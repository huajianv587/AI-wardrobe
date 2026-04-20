from __future__ import annotations

import argparse
import html
import json
import os
import re
import shutil
import tarfile
import time
import zipfile
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any

import gdown
import requests
from bs4 import BeautifulSoup
from tqdm import tqdm


PROJECT_ROOT = Path(__file__).resolve().parents[2]
RAW_ROOT = PROJECT_ROOT / "model_training" / "raw-sources"
SUMMARY_PATH = RAW_ROOT / "internal-research-download-report.generated.json"

DEEPFASHION_FOLDER_URL = (
    "https://drive.google.com/drive/folders/"
    "0B7EVK8r0v71pQ2FuZ0k0QnhBQnc?resourcekey=0-NWldFxSChFuCpK4nzAIGsg&usp=sharing"
)
DEEPFASHION2_FOLDER_URL = (
    "https://drive.google.com/drive/folders/125F48fsMBz2EF0Cpqk6aaHet5VH399Ok?usp=sharing"
)

DEEPFASHION_BENCHMARKS = [
    {
        "name": "Category and Attribute Prediction Benchmark",
        "folder_id": "0B7EVK8r0v71pWGplNFhjc01NbzQ",
        "resource_key": "0-BU3lAk-Nc7HscJu-CyC1yA",
    },
    {
        "name": "Consumer-to-shop Clothes Retrieval Benchmark",
        "folder_id": "0B7EVK8r0v71pRXllRUdQcC1zTHc",
        "resource_key": "0-YgTkHTdQH_KN0VcXr9k_jQ",
    },
    {
        "name": "Fashion Landmark Detection Benchmark",
        "folder_id": "0B7EVK8r0v71pLXQ4bmxZaEFKTm8",
        "resource_key": "0-Ldyv0gTGbbEnAf_wOGqEpg",
    },
    {
        "name": "Fashion Synthesis Benchmark",
        "folder_id": "0B7EVK8r0v71pTHhMenkxbE9fTVk",
        "resource_key": "0-vTjoKh5LuocS_K3yxycXIg",
    },
    {
        "name": "In-shop Clothes Retrieval Benchmark",
        "folder_id": "0B7EVK8r0v71pVDZFQXRsMDZCX1E",
        "resource_key": "0-4R4v6zl4CWhHTsUGOsTstw",
    },
]

DEEPFASHION_MULTIMODAL_FILES = [
    {
        "name": "image.zip",
        "url": "https://drive.google.com/file/d/1U2PljA7NE57jcSSzPs21ZurdIPXdYZtN/view?usp=sharing",
        "description": "DeepFashion-MultiModal images",
    },
    {
        "name": "parsing.zip",
        "url": "https://drive.google.com/file/d/1r-5t-VgDaAQidZLVgWtguaG7DvMoyUv9/view?usp=sharing",
        "description": "DeepFashion-MultiModal parsing labels",
    },
    {
        "name": "keypoints.zip",
        "url": "https://drive.google.com/file/d/1ZXdOQI-d4zNhqRJdUEWSQvPwAtLdjovo/view?usp=sharing",
        "description": "DeepFashion-MultiModal keypoints",
    },
    {
        "name": "densepose.zip",
        "url": "https://drive.google.com/file/d/14uyqBUDDcL1VLaXm7qmqghdcbkFuQa1s/view?usp=sharing",
        "description": "DeepFashion-MultiModal densepose",
    },
    {
        "name": "labels.zip",
        "url": "https://drive.google.com/file/d/11WoM5ZFwWpVjrIvZajW0g8EmQCNKMAWH/view?usp=sharing",
        "description": "DeepFashion-MultiModal labels",
    },
    {
        "name": "textual_descriptions.json",
        "url": "https://drive.google.com/file/d/1d1TRm8UMcQhZCb6HpPo8l3OPEin4Ztk2/view?usp=sharing",
        "description": "DeepFashion-MultiModal textual descriptions",
    },
]

