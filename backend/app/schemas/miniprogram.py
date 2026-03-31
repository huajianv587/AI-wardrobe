from pydantic import BaseModel


class MiniProgramShortcut(BaseModel):
    id: str
    title: str
    subtitle: str
    route: str
    badge: str | None = None


class MiniProgramWorkflowPreview(BaseModel):
    id: str
    title: str
    priority: str
    stage: str


class MiniProgramHomeResponse(BaseModel):
    greeting: str
    user_email: str
    wardrobe_count: int
    synced_count: int
    recommended_prompt: str
    shortcuts: list[MiniProgramShortcut]
    workflow_preview: list[MiniProgramWorkflowPreview]


class MiniProgramWardrobeCard(BaseModel):
    id: int
    name: str
    category: str
    color: str
    preview_url: str | None = None
    tags: list[str]


class MiniProgramWardrobeResponse(BaseModel):
    title: str
    items_total: int
    cards: list[MiniProgramWardrobeCard]


class MiniProgramAccountResponse(BaseModel):
    user_email: str
    mode: str
    cloud_enabled: bool
    items_total: int
    synced_count: int
    latest_cloud_sync_at: str | None = None
