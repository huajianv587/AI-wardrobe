.PHONY: help up down logs fmt test

help:
	@echo "Available targets:"
	@echo "  up    - start local services"
	@echo "  down  - stop local services"
	@echo "  logs  - tail docker compose logs"
	@echo "  fmt   - placeholder formatting target"
	@echo "  test  - placeholder test target"

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f

fmt:
	@echo "Add frontend/backend format commands here."

test:
	@echo "Add frontend/backend test commands here."
