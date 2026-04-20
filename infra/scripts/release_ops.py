from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tarfile
from datetime import datetime, timedelta, timezone
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[2]
INFRA_ROOT = PROJECT_ROOT / "infra"
COMPOSE_FILE = INFRA_ROOT / "docker" / "docker-compose.production.yml"
NGINX_FILE = INFRA_ROOT / "nginx" / "nginx.conf"
ENV_FILE = PROJECT_ROOT / ".env.production"
RUNTIME_ROOT = INFRA_ROOT / "runtime"
STATE_FILE = RUNTIME_ROOT / "current-release.json"
DEFAULT_COMPOSE_PROJECT = "ai-wardrobe-prod"
ALPINE_IMAGE = "alpine:3.20"


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _timestamp() -> str:
    return _utc_now().strftime("%Y%m%d%H%M%S")


def _print(message: str) -> None:
    print(message, flush=True)


def _fail(message: str) -> int:
    print(f"ERROR: {message}", file=sys.stderr, flush=True)
    return 1


def _require_file(path: Path, label: str) -> None:
    if not path.exists():
        raise FileNotFoundError(f"{label} was not found: {path}")


def _read_env_file(path: Path) -> dict[str, str]:
    env: dict[str, str] = {}
    if not path.exists():
        return env
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        env[key.strip()] = value.strip()
    return env


def _bool_value(raw: str | None, default: bool = False) -> bool:
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _resolve_project_path(raw_path: str | None, default: str) -> Path:
    candidate = Path((raw_path or default).strip()).expanduser()
    return candidate if candidate.is_absolute() else (PROJECT_ROOT / candidate).resolve()


def _load_runtime_env(env_file: Path, overrides: dict[str, str] | None = None) -> dict[str, str]:
    env = os.environ.copy()
    env.update(_read_env_file(env_file))
    env["AI_WARDROBE_ENV_FILE"] = str(env_file.resolve())
    env["PRODUCTION_ENV_FILE"] = str(env_file.resolve())
    if overrides:
        env.update({key: value for key, value in overrides.items() if value is not None})
    return env


def _compose_project_name(env: dict[str, str]) -> str:
    return env.get("COMPOSE_PROJECT_NAME", DEFAULT_COMPOSE_PROJECT).strip() or DEFAULT_COMPOSE_PROJECT


def _compose_cmd(env_file: Path) -> list[str]:
    return ["docker", "compose", "--env-file", str(env_file.resolve()), "-f", str(COMPOSE_FILE.resolve())]


def _quoted(parts: list[str]) -> str:
    return " ".join(f'"{part}"' if " " in part else part for part in parts)


def _run(
    command: list[str],
    *,
    cwd: Path = PROJECT_ROOT,
    env: dict[str, str] | None = None,
    capture_output: bool = False,
    check: bool = True,
) -> subprocess.CompletedProcess[str]:
    _print(f"$ {_quoted(command)}")
    return subprocess.run(
        command,
        cwd=str(cwd),
        env=env,
        text=True,
        capture_output=capture_output,
        check=check,
    )


def _capture(command: list[str], *, cwd: Path = PROJECT_ROOT, env: dict[str, str] | None = None) -> str:
    result = _run(command, cwd=cwd, env=env, capture_output=True, check=False)
    if result.returncode != 0:
        stderr = (result.stderr or "").strip()
        raise RuntimeError(stderr or f"Command failed with exit code {result.returncode}: {_quoted(command)}")
    return (result.stdout or "").strip()


def _optional_capture(command: list[str], *, cwd: Path = PROJECT_ROOT, env: dict[str, str] | None = None) -> str | None:
    try:
        return _capture(command, cwd=cwd, env=env)
    except Exception:
        return None


def _docker_available() -> bool:
    return shutil.which("docker") is not None


def _git_commit() -> str | None:
    return _optional_capture(["git", "rev-parse", "HEAD"], cwd=PROJECT_ROOT)


def _git_status() -> str | None:
    return _optional_capture(["git", "status", "--short"], cwd=PROJECT_ROOT)


def _read_state() -> dict[str, Any]:
    if not STATE_FILE.exists():
        return {}
    return json.loads(STATE_FILE.read_text(encoding="utf-8"))


def _write_state(payload: dict[str, Any]) -> None:
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def _write_json(path: Path, payload: Any) -> None:
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def _write_text(path: Path, content: str) -> None:
    path.write_text(content, encoding="utf-8")


