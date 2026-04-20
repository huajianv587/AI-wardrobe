from __future__ import annotations

import argparse
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Register the exported AI Wardrobe multimodal dataset in the official Qwen VL finetune repo.")
    parser.add_argument("--qwen-vl-finetune-root", required=True)
    parser.add_argument("--dataset-name", default="ai_wardrobe_multimodal")
    parser.add_argument("--annotation-path", required=True)
    parser.add_argument("--data-path", required=True)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    repo_root = Path(args.qwen_vl_finetune_root).resolve()
    init_path = repo_root / "qwenvl" / "data" / "__init__.py"
    if not init_path.exists():
        raise FileNotFoundError(f"Cannot find Qwen finetune registry file: {init_path}")

    content = init_path.read_text(encoding="utf-8")
    if f'"{args.dataset_name}"' in content:
        print(f"[skip] dataset '{args.dataset_name}' is already registered")
        return

    constant_name = args.dataset_name.upper()
    definition = (
        f"\n{constant_name} = {{\n"
        f'    "annotation_path": "{Path(args.annotation_path).resolve().as_posix()}",\n'
        f'    "data_path": "{Path(args.data_path).resolve().as_posix()}",\n'
        "}\n"
    )

    if "data_dict = {" not in content:
        raise RuntimeError("Unsupported Qwen registry layout: missing 'data_dict = {'")

    data_dict_index = content.index("data_dict = {")
    prefix = content[:data_dict_index]
    suffix = content[data_dict_index:]
    suffix = suffix.replace("data_dict = {\n", f"data_dict = {{\n    \"{args.dataset_name}\": {constant_name},\n", 1)
    updated = prefix + definition + "\n" + suffix
    init_path.write_text(updated, encoding="utf-8")
    print(f"[done] registered dataset '{args.dataset_name}' in {init_path}")


if __name__ == "__main__":
    main()
