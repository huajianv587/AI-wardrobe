from __future__ import annotations

import argparse
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2] / "data" / "models" / "virtual-tryon"
DEFAULT_REPO = "yisol/IDM-VTON"
DEFAULT_ALLOW_PATTERNS = [
    "*.json",
    "*.yaml",
    "*.yml",
    "*.txt",
    "*.md",
    "*.py",
    "configs/*",
    "ckpt/*",
]


def parse_args():
    parser = argparse.ArgumentParser(description="Download a base virtual try-on model snapshot.")
    parser.add_argument("--repo-id", default=DEFAULT_REPO, help="Hugging Face repo id for the base try-on model.")
    parser.add_argument("--full", action="store_true", help="Download the full repository, including large checkpoints.")
    parser.add_argument("--target", default="", help="Override the local target directory.")
    return parser.parse_args()


def ensure_directory(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def main() -> None:
    args = parse_args()
    try:
        from huggingface_hub import snapshot_download
    except Exception as exc:  # pragma: no cover - optional dependency path
        raise SystemExit(f"huggingface_hub is required before downloading try-on models: {exc}") from exc

    target = Path(args.target).expanduser() if args.target else ROOT / args.repo_id.replace("/", "--")
    ensure_directory(target)
    allow_patterns = None if args.full else DEFAULT_ALLOW_PATTERNS

    snapshot_download(
        repo_id=args.repo_id,
        local_dir=target,
        local_dir_use_symlinks=False,
        allow_patterns=allow_patterns,
    )

    checkpoint_dir = Path(__file__).resolve().parents[2] / "model_training" / "checkpoints" / "virtual-tryon"
    ensure_directory(checkpoint_dir)

    print("[ok] Virtual try-on assets downloaded")
    print(f"  repo:   {args.repo_id}")
    print(f"  target: {target}")
    print(f"  finetune checkpoint dir: {checkpoint_dir}")
    if not args.full:
        print("  note: downloaded config/runtime files only. Re-run with --full to fetch the complete base weights.")


if __name__ == "__main__":
    main()
