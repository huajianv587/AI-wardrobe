from __future__ import annotations

import argparse
import json
import time
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DATAROOT = PROJECT_ROOT / "model_training" / "raw-sources" / "tryon" / "viton-hd" / "extracted"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build bootstrap vitonhd_*_tagged.json files for IDM-VTON training.")
    parser.add_argument("--dataroot-path", type=Path, default=DEFAULT_DATAROOT)
    parser.add_argument("--item-label", default="top")
    parser.add_argument("--force", action="store_true")
    return parser.parse_args()


def read_pair_names(pair_file: Path) -> list[str]:
    names: list[str] = []
    for raw_line in pair_file.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line:
            continue
        image_name = line.split()[0]
        if image_name not in names:
            names.append(image_name)
    return names


def build_entries(names: list[str], item_label: str) -> list[dict[str, object]]:
    return [
        {
            "file_name": name,
            "tag_info": [
                {"tag_name": "item", "tag_category": item_label},
                {"tag_name": "sleeveLength", "tag_category": None},
                {"tag_name": "neckLine", "tag_category": None},
            ],
        }
        for name in names
    ]


def write_split(dataroot: Path, split: str, item_label: str, force: bool) -> dict[str, object]:
    pair_file = dataroot / f"{split}_pairs.txt"
    split_dir = dataroot / split
    output_file = split_dir / f"vitonhd_{split}_tagged.json"
    if not pair_file.exists():
        raise FileNotFoundError(f"Missing pair file: {pair_file}")
    if not split_dir.exists():
        raise FileNotFoundError(f"Missing split dir: {split_dir}")
    if output_file.exists() and not force:
        return {"split": split, "status": "kept", "output_file": str(output_file), "row_count": None}

    names = read_pair_names(pair_file)
    payload = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "bootstrap_note": "Generated from train/test pairs for IDM-VTON bootstrap training. Only the item label is populated.",
        "items": build_entries(names, item_label),
    }
    output_file.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return {"split": split, "status": "written", "output_file": str(output_file), "row_count": len(names)}


def main() -> None:
    args = parse_args()
    dataroot = args.dataroot_path.resolve()
    if not dataroot.exists():
        raise FileNotFoundError(f"Missing dataroot: {dataroot}")

    report = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "dataroot_path": str(dataroot),
        "item_label": args.item_label,
        "splits": [
            write_split(dataroot, "train", args.item_label, args.force),
            write_split(dataroot, "test", args.item_label, args.force),
        ],
    }
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
