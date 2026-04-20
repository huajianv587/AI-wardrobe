from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import tarfile
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable


SCRIPT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_SOURCE_DIR = SCRIPT_ROOT / "AAtrain" if (SCRIPT_ROOT / "AAtrain").is_dir() else SCRIPT_ROOT
PROGRESS_EVERY = 10_000


@dataclass(frozen=True)
class Stage:
    name: str
    description: str
    paths: tuple[str, ...]
    injections: tuple[tuple[str, str], ...] = ()


STAGES: tuple[Stage, ...] = (
    Stage(
        name="stage0-code-llm",
        description="Code, docs, services, and llm-recommender data.",
        paths=(
            "README.generated.md",
            "5090-HANDOFF.generated.md",
            "bundle-report.generated.json",
            "training",
            "ai-services",
            "docs",
            "logs",
            "model_training/README.md",
            "model_training/datasets/llm-recommender",
        ),
        injections=(
            (
                "training/data-prep/package_AAtrain_staged_for_autodl.py",
                "training/data-prep/package_AAtrain_staged_for_autodl.py",
            ),
            (
                "training/lora-finetune/run-530g-autodl-pipeline.sh",
                "training/lora-finetune/run-530g-autodl-pipeline.sh",
            ),
            ("docs/autodl-530g-pipeline.md", "docs/autodl-530g-pipeline.md"),
        ),
    ),
    Stage(
        name="stage1-multimodal-reader",
        description="Multimodal-reader JSONL/images and Qwen export files.",
        paths=(
            "model_training/datasets/multimodal-reader",
            "model_training/exports/multimodal-reader-qwen",
        ),
    ),
    Stage(
        name="stage2-virtual-tryon",
        description="VITON-HD raw extracted data plus organized virtual try-on manifests.",
        paths=(
            "model_training/raw-sources/tryon/viton-hd/extracted",
            "model_training/datasets/virtual-tryon",
        ),
    ),
    Stage(
        name="stage3-image-public",
        description="Fashionpedia, DeepFashion2, DeepFashion-MultiModal, and image-processor bootstrap data.",
        paths=(
            "model_training/datasets/image-processor",
            "model_training/datasets/deepfashion2",
            "model_training/datasets/deepfashion-multimodal",
            "model_training/raw-sources/fashionpedia-official",
            "model_training/raw-sources/deepfashion2",
            "model_training/raw-sources/deepfashion-multimodal",
            "model_training/raw-sources/deepfashion2-download-report.generated.json",
            "model_training/raw-sources/deepfashion-multimodal-download-report.generated.json",
            "model_training/raw-sources/vision-bootstrap-download-report.generated.json",
        ),
    ),
    Stage(
        name="stage4-shift15m",
        description="SHIFT15M raw assets and organized records.",
        paths=(
            "model_training/datasets/shift15m",
            "model_training/raw-sources/shift15m",
            "model_training/raw-sources/shift15m-repo",
            "model_training/raw-sources/shift15m-download-report.generated.json",
        ),
    ),
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build staged uncompressed TAR files for 530G AutoDL training.")
    parser.add_argument("--source-dir", type=Path, default=DEFAULT_SOURCE_DIR)
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=None,
        help="Defaults to <source-dir-parent>/AAtrain-staged-upload.",
    )
    parser.add_argument(
        "--stages",
        default="all",
        help="Comma-separated stage names, or 'all'. Example: stage0-code-llm,stage1-multimodal-reader",
    )
    parser.add_argument("--dry-run", action="store_true", help="Only report stage sizes; do not create tar files.")
    parser.add_argument("--fresh", action="store_true", help="Delete and recreate the output directory first.")
    parser.add_argument("--overwrite", action="store_true", help="Overwrite existing stage tar files.")
    parser.add_argument("--reuse-existing", action="store_true", help="Reuse an existing stage TAR instead of rebuilding it.")
    parser.add_argument("--keep-going", action="store_true", help="Warn on missing stage paths instead of failing.")
    parser.add_argument(
        "--tar-engine",
        choices=("system", "python"),
        default="system",
        help="Use the system tar command when possible; fall back to Python tar when injections require renamed entries.",
    )
    parser.add_argument(
        "--in-place-prune",
        action="store_true",
        help=(
            "Write staged tar files into <source-dir>/staged-tars, skip stage0 by default, "
            "and delete each stage's source paths after tar readability verification."
        ),
    )
    return parser.parse_args()