SHIFT15M_SMALL_FILES = [
    {
        "name": "label/iqon_outfits.json",
        "url": "https://research.zozo.com/data_release/shift15m/label/iqon_outfits.json",
        "description": "SHIFT15M outfits",
    },
    {
        "name": "label/iqon_outfits_with_tags.json",
        "url": "https://research.zozo.com/data_release/shift15m/label/iqon_outfits_with_tags.json",
        "description": "SHIFT15M outfits with tags",
    },
    {
        "name": "num_likes_regression/xy_00.pickle",
        "url": "https://research.zozo.com/data_release/shift15m/num_likes_regression/xy_00.pickle",
    },
    {
        "name": "num_likes_regression/xy_01.pickle",
        "url": "https://research.zozo.com/data_release/shift15m/num_likes_regression/xy_01.pickle",
    },
    {
        "name": "num_likes_regression/xy_02.pickle",
        "url": "https://research.zozo.com/data_release/shift15m/num_likes_regression/xy_02.pickle",
    },
    {
        "name": "num_likes_regression/xy_03.pickle",
        "url": "https://research.zozo.com/data_release/shift15m/num_likes_regression/xy_03.pickle",
    },
    {
        "name": "num_likes_regression/xy_04.pickle",
        "url": "https://research.zozo.com/data_release/shift15m/num_likes_regression/xy_04.pickle",
    },
    {
        "name": "num_likes_regression/xy_05.pickle",
        "url": "https://research.zozo.com/data_release/shift15m/num_likes_regression/xy_05.pickle",
    },
    {
        "name": "num_likes_regression/xy_06.pickle",
        "url": "https://research.zozo.com/data_release/shift15m/num_likes_regression/xy_06.pickle",
    },
    {
        "name": "num_likes_regression/xy_07.pickle",
        "url": "https://research.zozo.com/data_release/shift15m/num_likes_regression/xy_07.pickle",
    },
    {
        "name": "num_likes_regression/xy_08.pickle",
        "url": "https://research.zozo.com/data_release/shift15m/num_likes_regression/xy_08.pickle",
    },
    {
        "name": "num_likes_regression/xy_09.pickle",
        "url": "https://research.zozo.com/data_release/shift15m/num_likes_regression/xy_09.pickle",
    },
    {
        "name": "sum_prices_regression/sumprices.pickle",
        "url": "https://research.zozo.com/data_release/shift15m/sum_prices_regression/sumprices.pickle",
    },
    {
        "name": "year_classification/year_classification_labels.tar.gz",
        "url": "https://research.zozo.com/data_release/shift15m/year_classification/year_classification_labels.tar.gz",
    },
    {
        "name": "item_category_prediction/item_catalog.txt",
        "url": "https://research.zozo.com/data_release/shift15m/item_category_prediction/item_catalog.txt",
    },
]

SHIFT15M_FEATURE_LIST_URL = "https://research.zozo.com/data_release/shift15m/vgg16-features/filelist.txt"
SUPPORTED_DATASETS = ("deepfashion", "deepfashion-multimodal", "deepfashion2", "shift15m")
CHUNK_SIZE = 1024 * 1024


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Download internal-use research datasets into model_training/raw-sources "
            "with resume support and extraction helpers."
        )
    )
    parser.add_argument(
        "--datasets",
        nargs="+",
        choices=SUPPORTED_DATASETS,
        default=list(SUPPORTED_DATASETS),
    )
    parser.add_argument("--skip-extract", action="store_true")
    parser.add_argument("--keep-shift15m-tars", action="store_true")
    parser.add_argument("--shift15m-feature-workers", type=int, default=4)
    parser.add_argument("--deepfashion-password", default=os.getenv("DEEPFASHION_UNZIP_PASSWORD"))
    parser.add_argument("--deepfashion2-password", default=os.getenv("DEEPFASHION2_UNZIP_PASSWORD"))
    return parser.parse_args()


