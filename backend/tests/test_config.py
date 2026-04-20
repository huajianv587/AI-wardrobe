from core import config


def test_resolve_env_files_uses_test_env_files_without_base_env(monkeypatch):
    monkeypatch.delenv("AI_WARDROBE_ENV_FILE", raising=False)
    monkeypatch.setenv("APP_ENV", "test")

    env_files = config._resolve_env_files()

    assert env_files == (
        str(config.ROOT_DIR / ".env.test"),
        str(config.ROOT_DIR / ".env.test.local"),
    )


def test_resolve_env_files_uses_forced_env_file_exclusively(monkeypatch):
    monkeypatch.setenv("AI_WARDROBE_ENV_FILE", ".env.test.example")
    monkeypatch.setenv("APP_ENV", "production")

    env_files = config._resolve_env_files()

    assert env_files == (str(config.ROOT_DIR / ".env.test.example"),)


def test_settings_resolve_relative_project_paths_from_repo_root():
    resolved = config.Settings(
        _env_file=(),
        database_url="sqlite:///./data/ai_wardrobe.test.db",
        local_storage_root="./data/assets",
        model_training_dir="../model_training",
        fashion_model_root="./data/models/fashion",
    )

    assert resolved.database_url == f"sqlite:///{(config.ROOT_DIR / 'data' / 'ai_wardrobe.test.db').resolve().as_posix()}"
    assert resolved.local_storage_root == str((config.ROOT_DIR / "data" / "assets").resolve())
    assert resolved.model_training_dir == str((config.ROOT_DIR / ".." / "model_training").resolve())
    assert resolved.fashion_model_root == str((config.ROOT_DIR / "data" / "models" / "fashion").resolve())


def test_discover_root_dir_prefers_repo_root_when_monorepo_markers_exist(tmp_path):
    repo_root = tmp_path / "repo"
    config_file = repo_root / "backend" / "core" / "config.py"
    (repo_root / "backend" / "core").mkdir(parents=True)
    (repo_root / "frontend").mkdir()
    config_file.write_text("# test", encoding="utf-8")

    assert config._discover_root_dir(config_file) == repo_root


def test_discover_root_dir_falls_back_to_backend_dir_inside_backend_only_image(tmp_path):
    backend_root = tmp_path / "app"
    config_file = backend_root / "core" / "config.py"
    (backend_root / "core").mkdir(parents=True)
    config_file.write_text("# test", encoding="utf-8")

    assert config._discover_root_dir(config_file) == backend_root
