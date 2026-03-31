from __future__ import annotations

from dataclasses import dataclass
import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from app.models.user import User
from app.schemas.ai_demo import AiDemoArtifact, AiDemoRunRequest, AiDemoRunResponse, AiDemoServiceStatus, AiDemoWorkflow
from core import local_model
from core.config import settings


@dataclass(frozen=True)
class WorkflowConfig:
    id: str
    title: str
    model_name: str
    task: str
    priority: str
    gpu_requirement: str
    stage: str
    api_route: str
    sample_prompt: str
    summary: str
    service_slot: str
    settings_attr: str
    sample_image_hint: str | None = None


WORKFLOW_CONFIGS: tuple[WorkflowConfig, ...] = (
    WorkflowConfig(
        id="qwen-outfit-recommendation",
        title="Styling Text Generation",
        model_name="Qwen2.5-7B LoRA",
        task="穿搭推荐文案与整套建议",
        priority="P1",
        gpu_requirement="~20GB (5090 OK)",
        stage="demo-api",
        api_route="/api/v1/ai-demo/run",
        sample_prompt="Office meeting tomorrow, soft but professional",
        summary="Current demo uses API orchestration and heuristic wardrobe retrieval. Later you can swap in your fine-tuned LoRA endpoint without changing the contract.",
        service_slot="llm-recommender",
        settings_attr="llm_recommender_api_url",
    ),
    WorkflowConfig(
        id="birefnet-background-removal",
        title="Garment Cutout",
        model_name="BiRefNet / RMBG-2.0",
        task="衣物抠图与白底图",
        priority="P1",
        gpu_requirement="~8GB (inference only)",
        stage="demo-api",
        api_route="/api/v1/ai-demo/run",
        sample_prompt="Create a clean white-background garment image",
        sample_image_hint="Upload a garment source image in the wardrobe page first.",
        summary="The demo returns a pipeline plan and preview metadata. Later this same endpoint can call your self-hosted BiRefNet inference service.",
        service_slot="image-processor",
        settings_attr="image_processor_api_url",
    ),
    WorkflowConfig(
        id="clip-wardrobe-classifier",
        title="Wardrobe Classification",
        model_name="CLIP ViT-L/14",
        task="衣物分类、标签与检索 embedding",
        priority="P2",
        gpu_requirement="~4GB (inference only)",
        stage="demo-api",
        api_route="/api/v1/ai-demo/run",
        sample_prompt="Classify this garment and extract tags",
        summary="The API-first demo returns category, tags, and retrieval hints. Later you can point it to your own CLIP or SigLIP service.",
        service_slot="classifier",
        settings_attr="classifier_api_url",
    ),
    WorkflowConfig(
        id="qwen-vl-attribute-understanding",
        title="Multimodal Attribute Reading",
        model_name="Qwen-VL-7B LoRA",
        task="颜色、材质、风格、场景理解",
        priority="P2",
        gpu_requirement="~24GB (5090 OK)",
        stage="demo-api",
        api_route="/api/v1/ai-demo/run",
        sample_prompt="Describe the style, fabric, and mood of this garment",
        summary="The demo surfaces attribute JSON and copywriting. Later you can replace it with your own Qwen-VL adapter.",
        service_slot="multimodal-reader",
        settings_attr="multimodal_reader_api_url",
    ),
    WorkflowConfig(
        id="ootdiffusion-virtual-tryon",
        title="Virtual Try-On",
        model_name="OOTDiffusion / VITON",
        task="虚拟试衣效果生成",
        priority="P3",
        gpu_requirement="~18GB",
        stage="demo-api",
        api_route="/api/v1/ai-demo/run",
        sample_prompt="Generate a polished try-on preview for a weekend look",
        summary="The demo currently returns compositing instructions, palette, and expected output slots. Later you can swap to OOTDiffusion or VITON inference.",
        service_slot="virtual-tryon",
        settings_attr="virtual_tryon_api_url",
    ),
    WorkflowConfig(
        id="realesrgan-upscale",
        title="Detail Upscaling",
        model_name="Real-ESRGAN",
        task="超分与细节增强",
        priority="P3",
        gpu_requirement="~4GB (inference only)",
        stage="demo-api",
        api_route="/api/v1/ai-demo/run",
        sample_prompt="Upscale the result for product display",
        summary="The demo returns upscale settings and expected output descriptors. Later it can call your own Real-ESRGAN worker.",
        service_slot="image-processor",
        settings_attr="image_processor_api_url",
    ),
    WorkflowConfig(
        id="controlnet-product-shot",
        title="Product Hero Render",
        model_name="ControlNet + SD",
        task="商品展示图与美工图",
        priority="P4",
        gpu_requirement="~18-24GB",
        stage="demo-api",
        api_route="/api/v1/ai-demo/run",
        sample_prompt="Create a soft e-commerce hero shot with clean lighting",
        summary="The demo outlines the composition recipe. Later the same interface can drive your own ControlNet-based render pipeline.",
        service_slot="product-renderer",
        settings_attr="product_renderer_api_url",
    ),
    WorkflowConfig(
        id="triposr-avatar-rebuild",
        title="2.5D / 3D Reconstruction",
        model_name="TripoSR / InstantMesh",
        task="人体或单品重建入口",
        priority="P4",
        gpu_requirement="~12GB",
        stage="demo-api",
        api_route="/api/v1/ai-demo/run",
        sample_prompt="Prepare a lightweight 3D-ready avatar asset",
        summary="The demo focuses on API orchestration and output contracts, so you can later plug in TripoSR or InstantMesh without rewriting the product flow.",
        service_slot="avatar-builder",
        settings_attr="avatar_builder_api_url",
    ),
)