def ensure_directory(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    return path


def relative_to_project(path: Path) -> str:
    try:
        return str(path.relative_to(PROJECT_ROOT))
    except ValueError:
        return str(path)


def write_summary(payload: dict[str, Any]) -> None:
    ensure_directory(SUMMARY_PATH.parent)
    SUMMARY_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def slugify(value: str) -> str:
    cleaned = []
    for char in value:
        if char.isalnum():
            cleaned.append(char.lower())
        elif char in {" ", "-", "_"}:
            cleaned.append("-")
    slug = "".join(cleaned).strip("-")
    return slug or "item"


def dataset_report_path(dataset_name: str) -> Path:
    return RAW_ROOT / f"{slugify(dataset_name)}-download-report.generated.json"


def write_dataset_report(dataset_name: str, payload: dict[str, Any]) -> None:
    path = dataset_report_path(dataset_name)
    ensure_directory(path.parent)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def head_content_length(url: str) -> int | None:
    try:
        response = requests.head(url, allow_redirects=True, timeout=30)
        response.raise_for_status()
        content_length = response.headers.get("Content-Length")
        return int(content_length) if content_length else None
    except Exception:
        return None


def download_http_file(url: str, destination: Path, label: str | None = None) -> dict[str, Any]:
    ensure_directory(destination.parent)
    remote_size = head_content_length(url)
    final_size = destination.stat().st_size if destination.exists() else 0
    if remote_size and final_size == remote_size:
        return {
            "path": relative_to_project(destination),
            "bytes": final_size,
            "skipped": True,
            "label": label or destination.name,
        }

    temp_path = destination.with_suffix(destination.suffix + ".part")
    if destination.exists():
        if not temp_path.exists():
            shutil.move(destination, temp_path)
    downloaded = temp_path.stat().st_size if temp_path.exists() else 0

    headers: dict[str, str] = {}
    mode = "wb"
    if downloaded:
        headers["Range"] = f"bytes={downloaded}-"
        mode = "ab"

    with requests.get(url, stream=True, headers=headers, timeout=60) as response:
        response.raise_for_status()
        total = remote_size
        if response.status_code == 200 and downloaded:
            downloaded = 0
            mode = "wb"
        total_for_bar = total if total is not None else 0
        with temp_path.open(mode) as handle, tqdm(
            total=total_for_bar,
            initial=downloaded,
            unit="B",
            unit_scale=True,
            desc=label or destination.name,
        ) as progress:
            for chunk in response.iter_content(chunk_size=CHUNK_SIZE):
                if not chunk:
                    continue
                handle.write(chunk)
                progress.update(len(chunk))

    shutil.move(temp_path, destination)
    final_size = destination.stat().st_size
    return {
        "path": relative_to_project(destination),
        "bytes": final_size,
        "skipped": False,
        "label": label or destination.name,
    }


def download_gdrive_file(url: str, destination: Path, label: str | None = None) -> dict[str, Any]:
    ensure_directory(destination.parent)
    if destination.exists() and destination.stat().st_size > 0:
        return {
            "path": relative_to_project(destination),
            "bytes": destination.stat().st_size,
            "skipped": True,
            "label": label or destination.name,
        }

    try:
        output = gdown.download(url=url, output=str(destination), fuzzy=True, quiet=False, resume=True, use_cookies=False)
    except Exception as exc:
        return {
            "path": relative_to_project(destination),
            "bytes": destination.stat().st_size if destination.exists() else 0,
            "skipped": False,
            "label": label or destination.name,
            "error": str(exc),
        }
    if not output:
        return {
            "path": relative_to_project(destination),
            "bytes": destination.stat().st_size if destination.exists() else 0,
            "skipped": False,
            "label": label or destination.name,
            "error": f"Failed to download Google Drive file: {url}",
        }

    return {
        "path": relative_to_project(destination),
        "bytes": destination.stat().st_size,
        "skipped": False,
        "label": label or destination.name,
    }


def download_gdrive_folder(url: str, destination: Path) -> dict[str, Any]:
    ensure_directory(destination)
    before = {item.name: item.stat().st_size for item in destination.glob("*") if item.is_file()}
    try:
        outputs = gdown.download_folder(
            url=url,
            output=str(destination),
            quiet=False,
            use_cookies=False,
            remaining_ok=True,
            resume=True,
        )
    except Exception as exc:
        return {
            "archive_dir": relative_to_project(destination),
            "file_count": 0,
            "files": [],
            "error": str(exc),
        }
    if outputs is None:
        return {
            "archive_dir": relative_to_project(destination),
            "file_count": 0,
            "files": [],
            "error": f"Failed to download Google Drive folder: {url}",
        }

    files: list[dict[str, Any]] = []
    for item in destination.glob("*"):
        if not item.is_file():
            continue
        files.append(
            {
                "name": item.name,
                "path": relative_to_project(item),
                "bytes": item.stat().st_size,
                "skipped": before.get(item.name) == item.stat().st_size,
            }
        )
    files.sort(key=lambda entry: entry["name"])
    return {
        "archive_dir": relative_to_project(destination),
        "file_count": len(files),
        "files": files,
    }


def build_drive_folder_url(folder_id: str, resource_key: str) -> str:
    return f"https://drive.google.com/drive/folders/{folder_id}?resourcekey={resource_key}&usp=sharing"


def fetch_drive_folder_page(url: str) -> tuple[str, BeautifulSoup, str]:
    response = requests.get(url, timeout=60)
    response.raise_for_status()
    page_html = response.text
    return page_html, BeautifulSoup(page_html, "html.parser"), html.unescape(page_html)


def extract_drive_row_name(row: Any) -> str:
    tooltip_node = row.select_one("div[data-tooltip]")
    if tooltip_node and tooltip_node.get("data-tooltip"):
        tooltip = tooltip_node["data-tooltip"]
        for suffix in (
            " Shared folder",
            " Shared",
            " Text",
            " Compressed archive",
            " Binary",
            " Unknown",
        ):
            if tooltip.endswith(suffix):
                return tooltip[: -len(suffix)]
        return tooltip

    strong_node = row.select_one("strong.DNoYtb")
    if strong_node:
        return strong_node.get_text(strip=True)

    parts = list(row.stripped_strings)
    if len(parts) >= 2:
        return parts[1]
    return row.get("data-id") or "item"


def extract_drive_folder_resource_key(raw_html: str, item_id: str) -> str | None:
    match = re.search(
        r'"' + re.escape(item_id) + r'"\],null,"([^"]+)",null,"application/vnd.google-apps.folder"',
        raw_html,
    )
    if match:
        return match.group(1)
    return None


def crawl_deepfashion_folder(
    folder_url: str,
    output_dir: Path,
    visited_folder_ids: set[str],
) -> list[dict[str, Any]]:
    ensure_directory(output_dir)
    try:
        page_html, soup, raw_html = fetch_drive_folder_page(folder_url)
    except Exception as exc:
        return [{"type": "folder_error", "path": relative_to_project(output_dir), "error": str(exc)}]
    del page_html

    records: list[dict[str, Any]] = []
    for row in soup.select("tr[data-id]"):
        item_id = row.get("data-id")
        if not item_id:
            continue

        name = extract_drive_row_name(row)
        folder_resource_key = extract_drive_folder_resource_key(raw_html, item_id)
        if folder_resource_key:
            if item_id in visited_folder_ids:
                continue
            visited_folder_ids.add(item_id)
            child_dir = ensure_directory(output_dir / slugify(name))
            child_url = build_drive_folder_url(item_id, folder_resource_key)
            records.append(
                {
                    "type": "folder",
                    "name": name,
                    "folder_id": item_id,
                    "resource_key": folder_resource_key,
                    "path": relative_to_project(child_dir),
                    "children": crawl_deepfashion_folder(child_url, child_dir, visited_folder_ids),
                }
            )
            continue

        file_path = output_dir / name
        records.append(
            {
                "type": "file",
                "name": name,
                "file_id": item_id,
                "download": download_gdrive_file(
                    url=f"https://drive.google.com/uc?id={item_id}&export=download",
                    destination=file_path,
                    label=f"DeepFashion:{name}",
                ),
            }
        )
    return records


def extract_archive(archive_path: Path, output_dir: Path, password: str | None = None) -> dict[str, Any]:
    ensure_directory(output_dir)
    archive_name = archive_path.name.lower()
    target_dir = output_dir / archive_path.stem.replace(".tar", "")
    sentinel = target_dir / ".extracted.ok"
    if sentinel.exists():
        return {
            "archive": relative_to_project(archive_path),
            "output_dir": relative_to_project(target_dir),
            "skipped": True,
        }

    ensure_directory(target_dir)
    if archive_name.endswith(".zip"):
        with zipfile.ZipFile(archive_path) as handle:
            if password:
                handle.extractall(target_dir, pwd=password.encode("utf-8"))
            else:
                handle.extractall(target_dir)
    elif archive_name.endswith(".tar.gz") or archive_name.endswith(".tgz"):
        with tarfile.open(archive_path, "r:gz") as handle:
            handle.extractall(target_dir)
    elif archive_name.endswith(".tar"):
        with tarfile.open(archive_path, "r:") as handle:
            handle.extractall(target_dir)
    else:
        raise ValueError(f"Unsupported archive type: {archive_path.name}")

    sentinel.write_text(str(int(time.time())), encoding="utf-8")
    return {
        "archive": relative_to_project(archive_path),
        "output_dir": relative_to_project(target_dir),
        "skipped": False,
    }


def extract_archives_in_directory(source_dir: Path, output_dir: Path, password: str | None = None) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for archive_path in sorted(source_dir.glob("*")):
        if not archive_path.is_file():
            continue
        lower_name = archive_path.name.lower()
        if not (
            lower_name.endswith(".zip")
            or lower_name.endswith(".tar.gz")
            or lower_name.endswith(".tgz")
            or lower_name.endswith(".tar")
        ):
            continue
        try:
            records.append(extract_archive(archive_path, output_dir, password=password))
        except RuntimeError as exc:
            records.append(
                {
                    "archive": relative_to_project(archive_path),
                    "error": str(exc),
                }
            )
        except (tarfile.TarError, zipfile.BadZipFile, RuntimeError, ValueError) as exc:
            records.append(
                {
                    "archive": relative_to_project(archive_path),
                    "error": str(exc),
                }
            )
    return records


def extract_archives_in_tree(root_dir: Path, extract_root: Path, password: str | None = None) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for archive_path in sorted(root_dir.rglob("*")):
        if not archive_path.is_file():
            continue
        lower_name = archive_path.name.lower()
        if not (
            lower_name.endswith(".zip")
            or lower_name.endswith(".tar.gz")
            or lower_name.endswith(".tgz")
            or lower_name.endswith(".tar")
        ):
            continue
        relative_parent = archive_path.parent.relative_to(root_dir)
        target_dir = extract_root / relative_parent
        try:
            records.append(extract_archive(archive_path, target_dir, password=password))
        except (tarfile.TarError, zipfile.BadZipFile, RuntimeError, ValueError) as exc:
            records.append(
                {
                    "archive": relative_to_project(archive_path),
                    "error": str(exc),
                }
            )
    return records


def fetch_shift15m_feature_urls() -> list[str]:
    response = requests.get(SHIFT15M_FEATURE_LIST_URL, timeout=60)
    response.raise_for_status()
    lines = [line.strip() for line in response.text.splitlines() if line.strip()]
    return [line for line in lines if line.endswith(".tar.gz")]


def extract_shift15m_tars(tar_dir: Path, feature_dir: Path, cleanup: bool) -> list[dict[str, Any]]:
    ensure_directory(feature_dir)
    records: list[dict[str, Any]] = []
    for tar_path in sorted(tar_dir.glob("*.tar.gz")):
        target_dir_name = tar_path.name[:-7]
        temp_extract_dir = tar_dir / target_dir_name
        sentinel = feature_dir / f".{target_dir_name}.ok"
        if sentinel.exists():
            records.append(
                {
                    "archive": relative_to_project(tar_path),
                    "feature_dir": relative_to_project(feature_dir),
                    "skipped": True,
                }
            )
            continue

        with tarfile.open(tar_path, "r:gz") as handle:
            handle.extractall(tar_dir)

        if temp_extract_dir.exists():
            for feature_file in temp_extract_dir.iterdir():
                shutil.move(str(feature_file), feature_dir / feature_file.name)
            temp_extract_dir.rmdir()

        sentinel.write_text("ok", encoding="utf-8")
        records.append(
            {
                "archive": relative_to_project(tar_path),
                "feature_dir": relative_to_project(feature_dir),
                "skipped": False,
            }
        )
        if cleanup:
            tar_path.unlink(missing_ok=True)

    return records


def download_shift15m_feature_bundle(root: Path, workers: int, cleanup_tars: bool) -> dict[str, Any]:
    tar_dir = ensure_directory(root / "downloads" / "feature_tars")
    feature_dir = ensure_directory(root / "features")
    feature_urls = fetch_shift15m_feature_urls()

    tar_list_path = root / "tar_files.txt"
    tar_list_path.write_text("\n".join(Path(url).name for url in feature_urls), encoding="utf-8")

    records: list[dict[str, Any]] = []
    with ThreadPoolExecutor(max_workers=max(1, workers)) as executor:
        futures = {
            executor.submit(
                download_http_file,
                url,
                tar_dir / Path(url).name,
                f"shift15m:{Path(url).name}",
            ): url
            for url in feature_urls
        }
        for future in as_completed(futures):
            records.append(future.result())

    extracted = extract_shift15m_tars(tar_dir, feature_dir, cleanup=cleanup_tars)
    records.sort(key=lambda entry: entry["path"])
    return {
        "tar_dir": relative_to_project(tar_dir),
        "feature_dir": relative_to_project(feature_dir),
        "feature_tar_count": len(feature_urls),
        "downloads": records,
        "extracted": extracted,
        "cleanup_tars": cleanup_tars,
    }


def download_deepfashion(password: str | None, skip_extract: bool) -> dict[str, Any]:
    root = ensure_directory(RAW_ROOT / "deepfashion")
    benchmark_root = ensure_directory(root / "benchmarks")
    visited_folder_ids: set[str] = set()
    benchmark_reports = []
    for benchmark in DEEPFASHION_BENCHMARKS:
        visited_folder_ids.add(benchmark["folder_id"])
        output_dir = ensure_directory(benchmark_root / slugify(benchmark["name"]))
        benchmark_reports.append(
            {
                "name": benchmark["name"],
                "folder_id": benchmark["folder_id"],
                "resource_key": benchmark["resource_key"],
                "path": relative_to_project(output_dir),
                "children": crawl_deepfashion_folder(
                    build_drive_folder_url(benchmark["folder_id"], benchmark["resource_key"]),
                    output_dir,
                    visited_folder_ids,
                ),
            }
        )
    report = {
        "root": relative_to_project(root),
        "official_url": "https://mmlab.ie.cuhk.edu.hk/projects/DeepFashion.html",
        "benchmarks": benchmark_reports,
        "notes": [
            "Official source is the CUHK DeepFashion project page.",
            "Some DeepFashion archives may still require agreement acceptance or passwords depending on the split.",
        ],
    }
    if not skip_extract:
        report["extract"] = extract_archives_in_tree(benchmark_root, root / "extracted", password=password)
    return report


def download_deepfashion_multimodal(skip_extract: bool) -> dict[str, Any]:
    root = ensure_directory(RAW_ROOT / "deepfashion-multimodal")
    archive_dir = ensure_directory(root / "archives")
    records = []
    for entry in DEEPFASHION_MULTIMODAL_FILES:
        records.append(
            download_gdrive_file(
                url=entry["url"],
                destination=archive_dir / entry["name"],
                label=entry["description"],
            )
        )
    report = {
        "root": relative_to_project(root),
        "official_url": "https://github.com/yumingj/DeepFashion-MultiModal",
        "downloads": records,
    }
    if not skip_extract:
        report["extract"] = extract_archives_in_directory(archive_dir, root / "extracted")
    return report


def download_deepfashion2(password: str | None, skip_extract: bool) -> dict[str, Any]:
    root = ensure_directory(RAW_ROOT / "deepfashion2")
    archive_dir = ensure_directory(root / "archives")
    report = {
        "root": relative_to_project(root),
        "official_url": "https://github.com/switchablenorms/DeepFashion2",
        "download": download_gdrive_folder(DEEPFASHION2_FOLDER_URL, archive_dir),
        "notes": [
            "Official source is the DeepFashion2 Google Drive folder linked from the repo README.",
            "The archive password is distributed through the official Google Form.",
        ],
    }
    if not skip_extract:
        report["extract"] = extract_archives_in_directory(archive_dir, root / "extracted", password=password)
    return report


def download_shift15m(workers: int, skip_extract: bool, keep_tars: bool) -> dict[str, Any]:
    root = ensure_directory(RAW_ROOT / "shift15m")
    records = []
    for entry in SHIFT15M_SMALL_FILES:
        records.append(
            download_http_file(
                url=entry["url"],
                destination=root / entry["name"],
                label=entry.get("description") or f"shift15m:{entry['name']}",
            )
        )

    report = {
        "root": relative_to_project(root),
        "official_url": "https://github.com/st-tech/zozo-shift15m",
        "downloads": records,
        "notes": [
            "The official SHIFT15M release provides outfit metadata, task labels, and VGG16 feature shards.",
            "The upstream release does not expose a raw product image dump through the published download scripts.",
        ],
    }
    if not skip_extract:
        report["features"] = download_shift15m_feature_bundle(root, workers=workers, cleanup_tars=not keep_tars)
        year_tar = root / "year_classification" / "year_classification_labels.tar.gz"
        report["year_classification_extract"] = extract_archives_in_directory(
            year_tar.parent,
            root / "year_classification" / "extracted",
        )
    return report


def main() -> None:
    args = parse_args()
    ensure_directory(RAW_ROOT)

    started_at = time.strftime("%Y-%m-%dT%H:%M:%S%z")
    report: dict[str, Any] = {
        "started_at": started_at,
        "project_root": str(PROJECT_ROOT),
        "datasets": {},
    }
    write_summary(report)

    for dataset_name in args.datasets:
        try:
            if dataset_name == "deepfashion":
                report["datasets"][dataset_name] = download_deepfashion(
                    password=args.deepfashion_password,
                    skip_extract=args.skip_extract,
                )
            elif dataset_name == "deepfashion-multimodal":
                report["datasets"][dataset_name] = download_deepfashion_multimodal(skip_extract=args.skip_extract)
            elif dataset_name == "deepfashion2":
                report["datasets"][dataset_name] = download_deepfashion2(
                    password=args.deepfashion2_password,
                    skip_extract=args.skip_extract,
                )
            elif dataset_name == "shift15m":
                report["datasets"][dataset_name] = download_shift15m(
                    workers=args.shift15m_feature_workers,
                    skip_extract=args.skip_extract,
                    keep_tars=args.keep_shift15m_tars,
                )
            else:
                raise ValueError(f"Unsupported dataset: {dataset_name}")
        except Exception as exc:
            report["datasets"][dataset_name] = {"error": str(exc)}
        write_dataset_report(dataset_name, report["datasets"][dataset_name])
        write_summary(report)

    report["finished_at"] = time.strftime("%Y-%m-%dT%H:%M:%S%z")
    write_summary(report)
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
