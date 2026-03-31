from pydantic import BaseModel, Field


class RecommendationRequest(BaseModel):
    prompt: str = Field(min_length=3)
    weather: str | None = None
    scene: str | None = None
    style: str | None = None


class RecommendationOption(BaseModel):
    title: str
    rationale: str
    item_ids: list[int]
    confidence: float | None = None
    confidence_label: str | None = None
    key_item_id: int | None = None
    substitute_item_ids: list[int] = Field(default_factory=list)
    reason_badges: list[str] = Field(default_factory=list)
    charm_copy: str | None = None
    mood_emoji: str | None = None


class AgentTraceStep(BaseModel):
    node: str
    summary: str


class RecommendationResponse(BaseModel):
    source: str
    outfits: list[RecommendationOption]
    agent_trace: list[AgentTraceStep]
    profile_summary: str | None = None
    closet_gaps: list[str] = Field(default_factory=list)
    reminder_flags: list[str] = Field(default_factory=list)
