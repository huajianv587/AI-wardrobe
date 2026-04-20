from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[2]
RAW_ROOT = PROJECT_ROOT / "model_training" / "raw-sources"
JOBS_PATH = RAW_ROOT / "internal-research-download-jobs.generated.json"
PROGRESS_PATH = RAW_ROOT / "internal-research-download-progress.generated.json"

EXPECTED_FILES = {
    "deepfashion-multimodal": [
        "model_training/raw-sources/deepfashion-multimodal/archives/image.zip",
        "model_training/raw-sources/deepfashion-multimodal/archives/parsing.zip",
        "model_training/raw-sources/deepfashion-multimodal/archives/keypoints.zip",
        "model_training/raw-sources/deepfashion-multimodal/archives/densepose.zip",
        "model_training/raw-sources/deepfashion-multimodal/archives/labels.zip",
        "model_training/raw-sources/deepfashion-multimodal/archives/textual_descriptions.json",
    ],
    "deepfashion2": [
        "model_training/raw-sources/deepfashion2/archives/json_for_validation.zip",
        "model_training/raw-sources/deepfashion2/archives/test.zip",
        "model_training/raw-sources/deepfashion2/archives/train.zip",
        "model_training/raw-sources/deepfashion2/archives/validation.zip",
    ],
    "shift15m": [
        "model_training/raw-sources/shift15m/label/iqon_outfits.json",
        "model_training/raw-sources/shift15m/label/iqon_outfits_with_tags.json",
        "model_training/raw-sources/shift15m/num_likes_regression/xy_00.pickle",
        "model_training/raw-sources/shift15m/num_likes_regression/xy_01.pickle",
        "model_training/raw-sources/shift15m/num_likes_regression/xy_02.pickle",
        "model_training/raw-sources/shift15m/num_likes_regression/xy_03.pickle",
        "model_training/raw-sources/shift15m/num_likes_regression/xy_04.pickle",
        "model_training/raw-sources/shift15m/num_likes_regression/xy_05.pickle",
        "model_training/raw-sources/shift15m/num_likes_regression/xy_06.pickle",
        "model_training/raw-sources/shift15m/num_likes_regression/xy_07.pickle",
        "model_training/raw-sources/shift15m/num_likes_regression/xy_08.pickle",
        "model_training/raw-sources/shift15m/num_likes_regression/xy_09.pickle",
        "model_training/raw-sources/shift15m/sum_prices_regression/sumprices.pickle",
        "model_training/raw-sources/shift15m/year_classification/year_classification_labels.tar.gz",
        "model_training/raw-sources/shift15m/item_category_prediction/item_catalog.txt",
    ],
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Watch internal dataset download progress and write a heartbeat JSON file.")
    parser.add_argument("--interval-seconds", type=int, default=60)
    parser.add_argument("--max-iterations", type=int, default=0, help="0 means run until all tracked downloads are complete.")
    parser.add_argument("--bundle-when-ready", action="store_true")
    return parser.parse_args()


def read_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def artifact_status(relative_path: str) -> dict[str, Any]:
    exact_path = PROJECT_ROOT / relative_path
    if exact_path.exists():
        return {
            "expected_path": relative_path,
            "state": "complete",
            "path": relative_path,
            "bytes": exact_path.stat().st_size,
        }

    parent = exact_path.parent
    matches = sorted(parent.glob(exact_path.name + "*")) if parent.exists() else []
    partials = [path for path in matches if path.name != exact_path.name]
    if partials:
        partial = max(partials, key=lambda item: item.stat().st_size)
        return {
            "expected_path": relative_path,
            "state": "downloading",
            "path": str(partial.relative_to(PROJECT_ROOT)),
            "bytes": partial.stat().st_size,
        }

    return {
        "expected_path": relative_path,
        "state": "missing",
        "path": None,
        "bytes": 0,
    }


def process_alive(pid: int) -> bool:
    command = ["tasklist", "/FI", f"PID eq {pid}"]
    result = subprocess.run(command, capture_output=True, text=True)
    return str(pid) in result.stdout


def shift15m_feature_progress() -> dict[str, Any]:
    tar_dir = RAW_ROOT / "shift15m" / "downloads" / "feature_tars"
    feature_dir = RAW_ROOT / "shift15m" / "features"
    tar_files = list(tar_dir.glob("*.tar.gz")) if tar_dir.exists() else []
    partial_tars = [path for path in tar_dir.glob("*.tar.gz*") if path.name != path.stem and ".part" in path.name] if tar_dir.exists() else []
    extracted_ok = list(feature_dir.glob(".*.ok")) if feature_dir.exists() else []
    feature_files = list(feature_dir.glob("*.json.gz")) if feature_dir.exists() else []
    return {
        "tar_count": len(tar_files),
        "partial_tar_count": len(partial_tars),
        "extracted_ok_count": len(extracted_ok),
        "feature_file_count": len(feature_files),
        "expected_feature_tar_count": 200,
    }


def dataset_complete(dataset_name: str, files: list[dict[str, Any]], feature_info: dict[str, Any] | None) -> bool:
    if not files or not all(item["state"] == "complete" for item in files):
        return False
    if dataset_name != "shift15m":
        return True
    if not feature_info:
        return False
    return feature_info["extracted_ok_count"] >= feature_info["expected_feature_tar_count"]


def maybe_bundle() -> None:
    subprocess.run(
        [sys.executable, str(PROJECT_ROOT / "training/data-prep/prepare_AAtrain_bundle.py")],
        cwd=PROJECT_ROOT,
        check=False,
    )


def main() -> None:
    args = parse_args()
    jobs_payload = read_json(JOBS_PATH)
    iteration = 0
    bundle_triggered = False

    while True:
        payload: dict[str, Any] = {
            "updated_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
            "jobs": [],
            "datasets": {},
        }

        for job in jobs_payload.get("jobs", []):
            payload["jobs"].append(
                {
                    "dataset": job["dataset"],
                    "pid": job["pid"],
                    "alive": process_alive(int(job["pid"])),
                }
            )

        all_complete = True
        for dataset_name, relative_paths in EXPECTED_FILES.items():
            file_states = [artifact_status(relative_path) for relative_path in relative_paths]
            feature_info = shift15m_feature_progress() if dataset_name == "shift15m" else None
            payload["datasets"][dataset_name] = {
                "files": file_states,
                "feature_progress": feature_info,
            }
            payload["datasets"][dataset_name]["complete"] = dataset_complete(dataset_name, file_states, feature_info)
            if not payload["datasets"][dataset_name]["complete"]:
                all_complete = False

        write_json(PROGRESS_PATH, payload)

        if all_complete:
            if args.bundle_when_ready and not bundle_triggered:
                maybe_bundle()
                bundle_triggered = True
            if not args.max_iterations:
                break

        iteration += 1
        if args.max_iterations and iteration >= args.max_iterations:
            break
        time.sleep(max(5, args.interval_seconds))


if __name__ == "__main__":
    main()