WORKFLOW_INDEX = {config.id: config for config in WORKFLOW_CONFIGS}


def _configured_worker_url(config: WorkflowConfig) -> str | None:
    if local_model.should_use_local_model(config.service_slot):
        return None
    value = getattr(settings, config.settings_attr, "")
    if isinstance(value, str):
        value = value.strip()
    return value or None


def _health_url(base_url: str) -> str:
    return f"{base_url.rstrip('/')}/health"


def _infer_url(base_url: str) -> str:
    return f"{base_url.rstrip('/')}/infer"


def _json_request(url: str, method: str, payload: dict | None = None) -> dict:
    body = None if payload is None else json.dumps(payload).encode("utf-8")
    request = Request(
        url,
        data=body,
        method=method,
        headers={"Content-Type": "application/json"},
    )

    with urlopen(request, timeout=settings.ai_demo_adapter_timeout_seconds) as response:
        raw = response.read().decode("utf-8")
        return json.loads(raw) if raw else {}


def _probe_worker(config: WorkflowConfig) -> AiDemoServiceStatus:
    worker_url = _configured_worker_url(config)

    if not worker_url:
        return AiDemoServiceStatus(
            workflow_id=config.id,
            title=config.title,
            service_slot=config.service_slot,
            configured=False,
            healthy=None,
            mode="demo-fallback",
            worker_url=None,
            note="No external worker URL is configured yet. The backend will return the built-in demo contract.",
        )

    try:
        payload = _json_request(_health_url(worker_url), "GET")
        worker_mode = payload.get("mode", "external")
        return AiDemoServiceStatus(
            workflow_id=config.id,
            title=config.title,
            service_slot=config.service_slot,
            configured=True,
            healthy=True,
            mode=f"external:{worker_mode}",
            worker_url=worker_url,
            note="External worker is reachable. Requests can already flow through the FastAPI adapter.",
        )
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError, OSError) as exc:
        return AiDemoServiceStatus(
            workflow_id=config.id,
            title=config.title,
            service_slot=config.service_slot,
            configured=True,
            healthy=False,
            mode="configured-fallback",
            worker_url=worker_url,
            note=f"Worker URL is configured but currently unreachable, so the backend will fall back to the built-in demo. Detail: {exc}",
        )


def list_workflows() -> list[AiDemoWorkflow]:
    return [
        AiDemoWorkflow(
            id=config.id,
            title=config.title,
            model_name=config.model_name,
            task=config.task,
            priority=config.priority,
            gpu_requirement=config.gpu_requirement,
            stage=config.stage,
            api_route=config.api_route,
            sample_prompt=config.sample_prompt,
            sample_image_hint=config.sample_image_hint,
            summary=config.summary,
            service_slot=config.service_slot,
            configured_worker_url=_configured_worker_url(config),
            delivery_mode="external-proxy-ready" if _configured_worker_url(config) else "demo-fallback",
        )
        for config in WORKFLOW_CONFIGS
    ]


def list_service_statuses() -> list[AiDemoServiceStatus]:
    return [_probe_worker(config) for config in WORKFLOW_CONFIGS]


