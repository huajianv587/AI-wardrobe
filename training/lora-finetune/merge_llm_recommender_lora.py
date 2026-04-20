from __future__ import annotations

import argparse
from pathlib import Path

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Merge a PEFT LoRA adapter into a standalone deployable model directory.")
    parser.add_argument("--adapter-dir", default="model_training/checkpoints/llm-recommender")
    parser.add_argument("--output-dir", default="model_training/checkpoints/llm-recommender-merged")
    parser.add_argument("--dtype", choices=("bf16", "fp16", "fp32"), default="bf16")
    parser.add_argument("--max-shard-size", default="5GB")
    return parser.parse_args()


def resolve_dtype(name: str) -> torch.dtype | None:
    import torch

    if name == "bf16":
        return torch.bfloat16
    if name == "fp16":
        return torch.float16
    return None


def main() -> None:
    args = parse_args()
    try:
        from peft import AutoPeftModelForCausalLM
        from transformers import AutoTokenizer
    except ModuleNotFoundError as exc:
        raise ModuleNotFoundError(
            "Missing merge dependency. Install peft, transformers, and torch before merging LoRA weights."
        ) from exc

    adapter_dir = Path(args.adapter_dir).resolve()
    output_dir = Path(args.output_dir).resolve()
    if not adapter_dir.exists():
        raise FileNotFoundError(f"Missing adapter dir: {adapter_dir}")

    output_dir.mkdir(parents=True, exist_ok=True)
    torch_dtype = resolve_dtype(args.dtype)

    model = AutoPeftModelForCausalLM.from_pretrained(
        adapter_dir,
        trust_remote_code=True,
        torch_dtype=torch_dtype,
        device_map="cpu",
    ).eval()
    merged_model = model.merge_and_unload()
    merged_model.save_pretrained(
        output_dir,
        safe_serialization=True,
        max_shard_size=args.max_shard_size,
    )

    tokenizer = AutoTokenizer.from_pretrained(adapter_dir, trust_remote_code=True)
    tokenizer.save_pretrained(output_dir)
    print(f"[done] merged model saved to {output_dir}")


if __name__ == "__main__":
    main()
