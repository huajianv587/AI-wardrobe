.PHONY: help up down logs fmt check test worker queue-smoke frontend-build e2e miniprogram-build mobile-smoke training-smoke ci-local prod-up prod-down prod-logs ci-health release-backup release-verify release-deploy release-restore release-rollback

BACKEND_PY := $(if $(wildcard backend/.venv/Scripts/python.exe),$(abspath backend/.venv/Scripts/python.exe),python)

help:
	@echo "Available targets:"
	@echo "  up    - start local services"
	@echo "  down  - stop local services"
	@echo "  logs  - tail docker compose logs"
	@echo "  prod-up    - start the production compose stack"
	@echo "  prod-down  - stop the production compose stack"
	@echo "  prod-logs  - tail production compose logs"
	@echo "  release-backup   - snapshot env, local data, model assets, and redis for production rollback"
	@echo "  release-verify   - run the production health probe against the configured base URL"
	@echo "  release-deploy   - backup, build, deploy, and verify a tagged production release"
	@echo "  release-restore  - restore a named production backup (set BACKUP=<label-or-path>)"
	@echo "  release-rollback - roll back to the previous or specified release tag (set RELEASE_TAG=<tag> optionally)"
	@echo "  ci-health  - run the deployment health probe against BACKEND_PUBLIC_BASE_URL"
	@echo "  fmt          - run frontend lint checks"
	@echo "  check        - run backend tests and frontend build"
	@echo "  test         - run backend pytest suite"
	@echo "  worker       - start the backend RQ worker"
	@echo "  queue-smoke  - run the real Redis -> RQ -> worker smoke validation"
	@echo "  frontend-build - build the Next.js frontend"
	@echo "  e2e          - run Playwright end-to-end checks"
	@echo "  miniprogram-build - build the WeChat mini-program shell"
	@echo "  mobile-smoke - run the Expo shell smoke command"
	@echo "  training-smoke - compile and dry-run key training/data-prep CLIs"
	@echo "  ci-local     - run the local verification pipeline"

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f

prod-up:
	docker compose --env-file .env.production -f infra/docker/docker-compose.production.yml up -d --build

prod-down:
	docker compose --env-file .env.production -f infra/docker/docker-compose.production.yml down

prod-logs:
	docker compose --env-file .env.production -f infra/docker/docker-compose.production.yml logs -f

release-backup:
	$(BACKEND_PY) infra/scripts/release_ops.py backup

release-verify:
	$(BACKEND_PY) infra/scripts/release_ops.py verify

release-deploy:
	$(BACKEND_PY) infra/scripts/release_ops.py deploy $(if $(RELEASE_TAG),--release-tag $(RELEASE_TAG),)

release-restore:
	$(BACKEND_PY) infra/scripts/release_ops.py restore --backup $(BACKUP)

release-rollback:
	$(BACKEND_PY) infra/scripts/release_ops.py rollback $(if $(RELEASE_TAG),--release-tag $(RELEASE_TAG),)

ci-health:
	$(BACKEND_PY) backend/scripts/deployment_health_probe.py

fmt:
	cd frontend && npm run lint

check: test frontend-build

test:
	cd backend && PYTHONPATH=. $(BACKEND_PY) -m pytest tests -q

worker:
	cd backend && $(BACKEND_PY) worker.py

queue-smoke:
	cd backend && $(BACKEND_PY) scripts/smoke_queue_validation.py

frontend-build:
	cd frontend && npm run build

e2e:
	cd frontend && npm run test:e2e

miniprogram-build:
	cd miniprogram && npm run build:weapp

mobile-smoke:
	cd mobile-app && npm run smoke

training-smoke:
	$(BACKEND_PY) -c "from pathlib import Path; import py_compile; [py_compile.compile(str(path), doraise=True) for folder in [Path('training/data-prep'), Path('training/lora-finetune')] for path in sorted(folder.glob('*.py'))]"
	$(BACKEND_PY) training/data-prep/prepare_AAtrain_bundle.py --help
	$(BACKEND_PY) training/data-prep/package_AAtrain_for_cloud.py --help
	$(BACKEND_PY) training/data-prep/validate_multimodal_reader_jsonl.py --help
	$(BACKEND_PY) training/lora-finetune/train_llm_recommender.py --help
	$(BACKEND_PY) training/lora-finetune/merge_llm_recommender_lora.py --help
	$(BACKEND_PY) training/lora-finetune/register_qwen_vl_dataset.py --help

ci-local: test frontend-build e2e miniprogram-build mobile-smoke training-smoke queue-smoke