def _source_image_preview(source_image_url: str | None) -> str | None:
    return source_image_url if source_image_url else None


def _demo_artifacts_for_workflow(request: AiDemoRunRequest, user: User, wardrobe_count: int) -> list[AiDemoArtifact]:
    prompt = request.prompt or "Use the current wardrobe as the base context."
    occasion = request.occasion or "daily"
    style = request.style or "soft minimal"
    weather = request.weather or "mild weather"

    if request.workflow_id == "qwen-outfit-recommendation":
        return [
            AiDemoArtifact(kind="text", label="Prompt", value=prompt),
            AiDemoArtifact(kind="text", label="Demo answer", value=f"For {occasion}, keep the silhouette {style}, anchor with one hero piece, and balance the palette for {weather}."),
            AiDemoArtifact(kind="json", label="Wardrobe context", payload={"user_email": user.email, "wardrobe_items_seen": wardrobe_count}),
        ]

    if request.workflow_id == "birefnet-background-removal":
        return [
            AiDemoArtifact(kind="image", label="Source preview", preview_url=_source_image_preview(request.source_image_url), value=request.source_image_url or "No source image supplied yet."),
            AiDemoArtifact(kind="text", label="Pipeline", value="load image -> cutout -> edge refine -> export white background"),
            AiDemoArtifact(kind="json", label="Adapter contract", payload={"future_worker": "birefnet", "expected_output": "png-with-alpha-or-white-bg"}),
        ]

    if request.workflow_id == "clip-wardrobe-classifier":
        return [
            AiDemoArtifact(kind="text", label="Predicted category", value=request.garment_name or "outerwear"),
            AiDemoArtifact(kind="json", label="Predicted tags", payload=["minimal", "city", "layering", "soft-structured"]),
            AiDemoArtifact(kind="json", label="Retrieval features", payload={"embedding_ready": True, "vector_dim_note": "Swap in your own CLIP service later."}),
        ]

    if request.workflow_id == "qwen-vl-attribute-understanding":
        return [
            AiDemoArtifact(kind="text", label="Visual summary", value=f"The garment reads as {style} with a soft premium finish and is suitable for {occasion}."),
            AiDemoArtifact(kind="json", label="Attributes", payload={"color_family": "warm neutral", "fabric_guess": "cotton blend", "mood": "gentle polished"}),
            AiDemoArtifact(kind="image", label="Input reference", preview_url=_source_image_preview(request.source_image_url), value=request.source_image_url),
        ]

    if request.workflow_id == "ootdiffusion-virtual-tryon":
        return [
            AiDemoArtifact(kind="text", label="Scene direction", value=f"Compose a {style} try-on preview for {occasion}."),
            AiDemoArtifact(kind="json", label="Expected layers", payload={"avatar": "2.5D base body", "garment": request.garment_name or "selected garment", "output": "front-view styled composite"}),
            AiDemoArtifact(kind="text", label="Runtime note", value="Current demo is API orchestration only; later swap the worker to OOTDiffusion or VITON."),
        ]

    if request.workflow_id == "realesrgan-upscale":
        return [
            AiDemoArtifact(kind="text", label="Enhancement plan", value="2x upscale, preserve fabric edges, reduce compression artifacts"),
            AiDemoArtifact(kind="image", label="Input reference", preview_url=_source_image_preview(request.source_image_url), value=request.source_image_url),
            AiDemoArtifact(kind="json", label="Output target", payload={"resolution_goal": "1536px short edge", "worker": "realesrgan"}),
        ]

    if request.workflow_id == "controlnet-product-shot":
        return [
            AiDemoArtifact(kind="text", label="Art direction", value="Soft studio light, creamy backdrop, one hero garment angle, premium editorial warmth"),
            AiDemoArtifact(kind="json", label="Prompt blocks", payload={"subject": request.garment_name or "hero garment", "background": "buttercream gradient", "camera": "3/4 angle product shot"}),
            AiDemoArtifact(kind="text", label="Cost strategy", value="Prototype with API today, later swap to your own SD/ControlNet worker to reduce per-image cost."),
        ]

    return [
        AiDemoArtifact(kind="text", label="3D prep summary", value="Collect multi-view references, normalize pose, export lightweight reconstruction package."),
        AiDemoArtifact(kind="json", label="Worker handoff", payload={"future_worker": "triposr-or-instantmesh", "output": "glb + preview turntable"}),
        AiDemoArtifact(kind="text", label="Product note", value="MVP stays 2.5D first, then upgrades the same API contract when your own 3D worker is ready."),
    ]