def _archive_directory(source: Path, destination: Path) -> bool:
    if not source.exists():
        return False
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tarfile.open(destination, "w:gz") as archive:
        archive.add(source, arcname=source.name)
    return True


def _extract_archive(archive_path: Path, destination_parent: Path) -> bool:
    if not archive_path.exists():
        return False
    with tarfile.open(archive_path, "r:gz") as archive:
        archive.extractall(destination_parent)
    return True


def _clear_path(path: Path) -> None:
    if path.is_dir():
        shutil.rmtree(path)
    elif path.exists():
        path.unlink()


def _redis_volume_name(env: dict[str, str]) -> str:
    return f"{_compose_project_name(env)}_redis-data"


def _backup_redis_volume(env: dict[str, str], backup_dir: Path) -> bool:
    if not _docker_available():
        return False

    volume_name = _redis_volume_name(env)
    inspect = _run(["docker", "volume", "inspect", volume_name], capture_output=True, check=False)
    if inspect.returncode != 0:
        return False

    command = [
        "docker",
        "run",
        "--rm",
        "-v",
        f"{volume_name}:/data",
        "-v",
        f"{backup_dir.resolve()}:/backup",
        ALPINE_IMAGE,
        "sh",
        "-lc",
        "cd /data && tar -czf /backup/redis-data.tar.gz .",
    ]
    _run(command)
    return True


def _restore_redis_volume(env: dict[str, str], backup_dir: Path) -> bool:
    archive_path = backup_dir / "redis-data.tar.gz"
    if not archive_path.exists() or not _docker_available():
        return False

    volume_name = _redis_volume_name(env)
    _run(["docker", "volume", "create", volume_name], capture_output=True, check=False)
    command = [
        "docker",
        "run",
        "--rm",
        "-v",
        f"{volume_name}:/data",
        "-v",
        f"{backup_dir.resolve()}:/backup",
        ALPINE_IMAGE,
        "sh",
        "-lc",
        "rm -rf /data/* /data/.[!.]* /data/..?* 2>/dev/null || true; mkdir -p /data; tar -xzf /backup/redis-data.tar.gz -C /data",
    ]
    _run(command)
    return True


def _backup_root(env: dict[str, str]) -> Path:
    return _resolve_project_path(env.get("DEPLOY_BACKUP_ROOT"), "./infra/runtime/backups")


def _prune_old_backups(env: dict[str, str]) -> None:
    retention_days_raw = env.get("DEPLOY_BACKUP_RETENTION_DAYS", "14").strip()
    try:
        retention_days = int(retention_days_raw)
    except ValueError:
        return
    if retention_days <= 0:
        return

    root = _backup_root(env)
    if not root.exists():
        return

    cutoff = _utc_now() - timedelta(days=retention_days)
    for child in root.iterdir():
        if not child.is_dir():
            continue
        modified_at = datetime.fromtimestamp(child.stat().st_mtime, timezone.utc)
        if modified_at < cutoff:
            shutil.rmtree(child, ignore_errors=True)


def _resolve_backup_dir(raw: str, env: dict[str, str]) -> Path:
    candidate = Path(raw).expanduser()
    if candidate.is_absolute():
        return candidate
    from_root = (_backup_root(env) / candidate).resolve()
    if from_root.exists():
        return from_root
    return (PROJECT_ROOT / candidate).resolve()


def _snapshot_metadata(env: dict[str, str]) -> dict[str, Any]:
    return {
        "created_at": _utc_now().isoformat(),
        "compose_project_name": _compose_project_name(env),
        "release_tag": env.get("AI_WARDROBE_RELEASE_TAG", "latest"),
        "git_commit": _git_commit(),
        "git_status": _git_status(),
    }


