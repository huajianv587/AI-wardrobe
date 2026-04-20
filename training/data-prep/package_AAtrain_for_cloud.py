from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import tarfile
import time
from pathlib import Path
from typing import Any, Iterator


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_SOURCE_DIR = PROJECT_ROOT / "AAtrain"
DEFAULT_OUTPUT_DIR = PROJECT_ROOT / "AAtrain-upload-20gb"
DEFAULT_PART_SIZE_BYTES = 20_000_000_000
SAFETY_MARGIN_BYTES = 256 * 1024 * 1024
PROGRESS_EVERY = 10_000


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Package AAtrain as standalone tar parts for cloud uploads.")
    parser.add_argument("--source-dir", type=Path, default=DEFAULT_SOURCE_DIR)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--prefix", default="AAtrain-full")
    parser.add_argument("--part-size-bytes", type=int, default=DEFAULT_PART_SIZE_BYTES)
    parser.add_argument("--part-size-gb", type=float, default=0.0, help="Convenience override for decimal GB sizing.")
    parser.add_argument(
        "--safety-margin-bytes",
        type=int,
        default=SAFETY_MARGIN_BYTES,
        help="Keep this much headroom below the nominal cloud limit for each standalone tar part.",
    )
    parser.add_argument("--append", action="store_true", help="Keep existing part files and continue packing.")
    parser.add_argument("--start-entry-index", type=int, default=1, help="1-based entry index to start from.")
    parser.add_argument("--start-part-index", type=int, default=1, help="1-based part index for the first new part.")
    parser.add_argument("--max-parts", type=int, default=0, help="Stop after creating this many new parts. 0 means unlimited.")
    return parser.parse_args()