def _build_external_payload(config: WorkflowConfig, request: AiDemoRunRequest, user: User, wardrobe_count: int) -> dict:
    prompt = request.prompt or config.sample_prompt
    source_image_url = request.source_image_url or ""

    if config.id == "qwen-outfit-recommendation":
        return {
            "prompt": prompt,
            "wardrobe_count": wardrobe_count,
            "occasion": request.occasion,
            "style": request.style,
            "weather": request.weather,
            "user_email": user.email,
        }

    if config.id in {"birefnet-background-removal", "realesrgan-upscale"}:
        return {
            "image_url": source_image_url,
            "task": "cutout" if config.id == "birefnet-background-removal" else "upscale",
        }

    if config.id == "clip-wardrobe-classifier":
        return {"image_url": source_image_url}

    if config.id == "qwen-vl-attribute-understanding":
        return {
            "image_url": source_image_url,
            "prompt": prompt,
            "garment_name": request.garment_name,
        }

    if config.id == "ootdiffusion-virtual-tryon":
        return {
            "person_image_url": "",
            "garment_image_url": source_image_url,
        }

    if config.id == "controlnet-product-shot":
        return {
            "image_url": source_image_url,
            "prompt": prompt,
            "garment_name": request.garment_name,
        }

    return {
        "source_images": [source_image_url] if source_image_url else [],
        "prompt": prompt,
    }


def _external_artifacts(worker_url: str, payload: dict, upstream: dict, source_image_url: str | None) -> list[AiDemoArtifact]:
    artifacts = [
        AiDemoArtifact(kind="text", label="Adapter target", value=worker_url),
        AiDemoArtifact(kind="json", label="Worker request", payload=payload),
        AiDemoArtifact(kind="json", label="Worker response", payload=upstream),
    ]

    if source_image_url:
        artifacts.insert(
            1,
            AiDemoArtifact(kind="image", label="Input reference", preview_url=source_image_url, value=source_image_url),
        )

    return artifacts


def run_workflow(request: AiDemoRunRequest, user: User, wardrobe_count: int) -> AiDemoRunResponse:
    config = WORKFLOW_INDEX.get(request.workflow_id)
    if config is None:
        raise ValueError(f"Unknown workflow: {request.workflow_id}")

    worker_url = _configured_worker_url(config)
    if worker_url:
        payload = _build_external_payload(config, request, user, wardrobe_count)

        try:
            upstream = _json_request(_infer_url(worker_url), "POST", payload)
            return AiDemoRunResponse(
                workflow_id=config.id,
                workflow_title=config.title,
                provider_mode="external-adapter",
                status="proxied",
                headline=f"{config.title} worker responded through FastAPI",
                summary="This request already went through the API adapter layer, so you can swap stubs for your own hosted worker without changing the product flow.",
                model_upgrade_path=f"Worker connected at {worker_url}. Replace the current stub implementation with your trained {config.model_name} deployment when ready.",
                artifacts=_external_artifacts(worker_url, payload, upstream, request.source_image_url),
            )
        except (HTTPError, URLError, TimeoutError, json.JSONDecodeError, OSError) as exc:
            fallback_artifacts = [
                AiDemoArtifact(kind="text", label="Adapter fallback note", value=f"External worker failed, so the built-in demo contract was returned instead. Detail: {exc}"),
                *_demo_artifacts_for_workflow(request, user, wardrobe_count),
            ]
            return AiDemoRunResponse(
                workflow_id=config.id,
                workflow_title=config.title,
                provider_mode="external-adapter-fallback",
                status="fallback",
                headline=f"{config.title} fell back to the built-in demo",
                summary="A worker URL is configured, but the request could not complete against that external service. The API stayed stable and returned the local demo contract instead.",
                model_upgrade_path=f"Keep the same route and fix the worker behind {worker_url} when your model deployment is ready.",
                artifacts=fallback_artifacts,
            )

    return AiDemoRunResponse(
        workflow_id=config.id,
        workflow_title=config.title,
        provider_mode="api-demo -> self-hostable-adapter",
        status="ready",
        headline=f"{config.title} demo response generated through API orchestration",
        summary=config.summary,
        model_upgrade_path=f"Replace the adapter behind {config.id} with your own {config.model_name} deployment later.",
        artifacts=_demo_artifacts_for_workflow(request, user, wardrobe_count),
    )
