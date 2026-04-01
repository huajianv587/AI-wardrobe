from __future__ import annotations

import argparse
import json
from pathlib import Path


REQUIRED_TOP_LEVEL_KEYS = {"instruction", "input", "output"}


def validate_file(path: Path) -> tuple[int, int]:
    total = 0
    failures = 0

    with path.open("r", encoding="utf-8") as handle:
        for line_no, raw_line in enumerate(handle, start=1):
            line = raw_line.strip()
            if not line:
                continue

            total += 1
            try:
                payload = json.loads(line)
            except json.JSONDecodeError as exc:
                failures += 1
                print(f"[invalid-json] {path}:{line_no} -> {exc}")
                continue

            missing = REQUIRED_TOP_LEVEL_KEYS - set(payload.keys())
            if missing:
                failures += 1
                print(f"[missing-keys] {path}:{line_no} -> missing {sorted(missing)}")
                continue

            if not isinstance(payload["input"], dict):
                failures += 1
                print(f"[invalid-input] {path}:{line_no} -> `input` must be an object")
                continue

            if not isinstance(payload["output"], dict):
                failures += 1
                print(f"[invalid-output] {path}:{line_no} -> `output` must be an object")
                continue

    return total, failures


def main() -> None:
    parser = argparse.ArgumentParser(description="Validate Stage-1 llm-recommender JSONL files.")
    parser.add_argument("paths", nargs="+", help="One or more JSONL files to validate.")
    args = parser.parse_args()

    total_rows = 0
    total_failures = 0

    for raw_path in args.paths:
        path = Path(raw_path)
        if not path.exists():
            total_failures += 1
            print(f"[missing-file] {path}")
            continue

        rows, failures = validate_file(path)
        total_rows += rows
        total_failures += failures
        print(f"[checked] {path} -> rows={rows}, failures={failures}")

    if total_failures:
        raise SystemExit(1)

    print(f"[ok] validated {total_rows} rows")


if __name__ == "__main__":
    main()
