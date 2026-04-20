from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_OUTPUT_DIR = PROJECT_ROOT / "model_training" / "datasets" / "virtual-tryon"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Create a virtual-tryon dataset workspace with templates and review sheets.")
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    return parser.parse_args()


def ensure_directory(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def write_jsonl(path: Path, rows: list[dict[str, object]]) -> None:
    ensure_directory(path.parent)
    with path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")


def write_csv(path: Path, rows: list[dict[str, object]]) -> None:
    ensure_directory(path.parent)
    if not rows:
        path.write_text("", encoding="utf-8")
        return
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)


def template_pair(split: str, category: str, slug: str) -> dict[str, object]:
    return {
        "pair_id": f"{split}-{slug}",
        "split": split,
        "category": category,
        "person_image": f"person_images/{split}/{slug}-person.jpg",
        "garment_image": f"garment_images/{split}/{slug}-garment.png",
        "target_image": f"paired_targets/{split}/{slug}-target.jpg",
        "person_mask": f"masks/person/{split}/{slug}-person-mask.png",
        "garment_mask": f"masks/garment/{split}/{slug}-garment-mask.png",
        "agnostic_mask": f"agnostic_masks/{split}/{slug}-agnostic.png",
        "pose_json": f"pose/{split}/{slug}-openpose.json",
        "source": "private-approved",
        "review_status": "pending",
        "quality_score": 0.0,
        "fit_notes": ["front-view", "garment fully visible", "arms clear"],
        "license_bucket": "commercial-approved",
    }


def write_readme(path: Path) -> None:
    content = """# Virtual Try-On Workspace

This workspace is ready for collecting and training paired try-on data.

## Recommended phases

1. Bootset
   - train: 400
   - eval: 50
   - goal: verify preprocessing, pose parsing, and category routing
2. Beta candidate
   - train: 3000
   - eval: 400
   - holdout review set: 200
   - goal: first model worth side-by-side judging
3. Strong launch candidate
   - train: 8000
   - eval: 800
   - holdout review set: 400
   - goal: stable fidelity across tops, bottoms, and dresses

## Category mix

- upper_body: 55%
- lower_body: 25%
- dresses: 20%

## Folder contract

- `person_images/`: clean source people photos
- `garment_images/`: isolated product garments
- `paired_targets/`: approved ground-truth try-on targets
- `masks/`: person and garment masks
- `agnostic_masks/`: agnostic masks for diffusion-based try-on pipelines
- `pose/`: OpenPose or equivalent keypoints
- `annotations/`: JSONL pair manifests
- `review/`: human QA sheets and decision logs

## Non-negotiable data rules

1. Keep one garment category per pair.
2. Require front or near-front body orientation for the base set.
3. Reject heavy arm occlusion in the first release lane.
4. Use only data with commercial clearance.
5. Keep final holdout images out of training.
"""
    path.write_text(content, encoding="utf-8")


def main() -> None:
    args = parse_args()
    root = args.output_dir

    directories = [
        "annotations",
        "person_images/train",
        "person_images/eval",
        "garment_images/train",
        "garment_images/eval",
        "paired_targets/train",
        "paired_targets/eval",
        "masks/person/train",
        "masks/person/eval",
        "masks/garment/train",
        "masks/garment/eval",
        "agnostic_masks/train",
        "agnostic_masks/eval",
        "pose/train",
        "pose/eval",
        "review",
    ]
    for relative in directories:
        ensure_directory(root / relative)

    train_rows = [
        template_pair("train", "upper_body", "studio-top-001"),
        template_pair("train", "lower_body", "studio-bottom-001"),
        template_pair("train", "dresses", "studio-dress-001"),
    ]
    eval_rows = [
        template_pair("eval", "upper_body", "eval-top-001"),
        template_pair("eval", "dresses", "eval-dress-001"),
    ]
    review_rows = [
        {
            "pair_id": "train-studio-top-001",
            "identity_preservation": "",
            "garment_fidelity": "",
            "edge_cleanup": "",
            "pose_compatibility": "",
            "decision": "pending",
            "reviewer": "",
            "notes": "",
        }
    ]

    write_jsonl(root / "annotations" / "train_pairs.template.jsonl", train_rows)
    write_jsonl(root / "annotations" / "eval_pairs.template.jsonl", eval_rows)
    write_csv(root / "review" / "qa-checklist.template.csv", review_rows)
    write_readme(root / "README.generated.md")

    print(f"[done] virtual-tryon workspace ready at {root}")


if __name__ == "__main__":
    main()
