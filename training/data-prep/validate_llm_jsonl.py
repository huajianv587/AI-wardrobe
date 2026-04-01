from __future__ import annotations

import argparse
import json
from pathlib import Path

from typing import Any


REQUIRED_TOP_LEVEL_KEYS = {"instruction", "input", "output"}


def _validate_payload(payload: dict[str, Any], path: Path, row_label: str) -> int:
    failures = 0
    missing = REQUIRED_TOP_LEVEL_KEYS - set(payload.keys())
    if missing:
        failures += 1
        print(f"[missing-keys] {path}:{row_label} -> missing {sorted(missing)}")
        return failures

    if not isinstance(payload["input"], dict):
        failures += 1
        print(f"[invalid-input] {path}:{row_label} -> `input` must be an object")
        return failures

    if not isinstance(payload["output"], dict):
        failures += 1
        print(f"[invalid-output] {path}:{row_label} -> `output` must be an object")
        return failures

    return failures


def _validate_json_array(text: str, path: Path) -> tuple[int, int] | None:
    try:
        payload = json.loads(text)
    except json.JSONDecodeError:
        return None

    if not isinstance(payload, list):
        return None

    total = 0
    failures = 0
    for index, item in enumerate(payload, start=1):
        total += 1
        if not isinstance(item, dict):
            failures += 1
            print(f"[invalid-row] {path}:{index} -> each array item must be an object")
            continue
        failures += _validate_payload(item, path, str(index))

    return total, failures


def validate_file(path: Path) -> tuple[int, int]:
    raw_text = path.read_text(encoding="utf-8").strip()
    if not raw_text:
        return 0, 0

    array_result = _validate_json_array(raw_text, path)
    if array_result is not None:
        return array_result

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

            failures += _validate_payload(payload, path, str(line_no))

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
