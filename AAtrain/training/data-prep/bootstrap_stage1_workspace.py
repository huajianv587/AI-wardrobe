from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]

DATASET_DIRS = [
    "model_training/datasets/llm-recommender",
    "model_training/datasets/image-processor/test-images",
    "model_training/datasets/multimodal-reader",
    "model_training/datasets/virtual-tryon",
]

CHECKPOINT_DIRS = [
    "model_training/checkpoints/llm-recommender",
    "model_training/checkpoints/image-processor",
    "model_training/checkpoints/multimodal-reader",
    "model_training/checkpoints/virtual-tryon",
]

RAW_SOURCE_DIRS = [
    "model_training/raw-sources/fashioniq",
    "model_training/raw-sources/polyvore",
    "model_training/raw-sources/deepfashion2",
    "model_training/raw-sources/tryon",
]

PUBLIC_SOURCES = {
    "llm_recommender": [
        {
            "name": "FashionIQ",
            "official_url": "https://fashion-iq.github.io/",
            "repo_url": "https://github.com/XiaoxiaoGuo/fashion-iq",
            "purpose": "text-guided fashion phrasing and retrieval-style description patterns",
            "notes": "Use for prompt phrasing and text-image alignment ideas, then convert to product-style JSONL.",
        },
        {
            "name": "Polyvore Outfits",
            "official_url": "https://github.com/xthan/polyvore-dataset",
            "repo_url": "https://github.com/xthan/polyvore-dataset",
            "purpose": "outfit composition and compatibility structure",
            "notes": "Good for composition priors, not enough by itself for your product tone.",
        },
        {
            "name": "DeepFashion2",
            "official_url": "https://github.com/switchablenorms/DeepFashion2",
            "repo_url": "https://github.com/switchablenorms/DeepFashion2",
            "purpose": "garment categories, detection, landmarks, and image-side metadata structure",
            "notes": "Use the official download instructions from the project, not just the repository files.",
        },
    ],
    "multimodal_reader": [
        {
            "name": "Qwen2.5-VL-7B-Instruct",
            "official_url": "https://huggingface.co/Qwen/Qwen2.5-VL-7B-Instruct",
            "repo_url": "https://huggingface.co/Qwen/Qwen2.5-VL-7B-Instruct",
            "purpose": "multimodal attribute extraction base model",
            "notes": "Use for color, fabric, silhouette, and style QA.",
        }
    ],
    "cleanup": [
        {
            "name": "RMBG-2.0",
            "official_url": "https://huggingface.co/briaai/RMBG-2.0",
            "repo_url": "https://huggingface.co/briaai/RMBG-2.0",
            "purpose": "background removal baseline",
            "notes": "Check license before commercial use.",
        }
    ],
    "virtual_tryon": [
        {
            "name": "IDM-VTON",
            "official_url": "https://huggingface.co/yisol/IDM-VTON",
            "repo_url": "https://huggingface.co/yisol/IDM-VTON",
            "purpose": "virtual try-on research baseline",
            "notes": "Check the non-commercial license terms before product deployment.",
        },
        {
            "name": "OOTDiffusion",
            "official_url": "https://github.com/levihsu/OOTDiffusion",
            "repo_url": "https://github.com/levihsu/OOTDiffusion",
            "purpose": "virtual try-on research pipeline",
            "notes": "Treat as research-first unless your legal review clears it.",
        },
    ],
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Bootstrap the AI Wardrobe training workspace for stage-1 and later cloud runs.")
    parser.add_argument("--project-root", default=str(PROJECT_ROOT), help="Override the repository root.")
    parser.add_argument("--generate-seed-llm", action="store_true", help="Generate the seed train.jsonl and eval.jsonl files for llm-recommender.")
    parser.add_argument("--train-size", type=int, default=5200, help="Number of curated train rows to generate when --generate-seed-llm is enabled.")
    parser.add_argument("--eval-size", type=int, default=600, help="Number of curated eval rows to generate when --generate-seed-llm is enabled.")
    parser.add_argument("--download-public-sources", action="store_true", help="Export high-value public fashion metadata and clone lightweight source repositories.")
    parser.add_argument("--download-fashion-models", action="store_true", help="Run backend/scripts/download_fashion_models.py after workspace setup.")
    parser.add_argument("--download-virtual-tryon-base", action="store_true", help="Run backend/scripts/download_virtual_tryon_models.py after workspace setup.")
    parser.add_argument("--virtual-tryon-repo-id", default="yisol/IDM-VTON", help="Base repo id for the virtual try-on download helper.")
    parser.add_argument("--virtual-tryon-full", action="store_true", help="Pass --full to the try-on download helper.")
    return parser.parse_args()


def ensure_directory(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def write_manifest(project_root: Path) -> Path:
    raw_sources_root = project_root / "model_training" / "raw-sources"
    ensure_directory(raw_sources_root)
    payload = {
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "project_root": str(project_root),
        "sources": PUBLIC_SOURCES,
    }
    target = raw_sources_root / "source-manifest.generated.json"
    target.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return target


def write_readme(project_root: Path) -> Path:
    raw_sources_root = project_root / "model_training" / "raw-sources"
    ensure_directory(raw_sources_root)
    lines = [
        "# Training Raw Sources",
        "",
        "This file is generated by `bootstrap_stage1_workspace.py`.",
        "",
        "## Recommended first commands",
        "",
        "### LLM base model",
        "",
        "```bash",
        "hf download Qwen/Qwen2.5-7B-Instruct --local-dir /workspace/models/qwen2.5-7b-instruct",
        "```",
        "",
        "### Multimodal base model",
        "",
        "```bash",
        "hf download Qwen/Qwen2.5-VL-7B-Instruct --local-dir /workspace/models/qwen2.5-vl-7b-instruct",
        "```",
        "",
        "### Local cleanup assets",
        "",
        "```bash",
        "python backend/scripts/download_fashion_models.py",
        "```",
        "",
        "### Public metadata sources",
        "",
        "```bash",
        "python training/data-prep/download_public_sources.py",
        "```",
        "",
        "### Try-on base snapshot",
        "",
        "```bash",
        "python backend/scripts/download_virtual_tryon_models.py --repo-id yisol/IDM-VTON --full",
        "```",
        "",
        "## Public source references",
        "",
    ]
    for group, entries in PUBLIC_SOURCES.items():
        lines.append(f"### {group}")
        lines.append("")
        for entry in entries:
            lines.append(f"- {entry['name']}")
            lines.append(f"  official: {entry['official_url']}")
            lines.append(f"  repo: {entry['repo_url']}")
            lines.append(f"  purpose: {entry['purpose']}")
            lines.append(f"  notes: {entry['notes']}")
        lines.append("")

    target = raw_sources_root / "README.generated.md"
    target.write_text("\n".join(lines), encoding="utf-8")
    return target


def run_script(project_root: Path, relative_script: str, extra_args: list[str] | None = None) -> None:
    command = [sys.executable, str(project_root / relative_script)]
    if extra_args:
        command.extend(extra_args)
    subprocess.run(command, cwd=project_root, check=True)


def bootstrap_workspace(project_root: Path) -> tuple[list[Path], Path, Path]:
    created_dirs: list[Path] = []
    for relative in DATASET_DIRS + CHECKPOINT_DIRS + RAW_SOURCE_DIRS:
        target = project_root / relative
        ensure_directory(target)
        created_dirs.append(target)
    manifest = write_manifest(project_root)
    generated_readme = write_readme(project_root)
    return created_dirs, manifest, generated_readme


def main() -> None:
    args = parse_args()
    project_root = Path(args.project_root).expanduser().resolve()
    created_dirs, manifest, generated_readme = bootstrap_workspace(project_root)

    if args.generate_seed_llm:
        run_script(
            project_root,
            "training/data-prep/build_llm_recommender_corpus.py",
            ["--train-size", str(args.train_size), "--eval-size", str(args.eval_size)],
        )

    if args.download_public_sources:
        run_script(project_root, "training/data-prep/download_public_sources.py")

    if args.download_fashion_models:
        run_script(project_root, "backend/scripts/download_fashion_models.py")

    if args.download_virtual_tryon_base:
        extra_args = ["--repo-id", args.virtual_tryon_repo_id]
        if args.virtual_tryon_full:
            extra_args.append("--full")
        run_script(project_root, "backend/scripts/download_virtual_tryon_models.py", extra_args)

    print("AI Wardrobe training workspace is ready.")
    print()
    print("Created directories:")
    for path in created_dirs:
        print(f"  - {path}")
    print()
    print(f"Manifest: {manifest}")
    print(f"Notes:    {generated_readme}")
    print()
    print("Recommended next steps:")
    print("  1. Review training/data-prep/high-quality-annotation-spec.md before extending labels")
    print("  2. Validate JSONL with training/data-prep/validate_llm_jsonl.py")
    print("  3. Audit dataset quality with training/data-prep/audit_curated_llm_dataset.py")
    print("  4. Train Qwen/Qwen2.5-7B-Instruct with training/lora-finetune/train_llm_recommender.py")
    print("  5. Serve the checkpoint behind an OpenAI-compatible endpoint such as vLLM")


if __name__ == "__main__":
    main()
