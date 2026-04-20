from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import tarfile
import time
import zipfile
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[2]
RAW_ROOT = PROJECT_ROOT / "model_training" / "raw-sources"
DATASETS_ROOT = PROJECT_ROOT / "model_training" / "datasets"
DEFAULT_AATRAIN_DIR = PROJECT_ROOT / "AAtrain"

DEEPMM_FILES = ("image.zip", "parsing.zip", "keypoints.zip", "densepose.zip", "labels.zip", "textual_descriptions.json")
DEEPFASHION2_FILES = ("train.zip", "validation.zip", "test.zip", "json_for_validation.zip")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Prepare a portable AAtrain bundle for the 5090 training machine.")
    parser.add_argument("--aatrain-dir", type=Path, default=DEFAULT_AATRAIN_DIR)
    parser.add_argument("--use-hardlinks", action="store_true", default=True)
    parser.add_argument("--deepfashion2-password", default=os.getenv("DEEPFASHION2_UNZIP_PASSWORD"))
    parser.add_argument("--fresh", action="store_true", help="Delete any existing AAtrain directory before rebuilding it.")
    parser.add_argument(
        "--full-research-assets",
        action="store_true",
        help="Also mirror large raw research datasets such as DeepFashion-MultiModal, DeepFashion2, and SHIFT15M.",
    )
    parser.add_argument(
        "--rebuild-organized-datasets",
        action="store_true",
        help="Recompute organized research dataset manifests even if cached stats already exist.",
    )
    return parser.parse_args()