def ensure_directory(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    return path


def relative_to_project(path: Path) -> str:
    try:
        return str(path.relative_to(PROJECT_ROOT))
    except ValueError:
        return str(path)


def write_json(path: Path, payload: dict[str, Any]) -> None:
    ensure_directory(path.parent)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def write_text(path: Path, content: str) -> None:
    ensure_directory(path.parent)
    path.write_text(content, encoding="utf-8")


def iter_sorted_paths(root: Path) -> Iterator[Path]:
    yield root
    for dirpath, dirnames, filenames in os.walk(root):
        current = Path(dirpath)
        dirnames.sort(key=str.lower)
        filenames.sort(key=str.lower)
        for name in dirnames:
            yield current / name
        for name in filenames:
            yield current / name


def estimate_tar_entry_bytes(path: Path) -> int:
    if path.is_dir():
        return 512
    size = path.stat().st_size
    return 512 + (((size + 511) // 512) * 512)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while True:
            chunk = handle.read(8 * 1024 * 1024)
            if not chunk:
                break
            digest.update(chunk)
    return digest.hexdigest()


def collect_existing_parts(output_dir: Path, prefix: str) -> list[dict[str, Any]]:
    parts: list[dict[str, Any]] = []
    for path in sorted(output_dir.glob(f"{prefix}.tar.part*")):
        parts.append(
            {
                "name": path.name,
                "path": str(path),
                "bytes": path.stat().st_size,
                "sha256": sha256_file(path),
                "entry_count": None,
            }
        )
    return parts


class PartArchive:
    def __init__(
        self,
        output_dir: Path,
        prefix: str,
        part_index: int,
        source_dir: Path,
        soft_limit_bytes: int,
    ) -> None:
        self.output_dir = output_dir
        self.prefix = prefix
        self.part_index = part_index
        self.source_dir = source_dir
        self.root_parent = source_dir.parent
        self.soft_limit_bytes = soft_limit_bytes
        self.path = self.output_dir / f"{self.prefix}.tar.part{self.part_index:03d}"
        print(f"[pack] opening {self.path.name}")
        self.file = self.path.open("wb")
        self.tar = tarfile.open(fileobj=self.file, mode="w", format=tarfile.PAX_FORMAT)
        self.seen_dirs: set[str] = set()
        self.estimated_bytes = 0
        self.entry_count = 0
        self._ensure_directory(self.source_dir)

    def _ensure_directory(self, path: Path) -> None:
        current = path
        missing: list[Path] = []
        while True:
            arcname = current.relative_to(self.root_parent).as_posix()
            if arcname in self.seen_dirs:
                break
            missing.append(current)
            if current == self.source_dir:
                break
            current = current.parent

        for directory in reversed(missing):
            arcname = directory.relative_to(self.root_parent).as_posix()
            self.tar.add(directory, arcname=arcname, recursive=False)
            self.seen_dirs.add(arcname)
            self.estimated_bytes += 512

    def _missing_parent_bytes(self, path: Path) -> int:
        total = 0
        current = path.parent if path.is_file() else path
        while True:
            arcname = current.relative_to(self.root_parent).as_posix()
            if arcname in self.seen_dirs:
                break
            total += 512
            if current == self.source_dir:
                break
            current = current.parent
        return total

    def can_fit(self, path: Path) -> bool:
        extra_bytes = estimate_tar_entry_bytes(path) + self._missing_parent_bytes(path) + 1024
        return self.estimated_bytes + extra_bytes <= self.soft_limit_bytes

    def add_path(self, path: Path) -> None:
        if path != self.source_dir:
            self._ensure_directory(path.parent if path.is_file() else path)

        arcname = path.relative_to(self.root_parent).as_posix()
        if path.is_dir():
            if arcname in self.seen_dirs:
                return
            self.tar.add(path, arcname=arcname, recursive=False)
            self.seen_dirs.add(arcname)
            self.estimated_bytes += 512
        else:
            self.tar.add(path, arcname=arcname, recursive=False)
            self.estimated_bytes += estimate_tar_entry_bytes(path)

        self.entry_count += 1

    def close(self) -> dict[str, Any]:
        self.tar.close()
        self.file.flush()
        self.file.close()
        actual_bytes = self.path.stat().st_size
        record = {
            "name": self.path.name,
            "path": str(self.path),
            "bytes": actual_bytes,
            "sha256": sha256_file(self.path),
            "entry_count": self.entry_count,
        }
        print(f"[pack] closed {self.path.name} bytes={actual_bytes} entries={self.entry_count}")
        return record


def build_upload_readme(output_dir: Path, manifest: dict[str, Any]) -> None:
    parts = manifest["parts"]
    content = [
        "# AAtrain Upload Pack",
        "",
        f"- Generated at: `{manifest['generated_at']}`",
        f"- Source dir: `{manifest['source_dir']}`",
        f"- Part count: `{len(parts)}`",
        f"- Part size target: `{manifest['part_size_bytes']}` bytes",
        f"- Safety margin: `{manifest['safety_margin_bytes']}` bytes",
        f"- Max intended per-part payload: `{manifest['soft_limit_bytes']}` bytes",
        f"- Total packed bytes: `{manifest['total_bytes']}`",
        "",
        "## Upload Advice",
        "",
        "- Upload all `.tar.partNNN` files into the same cloud folder.",
        "- Upload `manifest.generated.json`, `sha256sums.generated.txt`, and `extract_on_linux.generated.sh` together.",
        "- Keep the upload pack on your cloud disk when possible, then extract the working `AAtrain` directory onto a 400GB local/external SSD mount.",
        "",
        "## Extract On Linux",
        "",
        "```bash",
        "cd /mnt/external-disk/AAtrain-upload-20gb",
        "sha256sum -c sha256sums.generated.txt",
        "mkdir -p /mnt/external-disk",
        "for part in $(ls AAtrain-full.tar.part* | sort); do",
        "  tar -xf \"$part\" -C /mnt/external-disk",
        "done",
        "cd /mnt/external-disk/AAtrain",
        "bash training/lora-finetune/run-5090-full-stack.generated.sh",
        "```",
        "",
        "## Notes",
        "",
        "- Each `partNNN` file is a standalone TAR archive under the cloud upload limit.",
        "- Extract the parts one by one in filename order.",
        "- Directory entries can repeat across parts; this is expected and harmless.",
        "",
    ]
    write_text(output_dir / "README.generated.md", "\n".join(content))


def build_linux_extract_script(output_dir: Path, manifest: dict[str, Any]) -> None:
    content = "\n".join(
        [
            "#!/usr/bin/env bash",
            "set -euo pipefail",
            'TARGET_DIR="${1:-/root/autodl-tmp}"',
            'SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"',
            'cd "${SCRIPT_DIR}"',
            'sha256sum -c sha256sums.generated.txt',
            'mkdir -p "${TARGET_DIR}"',
            'for part in $(ls ' + manifest["prefix"] + '.tar.part* | sort); do',
            '  tar -xf "${part}" -C "${TARGET_DIR}"',
            'done',
            'echo "[ok] extracted into ${TARGET_DIR}"',
        ]
    )
    script_path = output_dir / "extract_on_linux.generated.sh"
    write_text(script_path, content)
    script_path.chmod(0o755)


def build_sha256_file(output_dir: Path, manifest: dict[str, Any]) -> None:
    lines = [f"{part['sha256']}  {part['name']}" for part in manifest["parts"]]
    write_text(output_dir / "sha256sums.generated.txt", "\n".join(lines) + "\n")


def build_manifest(
    output_dir: Path,
    source_dir: Path,
    prefix: str,
    part_size_bytes: int,
    safety_margin_bytes: int,
    parts: list[dict[str, Any]],
) -> dict[str, Any]:
    manifest = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "source_dir": relative_to_project(source_dir),
        "output_dir": relative_to_project(output_dir),
        "prefix": prefix,
        "format": "standalone-tar-parts",
        "part_size_bytes": part_size_bytes,
        "safety_margin_bytes": safety_margin_bytes,
        "soft_limit_bytes": part_size_bytes - safety_margin_bytes,
        "total_bytes": sum(part["bytes"] for part in parts),
        "parts": parts,
    }
    write_json(output_dir / "manifest.generated.json", manifest)
    build_sha256_file(output_dir, manifest)
    build_upload_readme(output_dir, manifest)
    build_linux_extract_script(output_dir, manifest)
    return manifest


def main() -> None:
    args = parse_args()
    source_dir = args.source_dir.resolve()
    if not source_dir.exists():
        raise FileNotFoundError(f"Missing source dir: {source_dir}")

    part_size_bytes = int(args.part_size_gb * 1_000_000_000) if args.part_size_gb > 0 else args.part_size_bytes
    if part_size_bytes <= args.safety_margin_bytes:
        raise ValueError("part size must be larger than the safety margin")

    output_dir = args.output_dir.resolve()
    if output_dir.exists() and not args.append:
        shutil.rmtree(output_dir)
    ensure_directory(output_dir)

    parts: list[dict[str, Any]] = collect_existing_parts(output_dir, args.prefix) if args.append else []
    soft_limit_bytes = part_size_bytes - args.safety_margin_bytes

    processed = 0
    created_parts = 0
    archive = PartArchive(
        output_dir=output_dir,
        prefix=args.prefix,
        part_index=args.start_part_index,
        source_dir=source_dir,
        soft_limit_bytes=soft_limit_bytes,
    )

    for path in iter_sorted_paths(source_dir):
        processed += 1
        if processed < args.start_entry_index:
            continue

        arcname = path.relative_to(source_dir.parent).as_posix()
        if processed <= 10 or processed % PROGRESS_EVERY == 0:
            print(f"[pack] add #{processed}: {arcname}")

        if path != source_dir and archive.entry_count > 0 and not archive.can_fit(path):
            parts.append(archive.close())
            created_parts += 1

            if args.max_parts > 0 and created_parts >= args.max_parts:
                state = {
                    "resume_at_entry_index": processed,
                    "next_part_index": args.start_part_index + created_parts,
                    "created_parts_this_run": created_parts,
                    "existing_parts_total": len(parts),
                }
                write_json(output_dir / "resume.generated.json", state)
                print(json.dumps(state, ensure_ascii=False, indent=2))
                return

            archive = PartArchive(
                output_dir=output_dir,
                prefix=args.prefix,
                part_index=args.start_part_index + created_parts,
                source_dir=source_dir,
                soft_limit_bytes=soft_limit_bytes,
            )

        archive.add_path(path)

    parts.append(archive.close())
    manifest = build_manifest(
        output_dir=output_dir,
        source_dir=source_dir,
        prefix=args.prefix,
        part_size_bytes=part_size_bytes,
        safety_margin_bytes=args.safety_margin_bytes,
        parts=parts,
    )
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
