from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATASET_DIR = PROJECT_ROOT / "model_training" / "datasets" / "image-processor"
RAW_ROOT = PROJECT_ROOT / "model_training" / "raw-sources"


def ensure_directory(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    return path


def relative_to_project(path: Path) -> str:
    try:
        return str(path.relative_to(PROJECT_ROOT))
    except ValueError:
        return str(path)


def load_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    payload = json.loads(path.read_text(encoding="utf-8"))
    return payload if isinstance(payload, dict) else {}


def count_files(root: Path, pattern: str) -> int:
    if not root.exists():
        return 0
    return sum(1 for _ in root.rglob(pattern))


def write_json(path: Path, payload: dict[str, Any]) -> None:
    ensure_directory(path.parent)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def write_readme(path: Path, payload: dict[str, Any]) -> None:
    fashionpedia = payload["sources"]["fashionpedia"]
    deepfashion2 = payload["sources"]["deepfashion2"]
    deepmm = payload["sources"]["deepfashion_multimodal"]

    content = [
        "# Image Processor Public Bootstrap",
        "",
        "This directory now includes the public bootstrap index for image-processor training on the cloud 5090 box.",
        "",
        "## Stage Direction",
        "",
        "- current strategy: `pretrained-inference-first`",
        "- primary public fine-tune sources: `Fashionpedia` and `DeepFashion2`",
        "- optional auxiliary source: `DeepFashion-MultiModal`",
        "",
        "## Public Sources",
        "",
        f"- Fashionpedia: `{fashionpedia['train_images']}` train images / `{fashionpedia['val_test_images']}` val-test images",
        f"- DeepFashion2: `{deepfashion2['train']}` train / `{deepfashion2['validation']}` validation / `{deepfashion2['test']}` test",
        f"- DeepFashion-MultiModal: `{deepmm['row_count']}` organized rows",
        "",
        "## Important Notes",
        "",
        "- Fashionpedia is strong for apparel segmentation and localized attributes.",
        "- DeepFashion2 adds cleaner garment structure, masks, and commercial-consumer variation.",
        "- For best cutout quality on your own product photos, private garment photography is still recommended later.",
        "",
        "## Key Paths",
        "",
        f"- Fashionpedia raw: `{fashionpedia['root']}`",
        f"- DeepFashion2 organized records: `{deepfashion2['records_dir']}`",
        f"- DeepFashion-MultiModal records: `{deepmm['records_dir']}`",
        "",
    ]
    path.write_text("\n".join(content), encoding="utf-8")


def main() -> None:
    ensure_directory(DATASET_DIR)

    deepfashion2_stats = load_json(PROJECT_ROOT / "model_training" / "datasets" / "deepfashion2" / "stats.generated.json")
    deepmm_stats = load_json(PROJECT_ROOT / "model_training" / "datasets" / "deepfashion-multimodal" / "stats.generated.json")
    fashionpedia_root = RAW_ROOT / "fashionpedia-official"
    fashionpedia_train_images = count_files(fashionpedia_root / "images" / "train2020", "*.jpg")
    fashionpedia_val_images = count_files(fashionpedia_root / "images" / "val_test2020", "*.jpg")

    payload = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "dataset_dir": relative_to_project(DATASET_DIR),
        "strategy": "pretrained-inference-first-with-public-finetune-bootstrap",
        "sources": {
            "fashionpedia": {
                "status": "ready" if fashionpedia_train_images and fashionpedia_val_images else "pending",
                "license": "CC-BY-4.0",
                "root": relative_to_project(fashionpedia_root),
                "train_images": fashionpedia_train_images,
                "val_test_images": fashionpedia_val_images,
                "train_annotations": relative_to_project(fashionpedia_root / "annotations" / "instances_attributes_train2020.json"),
                "val_annotations": relative_to_project(fashionpedia_root / "annotations" / "instances_attributes_val2020.json"),
            },
            "deepfashion2": {
                "status": deepfashion2_stats.get("status", "pending"),
                "train": deepfashion2_stats.get("stats", {}).get("train", 0),
                "validation": deepfashion2_stats.get("stats", {}).get("validation", 0),
                "test": deepfashion2_stats.get("stats", {}).get("test", 0),
                "records_dir": relative_to_project(PROJECT_ROOT / "model_training" / "datasets" / "deepfashion2" / "records"),
            },
            "deepfashion_multimodal": {
                "status": deepmm_stats.get("status", "pending"),
                "row_count": deepmm_stats.get("row_count", 0),
                "records_dir": relative_to_project(PROJECT_ROOT / "model_training" / "datasets" / "deepfashion-multimodal" / "records"),
            },
        },
        "notes": [
            "Use Fashionpedia plus DeepFashion2 as the public bootstrap when you decide to fine-tune image-processor.",
            "Keep test-images for smoke testing pretrained RMBG / BiRefNet behavior before starting full fine-tuning.",
            "Private garment photography is still the best long-term source for production-grade cutout quality.",
        ],
    }

    write_json(DATASET_DIR / "public-bootstrap.generated.json", payload)
    write_readme(DATASET_DIR / "README.generated.md", payload)
    print(json.dumps(payload, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
