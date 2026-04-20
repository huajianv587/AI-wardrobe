from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Audit multimodal-reader dataset distributions and lightweight quality rules.")
    parser.add_argument("paths", nargs="+", help="JSONL files to audit")
    return parser.parse_args()


def audit_file(path: Path) -> tuple[int, list[str], Counter[str], Counter[str], Counter[str]]:
    errors: list[str] = []
    category_counter: Counter[str] = Counter()
    color_counter: Counter[str] = Counter()
    occasion_counter: Counter[str] = Counter()
    rows = 0
    with path.open("r", encoding="utf-8") as handle:
        for rows, line in enumerate(handle, start=1):
            row = json.loads(line)
            output = row.get("output") or {}
            category = str(output.get("category") or "").strip()
            color_family = str(output.get("color_family") or "").strip()
            occasions = output.get("occasions") or []
            tags = output.get("tags") or []
            style_notes = str(output.get("style_notes") or "").strip()
            category_counter[category] += 1
            color_counter[color_family] += 1
            for occasion in occasions:
                occasion_counter[str(occasion)] += 1
            if len(tags) < 4:
                errors.append(f"{path}:{rows}: too few tags")
            if len(occasions) > 3:
                errors.append(f"{path}:{rows}: too many occasions")
            if len(style_notes) > 120:
                errors.append(f"{path}:{rows}: style_notes too long")
    return rows, errors, category_counter, color_counter, occasion_counter


def main() -> None:
    args = parse_args()
    total_rows = 0
    total_errors = 0
    merged_categories: Counter[str] = Counter()
    merged_colors: Counter[str] = Counter()
    merged_occasions: Counter[str] = Counter()

    for raw_path in args.paths:
        path = Path(raw_path).resolve()
        rows, errors, categories, colors, occasions = audit_file(path)
        total_rows += rows
        total_errors += len(errors)
        merged_categories.update(categories)
        merged_colors.update(colors)
        merged_occasions.update(occasions)
        print(f"[audited] {path} -> rows={rows}, errors={len(errors)}")
        for error in errors[:20]:
            print(error)

    if total_errors:
        raise SystemExit(1)

    print("[category-distribution]")
    for key, value in merged_categories.most_common():
        print(f"  {key}: {value}")
    print("[color-family-distribution]")
    for key, value in merged_colors.most_common():
        print(f"  {key}: {value}")
    print("[occasion-distribution]")
    for key, value in merged_occasions.most_common():
        print(f"  {key}: {value}")
    print(f"[ok] audited {total_rows} rows with no heuristic quality failures")


if __name__ == "__main__":
    main()
