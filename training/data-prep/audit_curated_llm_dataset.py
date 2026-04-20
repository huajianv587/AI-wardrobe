from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path

from generate_curated_llm_dataset import audit_example


def load_rows(path: Path) -> list[dict]:
    rows: list[dict] = []
    with path.open("r", encoding="utf-8") as handle:
        for line_no, raw_line in enumerate(handle, start=1):
            line = raw_line.strip()
            if not line:
                continue
            payload = json.loads(line)
            payload["_line_no"] = line_no
            rows.append(payload)
    return rows


def audit_file(path: Path) -> tuple[int, Counter[str], Counter[str]]:
    scene_counter: Counter[str] = Counter()
    error_counter: Counter[str] = Counter()
    rows = load_rows(path)

    for row in rows:
        scene = row.get("input", {}).get("scene", "unknown")
        scene_counter[scene] += 1
        for error in audit_example(row):
            error_counter[error] += 1

    return len(rows), scene_counter, error_counter


def main() -> None:
    parser = argparse.ArgumentParser(description="Audit curated llm-recommender JSONL files for quality heuristics.")
    parser.add_argument("paths", nargs="+")
    args = parser.parse_args()

    total_rows = 0
    merged_scenes: Counter[str] = Counter()
    merged_errors: Counter[str] = Counter()

    for raw_path in args.paths:
        path = Path(raw_path)
        rows, scenes, errors = audit_file(path)
        total_rows += rows
        merged_scenes.update(scenes)
        merged_errors.update(errors)
        print(f"[audited] {path} -> rows={rows}, errors={sum(errors.values())}")

    print("[scene-distribution]")
    for scene, count in merged_scenes.most_common():
        print(f"  {scene}: {count}")

    if merged_errors:
        print("[quality-errors]")
        for label, count in merged_errors.most_common():
            print(f"  {label}: {count}")
        raise SystemExit(1)

    print(f"[ok] audited {total_rows} rows with no heuristic quality failures")


if __name__ == "__main__":
    main()
