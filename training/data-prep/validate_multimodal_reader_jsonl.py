from __future__ import annotations

import argparse
import json
from pathlib import Path


REQUIRED_OUTPUT_KEYS = {
    "tags",
    "occasions",
    "style_notes",
    "color_family",
    "dominant_color",
    "fabric_guess",
    "silhouette",
    "season",
    "mood",
    "category",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate multimodal-reader JSONL files and image references.")
    parser.add_argument("paths", nargs="+", help="JSONL files to validate")
    return parser.parse_args()


def validate_row(row: dict[str, object], *, dataset_root: Path, row_index: int, path: Path) -> list[str]:
    errors: list[str] = []
    image_path = str(row.get("image_path") or "").strip()
    if not image_path:
        errors.append("missing image_path")
    elif not (dataset_root / image_path).exists():
        errors.append(f"image missing: {image_path}")

    messages = row.get("messages")
    if not isinstance(messages, list) or len(messages) < 3:
        errors.append("messages must include system/user/assistant")

    output = row.get("output")
    if not isinstance(output, dict):
        errors.append("output must be an object")
    else:
        missing = sorted(REQUIRED_OUTPUT_KEYS - set(output))
        if missing:
            errors.append(f"output missing keys: {', '.join(missing)}")
        if not isinstance(output.get("tags"), list) or not output.get("tags"):
            errors.append("output.tags must be a non-empty list")
        if not isinstance(output.get("occasions"), list) or not output.get("occasions"):
            errors.append("output.occasions must be a non-empty list")
        if len(str(output.get("style_notes") or "").strip()) < 8:
            errors.append("output.style_notes is too short")

    if errors:
        return [f"{path}:{row_index}: {message}" for message in errors]
    return []


def validate_file(path: Path) -> tuple[int, list[str]]:
    dataset_root = path.parent
    errors: list[str] = []
    rows = 0
    with path.open("r", encoding="utf-8") as handle:
        for rows, line in enumerate(handle, start=1):
            line = line.strip()
            if not line:
                errors.append(f"{path}:{rows}: empty line")
                continue
            try:
                row = json.loads(line)
            except json.JSONDecodeError as exc:
                errors.append(f"{path}:{rows}: invalid JSON - {exc}")
                continue
            errors.extend(validate_row(row, dataset_root=dataset_root, row_index=rows, path=path))
    return rows, errors


def main() -> None:
    args = parse_args()
    total_rows = 0
    total_errors = 0
    for raw_path in args.paths:
        path = Path(raw_path).resolve()
        rows, errors = validate_file(path)
        total_rows += rows
        total_errors += len(errors)
        if errors:
            print(f"[failed] {path} -> rows={rows}, errors={len(errors)}")
            for error in errors[:20]:
                print(error)
        else:
            print(f"[checked] {path} -> rows={rows}, errors=0")
    if total_errors:
        raise SystemExit(1)
    print(f"[ok] validated {total_rows} rows")


if __name__ == "__main__":
    main()
