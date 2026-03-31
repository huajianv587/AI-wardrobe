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


class AgentTraceStep(BaseModel):
    node: str
    summary: str


class RecommendationResponse(BaseModel):
    source: str
    outfits: list[RecommendationOption]
    agent_trace: list[AgentTraceStep]