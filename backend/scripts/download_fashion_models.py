from __future__ import annotations

from pathlib import Path
import shutil
from urllib.request import urlretrieve


ROOT = Path(__file__).resolve().parents[1] / "data" / "models" / "fashion"
SAM2_DIR = ROOT / "sam2"
SCHP_DIR = ROOT / "schp"
YOLO_DIR = ROOT / "yolo"

SAM2_CHECKPOINTS = {
    "sam2.1_hiera_small.pt": "https://dl.fbaipublicfiles.com/segment_anything_2/092824/sam2.1_hiera_small.pt",
}
SCHP_CHECKPOINTS = {
    "atr": {
        "exp-schp-201908301523-atr.pth": "https://huggingface.co/panyanyany/Self-Correction-Human-Parsing/resolve/main/schp/exp-schp-201908301523-atr.pth",
    },
    "lip": {
        "exp-schp-201908261155-lip.pth": "https://huggingface.co/panyanyany/Self-Correction-Human-Parsing/resolve/main/schp/exp-schp-201908261155-lip.pth",
    },
}


def ensure_directory(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def download_file(target: Path, url: str) -> None:
    if target.exists() and target.stat().st_size > 0:
        print(f"[skip] {target}")
        return
    print(f"[download] {target.name}")
    urlretrieve(url, target)


def prime_yolo_weights() -> None:
    try:
        from ultralytics import YOLO
    except Exception as exc:  # pragma: no cover - optional dependency path
        print(f"[warn] ultralytics unavailable, skip YOLO cache prime: {exc}")
        return
    ensure_directory(YOLO_DIR)
    try:
        model = YOLO("yolo26n.pt")
        target = YOLO_DIR / "yolo26n.pt"
        candidates = [
            Path(str(getattr(model, "ckpt_path", "") or "")),
            Path.cwd() / "yolo26n.pt",
            Path(__file__).resolve().parents[1] / "yolo26n.pt",
        ]
        copied = False
        for candidate in candidates:
            if not str(candidate):
                continue
            if not candidate.exists():
                continue
            if candidate.resolve() != target.resolve():
                shutil.copy2(candidate, target)
            copied = True
            break
        if copied:
            print(f"[ok] yolo26n.pt staged at {target}")
        else:
            print("[ok] yolo26n.pt cached by ultralytics")
    except Exception as exc:  # pragma: no cover - optional dependency path
        print(f"[warn] could not prime YOLO weights: {exc}")


def download_fashionclip() -> None:
    try:
        from huggingface_hub import snapshot_download
    except Exception as exc:  # pragma: no cover - optional dependency path
        print(f"[warn] huggingface_hub unavailable, skip FashionCLIP: {exc}")
        return
    destination = ROOT / "fashion-clip"
    ensure_directory(destination)
    snapshot_download(
        repo_id="patrickjohncyh/fashion-clip",
        local_dir=destination,
        local_dir_use_symlinks=False,
        ignore_patterns=["*.msgpack", "*.h5", "*.ot"],
    )
    print("[ok] FashionCLIP snapshot downloaded")


def main() -> None:
    ensure_directory(ROOT)
    ensure_directory(SAM2_DIR)
    ensure_directory(SCHP_DIR)
    ensure_directory(YOLO_DIR)

    for filename, url in SAM2_CHECKPOINTS.items():
        download_file(SAM2_DIR / filename, url)

    for dataset, checkpoints in SCHP_CHECKPOINTS.items():
        dataset_dir = SCHP_DIR / dataset
        ensure_directory(dataset_dir)
        for filename, url in checkpoints.items():
            download_file(dataset_dir / filename, url)

    prime_yolo_weights()
    download_fashionclip()

    print()
    print("SCHP 官方权重请按官方仓库说明手动放入以下目录：")
    print(f"  - {SCHP_DIR / 'atr'}")
    print(f"  - {SCHP_DIR / 'lip'}")


if __name__ == "__main__":
    main()
