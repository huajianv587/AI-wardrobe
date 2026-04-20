from __future__ import annotations

import argparse
import csv
import json
import shutil
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DATASET_DIR = PROJECT_ROOT / "model_training" / "datasets" / "multimodal-reader"
SYSTEM_PROMPT = (
    "You extract wardrobe metadata from a single garment image. "
    "Return strict JSON with keys tags, occasions, style_notes, color_family, "
    "dominant_color, fabric_guess, silhouette, season, mood, and category."
)
USER_PROMPT = "Describe the garment for wardrobe enrichment and return JSON only."
REQUIRED_COLUMNS = {
    "split",
    "source_id",
    "image_path",
    "garment_name",
    "category",
    "dominant_color",
    "color_family",
    "fabric_guess",
    "silhouette",
    "season",
    "mood",
    "tags",
    "occasions",
    "style_notes",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Import private garment images into the multimodal-reader dataset format.")
    parser.add_argument("--catalog", default="training/data-prep/private-multimodal-catalog.template.csv")
    parser.add_argument("--dataset-dir", default=str(DEFAULT_DATASET_DIR))
    parser.add_argument("--copy-mode", choices=["copy", "move"], default="copy")
    return parser.parse_args()


def ensure_directory(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def split_items(raw: str) -> list[str]:
    return [item.strip() for item in str(raw or "").split("|") if item.strip()]


def write_jsonl(path: Path, rows: list[dict[str, object]]) -> None:
    ensure_directory(path.parent)
    with path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")


def load_jsonl(path: Path) -> list[dict[str, object]]:
    if not path.exists():
        return []
    rows: list[dict[str, object]] = []
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def relative_target_path(split: str, source_id: str, source_path: Path) -> Path:
    extension = source_path.suffix.lower() or ".jpg"
    safe_source_id = "".join(character if character.isalnum() or character in {"-", "_"} else "-" for character in source_id).strip("-")
    filename = f"{safe_source_id or source_path.stem}{extension}"
    return Path("images") / "private" / split / filename


def build_row(split: str, relative_image_path: str, entry: dict[str, str]) -> dict[str, object]:
    output = {
        "source": "multimodal-private",
        "tags": split_items(entry["tags"]),
        "occasions": split_items(entry["occasions"]),
        "style_notes": entry["style_notes"].strip(),
        "color_family": entry["color_family"].strip(),
        "dominant_color": entry["dominant_color"].strip(),
        "fabric_guess": entry["fabric_guess"].strip(),
        "silhouette": entry["silhouette"].strip(),
        "season": entry["season"].strip(),
        "mood": entry["mood"].strip(),
        "category": entry["category"].strip(),
    }
    return {
        "id": f"private-{entry['source_id'].strip()}",
        "source": "private-catalog",
        "task": "garment-attribute-understanding",
        "image_path": relative_image_path,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": USER_PROMPT},
            {"role": "assistant", "content": json.dumps(output, ensure_ascii=False, sort_keys=True)},
        ],
        "input": {
            "prompt": USER_PROMPT,
            "garment_name": entry["garment_name"].strip(),
            "image_path": relative_image_path,
        },
        "output": output,
        "source_meta": {
            "dataset": "private-catalog",
            "source_id": entry["source_id"].strip(),
            "catalog_image_path": entry["image_path"].strip(),
        },
    }


def merge_base_and_private(base_rows: list[dict[str, object]], private_rows: list[dict[str, object]]) -> list[dict[str, object]]:
    seen_ids = {str(row.get("id") or "") for row in base_rows}
    merged = list(base_rows)
    for row in private_rows:
        row_id = str(row.get("id") or "")
        if row_id in seen_ids:
            continue
        merged.append(row)
        seen_ids.add(row_id)
    return merged


def import_catalog(args: argparse.Namespace) -> None:
    dataset_dir = Path(args.dataset_dir).resolve()
    catalog_path = Path(args.catalog).resolve()
    if not catalog_path.exists():
        raise FileNotFoundError(f"Missing catalog: {catalog_path}")

    with catalog_path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        missing = REQUIRED_COLUMNS - set(reader.fieldnames or [])
        if missing:
            raise ValueError(f"Catalog is missing columns: {', '.join(sorted(missing))}")
        private_train_rows: list[dict[str, object]] = []
        private_eval_rows: list[dict[str, object]] = []
        for row in reader:
            split = row["split"].strip().lower()
            if split not in {"train", "eval"}:
                raise ValueError(f"Unsupported split '{split}' for source_id={row['source_id']}")
            source_path = Path(row["image_path"].strip()).expanduser()
            if not source_path.is_absolute():
                source_path = (PROJECT_ROOT / source_path).resolve()
            if not source_path.exists():
                raise FileNotFoundError(f"Missing image: {source_path}")

            target_relative = relative_target_path(split, row["source_id"].strip(), source_path)
            target_path = dataset_dir / target_relative
            ensure_directory(target_path.parent)
            if args.copy_mode == "move":
                shutil.move(str(source_path), str(target_path))
            else:
                shutil.copy2(source_path, target_path)

            payload = build_row(split, str(target_relative).replace("\\", "/"), row)
            if split == "train":
                private_train_rows.append(payload)
            else:
                private_eval_rows.append(payload)

    write_jsonl(dataset_dir / "train.private.jsonl", private_train_rows)
    write_jsonl(dataset_dir / "eval.private.jsonl", private_eval_rows)

    base_train = load_jsonl(dataset_dir / "train.jsonl")
    base_eval = load_jsonl(dataset_dir / "eval.jsonl")
    write_jsonl(dataset_dir / "train.mixed.jsonl", merge_base_and_private(base_train, private_train_rows))
    write_jsonl(dataset_dir / "eval.mixed.jsonl", merge_base_and_private(base_eval, private_eval_rows))

    print(f"[done] imported private train rows: {len(private_train_rows)}")
    print(f"[done] imported private eval rows: {len(private_eval_rows)}")
    print(f"[done] wrote: {dataset_dir / 'train.private.jsonl'}")
    print(f"[done] wrote: {dataset_dir / 'eval.private.jsonl'}")
    print(f"[done] wrote: {dataset_dir / 'train.mixed.jsonl'}")
    print(f"[done] wrote: {dataset_dir / 'eval.mixed.jsonl'}")


def main() -> None:
    args = parse_args()
    import_catalog(args)


if __name__ == "__main__":
    main()
