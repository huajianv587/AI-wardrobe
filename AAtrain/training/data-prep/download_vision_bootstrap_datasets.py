from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import tarfile
import zipfile
from html import unescape
from pathlib import Path
from typing import Any
from urllib.parse import urljoin

import gdown
import requests
from tqdm import tqdm


PROJECT_ROOT = Path(__file__).resolve().parents[2]
RAW_ROOT = PROJECT_ROOT / "model_training" / "raw-sources"
REPORT_PATH = RAW_ROOT / "vision-bootstrap-download-report.generated.json"
CHUNK_SIZE = 1024 * 1024

SUPPORTED_DATASETS = ("viton-hd", "fashionpedia", "dresscode-request")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Download high-quality public bootstrap datasets for virtual-tryon and image-processor lanes."
    )
    parser.add_argument(
        "--datasets",
        nargs="+",
        choices=SUPPORTED_DATASETS,
        default=["viton-hd", "fashionpedia", "dresscode-request"],
    )
    parser.add_argument("--skip-extract", action="store_true")
    parser.add_argument("--skip-git", action="store_true")
    return parser.parse_args()


def ensure_directory(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    return path


def relative_to_project(path: Path) -> str:
    try:
        return str(path.relative_to(PROJECT_ROOT))
    except ValueError:
        return str(path)


def write_report(payload: dict[str, Any]) -> None:
    ensure_directory(REPORT_PATH.parent)
    REPORT_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def shallow_clone(target: Path, repo_url: str) -> dict[str, Any]:
    ensure_directory(target.parent)
    if (target / ".git").exists():
        subprocess.run(["git", "-C", str(target), "pull", "--ff-only"], check=True)
        return {"path": relative_to_project(target), "repo": repo_url, "updated": True}

    if target.exists():
        return {"path": relative_to_project(target), "repo": repo_url, "updated": False, "skipped": True}

    subprocess.run(["git", "clone", "--depth", "1", "--filter=blob:none", repo_url, str(target)], check=True)
    return {"path": relative_to_project(target), "repo": repo_url, "updated": False, "skipped": False}


def download_http_file(url: str, destination: Path, label: str) -> dict[str, Any]:
    ensure_directory(destination.parent)
    if destination.exists() and destination.stat().st_size > 0:
        return {
            "path": relative_to_project(destination),
            "bytes": destination.stat().st_size,
            "url": url,
            "skipped": True,
        }

    part_path = destination.with_suffix(destination.suffix + ".part")
    existing = part_path.stat().st_size if part_path.exists() else 0

    headers: dict[str, str] = {}
    mode = "wb"
    if existing:
        headers["Range"] = f"bytes={existing}-"
        mode = "ab"

    with requests.get(url, stream=True, headers=headers, timeout=60) as response:
        response.raise_for_status()
        total = response.headers.get("Content-Length")
        total_bytes = int(total) + existing if total and response.status_code == 206 else int(total or 0)
        if response.status_code == 200 and existing:
            existing = 0
            mode = "wb"
        with part_path.open(mode) as handle, tqdm(
            total=total_bytes or None,
            initial=existing,
            unit="B",
            unit_scale=True,
            desc=label,
        ) as progress:
            for chunk in response.iter_content(chunk_size=CHUNK_SIZE):
                if not chunk:
                    continue
                handle.write(chunk)
                progress.update(len(chunk))

    shutil.move(part_path, destination)
    return {"path": relative_to_project(destination), "bytes": destination.stat().st_size, "url": url}


def download_gdrive_file(url: str, destination: Path, label: str) -> dict[str, Any]:
    ensure_directory(destination.parent)
    if destination.exists() and destination.stat().st_size > 0 and _is_valid_archive_file(destination):
        return {"path": relative_to_project(destination), "bytes": destination.stat().st_size, "url": url, "skipped": True}

    if destination.exists():
        destination.unlink()

    try:
        output = gdown.download(url=url, output=str(destination), fuzzy=True, quiet=False, resume=True, use_cookies=False)
    except Exception:
        output = None

    if not output:
        _download_gdrive_with_confirm(_normalize_gdrive_url(url), destination, label)

    if not _is_valid_archive_file(destination):
        raise RuntimeError(f"Downloaded file is not a valid archive payload: {destination}")

    return {"path": relative_to_project(destination), "bytes": destination.stat().st_size, "url": url, "skipped": False}


def extract_archive(archive_path: Path, destination: Path) -> dict[str, Any]:
    sentinel = destination / ".extracted.ok"
    if sentinel.exists():
        return {"archive": relative_to_project(archive_path), "output_dir": relative_to_project(destination), "skipped": True}

    ensure_directory(destination)
    archive_name = archive_path.name.lower()
    if archive_name.endswith(".zip"):
        with zipfile.ZipFile(archive_path) as handle:
            handle.extractall(destination)
    elif archive_name.endswith(".tar.gz") or archive_name.endswith(".tgz"):
        with tarfile.open(archive_path, mode="r:gz") as handle:
            handle.extractall(destination)
    elif archive_name.endswith(".tar"):
        with tarfile.open(archive_path, mode="r:") as handle:
            handle.extractall(destination)
    else:
        raise RuntimeError(f"Unsupported archive format: {archive_path}")

    sentinel.write_text("ok", encoding="utf-8")
    return {"archive": relative_to_project(archive_path), "output_dir": relative_to_project(destination), "skipped": False}


def _extract_drive_form(action_url: str, html_text: str) -> tuple[str, dict[str, str]] | None:
    form_match = re.search(
        r'<form[^>]+id="download-form"[^>]+action="([^"]+)"[^>]*>(.*?)</form>',
        html_text,
        flags=re.IGNORECASE | re.DOTALL,
    )
    if not form_match:
        return None

    form_action = urljoin(action_url, unescape(form_match.group(1)))
    form_body = form_match.group(2)
    inputs = re.findall(
        r'<input[^>]+type="hidden"[^>]+name="([^"]+)"[^>]+value="([^"]*)"',
        form_body,
        flags=re.IGNORECASE,
    )
    return form_action, {name: unescape(value) for name, value in inputs}


def _normalize_gdrive_url(url: str) -> str:
    file_id_match = re.search(r"/d/([A-Za-z0-9_-]+)", url)
    if file_id_match:
        return f"https://drive.google.com/uc?id={file_id_match.group(1)}&export=download"

    id_match = re.search(r"[?&]id=([A-Za-z0-9_-]+)", url)
    if id_match:
        return f"https://drive.google.com/uc?id={id_match.group(1)}&export=download"

    return url


def _stream_response_to_file(response: requests.Response, destination: Path, label: str) -> None:
    part_path = destination.with_suffix(destination.suffix + ".part")
    existing = part_path.stat().st_size if part_path.exists() else 0

    if response.status_code == 200 and existing:
        part_path.unlink()
        existing = 0

    total = response.headers.get("Content-Length")
    total_bytes = int(total) + existing if total and response.status_code == 206 else int(total or 0)

    with part_path.open("ab" if existing else "wb") as handle, tqdm(
        total=total_bytes or None,
        initial=existing,
        unit="B",
        unit_scale=True,
        desc=label,
    ) as progress:
        for chunk in response.iter_content(chunk_size=CHUNK_SIZE):
            if not chunk:
                continue
            handle.write(chunk)
            progress.update(len(chunk))

    shutil.move(part_path, destination)


def _download_gdrive_with_confirm(url: str, destination: Path, label: str) -> None:
    part_path = destination.with_suffix(destination.suffix + ".part")
    existing = part_path.stat().st_size if part_path.exists() else 0

    with requests.Session() as session:
        initial = session.get(url, allow_redirects=True, timeout=60)
        initial.raise_for_status()

        content_type = initial.headers.get("Content-Type", "")
        if "text/html" not in content_type.lower():
            if existing:
                initial.close()
                initial = session.get(url, allow_redirects=True, headers={"Range": f"bytes={existing}-"}, stream=True, timeout=60)
                initial.raise_for_status()
            else:
                initial = session.get(url, allow_redirects=True, stream=True, timeout=60)
                initial.raise_for_status()
            _stream_response_to_file(initial, destination, label)
            return

        form_payload = _extract_drive_form(initial.url, initial.text)
        if not form_payload:
            raise RuntimeError(f"Failed to parse Google Drive confirmation page for: {url}")

        form_action, params = form_payload
        headers = {"Range": f"bytes={existing}-"} if existing else None
        with session.get(form_action, params=params, headers=headers, stream=True, timeout=60) as confirmed:
            confirmed.raise_for_status()
            _stream_response_to_file(confirmed, destination, label)


def _is_valid_archive_file(path: Path) -> bool:
    if not path.exists() or path.stat().st_size < 1024:
        return False

    suffixes = [suffix.lower() for suffix in path.suffixes]
    try:
        if suffixes[-1:] == [".zip"]:
            return zipfile.is_zipfile(path)
        if suffixes[-2:] == [".tar", ".gz"] or suffixes[-1:] == [".tgz"] or suffixes[-1:] == [".tar"]:
            return tarfile.is_tarfile(path)
    except Exception:
        return False

    return True


def download_viton_hd(skip_extract: bool, skip_git: bool) -> dict[str, Any]:
    root = ensure_directory(RAW_ROOT / "tryon" / "viton-hd")
    report: dict[str, Any] = {
        "dataset": "viton-hd",
        "official_repo": "https://github.com/shadow2496/VITON-HD",
        "license": "CC-BY-NC-4.0",
        "notes": [
            "Official VITON-HD dataset is for research purposes only.",
            "This is the best directly downloadable public virtual-try-on baseline in the current project context.",
        ],
    }
    if not skip_git:
        report["repo"] = shallow_clone(root / "repo", report["official_repo"])

    official_archive = root / "archives" / "zalando-hd-resized.zip"
    mirror_archive = root / "archives" / "zalando-hd-resized.tar.gz"
    official_url = "https://drive.google.com/file/d/1tLx8LRp-sxDp0EcYmYoV_vXdSc-jJ79w/view?usp=sharing"
    mirror_url = "https://huggingface.co/datasets/zhengchong/VITON-HD/resolve/main/zalando-hd-resized.tar.gz"

    try:
        report["download"] = download_gdrive_file(official_url, official_archive, "VITON-HD dataset")
        archive = official_archive
    except Exception as error:
        report["download_error"] = str(error)
        report["download"] = download_http_file(mirror_url, mirror_archive, "VITON-HD dataset mirror")
        report["download"]["mirror"] = True
        report["download"]["original_url"] = official_url
        archive = mirror_archive

    if not skip_extract:
        report["extract"] = extract_archive(archive, root / "extracted")
    return report


def download_fashionpedia(skip_extract: bool, skip_git: bool) -> dict[str, Any]:
    root = ensure_directory(RAW_ROOT / "fashionpedia-official")
    report: dict[str, Any] = {
        "dataset": "fashionpedia",
        "official_repo": "https://github.com/cvdfoundation/fashionpedia",
        "homepage": "https://fashionpedia.github.io/home/Fashionpedia_download.html",
        "license": "CC-BY-4.0",
        "notes": [
            "Fashionpedia provides segmentation-aware fashion annotations and is a strong public bootstrap for image-processor fine-tuning.",
            "For best product cutout quality, you will still want your own garment photography later.",
        ],
    }
    if not skip_git:
        report["repo"] = shallow_clone(root / "repo", report["official_repo"])

    files = [
        (
            "train_images",
            "https://s3.amazonaws.com/ifashionist-dataset/images/train2020.zip",
            root / "archives" / "train2020.zip",
        ),
        (
            "val_test_images",
            "https://s3.amazonaws.com/ifashionist-dataset/images/val_test2020.zip",
            root / "archives" / "val_test2020.zip",
        ),
        (
            "instances_train",
            "https://s3.amazonaws.com/ifashionist-dataset/annotations/instances_attributes_train2020.json",
            root / "annotations" / "instances_attributes_train2020.json",
        ),
        (
            "instances_val",
            "https://s3.amazonaws.com/ifashionist-dataset/annotations/instances_attributes_val2020.json",
            root / "annotations" / "instances_attributes_val2020.json",
        ),
    ]

    downloads: dict[str, Any] = {}
    for label, url, destination in files:
        downloads[label] = download_http_file(url, destination, f"Fashionpedia {label}")
    report["downloads"] = downloads

    if not skip_extract:
        report["extract"] = {
            "train_images": extract_archive(root / "archives" / "train2020.zip", root / "images" / "train2020"),
            "val_test_images": extract_archive(root / "archives" / "val_test2020.zip", root / "images" / "val_test2020"),
        }
    return report


def dresscode_request_info() -> dict[str, Any]:
    return {
        "dataset": "dresscode-request",
        "official_repo": "https://github.com/aimagelab/dress-code",
        "request_form": "https://forms.gle/72Bpeh48P7zQimin7",
        "status": "manual-request-required",
        "notes": [
            "The official repo states the dataset will not be released to private companies.",
            "Non-institutional email addresses are not accepted.",
            "A signed release agreement is mandatory, so this dataset cannot be auto-downloaded here.",
        ],
    }


def main() -> None:
    args = parse_args()
    ensure_directory(RAW_ROOT)

    report: dict[str, Any] = {
        "generated_at": __import__("time").strftime("%Y-%m-%dT%H:%M:%S%z"),
        "datasets": {},
    }

    for dataset_name in args.datasets:
        if dataset_name == "viton-hd":
            report["datasets"][dataset_name] = download_viton_hd(args.skip_extract, args.skip_git)
        elif dataset_name == "fashionpedia":
            report["datasets"][dataset_name] = download_fashionpedia(args.skip_extract, args.skip_git)
        elif dataset_name == "dresscode-request":
            report["datasets"][dataset_name] = dresscode_request_info()

    write_report(report)
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
