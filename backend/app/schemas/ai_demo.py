from pydantic import BaseModel, Field


class AiDemoWorkflow(BaseModel):
    id: str
    title: str
    model_name: str
    task: str
    priority: str
    gpu_requirement: str
    stage: str
    api_route: str
    sample_prompt: str
    sample_image_hint: str | None = None
    summary: str
    service_slot: str
    configured_worker_url: str | None = None
    delivery_mode: str


class AiDemoArtifact(BaseModel):
    kind: str
    label: str
    value: str | None = None
    preview_url: str | None = None
    payload: dict | list | None = None


class AiDemoRunRequest(BaseModel):
    workflow_id: str
    prompt: str = Field(default="")
    source_image_url: str | None = None
    garment_name: str | None = None
    style: str | None = None
    occasion: str | None = None
    weather: str | None = None


class AiDemoRunResponse(BaseModel):
    workflow_id: str
    workflow_title: str
    provider_mode: str
    status: str
    headline: str
    summary: str
    model_upgrade_path: str
    artifacts: list[AiDemoArtifact]


class AiDemoServiceStatus(BaseModel):
    workflow_id: str
    title: str
    service_slot: str
    configured: bool
    healthy: bool | None = None
    mode: str
    worker_url: str | None = None
    note: str