def backup_release(env_file: Path, *, label: str | None = None) -> Path:
    _require_file(env_file, "Production env file")
    env = _load_runtime_env(env_file)
    backup_dir = _backup_root(env) / (label or f"backup-{_timestamp()}")
    backup_dir.mkdir(parents=True, exist_ok=True)

    manifest = _snapshot_metadata(env)
    manifest["backup_dir"] = str(backup_dir)

    if env_file.exists():
        shutil.copy2(env_file, backup_dir / env_file.name)
        manifest["env_file"] = env_file.name

    shutil.copy2(COMPOSE_FILE, backup_dir / COMPOSE_FILE.name)
    shutil.copy2(NGINX_FILE, backup_dir / NGINX_FILE.name)

    data_root = (PROJECT_ROOT / "data").resolve()
    model_training_root = (PROJECT_ROOT / "model_training").resolve()
    manifest["archives"] = {
        "data": _archive_directory(data_root, backup_dir / "data.tar.gz"),
        "model_training": _archive_directory(model_training_root, backup_dir / "model_training.tar.gz"),
        "redis": _backup_redis_volume(env, backup_dir),
    }

    if _docker_available():
        compose = _compose_cmd(env_file)
        rendered_config = _optional_capture([*compose, "config"], env=env)
        if rendered_config:
            _write_text(backup_dir / "compose.rendered.yml", rendered_config)
        compose_ps = _optional_capture([*compose, "ps"], env=env)
        if compose_ps:
            _write_text(backup_dir / "compose.ps.txt", compose_ps)
        compose_images = _optional_capture([*compose, "images"], env=env)
        if compose_images:
            _write_text(backup_dir / "compose.images.txt", compose_images)

    _write_json(backup_dir / "manifest.json", manifest)
    _prune_old_backups(env)
    _print(f"Backup completed: {backup_dir}")
    return backup_dir


def restore_backup(env_file: Path, backup: str, *, start_stack: bool = False) -> Path:
    _require_file(env_file, "Production env file")
    env = _load_runtime_env(env_file)
    backup_dir = _resolve_backup_dir(backup, env)
    if not backup_dir.exists():
        raise FileNotFoundError(f"Backup was not found: {backup_dir}")

    if _docker_available():
        compose = _compose_cmd(env_file)
        _run([*compose, "down"], env=env, check=False)

    data_root = (PROJECT_ROOT / "data").resolve()
    model_training_root = (PROJECT_ROOT / "model_training").resolve()

    data_archive = backup_dir / "data.tar.gz"
    if data_archive.exists():
        _clear_path(data_root)
        _extract_archive(data_archive, PROJECT_ROOT)

    model_archive = backup_dir / "model_training.tar.gz"
    if model_archive.exists():
        _clear_path(model_training_root)
        _extract_archive(model_archive, PROJECT_ROOT)

    backed_up_env = backup_dir / env_file.name
    if backed_up_env.exists():
        shutil.copy2(backed_up_env, env_file)

    restored_env = _load_runtime_env(env_file)
    _restore_redis_volume(restored_env, backup_dir)

    if start_stack and _docker_available():
        compose = _compose_cmd(env_file)
        _run([*compose, "up", "-d"], env=restored_env)

    _print(f"Restore completed from: {backup_dir}")
    return backup_dir


def verify_release(env_file: Path, *, cloud_smoke: bool = False) -> None:
    _require_file(env_file, "Production env file")
    env = _load_runtime_env(env_file)
    base_url = env.get("BACKEND_PUBLIC_BASE_URL", "").strip()
    if not base_url:
        gateway_port = env.get("GATEWAY_HTTP_PORT", "80").strip() or "80"
        base_url = f"http://127.0.0.1:{gateway_port}"

    probe_env = env.copy()
    probe_env["BACKEND_PUBLIC_BASE_URL"] = base_url
    _run(["python", "backend/scripts/deployment_health_probe.py"], env=probe_env)

    if cloud_smoke or _bool_value(env.get("DEPLOY_RUN_CLOUD_SMOKE"), default=False):
        _run(["python", "backend/scripts/cloud_smoke_test.py"], env=probe_env)


def deploy_release(env_file: Path, *, release_tag: str | None = None, cloud_smoke: bool = False) -> None:
    _require_file(env_file, "Production env file")
    base_env = _load_runtime_env(env_file)
    requested_tag = (release_tag or base_env.get("AI_WARDROBE_RELEASE_TAG") or f"release-{_timestamp()}").strip()
    env = _load_runtime_env(env_file, overrides={"AI_WARDROBE_RELEASE_TAG": requested_tag})

    previous_state = _read_state()
    backup_dir = backup_release(env_file, label=f"predeploy-{requested_tag}")

    compose = _compose_cmd(env_file)
    _run([*compose, "build", "frontend", "backend"], env=env)
    _run([*compose, "up", "-d", "redis", "backend", "frontend", "gateway"], env=env)
    verify_release(env_file, cloud_smoke=cloud_smoke)

    state = {
        "release_tag": requested_tag,
        "deployed_at": _utc_now().isoformat(),
        "git_commit": _git_commit(),
        "previous_release_tag": previous_state.get("release_tag"),
        "predeploy_backup": backup_dir.name,
    }
    _write_state(state)
    _print(f"Deploy completed: release_tag={requested_tag}")