def ensure_directory(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    return path


def reset_directory(path: Path) -> Path:
    if path.exists():
        shutil.rmtree(path)
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


def write_jsonl(path: Path, rows: list[dict[str, Any]]) -> None:
    ensure_directory(path.parent)
    with path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")


def load_cached_report(path: Path) -> dict[str, Any] | None:
    if not path.exists():
        return None
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return None
    return payload if isinstance(payload, dict) else None


def count_jsonl_rows(path: Path) -> int:
    if not path.exists():
        return 0
    with path.open("r", encoding="utf-8") as handle:
        return sum(1 for _ in handle if _.strip())


def extract_zip_once(archive_path: Path, destination: Path, password: str | None = None) -> dict[str, Any]:
    sentinel = destination / ".extracted.ok"
    if sentinel.exists():
        return {"archive": relative_to_project(archive_path), "output_dir": relative_to_project(destination), "skipped": True}

    ensure_directory(destination)
    with zipfile.ZipFile(archive_path) as handle:
        if password:
            handle.extractall(destination, pwd=password.encode("utf-8"))
        else:
            handle.extractall(destination)
    sentinel.write_text("ok", encoding="utf-8")
    return {"archive": relative_to_project(archive_path), "output_dir": relative_to_project(destination), "skipped": False}


def extract_tar_once(archive_path: Path, destination: Path) -> dict[str, Any]:
    sentinel = destination / ".extracted.ok"
    if sentinel.exists():
        return {"archive": relative_to_project(archive_path), "output_dir": relative_to_project(destination), "skipped": True}

    ensure_directory(destination)
    with tarfile.open(archive_path, "r:gz") as handle:
        handle.extractall(destination)
    sentinel.write_text("ok", encoding="utf-8")
    return {"archive": relative_to_project(archive_path), "output_dir": relative_to_project(destination), "skipped": False}


def parse_numeric_table(path: Path | None) -> dict[str, list[int]]:
    mapping: dict[str, list[int]] = {}
    if not path or not path.exists():
        return mapping
    with path.open("r", encoding="utf-8", errors="ignore") as handle:
        for line in handle:
            parts = line.strip().split()
            if len(parts) < 2:
                continue
            mapping[parts[0]] = [int(item) for item in parts[1:] if item.lstrip("-").isdigit()]
    return mapping


def parse_text_descriptions(path: Path | None) -> dict[str, list[str]]:
    if not path or not path.exists():
        return {}
    payload = json.loads(path.read_text(encoding="utf-8"))
    mapping: dict[str, list[str]] = {}
    if isinstance(payload, dict):
        for key, value in payload.items():
            if isinstance(value, str) and value.strip():
                mapping[str(key)] = [value.strip()]
            elif isinstance(value, list):
                mapping[str(key)] = [item.strip() for item in value if isinstance(item, str) and item.strip()]
            elif isinstance(value, dict):
                for field in ("descriptions", "description", "captions", "caption", "texts", "text"):
                    if field in value:
                        nested = value[field]
                        if isinstance(nested, str):
                            mapping[str(key)] = [nested.strip()]
                        elif isinstance(nested, list):
                            mapping[str(key)] = [item.strip() for item in nested if isinstance(item, str) and item.strip()]
                        break
    return mapping


def deterministic_split(sample_id: str) -> str:
    bucket = int(hashlib.md5(sample_id.encode("utf-8")).hexdigest()[:8], 16) % 10
    return "eval" if bucket == 0 else "train"


def stream_array_json_to_jsonl(input_path: Path, output_path: Path, source_name: str) -> int:
    decoder = json.JSONDecoder()
    buffer = ""
    started = False
    finished = False
    count = 0

    ensure_directory(output_path.parent)
    with input_path.open("r", encoding="utf-8") as source, output_path.open("w", encoding="utf-8") as sink:
        while True:
            chunk = source.read(1024 * 1024)
            if chunk:
                buffer += chunk
            pos = 0
            while True:
                while pos < len(buffer) and buffer[pos].isspace():
                    pos += 1
                if not started:
                    if pos >= len(buffer):
                        break
                    if buffer[pos] != "[":
                        raise ValueError(f"{input_path} is not a top-level JSON array")
                    started = True
                    pos += 1
                    continue
                while pos < len(buffer) and buffer[pos] in " \r\n\t,":
                    pos += 1
                if pos < len(buffer) and buffer[pos] == "]":
                    finished = True
                    pos += 1
                    break
                if pos >= len(buffer):
                    break
                try:
                    obj, end = decoder.raw_decode(buffer, pos)
                except json.JSONDecodeError:
                    break
                sink.write(json.dumps({"source": source_name, "payload": obj}, ensure_ascii=False) + "\n")
                count += 1
                pos = end
            buffer = buffer[pos:]
            if not chunk:
                break

    if not finished:
        raise ValueError(f"Incomplete JSON array while converting {input_path}")
    return count


def mirror_file(src: Path, dst: Path, use_hardlinks: bool) -> None:
    ensure_directory(dst.parent)
    if dst.exists():
        dst.unlink()
    if use_hardlinks:
        try:
            os.link(src, dst)
            return
        except OSError:
            pass
    shutil.copy2(src, dst)


def mirror_tree(src: Path, dst: Path, use_hardlinks: bool) -> None:
    if src.is_file():
        if ".part" not in src.name and not src.name.endswith(".pyc"):
            mirror_file(src, dst, use_hardlinks)
        return
    for path in src.rglob("*"):
        relative = path.relative_to(src)
        target = dst / relative
        if path.is_dir():
            if path.name == "__pycache__":
                continue
            ensure_directory(target)
            continue
        if ".part" in path.name or path.name.endswith(".pyc"):
            continue
        mirror_file(path, target, use_hardlinks)


def compact_mirror_targets(targets: list[Path]) -> list[Path]:
    compacted: list[Path] = []
    for candidate in sorted(dict.fromkeys(targets), key=lambda item: (len(item.parts), str(item))):
        if any(existing == candidate or existing in candidate.parents for existing in compacted):
            continue
        compacted.append(candidate)
    return compacted


def organize_deepfashion_multimodal(force_rebuild: bool = False) -> dict[str, Any]:
    raw_root = RAW_ROOT / "deepfashion-multimodal"
    output_dir = DATASETS_ROOT / "deepfashion-multimodal"
    extracted_root = raw_root / "extracted"
    ensure_directory(output_dir)
    cached_report = load_cached_report(output_dir / "stats.generated.json")
    if not force_rebuild and cached_report and (output_dir / "records" / "master.jsonl").exists():
        return cached_report

    report: dict[str, Any] = {
        "dataset": "deepfashion-multimodal",
        "available_archives": {name: (raw_root / "archives" / name).exists() for name in DEEPMM_FILES},
    }

    for name in ("image.zip", "parsing.zip", "keypoints.zip", "densepose.zip", "labels.zip"):
        archive = raw_root / "archives" / name
        if archive.exists():
            extract_zip_once(archive, extracted_root / name.removesuffix(".zip"))

    image_root = extracted_root / "image"
    if not image_root.exists():
        report["status"] = "pending"
        write_json(output_dir / "stats.generated.json", report)
        return report

    descriptions = parse_text_descriptions(raw_root / "archives" / "textual_descriptions.json")
    key_loc = parse_numeric_table(next(iter(sorted((extracted_root / "keypoints").rglob("*loc*.txt"))), None) if (extracted_root / "keypoints").exists() else None)
    key_vis = parse_numeric_table(next(iter(sorted((extracted_root / "keypoints").rglob("*vis*.txt"))), None) if (extracted_root / "keypoints").exists() else None)
    shape = parse_numeric_table(next(iter(sorted((extracted_root / "labels").rglob("*shape*.txt"))), None) if (extracted_root / "labels").exists() else None)
    fabric = parse_numeric_table(next(iter(sorted((extracted_root / "labels").rglob("*fabric*.txt"))), None) if (extracted_root / "labels").exists() else None)
    color = parse_numeric_table(next(iter(sorted((extracted_root / "labels").rglob("*color*.txt"))), None) if (extracted_root / "labels").exists() else None)

    parsing_files = {path.name: path for path in (extracted_root / "parsing").rglob("*.png")} if (extracted_root / "parsing").exists() else {}
    densepose_files = {path.name: path for path in (extracted_root / "densepose").rglob("*.png")} if (extracted_root / "densepose").exists() else {}

    rows: list[dict[str, Any]] = []
    for image_path in sorted(image_root.rglob("*.jpg")):
        image_name = image_path.name
        sample_id = image_path.stem
        png_name = image_name.replace(".jpg", ".png")
        rows.append(
            {
                "id": sample_id,
                "source": "deepfashion-multimodal",
                "split": deterministic_split(sample_id),
                "image_path": relative_to_project(image_path),
                "parsing_path": relative_to_project(parsing_files[png_name]) if png_name in parsing_files else None,
                "densepose_path": relative_to_project(densepose_files[png_name]) if png_name in densepose_files else None,
                "text_descriptions": descriptions.get(image_name) or descriptions.get(sample_id) or [],
                "annotations": {
                    "keypoints_loc": key_loc.get(image_name) or key_loc.get(sample_id) or [],
                    "keypoints_vis": key_vis.get(image_name) or key_vis.get(sample_id) or [],
                    "shape": shape.get(image_name) or shape.get(sample_id) or [],
                    "fabric": fabric.get(image_name) or fabric.get(sample_id) or [],
                    "color_pattern": color.get(image_name) or color.get(sample_id) or [],
                },
            }
        )

    write_jsonl(output_dir / "records" / "master.jsonl", rows)
    write_jsonl(output_dir / "records" / "train.jsonl", [row for row in rows if row["split"] == "train"])
    write_jsonl(output_dir / "records" / "eval.jsonl", [row for row in rows if row["split"] == "eval"])
    report["status"] = "ready" if all(report["available_archives"].values()) else "partial-ready"
    report["row_count"] = len(rows)
    write_json(output_dir / "stats.generated.json", report)
    return report


def summarize_items(annotation: dict[str, Any]) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for key, value in annotation.items():
        if not isinstance(value, dict):
            continue
        if "category_id" not in value and "category_name" not in value:
            continue
        items.append(
            {
                "item_key": key,
                "category_id": value.get("category_id"),
                "category_name": value.get("category_name"),
                "style": value.get("style"),
                "bounding_box": value.get("bounding_box"),
                "scale": value.get("scale"),
                "occlusion": value.get("occlusion"),
                "zoom_in": value.get("zoom_in"),
                "viewpoint": value.get("viewpoint"),
            }
        )
    return items


def count_matching_files(root: Path, pattern: str) -> int:
    if not root or not root.exists():
        return 0
    return sum(1 for _ in root.rglob(pattern))


def find_deepfashion2_split_paths(raw_root: Path, extracted_root: Path, split: str) -> dict[str, Path | None] | None:
    candidates: list[dict[str, Any]] = []
    search_roots = [extracted_root, raw_root / "archives"]
    for root in search_roots:
        split_root = root / split / split
        image_dir = split_root / "image"
        annos_dir = split_root / "annos"
        if not image_dir.exists():
            continue
        image_count = count_matching_files(image_dir, "*.jpg")
        anno_count = count_matching_files(annos_dir, "*.json") if annos_dir.exists() else 0
        candidates.append(
            {
                "source_root": root,
                "split_root": split_root,
                "image_dir": image_dir,
                "annos_dir": annos_dir if annos_dir.exists() else None,
                "image_count": image_count,
                "anno_count": anno_count,
            }
        )

    if not candidates:
        return None

    best = max(candidates, key=lambda item: (item["image_count"], item["anno_count"], str(item["source_root"])))
    return {
        "source_root": best["source_root"],
        "split_root": best["split_root"],
        "image_dir": best["image_dir"],
        "annos_dir": best["annos_dir"],
    }


def has_manual_deepfashion2_extract(raw_root: Path, split_name: str) -> bool:
    manual_dir = raw_root / "archives" / split_name
    return manual_dir.exists() and any(manual_dir.iterdir())


def organize_deepfashion2(password: str | None, force_rebuild: bool = False) -> dict[str, Any]:
    raw_root = RAW_ROOT / "deepfashion2"
    output_dir = DATASETS_ROOT / "deepfashion2"
    extracted_root = raw_root / "extracted"
    ensure_directory(output_dir)
    cached_report = load_cached_report(output_dir / "stats.generated.json")
    if not force_rebuild and cached_report and (output_dir / "records" / "train.jsonl").exists():
        return cached_report

    report: dict[str, Any] = {
        "dataset": "deepfashion2",
        "available_archives": {name: (raw_root / "archives" / name).exists() for name in DEEPFASHION2_FILES},
    }

    for name in DEEPFASHION2_FILES:
        archive = raw_root / "archives" / name
        if archive.exists():
            if has_manual_deepfashion2_extract(raw_root, name.removesuffix(".zip")):
                report.setdefault("manual_extract_dirs", []).append(relative_to_project(raw_root / "archives" / name.removesuffix(".zip")))
                continue
            try:
                extract_zip_once(archive, extracted_root / name.removesuffix(".zip"), password=password)
            except RuntimeError as exc:
                report.setdefault("extract_errors", []).append({name: str(exc)})

    split_dirs: dict[str, dict[str, Path | None]] = {}
    for split in ("train", "validation", "test"):
        resolved = find_deepfashion2_split_paths(raw_root, extracted_root, split)
        if resolved and resolved["image_dir"]:
            split_dirs[split] = {
                "source_root": resolved["source_root"],
                "split_root": resolved["split_root"],
                "image_dir": resolved["image_dir"],
                "annos_dir": resolved["annos_dir"],
            }

    if not split_dirs:
        report["status"] = "pending"
        write_json(output_dir / "stats.generated.json", report)
        return report

    stats: dict[str, Any] = {}
    selected_sources: dict[str, str] = {}
    for split, paths in split_dirs.items():
        rows: list[dict[str, Any]] = []
        image_dir = paths["image_dir"]
        annos_dir = paths["annos_dir"]
        assert image_dir is not None
        selected_sources[split] = relative_to_project(paths["split_root"]) if paths.get("split_root") else relative_to_project(image_dir)
        for image_path in sorted(image_dir.rglob("*.jpg")):
            sample_id = image_path.stem
            annotation_path = annos_dir / f"{sample_id}.json" if annos_dir else None
            annotation = json.loads(annotation_path.read_text(encoding="utf-8")) if annotation_path and annotation_path.exists() else {}
            rows.append(
                {
                    "id": sample_id,
                    "source": "deepfashion2",
                    "split": split,
                    "image_path": relative_to_project(image_path),
                    "annotation_path": relative_to_project(annotation_path) if annotation_path and annotation_path.exists() else None,
                    "pair_id": annotation.get("pair_id"),
                    "source_domain": annotation.get("source"),
                    "items": summarize_items(annotation),
                }
            )
        write_jsonl(output_dir / "records" / f"{split}.jsonl", rows)
        stats[split] = len(rows)

    report["status"] = "ready" if all(report["available_archives"].values()) else "partial-ready"
    report["stats"] = stats
    report["selected_sources"] = selected_sources
    write_json(output_dir / "stats.generated.json", report)
    return report


def parse_item_catalog(path: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8", errors="ignore") as handle:
        for line in handle:
            parts = line.strip().split()
            if len(parts) != 4:
                continue
            rows.append({"item_id": parts[0], "category_id": parts[1], "subcategory_id": parts[2], "year": int(parts[3])})
    return rows


def organize_shift15m(force_rebuild: bool = False) -> dict[str, Any]:
    raw_root = RAW_ROOT / "shift15m"
    output_dir = DATASETS_ROOT / "shift15m"
    ensure_directory(output_dir)
    cached_report = load_cached_report(output_dir / "stats.generated.json")
    if not force_rebuild and cached_report and (output_dir / "records" / "iqon_outfits.jsonl").exists():
        return cached_report
    report: dict[str, Any] = {"dataset": "shift15m"}

    outfits = raw_root / "label" / "iqon_outfits.json"
    if outfits.exists():
        report["iqon_outfits_rows"] = stream_array_json_to_jsonl(outfits, output_dir / "records" / "iqon_outfits.jsonl", "shift15m-outfits")

    outfits_with_tags = raw_root / "label" / "iqon_outfits_with_tags.json"
    if outfits_with_tags.exists():
        report["iqon_outfits_with_tags_rows"] = stream_array_json_to_jsonl(
            outfits_with_tags,
            output_dir / "records" / "iqon_outfits_with_tags.jsonl",
            "shift15m-outfits-with-tags",
        )

    item_catalog = raw_root / "item_category_prediction" / "item_catalog.txt"
    if item_catalog.exists():
        catalog_rows = parse_item_catalog(item_catalog)
        write_jsonl(output_dir / "records" / "item_catalog.jsonl", catalog_rows)
        report["item_catalog_rows"] = len(catalog_rows)

    year_archive = raw_root / "year_classification" / "year_classification_labels.tar.gz"
    if year_archive.exists():
        extract_tar_once(year_archive, output_dir / "year_classification")

    features_dir = raw_root / "features"
    if features_dir.exists():
        report["feature_file_count"] = sum(1 for _ in features_dir.glob("*.json.gz"))

    has_core_rows = any(key.endswith("_rows") for key in report)
    has_features = report.get("feature_file_count", 0) > 0
    if has_core_rows and has_features:
        report["status"] = "ready"
    elif has_core_rows:
        report["status"] = "partial-ready"
    else:
        report["status"] = "pending"
    write_json(output_dir / "stats.generated.json", report)
    return report


def summarize_virtual_tryon_dataset() -> dict[str, Any]:
    train_manifest = DATASETS_ROOT / "virtual-tryon" / "annotations" / "train_pairs.jsonl"
    eval_manifest = DATASETS_ROOT / "virtual-tryon" / "annotations" / "eval_pairs.jsonl"
    template_manifest = DATASETS_ROOT / "virtual-tryon" / "annotations" / "train_pairs.template.jsonl"
    import_report = load_cached_report(DATASETS_ROOT / "virtual-tryon" / "annotations" / "viton_hd_import_report.generated.json") or {}

    train_rows = count_jsonl_rows(train_manifest)
    eval_rows = count_jsonl_rows(eval_manifest)
    if train_rows or eval_rows:
        return {
            "status": "research-bootstrap-ready",
            "train": train_rows,
            "eval": eval_rows,
            "source": "viton-hd",
            "license_bucket": "research-only-noncommercial",
            "import_mode": import_report.get("import_mode"),
        }

    if template_manifest.exists():
        return {"status": "template-only", "train": 0, "eval": 0}

    return {"status": "missing", "train": 0, "eval": 0}


def summarize_image_processor_bootstrap() -> dict[str, Any]:
    bootstrap = load_cached_report(DATASETS_ROOT / "image-processor" / "public-bootstrap.generated.json") or {}
    sources = bootstrap.get("sources", {})
    fashionpedia = sources.get("fashionpedia", {}) if isinstance(sources, dict) else {}
    deepfashion2 = sources.get("deepfashion2", {}) if isinstance(sources, dict) else {}
    deepmm = sources.get("deepfashion_multimodal", {}) if isinstance(sources, dict) else {}

    if bootstrap:
        return {
            "status": "public-bootstrap-ready"
            if fashionpedia.get("status") == "ready" and deepfashion2.get("status") == "ready"
            else "indexed",
            "strategy": bootstrap.get("strategy", "pretrained-inference-first"),
            "fashionpedia_train_images": fashionpedia.get("train_images", 0),
            "fashionpedia_val_test_images": fashionpedia.get("val_test_images", 0),
            "deepfashion2_train": deepfashion2.get("train", 0),
            "deepfashion2_validation": deepfashion2.get("validation", 0),
            "deepfashion2_test": deepfashion2.get("test", 0),
            "deepfashion_multimodal_rows": deepmm.get("row_count", 0),
        }

    return {"status": "pending", "strategy": "pretrained-inference-first"}


def build_bundle_readme(aatrain_dir: Path, report: dict[str, Any]) -> None:
    llm_train = DATASETS_ROOT / "llm-recommender" / "train.jsonl"
    llm_eval = DATASETS_ROOT / "llm-recommender" / "eval.jsonl"
    multimodal_train = DATASETS_ROOT / "multimodal-reader" / "train.jsonl"
    multimodal_eval = DATASETS_ROOT / "multimodal-reader" / "eval.jsonl"
    deepfashion2 = report["organized"]["deepfashion2"]
    virtual_tryon = report["project_datasets"]["virtual-tryon"]
    image_processor = report["project_datasets"]["image-processor"]
    deepfashion2_extract_errors = deepfashion2.get("extract_errors") or []
    deepfashion2_note = (
        "- `deepfashion2` still needs manually extracted folders or `DEEPFASHION2_UNZIP_PASSWORD` during a rebuild."
        if deepfashion2_extract_errors
        else "- `deepfashion2` is already extracted and ready in this bundle."
    )

    content = [
        "# AAtrain Bundle",
        "",
        "This folder is the portable training handoff for the 5090 machine.",
        "",
        "## Included",
        "",
        "- training scripts and configs",
        "- docs and runbooks",
        "- ai-services used by the training/deployment flow",
        "- organized dataset manifests",
        "- completed raw-source downloads mirrored from this repo",
        "",
        "## Dataset Status",
        "",
        f"- LLM recommender: ready ({count_jsonl_rows(llm_train)} train / {count_jsonl_rows(llm_eval)} eval)",
        f"- Multimodal reader: ready ({count_jsonl_rows(multimodal_train)} train / {count_jsonl_rows(multimodal_eval)} eval)",
        (
            f"- Image processor: {image_processor.get('status', 'pending')} "
            f"(Fashionpedia {image_processor.get('fashionpedia_train_images', 0)} train images / "
            f"DeepFashion2 {image_processor.get('deepfashion2_train', 0)} train)"
        ),
        f"- DeepFashion-MultiModal: {report['organized']['deepfashion-multimodal'].get('status', 'pending')}",
        f"- DeepFashion2: {report['organized']['deepfashion2'].get('status', 'pending')}",
        f"- SHIFT15M: {report['organized']['shift15m'].get('status', 'pending')}",
        (
            f"- Virtual try-on paired data: {virtual_tryon.get('status', 'pending')} "
            f"({virtual_tryon.get('train', 0)} train / {virtual_tryon.get('eval', 0)} eval)"
        ),
        "",
        "## Cloud Notes",
        "",
        "- Re-run `training/lora-finetune/register_qwen_vl_dataset.py` on the 5090 machine so dataset paths match that machine.",
        "- `virtual-tryon` now includes a VITON-HD research bootstrap, but the upstream license remains non-commercial.",
        "- `image-processor` includes a public bootstrap index that points to Fashionpedia and DeepFashion2.",
        deepfashion2_note,
        "- Archive passwords are never written into the bundle. Use `training/data-prep/dataset-sources.md` for the documented environment variable names when rebuilding sources elsewhere.",
        "- Large raw research assets are included only when you build with `--full-research-assets`.",
        "",
    ]
    path = aatrain_dir / "README.generated.md"
    path.write_text("\n".join(content), encoding="utf-8")


def build_cloud_handoff_notes(aatrain_dir: Path, report: dict[str, Any]) -> None:
    llm_train = DATASETS_ROOT / "llm-recommender" / "train.jsonl"
    llm_eval = DATASETS_ROOT / "llm-recommender" / "eval.jsonl"
    multimodal_train = DATASETS_ROOT / "multimodal-reader" / "train.jsonl"
    multimodal_eval = DATASETS_ROOT / "multimodal-reader" / "eval.jsonl"
    deepfashion2 = report["organized"]["deepfashion2"]
    virtual_tryon = report["project_datasets"]["virtual-tryon"]
    image_processor = report["project_datasets"]["image-processor"]

    lines = [
        "# 5090 Handoff Notes",
        "",
        f"Generated: {report['generated_at']}",
        "",
        "## Ready To Train",
        "",
        f"- `llm-recommender`: {count_jsonl_rows(llm_train)} train / {count_jsonl_rows(llm_eval)} eval",
        f"- `multimodal-reader`: {count_jsonl_rows(multimodal_train)} train / {count_jsonl_rows(multimodal_eval)} eval",
        (
            f"- `virtual-tryon`: {virtual_tryon.get('status', 'pending')} "
            f"({virtual_tryon.get('train', 0)} train / {virtual_tryon.get('eval', 0)} eval)"
        ),
        (
            f"- `image-processor`: {image_processor.get('status', 'pending')} "
            f"(Fashionpedia {image_processor.get('fashionpedia_train_images', 0)} train images)"
        ),
        "",
        "## Research Assets Included",
        "",
        f"- `deepfashion-multimodal`: {report['organized']['deepfashion-multimodal'].get('status', 'pending')}",
        f"- `deepfashion2`: {deepfashion2.get('status', 'pending')}",
        f"- `shift15m`: {report['organized']['shift15m'].get('status', 'pending')}",
        "",
        "## Current Blockers",
        "",
        "- `virtual-tryon` is trainable with VITON-HD bootstrap, but that source remains research-only / non-commercial.",
        "- `image-processor` has a public bootstrap index, but private garment photography is still the best source for production-grade cutout tuning.",
    ]

    extract_errors = deepfashion2.get("extract_errors") or []
    if extract_errors:
        lines.append("- `deepfashion2` still reports encrypted archives. Provide `DEEPFASHION2_UNZIP_PASSWORD` or keep the manually extracted folders.")
    else:
        lines.append("- No extraction blocker remains for `deepfashion2` in this bundle.")

    lines.extend(
        [
            "",
            "## Bundle Mode",
            "",
            f"- `bundle_mode`: {report.get('bundle_mode', 'cloud-lean')}",
            "- `cloud-lean` keeps training-ready corpora and export files only.",
            "- Use `--full-research-assets` only when you explicitly need the raw DeepFashion or SHIFT15M payloads on the cloud box.",
            "",
            "## On The 5090 Machine",
            "",
            "1. Place the bundle at your project root.",
            "2. Install `training/lora-finetune/requirements-autodl.txt`.",
            "3. Re-run `training/lora-finetune/register_qwen_vl_dataset.py` with the cloud machine paths.",
            "4. Training order recommendation: `llm-recommender` -> `multimodal-reader` -> `virtual-tryon` -> `image-processor`.",
        ]
    )

    (aatrain_dir / "5090-HANDOFF.generated.md").write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    args = parse_args()
    aatrain_dir = reset_directory(args.aatrain_dir) if args.fresh else ensure_directory(args.aatrain_dir)

    report: dict[str, Any] = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "aatrain_dir": relative_to_project(aatrain_dir),
        "bundle_mode": "full-research-assets" if args.full_research_assets else "cloud-lean",
        "project_datasets": {
            "image-processor": summarize_image_processor_bootstrap(),
            "virtual-tryon": summarize_virtual_tryon_dataset(),
        },
        "organized": {
            "deepfashion-multimodal": organize_deepfashion_multimodal(force_rebuild=args.rebuild_organized_datasets),
            "deepfashion2": organize_deepfashion2(args.deepfashion2_password, force_rebuild=args.rebuild_organized_datasets),
            "shift15m": organize_shift15m(force_rebuild=args.rebuild_organized_datasets),
        },
    }

    mirror_targets = [
        PROJECT_ROOT / "training",
        PROJECT_ROOT / "docs",
        PROJECT_ROOT / "ai-services",
        PROJECT_ROOT / "model_training" / "README.md",
        PROJECT_ROOT / "model_training" / "datasets" / "llm-recommender",
        PROJECT_ROOT / "model_training" / "datasets" / "image-processor",
        PROJECT_ROOT / "model_training" / "datasets" / "multimodal-reader",
        PROJECT_ROOT / "model_training" / "datasets" / "virtual-tryon",
        PROJECT_ROOT / "model_training" / "exports" / "multimodal-reader-qwen",
        PROJECT_ROOT / "model_training" / "raw-sources" / "deepfashion-download-report.generated.json",
        PROJECT_ROOT / "model_training" / "raw-sources" / "internal-research-download-jobs.generated.json",
        PROJECT_ROOT / "model_training" / "raw-sources" / "internal-research-download-progress.generated.json",
        PROJECT_ROOT / "model_training" / "raw-sources" / "vision-bootstrap-download-report.generated.json",
    ]
    if args.full_research_assets:
        mirror_targets.extend(
            [
                PROJECT_ROOT / "model_training" / "datasets" / "deepfashion-multimodal",
                PROJECT_ROOT / "model_training" / "datasets" / "deepfashion2",
                PROJECT_ROOT / "model_training" / "datasets" / "shift15m",
                PROJECT_ROOT / "model_training" / "raw-sources",
            ]
        )
    else:
        report["omitted_for_cloud"] = [
            "model_training/datasets/deepfashion-multimodal",
            "model_training/datasets/deepfashion2",
            "model_training/datasets/shift15m",
            "model_training/raw-sources/tryon",
            "model_training/raw-sources/fashionpedia-official",
            "model_training/raw-sources/deepfashion-multimodal",
            "model_training/raw-sources/deepfashion2",
            "model_training/raw-sources/shift15m",
        ]

    mirrored: list[str] = []
    for src in compact_mirror_targets(mirror_targets):
        if not src.exists():
            continue
        dst = aatrain_dir / src.relative_to(PROJECT_ROOT)
        mirror_tree(src, dst, args.use_hardlinks)
        mirrored.append(relative_to_project(src))
    report["mirrored"] = mirrored

    build_bundle_readme(aatrain_dir, report)
    build_cloud_handoff_notes(aatrain_dir, report)
    write_json(aatrain_dir / "bundle-report.generated.json", report)
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
