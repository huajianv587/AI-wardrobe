from __future__ import annotations

import argparse
import json
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DATASET_DIR = PROJECT_ROOT / "model_training" / "datasets" / "multimodal-reader"
DEFAULT_EXPORT_DIR = PROJECT_ROOT / "model_training" / "exports" / "multimodal-reader-qwen"
DEFAULT_DATASET_NAME = "ai_wardrobe_multimodal"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Export the multimodal-reader dataset into Qwen official finetune format.")
    parser.add_argument("--dataset-dir", default=str(DEFAULT_DATASET_DIR))
    parser.add_argument("--export-dir", default=str(DEFAULT_EXPORT_DIR))
    parser.add_argument("--dataset-name", default=DEFAULT_DATASET_NAME)
    parser.add_argument("--train-file", default="train.mixed.jsonl")
    parser.add_argument("--eval-file", default="eval.mixed.jsonl")
    return parser.parse_args()


def ensure_directory(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def load_jsonl(path: Path) -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def build_conversation(row: dict[str, object]) -> dict[str, object]:
    prompt = str(((row.get("input") or {}).get("prompt")) or "Describe the garment for wardrobe enrichment and return JSON only.").strip()
    garment_name = str(((row.get("input") or {}).get("garment_name")) or "").strip()
    image_path = str(row.get("image_path") or "").replace("\\", "/")
    output_payload = json.dumps(row.get("output") or {}, ensure_ascii=False, sort_keys=True)
    human_value = "<image>\n" + prompt
    if garment_name:
        human_value += f"\nGarment name: {garment_name}"
    return {
        "id": str(row.get("id") or ""),
        "image": image_path,
        "conversations": [
            {"from": "human", "value": human_value},
            {"from": "gpt", "value": output_payload},
        ],
    }


def write_json(path: Path, payload: list[dict[str, object]]) -> None:
    ensure_directory(path.parent)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def write_readme(path: Path, dataset_name: str, dataset_dir: Path, train_annotation: Path, eval_annotation: Path) -> None:
    dataset_rel = dataset_dir.relative_to(PROJECT_ROOT).as_posix() if dataset_dir.is_relative_to(PROJECT_ROOT) else dataset_dir.as_posix()
    train_rel = train_annotation.relative_to(PROJECT_ROOT).as_posix() if train_annotation.is_relative_to(PROJECT_ROOT) else train_annotation.as_posix()
    eval_rel = eval_annotation.relative_to(PROJECT_ROOT).as_posix() if eval_annotation.is_relative_to(PROJECT_ROOT) else eval_annotation.as_posix()
    content = f"""# Qwen VL Export

This export is ready for the official Qwen VL finetune repo.

## Dataset name

`{dataset_name}`

## Paths

- project-relative data root: `{dataset_rel}`
- project-relative train annotation: `{train_rel}`
- project-relative eval annotation: `{eval_rel}`

## Next step

1. Clone the official Qwen VL finetune repo.
2. Register this dataset with `training/lora-finetune/register_qwen_vl_dataset.py` on the target machine so it writes that machine's absolute paths.
3. Launch training with `training/lora-finetune/run-multimodal-reader.sh`.
"""
    path.write_text(content, encoding="utf-8")


def write_registry_snippet(path: Path, dataset_name: str, train_annotation: Path, dataset_dir: Path) -> None:
    snippet = (
        "# Replace <PROJECT_ROOT> with the absolute project path on the target machine,\n"
        "# or use training/lora-finetune/register_qwen_vl_dataset.py instead.\n\n"
        f"{dataset_name.upper()} = {{\n"
        f'    "annotation_path": "<PROJECT_ROOT>/{train_annotation.relative_to(PROJECT_ROOT).as_posix()}",\n'
        f'    "data_path": "<PROJECT_ROOT>/{dataset_dir.relative_to(PROJECT_ROOT).as_posix()}",\n'
        "}\n\n"
        "data_dict.update({\n"
        f'    "{dataset_name}": {dataset_name.upper()},\n'
        "})\n"
    )
    path.write_text(snippet, encoding="utf-8")


def main() -> None:
    args = parse_args()
    dataset_dir = Path(args.dataset_dir).resolve()
    export_dir = Path(args.export_dir).resolve()
    train_path = dataset_dir / args.train_file
    eval_path = dataset_dir / args.eval_file

    if not train_path.exists():
        fallback_train = dataset_dir / "train.jsonl"
        train_path = fallback_train if fallback_train.exists() else train_path
    if not eval_path.exists():
        fallback_eval = dataset_dir / "eval.jsonl"
        eval_path = fallback_eval if fallback_eval.exists() else eval_path

    if not train_path.exists() or not eval_path.exists():
        raise FileNotFoundError("Missing multimodal train/eval files to export.")

    train_rows = [build_conversation(row) for row in load_jsonl(train_path)]
    eval_rows = [build_conversation(row) for row in load_jsonl(eval_path)]

    train_annotation = export_dir / "annotations" / "train.json"
    eval_annotation = export_dir / "annotations" / "eval.json"
    write_json(train_annotation, train_rows)
    write_json(eval_annotation, eval_rows)
    write_registry_snippet(export_dir / "dataset_registry.snippet.py", args.dataset_name, train_annotation, dataset_dir)
    write_readme(export_dir / "README.generated.md", args.dataset_name, dataset_dir, train_annotation, eval_annotation)

    print(f"[done] exported train rows: {len(train_rows)}")
    print(f"[done] exported eval rows: {len(eval_rows)}")
    print(f"[done] export root: {export_dir}")


if __name__ == "__main__":
    main()
