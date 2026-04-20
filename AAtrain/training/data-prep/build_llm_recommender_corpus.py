from __future__ import annotations

import argparse
import json
import random
from pathlib import Path

from generate_curated_llm_dataset import DEFAULT_EVAL_SIZE, DEFAULT_TRAIN_SIZE, ROOT, ensure_directory, generate_rows
from generate_premium_refinement_set import generate_premium_rows


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build the final llm-recommender corpus, including the premium refinement overlay.")
    parser.add_argument("--train-size", type=int, default=DEFAULT_TRAIN_SIZE)
    parser.add_argument("--eval-size", type=int, default=DEFAULT_EVAL_SIZE)
    parser.add_argument("--premium-train-size", type=int, default=192)
    parser.add_argument("--premium-eval-size", type=int, default=48)
    parser.add_argument("--seed", type=int, default=20260411)
    parser.add_argument("--output-dir", default=str(ROOT))
    return parser.parse_args()


def write_rows(path: Path, rows: list[dict]) -> None:
    ensure_directory(path.parent)
    with path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")


def shuffled(rows: list[dict], seed: int) -> list[dict]:
    items = list(rows)
    random.Random(seed).shuffle(items)
    return items


def main() -> None:
    args = parse_args()
    output_dir = Path(args.output_dir).expanduser().resolve()
    ensure_directory(output_dir)

    if args.premium_train_size % 8 != 0 or args.premium_eval_size % 8 != 0:
        raise SystemExit("premium sizes must be divisible by 8 because the premium overlay uses 8 handcrafted recipes")

    if args.premium_train_size >= args.train_size or args.premium_eval_size >= args.eval_size:
        raise SystemExit("premium overlay must be smaller than the final train/eval totals")

    premium_train_variants = args.premium_train_size // 8
    premium_eval_variants = args.premium_eval_size // 8

    base_train_size = args.train_size - args.premium_train_size
    base_eval_size = args.eval_size - args.premium_eval_size

    base_train_rows = generate_rows(base_train_size, args.seed)
    base_eval_rows = generate_rows(base_eval_size, args.seed + 900000)
    premium_train_rows, premium_eval_rows = generate_premium_rows(premium_train_variants, premium_eval_variants, args.seed)

    train_rows = shuffled([*base_train_rows, *premium_train_rows], args.seed + 111)
    eval_rows = shuffled([*base_eval_rows, *premium_eval_rows], args.seed + 222)

    write_rows(output_dir / "train.base.jsonl", base_train_rows)
    write_rows(output_dir / "eval.base.jsonl", base_eval_rows)
    write_rows(output_dir / "train.premium.jsonl", premium_train_rows)
    write_rows(output_dir / "eval.premium.jsonl", premium_eval_rows)
    write_rows(output_dir / "train.jsonl", train_rows)
    write_rows(output_dir / "eval.jsonl", eval_rows)

    print(f"Wrote base train rows: {len(base_train_rows)}")
    print(f"Wrote premium train rows: {len(premium_train_rows)}")
    print(f"Wrote final train rows: {len(train_rows)}")
    print(f"Wrote base eval rows: {len(base_eval_rows)}")
    print(f"Wrote premium eval rows: {len(premium_eval_rows)}")
    print(f"Wrote final eval rows: {len(eval_rows)}")


if __name__ == "__main__":
    main()
