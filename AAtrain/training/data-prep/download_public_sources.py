from __future__ import annotations

import argparse
import json
import subprocess
from pathlib import Path

from datasets import load_dataset, load_dataset_builder


PROJECT_ROOT = Path(__file__).resolve().parents[2]
RAW_ROOT = PROJECT_ROOT / "model_training" / "raw-sources"

GITHUB_REPOS = {
    "fashioniq-repo": "https://github.com/XiaoxiaoGuo/fashion-iq.git",
    "polyvore-repo": "https://github.com/xthan/polyvore-dataset.git",
    "deepfashion2-repo": "https://github.com/switchablenorms/DeepFashion2.git",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Download accessible public fashion metadata sources into model_training/raw-sources.")
    parser.add_argument("--polyvore-limit", type=int, default=30000)
    parser.add_argument("--fashioniq-limit", type=int, default=6000)
    parser.add_argument("--fashionpedia-limit", type=int, default=12000)
    parser.add_argument("--skip-git", action="store_true")
    return parser.parse_args()


def ensure_directory(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def shallow_clone(name: str, repo_url: str) -> Path:
    target = RAW_ROOT / name
    if (target / ".git").exists():
        subprocess.run(["git", "-C", str(target), "pull", "--ff-only"], check=True)
        return target

    if target.exists():
        return target

    subprocess.run(["git", "clone", "--depth", "1", "--filter=blob:none", repo_url, str(target)], check=True)
    return target


def load_split(dataset_name: str, split_name: str, limit: int):
    dataset = load_dataset(dataset_name, split=split_name)
    capped = min(limit, len(dataset))
    if capped < len(dataset):
        dataset = dataset.select(range(capped))
    print(f"[loaded] {dataset_name}:{split_name} -> rows={len(dataset)}")
    return dataset


def export_jsonl(path: Path, rows: list[dict]) -> None:
    ensure_directory(path.parent)
    with path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")


def polyvore_metadata(limit: int) -> list[dict]:
    dataset = load_split("Marqo/polyvore", "data", limit)
    exported: list[dict] = []
    for index, payload in enumerate(dataset):
        image = payload.get("image")
        exported.append(
            {
                "dataset": "Marqo/polyvore",
                "row_idx": index,
                "item_id": payload.get("item_ID"),
                "category": payload.get("category"),
                "text": payload.get("text"),
                "image_size": list(image.size) if image else None,
            }
        )
    return exported


def fashioniq_metadata(limit: int) -> list[dict]:
    dataset = load_split("royokong/fashioniq_val", "val", limit)
    exported: list[dict] = []
    for index, payload in enumerate(dataset):
        candidate = payload.get("candidate")
        target = payload.get("target")
        exported.append(
            {
                "dataset": "royokong/fashioniq_val",
                "row_idx": index,
                "candidate_id": payload.get("candidate_id"),
                "target_id": payload.get("target_id"),
                "category": payload.get("category"),
                "captions": payload.get("caption") or [],
                "candidate_image_size": list(candidate.size) if candidate else None,
                "target_image_size": list(target.size) if target else None,
            }
        )
    return exported


def fashionpedia_metadata(limit: int) -> list[dict]:
    category_names = load_dataset_builder("detection-datasets/fashionpedia").info.features["objects"]["category"].feature.names
    dataset = load_split("detection-datasets/fashionpedia", "train", limit)
    exported: list[dict] = []
    for index, payload in enumerate(dataset):
        category_ids = list((payload.get("objects") or {}).get("category") or [])
        categories = [category_names[item] for item in category_ids if isinstance(item, int) and 0 <= item < len(category_names)]
        exported.append(
            {
                "dataset": "detection-datasets/fashionpedia",
                "row_idx": index,
                "image_id": payload.get("image_id"),
                "width": payload.get("width"),
                "height": payload.get("height"),
                "object_count": len(categories),
                "object_categories": list(dict.fromkeys(categories)),
            }
        )
    return exported


def write_summary(report_path: Path, payload: dict) -> None:
    ensure_directory(report_path.parent)
    report_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> None:
    args = parse_args()
    ensure_directory(RAW_ROOT)

    git_paths: dict[str, str] = {}
    if not args.skip_git:
        for name, repo_url in GITHUB_REPOS.items():
            git_paths[name] = str(shallow_clone(name, repo_url))

    polyvore_rows = polyvore_metadata(args.polyvore_limit)
    fashioniq_rows = fashioniq_metadata(args.fashioniq_limit)
    fashionpedia_rows = fashionpedia_metadata(args.fashionpedia_limit)

    polyvore_path = RAW_ROOT / "polyvore" / f"polyvore.metadata.{len(polyvore_rows)}.jsonl"
    fashioniq_path = RAW_ROOT / "fashioniq" / f"fashioniq.metadata.{len(fashioniq_rows)}.jsonl"
    fashionpedia_path = RAW_ROOT / "fashionpedia" / f"fashionpedia.metadata.{len(fashionpedia_rows)}.jsonl"

    export_jsonl(polyvore_path, polyvore_rows)
    export_jsonl(fashioniq_path, fashioniq_rows)
    export_jsonl(fashionpedia_path, fashionpedia_rows)

    summary = {
        "git_paths": git_paths,
        "exports": {
            "polyvore": {"rows": len(polyvore_rows), "path": str(polyvore_path)},
            "fashioniq": {"rows": len(fashioniq_rows), "path": str(fashioniq_path)},
            "fashionpedia": {"rows": len(fashionpedia_rows), "path": str(fashionpedia_path)},
        },
        "note": "Datasets were loaded through Hugging Face datasets and are now also available through the local HF cache on this machine.",
    }
    summary_path = RAW_ROOT / "download-report.generated.json"
    write_summary(summary_path, summary)

    print("Public source download completed.")
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
