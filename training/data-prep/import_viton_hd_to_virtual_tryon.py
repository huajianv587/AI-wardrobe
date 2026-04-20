from __future__ import annotations

import argparse
import json
import os
import shutil
from pathlib import Path
from typing import Any

from PIL import Image


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_SOURCE_ROOT = PROJECT_ROOT / "model_training" / "raw-sources" / "tryon" / "viton-hd" / "extracted"
DEFAULT_OUTPUT_DIR = PROJECT_ROOT / "model_training" / "datasets" / "virtual-tryon"
MANIFEST_NAMES = {
    "train": "train_pairs.jsonl",
    "eval": "eval_pairs.jsonl",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Import VITON-HD into model_training/datasets/virtual-tryon using the project's pair schema."
    )
    parser.add_argument("--source-root", type=Path, default=DEFAULT_SOURCE_ROOT)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--force", action="store_true", help="Rebuild generated train/eval assets in the output directory.")
    parser.add_argument("--copy", action="store_true", help="Copy files instead of creating hardlinks.")
    return parser.parse_args()


def ensure_directory(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    return path


def relative_to_project(path: Path) -> str:
    try:
        return str(path.relative_to(PROJECT_ROOT))
    except ValueError:
        return str(path)


def write_json(path: Path, payload: dict[str, Any]) -> None:
    ensure_directory(path.parent)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def write_jsonl(path: Path, rows: list[dict[str, Any]]) -> None:
    ensure_directory(path.parent)
    with path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")


def reset_generated_split_dirs(output_dir: Path) -> None:
    generated_roots = [
        output_dir / "person_images" / "train",
        output_dir / "person_images" / "eval",
        output_dir / "garment_images" / "train",
        output_dir / "garment_images" / "eval",
        output_dir / "paired_targets" / "train",
        output_dir / "paired_targets" / "eval",
        output_dir / "masks" / "person" / "train",
        output_dir / "masks" / "person" / "eval",
        output_dir / "masks" / "garment" / "train",
        output_dir / "masks" / "garment" / "eval",
        output_dir / "agnostic_masks" / "train",
        output_dir / "agnostic_masks" / "eval",
        output_dir / "pose" / "train",
        output_dir / "pose" / "eval",
    ]
    for path in generated_roots:
        if path.exists():
            shutil.rmtree(path)
        path.mkdir(parents=True, exist_ok=True)

    annotations_dir = ensure_directory(output_dir / "annotations")
    for manifest_name in MANIFEST_NAMES.values():
        manifest_path = annotations_dir / manifest_name
        if manifest_path.exists():
            manifest_path.unlink()

    report_path = annotations_dir / "viton_hd_import_report.generated.json"
    if report_path.exists():
        report_path.unlink()


def mirror_file(src: Path, dst: Path, use_hardlinks: bool) -> None:
    ensure_directory(dst.parent)
    if dst.exists():
        dst.unlink()
    if use_hardlinks:
        try:
            os.link(src, dst)
            return
        except OSError:
            pass
    shutil.copy2(src, dst)


def build_person_mask(parse_path: Path, destination: Path) -> None:
    ensure_directory(destination.parent)
    with Image.open(parse_path) as parse_image:
        binary_mask = parse_image.convert("L").point(lambda value: 255 if value != 0 else 0)
        binary_mask.save(destination)


def ensure_required_paths(record: dict[str, Path]) -> None:
    missing = [name for name, path in record.items() if not path.exists()]
    if missing:
        missing_str = ", ".join(missing)
        raise FileNotFoundError(f"Missing required VITON-HD files for {record['image'].stem}: {missing_str}")


def build_split_records(source_root: Path, output_dir: Path, source_split: str, target_split: str, use_hardlinks: bool) -> list[dict[str, Any]]:
    split_root = source_root / source_split
    image_dir = split_root / "image"
    rows: list[dict[str, Any]] = []

    for image_path in sorted(image_dir.glob("*.jpg")):
        stem = image_path.stem
        required = {
            "image": image_path,
            "cloth": split_root / "cloth" / image_path.name,
            "cloth_mask": split_root / "cloth-mask" / image_path.name,
            "agnostic_mask": split_root / "agnostic-mask" / f"{stem}_mask.png",
            "parse": split_root / "image-parse-v3" / f"{stem}.png",
            "pose_json": split_root / "openpose_json" / f"{stem}_keypoints.json",
        }
        ensure_required_paths(required)

        person_image_dst = output_dir / "person_images" / target_split / image_path.name
        garment_image_dst = output_dir / "garment_images" / target_split / image_path.name
        target_image_dst = output_dir / "paired_targets" / target_split / image_path.name
        garment_mask_dst = output_dir / "masks" / "garment" / target_split / image_path.name
        agnostic_mask_dst = output_dir / "agnostic_masks" / target_split / f"{stem}_mask.png"
        pose_dst = output_dir / "pose" / target_split / f"{stem}_keypoints.json"
        person_mask_dst = output_dir / "masks" / "person" / target_split / f"{stem}-person-mask.png"

        mirror_file(required["image"], person_image_dst, use_hardlinks)
        mirror_file(required["cloth"], garment_image_dst, use_hardlinks)
        mirror_file(required["image"], target_image_dst, use_hardlinks)
        mirror_file(required["cloth_mask"], garment_mask_dst, use_hardlinks)
        mirror_file(required["agnostic_mask"], agnostic_mask_dst, use_hardlinks)
        mirror_file(required["pose_json"], pose_dst, use_hardlinks)
        build_person_mask(required["parse"], person_mask_dst)

        rows.append(
            {
                "pair_id": f"{target_split}-viton-hd-{stem}",
                "split": target_split,
                "category": "upper_body",
                "person_image": relative_to_project(person_image_dst),
                "garment_image": relative_to_project(garment_image_dst),
                "target_image": relative_to_project(target_image_dst),
                "person_mask": relative_to_project(person_mask_dst),
                "garment_mask": relative_to_project(garment_mask_dst),
                "agnostic_mask": relative_to_project(agnostic_mask_dst),
                "pose_json": relative_to_project(pose_dst),
                "source": "viton-hd",
                "source_split": source_split,
                "pairing_mode": "paired-self-reconstruction",
                "review_status": "public-bootstrap-unreviewed",
                "quality_score": 0.0,
                "fit_notes": [
                    "front-view",
                    "upper-body-only",
                    "public-bootstrap",
                    "research-only",
                ],
                "license_bucket": "research-only-noncommercial",
            }
        )

    return rows


def build_dataset_readme(output_dir: Path, report: dict[str, Any]) -> None:
    content = [
        "# Virtual Try-On Dataset",
        "",
        "This dataset has been bootstrapped from the public VITON-HD release.",
        "",
        "## Current Imported Source",
        "",
        "- source: `VITON-HD`",
        "- lane: `research bootstrap`",
        "- category coverage: `upper_body` only",
        f"- train pairs: `{report['stats']['train']}`",
        f"- eval pairs: `{report['stats']['eval']}`",
        "",
        "## Important License Note",
        "",
        "- VITON-HD is imported here for research bootstrapping.",
        "- The upstream dataset is marked research-only / non-commercial.",
        "- Do not treat this imported dataset as commercial-cleared production data.",
        "",
        "## Generated Files",
        "",
        "- `annotations/train_pairs.jsonl`",
        "- `annotations/eval_pairs.jsonl`",
        "- `masks/person/*` are generated from `image-parse-v3` silhouettes",
        "",
        "## Recommended Next Step",
        "",
        "- Keep this dataset for 5090 R&D training.",
        "- Replace or augment it later with commercial-cleared paired data if you need production-safe weights.",
        "",
    ]
    (output_dir / "README.generated.md").write_text("\n".join(content), encoding="utf-8")


def main() -> None:
    args = parse_args()
    output_dir = ensure_directory(args.output_dir)

    if args.force:
        reset_generated_split_dirs(output_dir)

    for split_name in (
        output_dir / "person_images" / "train",
        output_dir / "person_images" / "eval",
        output_dir / "garment_images" / "train",
        output_dir / "garment_images" / "eval",
        output_dir / "paired_targets" / "train",
        output_dir / "paired_targets" / "eval",
        output_dir / "masks" / "person" / "train",
        output_dir / "masks" / "person" / "eval",
        output_dir / "masks" / "garment" / "train",
        output_dir / "masks" / "garment" / "eval",
        output_dir / "agnostic_masks" / "train",
        output_dir / "agnostic_masks" / "eval",
        output_dir / "pose" / "train",
        output_dir / "pose" / "eval",
    ):
        ensure_directory(split_name)

    train_rows = build_split_records(args.source_root, output_dir, "train", "train", use_hardlinks=not args.copy)
    eval_rows = build_split_records(args.source_root, output_dir, "test", "eval", use_hardlinks=not args.copy)

    annotations_dir = ensure_directory(output_dir / "annotations")
    write_jsonl(annotations_dir / MANIFEST_NAMES["train"], train_rows)
    write_jsonl(annotations_dir / MANIFEST_NAMES["eval"], eval_rows)

    report = {
        "generated_at": __import__("time").strftime("%Y-%m-%dT%H:%M:%S%z"),
        "source_root": relative_to_project(args.source_root),
        "output_dir": relative_to_project(output_dir),
        "import_mode": "copy" if args.copy else "hardlink-plus-generated-masks",
        "stats": {
            "train": len(train_rows),
            "eval": len(eval_rows),
        },
        "notes": [
            "Target images are self-reconstruction supervision using the same source person image.",
            "This bootstrap import is upper-body-only and research-only.",
        ],
    }
    write_json(annotations_dir / "viton_hd_import_report.generated.json", report)
    build_dataset_readme(output_dir, report)
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
