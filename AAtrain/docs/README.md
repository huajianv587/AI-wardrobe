# Project Docs

This folder captures the architecture, API contract, storage strategy, and roadmap decisions for AI Wardrobe.

Included now:

- `architecture.md`: system layers and module responsibilities
- `api-spec.md`: initial MVP HTTP endpoints
- `cloud-5090-training-runbook.md`: cloud RTX 5090 training, licensing, and deployment checklist
- `deployment-checklist.md`: the fast preflight list for production launch
- `local-vllm.md`: local OpenAI-compatible vLLM startup and URL configuration
- `multimodal-reader-cloud-runbook.md`: private garment import, Qwen VL finetune, and multimodal deployment path
- `model-serving-stack.md`: vLLM + Docker + Nginx + production env model serving reference
- `release-runbook.md`: backup, deploy, verify, restore, and rollback workflow
- `supabase-setup.md`: required and optional environment values for the Supabase product database setup

The documents are intentionally concise at this stage and should evolve together with the codebase.