def ensure_directory(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    return path


def safe_reset_directory(path: Path, allowed_parent: Path) -> None:
    resolved = path.resolve()
    parent = allowed_parent.resolve()
    if resolved == parent or parent not in resolved.parents:
        raise ValueError(f"Refusing to delete outside expected output parent: {resolved}")
    if resolved.exists():
        shutil.rmtree(resolved)
    resolved.mkdir(parents=True, exist_ok=True)


def select_stages(raw: str) -> list[Stage]:
    if raw.strip().lower() == "all":
        return list(STAGES)
    requested = {item.strip() for item in raw.split(",") if item.strip()}
    stage_by_name = {stage.name: stage for stage in STAGES}
    unknown = sorted(requested - set(stage_by_name))
    if unknown:
        raise ValueError(f"Unknown stage name(s): {', '.join(unknown)}")
    return [stage for stage in STAGES if stage.name in requested]


def select_in_place_stages(raw: str) -> list[Stage]:
    if raw.strip().lower() == "all":
        return [stage for stage in STAGES if stage.name != "stage0-code-llm"]
    selected = select_stages(raw)
    blocked = [stage.name for stage in selected if stage.name == "stage0-code-llm"]
    if blocked:
        raise ValueError("stage0-code-llm must stay expanded for in-place AAtrain uploads.")
    return selected


def compact_paths(paths: Iterable[Path]) -> list[Path]:
    compacted: list[Path] = []
    for candidate in sorted(dict.fromkeys(paths), key=lambda item: (len(item.parts), item.as_posix().lower())):
        if any(existing == candidate or existing in candidate.parents for existing in compacted):
            continue
        compacted.append(candidate)
    return compacted


def resolve_stage_paths(source_dir: Path, stage: Stage, keep_going: bool) -> list[Path]:
    resolved: list[Path] = []
    missing: list[str] = []
    for raw_path in stage.paths:
        path = source_dir / raw_path
        if path.exists():
            resolved.append(path)
        else:
            missing.append(raw_path)
    if missing and not keep_going:
        raise FileNotFoundError(f"{stage.name} is missing required path(s): {', '.join(missing)}")
    for path in missing:
        print(f"[warn] {stage.name}: missing {path}")
    return compact_paths(resolved)


def summarize_stage(paths: list[Path]) -> dict[str, int]:
    file_count = 0
    byte_count = 0
    directory_count = 0
    for path in paths:
        if path.is_file():
            file_count += 1
            byte_count += path.stat().st_size
            continue
        for dirpath, dirnames, filenames in os.walk(path):
            dirnames.sort(key=str.lower)
            filenames.sort(key=str.lower)
            directory_count += 1
            current = Path(dirpath)
            for filename in filenames:
                file_count += 1
                byte_count += (current / filename).stat().st_size
    return {
        "files": file_count,
        "directories": directory_count,
        "bytes": byte_count,
    }


def resolve_injections(source_dir: Path, stage: Stage) -> list[tuple[Path, str]]:
    injections: list[tuple[Path, str]] = []
    for source_rel, dest_rel in stage.injections:
        source = SCRIPT_ROOT / source_rel
        dest = source_dir / dest_rel
        if not source.exists() or dest.exists():
            continue
        injections.append((source, f"{source_dir.name}/{Path(dest_rel).as_posix()}"))
    return injections


def sync_stage0_injections_into_source(source_dir: Path) -> list[dict[str, str]]:
    synced: list[dict[str, str]] = []
    stage0 = next(stage for stage in STAGES if stage.name == "stage0-code-llm")
    for source_rel, dest_rel in stage0.injections:
        source = SCRIPT_ROOT / source_rel
        dest = source_dir / dest_rel
        if not source.exists():
            continue
        ensure_directory(dest.parent)
        if source.resolve() != dest.resolve():
            shutil.copy2(source, dest)
            synced.append({"source": str(source), "dest": dest.relative_to(source_dir).as_posix()})
            print(f"[sync] {source} -> {dest}")
    return synced


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while True:
            chunk = handle.read(8 * 1024 * 1024)
            if not chunk:
                break
            digest.update(chunk)
    return digest.hexdigest()


def verify_tar_readable(path: Path) -> dict[str, Any]:
    if not path.exists() or path.stat().st_size <= 0:
        raise RuntimeError(f"Tar file is missing or empty: {path}")

    started = time.time()
    result = subprocess.run(
        ["tar", "-tf", str(path)],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
        text=True,
        check=False,
    )
    elapsed_seconds = round(time.time() - started, 2)
    stderr = result.stderr.strip()
    if result.returncode != 0 or "Truncated input file" in stderr or "Error exit delayed" in stderr:
        raise RuntimeError(f"tar -tf failed for {path}: {result.stderr.strip()}")
    return {"tar_list_check": "ok", "tar_list_elapsed_seconds": elapsed_seconds}


def add_path_to_tar(tar: tarfile.TarFile, source_dir: Path, path: Path, counter: dict[str, int]) -> None:
    arcname = path.relative_to(source_dir.parent).as_posix()
    tar.add(path, arcname=arcname, recursive=False)
    counter["entries"] += 1

    if path.is_dir():
        for dirpath, dirnames, filenames in os.walk(path):
            dirnames.sort(key=str.lower)
            filenames.sort(key=str.lower)
            current = Path(dirpath)
            if current != path:
                tar.add(current, arcname=current.relative_to(source_dir.parent).as_posix(), recursive=False)
                counter["entries"] += 1
            for filename in filenames:
                file_path = current / filename
                tar.add(file_path, arcname=file_path.relative_to(source_dir.parent).as_posix(), recursive=False)
                counter["entries"] += 1
                if counter["entries"] % PROGRESS_EVERY == 0:
                    print(f"[pack] {counter['stage']} entries={counter['entries']} latest={file_path}")


def add_source_root_entry(tar: tarfile.TarFile, source_dir: Path, counter: dict[str, int]) -> None:
    tar.add(source_dir, arcname=source_dir.name, recursive=False)
    counter["entries"] += 1


def add_injections_to_tar(tar: tarfile.TarFile, injections: list[tuple[Path, str]], counter: dict[str, int]) -> None:
    for source, arcname in injections:
        tar.add(source, arcname=arcname, recursive=False)
        counter["entries"] += 1
        print(f"[pack] injected {source} -> {arcname}")


def write_json(path: Path, payload: dict[str, Any]) -> None:
    ensure_directory(path.parent)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def write_text(path: Path, content: str) -> None:
    ensure_directory(path.parent)
    path.write_text(content, encoding="utf-8")


def build_stage_tar(
    source_dir: Path,
    output_dir: Path,
    stage: Stage,
    paths: list[Path],
    injections: list[tuple[Path, str]],
    overwrite: bool,
    tar_engine: str,
) -> dict[str, Any]:
    tar_path = output_dir / f"{stage.name}.tar"
    if tar_path.exists() and not overwrite:
        raise FileExistsError(f"{tar_path} already exists. Use --overwrite or --fresh.")
    if tar_path.exists():
        tar_path.unlink()

    print(f"[pack] opening {tar_path}")
    counter = {"stage": stage.name, "entries": 0}
    if tar_engine == "system" and not injections:
        archive_paths = [path.relative_to(source_dir.parent).as_posix() for path in paths]
        result = subprocess.run(
            ["tar", "-cf", str(tar_path), *archive_paths],
            cwd=source_dir.parent,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            check=False,
        )
        if result.returncode != 0:
            if tar_path.exists():
                tar_path.unlink()
            raise RuntimeError(f"system tar failed for {stage.name}: {result.stderr.strip()}")
        counter["entries"] = None
    else:
        with tarfile.open(tar_path, mode="w", format=tarfile.PAX_FORMAT) as tar:
            add_source_root_entry(tar, source_dir, counter)
            for path in paths:
                add_path_to_tar(tar, source_dir, path, counter)
            add_injections_to_tar(tar, injections, counter)

    digest = sha256_file(tar_path)
    record = {
        "name": stage.name,
        "description": stage.description,
        "tar": tar_path.name,
        "bytes": tar_path.stat().st_size,
        "sha256": digest,
        "tar_entries": counter["entries"],
        "tar_engine": "system" if tar_engine == "system" and not injections else "python",
        "paths": [path.relative_to(source_dir).as_posix() for path in paths],
        "injections": [{"source": str(source), "dest": arcname} for source, arcname in injections],
    }
    print(f"[pack] closed {tar_path.name} bytes={record['bytes']} sha256={digest}")
    return record


def reuse_stage_tar(output_dir: Path, stage: Stage) -> dict[str, Any]:
    tar_path = output_dir / f"{stage.name}.tar"
    if not tar_path.exists():
        raise FileNotFoundError(f"Cannot reuse missing tar: {tar_path}")
    digest = sha256_file(tar_path)
    record = {
        "name": stage.name,
        "description": stage.description,
        "tar": tar_path.name,
        "bytes": tar_path.stat().st_size,
        "sha256": digest,
        "tar_entries": None,
        "tar_engine": "reused-existing",
        "paths": list(stage.paths),
        "injections": [],
        "reused_existing_tar": True,
    }
    print(f"[reuse] {tar_path.name} bytes={record['bytes']} sha256={digest}")
    return record


def assert_inside_source(source_dir: Path, path: Path) -> Path:
    resolved_source = source_dir.resolve()
    resolved = path.resolve()
    if resolved == resolved_source or resolved_source not in resolved.parents:
        raise ValueError(f"Refusing to delete outside source dir: {resolved}")
    return resolved


def prune_stage_paths(source_dir: Path, paths: list[Path]) -> list[dict[str, Any]]:
    deleted: list[dict[str, Any]] = []
    for path in paths:
        if not path.exists():
            deleted.append({"path": path.relative_to(source_dir).as_posix(), "status": "already-missing"})
            continue
        resolved = assert_inside_source(source_dir, path)
        rel = path.relative_to(source_dir).as_posix()
        if path.is_dir():
            shutil.rmtree(resolved)
            kind = "directory"
        else:
            resolved.unlink()
            kind = "file"
        deleted.append({"path": rel, "status": "deleted", "kind": kind})
        print(f"[prune] deleted {rel}")
    return deleted


def build_readme(output_dir: Path, manifest: dict[str, Any]) -> None:
    lines = [
        "# AAtrain Staged AutoDL Upload",
        "",
        "Upload this folder as part of `AAtrain`. Extract each stage TAR on AutoDL only when that training stage needs it.",
        "",
        "## Files",
        "",
        "| Stage | TAR | Size (GB) | Purpose |",
        "|---|---:|---:|---|",
    ]
    for stage in manifest["stages"]:
        size_gb = stage["bytes"] / 1_000_000_000
        lines.append(f"| `{stage['name']}` | `{stage['tar']}` | {size_gb:.2f} | {stage['description']} |")

    lines.extend(
        [
            "",
            "## AutoDL Extract Pattern",
            "",
            "```bash",
            "cd /root/autodl-tmp/AAtrain",
            "bash training/lora-finetune/run-530g-autodl-pipeline.sh prepare-stage1",
            "```",
            "",
            "LLM data stays expanded. Stage TAR files are authoritative copies for later-stage datasets.",
            "",
        ]
    )
    write_text(output_dir / "README.generated.md", "\n".join(lines))


def build_sha256_file(output_dir: Path, stage_records: list[dict[str, Any]]) -> None:
    lines = [f"{record['sha256']}  {record['tar']}" for record in stage_records]
    write_text(output_dir / "sha256sums.generated.txt", "\n".join(lines) + "\n")


def persist_outputs(output_dir: Path, manifest: dict[str, Any], records: list[dict[str, Any]]) -> None:
    write_json(output_dir / "manifest.generated.json", manifest)
    build_sha256_file(output_dir, records)
    build_readme(output_dir, manifest)


def build_manifest_payload(source_dir: Path, output_dir: Path, records: list[dict[str, Any]], in_place_prune: bool) -> dict[str, Any]:
    return {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "source_dir": str(source_dir),
        "output_dir": str(output_dir),
        "format": "in-place-staged-uncompressed-tar" if in_place_prune else "staged-uncompressed-tar",
        "notes": [
            "Do not zip these stages.",
            "LLM data and project code stay expanded.",
            "Extract stage tar files just before their training lane needs them.",
            "Do not delete these tar files until the cloud upload is complete and verified.",
        ],
        "stages": records,
    }


def load_existing_records(output_dir: Path, selected_stage_names: set[str]) -> list[dict[str, Any]]:
    manifest_path = output_dir / "manifest.generated.json"
    if not manifest_path.exists():
        return []
    try:
        payload = json.loads(manifest_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return []
    stages = payload.get("stages")
    if not isinstance(stages, list):
        return []
    return [stage for stage in stages if isinstance(stage, dict) and stage.get("name") not in selected_stage_names]


def main() -> None:
    args = parse_args()
    source_dir = args.source_dir.resolve()
    if not source_dir.exists():
        raise FileNotFoundError(f"Missing source dir: {source_dir}")

    output_dir_default = source_dir / "staged-tars" if args.in_place_prune else source_dir.parent / "AAtrain-staged-upload"
    output_dir = (args.output_dir or output_dir_default).resolve()
    if args.in_place_prune and source_dir.resolve() not in output_dir.parents:
        raise ValueError(f"In-place prune output dir must be inside source dir: {output_dir}")
    if args.dry_run:
        pass
    elif args.fresh:
        safe_reset_directory(output_dir, source_dir.parent)
    else:
        ensure_directory(output_dir)

    synced_files: list[dict[str, str]] = []
    if args.in_place_prune and not args.dry_run:
        synced_files = sync_stage0_injections_into_source(source_dir)

    selected_stages = select_in_place_stages(args.stages) if args.in_place_prune else select_stages(args.stages)
    selected_names = {stage.name for stage in selected_stages}
    records: list[dict[str, Any]] = [] if args.dry_run else load_existing_records(output_dir, selected_names)
    for stage in selected_stages:
        paths = resolve_stage_paths(source_dir, stage, keep_going=args.keep_going)
        injections = resolve_injections(source_dir, stage)
        summary = summarize_stage(paths)
        for injected_source, _ in injections:
            summary["files"] += 1
            summary["bytes"] += injected_source.stat().st_size
        record: dict[str, Any] = {
            "name": stage.name,
            "description": stage.description,
            "paths": [path.relative_to(source_dir).as_posix() for path in paths],
            "injections": [{"source": str(source), "dest": arcname} for source, arcname in injections],
            **summary,
        }
        if args.dry_run:
            print(
                f"[dry-run] {stage.name}: files={summary['files']} "
                f"dirs={summary['directories']} GB={summary['bytes'] / 1_000_000_000:.2f}"
            )
        else:
            tar_path = output_dir / f"{stage.name}.tar"
            if args.reuse_existing and tar_path.exists() and not args.overwrite:
                record.update(reuse_stage_tar(output_dir, stage))
            else:
                record.update(
                    build_stage_tar(
                        source_dir,
                        output_dir,
                        stage,
                        paths,
                        injections,
                        overwrite=args.overwrite,
                        tar_engine=args.tar_engine,
                    )
                )
            record.update(verify_tar_readable(output_dir / record["tar"]))
            if args.in_place_prune:
                record["pruned_paths"] = prune_stage_paths(source_dir, paths)
        records.append(record)
        if not args.dry_run:
            manifest = build_manifest_payload(source_dir, output_dir, records, args.in_place_prune)
            if synced_files:
                manifest["synced_files"] = synced_files
            persist_outputs(output_dir, manifest, records)

    manifest = build_manifest_payload(source_dir, output_dir, records, args.in_place_prune)
    if synced_files:
        manifest["synced_files"] = synced_files
    if not args.dry_run:
        persist_outputs(output_dir, manifest, records)
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