def rollback_release(env_file: Path, *, release_tag: str | None = None, backup: str | None = None, cloud_smoke: bool = False) -> None:
    _require_file(env_file, "Production env file")
    state = _read_state()
    target_release = (release_tag or state.get("previous_release_tag") or "").strip()
    if not target_release:
        raise RuntimeError("No previous release tag was recorded. Pass --release-tag explicitly.")

    base_env = _load_runtime_env(env_file)
    if backup or state.get("predeploy_backup"):
        restore_backup(env_file, backup or state["predeploy_backup"], start_stack=False)

    env = _load_runtime_env(env_file, overrides={"AI_WARDROBE_RELEASE_TAG": target_release})
    compose = _compose_cmd(env_file)
    _run([*compose, "up", "-d", "--no-build", "redis", "backend", "frontend", "gateway"], env=env)
    verify_release(env_file, cloud_smoke=cloud_smoke)

    new_state = {
        "release_tag": target_release,
        "deployed_at": _utc_now().isoformat(),
        "git_commit": _git_commit(),
        "previous_release_tag": None,
        "rollback_from": state.get("release_tag"),
        "restored_backup": backup or state.get("predeploy_backup"),
    }
    _write_state(new_state)
    _print(f"Rollback completed: release_tag={target_release}")


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="AI Wardrobe production release operations.")
    parser.add_argument("--env-file", default=str(ENV_FILE), help="Path to .env.production")
    subparsers = parser.add_subparsers(dest="command", required=True)

    backup_parser = subparsers.add_parser("backup", help="Snapshot env, local data, model assets, and redis.")
    backup_parser.add_argument("--label", help="Optional backup label.")

    verify_parser = subparsers.add_parser("verify", help="Run deployment health checks and optional cloud smoke.")
    verify_parser.add_argument("--cloud-smoke", action="store_true", help="Also run backend/scripts/cloud_smoke_test.py.")

    deploy_parser = subparsers.add_parser("deploy", help="Backup, build, deploy, and verify a production release.")
    deploy_parser.add_argument("--release-tag", help="Image tag to build and deploy.")
    deploy_parser.add_argument("--cloud-smoke", action="store_true", help="Also run backend/scripts/cloud_smoke_test.py after deploy.")

    restore_parser = subparsers.add_parser("restore", help="Restore env, data, models, and redis from a backup.")
    restore_parser.add_argument("--backup", required=True, help="Backup label or absolute path.")
    restore_parser.add_argument("--start-stack", action="store_true", help="Start the production compose stack after restore.")

    rollback_parser = subparsers.add_parser("rollback", help="Roll back to the previous or specified release tag.")
    rollback_parser.add_argument("--release-tag", help="Release tag to roll back to. Defaults to the recorded previous release.")
    rollback_parser.add_argument("--backup", help="Backup label or absolute path to restore before rollback.")
    rollback_parser.add_argument("--cloud-smoke", action="store_true", help="Also run backend/scripts/cloud_smoke_test.py after rollback.")

    return parser


def main() -> int:
    parser = _parser()
    args = parser.parse_args()
    env_file = Path(args.env_file).expanduser().resolve()

    try:
        RUNTIME_ROOT.mkdir(parents=True, exist_ok=True)

        if args.command == "backup":
            backup_release(env_file, label=args.label)
        elif args.command == "verify":
            verify_release(env_file, cloud_smoke=args.cloud_smoke)
        elif args.command == "deploy":
            deploy_release(env_file, release_tag=args.release_tag, cloud_smoke=args.cloud_smoke)
        elif args.command == "restore":
            restore_backup(env_file, args.backup, start_stack=args.start_stack)
        elif args.command == "rollback":
            rollback_release(env_file, release_tag=args.release_tag, backup=args.backup, cloud_smoke=args.cloud_smoke)
        else:
            return _fail(f"Unsupported command: {args.command}")
    except Exception as exc:
        return _fail(f"{type(exc).__name__}: {exc}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
