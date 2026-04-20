from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.recommendation import RecommendationResponse
from app.schemas.wardrobe import ClothingMemoryCardRead


class GeoLocationOption(BaseModel):
    name: str
    country: str | None = None
    admin1: str | None = None
    latitude: float
    longitude: float
    timezone: str | None = None


class TomorrowAssistantRequest(BaseModel):
    location_query: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    timezone: str | None = None
    schedule: str = "Workday with normal commute"
    has_commute: bool = True
    date: str | None = None


class CurrentWeatherRequest(BaseModel):
    location_query: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    timezone: str | None = None
    location_name: str | None = None


class WeatherSummary(BaseModel):
    location_name: str
    timezone: str
    date: str
    weather_code: int
    condition_label: str
    temperature_max: float
    temperature_min: float
    precipitation_probability_max: float | None = None


class CurrentWeatherResponse(BaseModel):
    location_name: str
    timezone: str
    current_time: str
    weather_code: int
    condition_label: str
    condition_label_zh: str
    temperature: float
    apparent_temperature: float | None = None
    wind_speed: float | None = None
    is_day: bool | None = None
    precipitation: float | None = None
    temperature_max: float | None = None
    temperature_min: float | None = None
    precipitation_probability_max: float | None = None
    outfit_hint: str


class TomorrowPlanBlock(BaseModel):
    period: str
    summary: str
    recommendation: RecommendationResponse


class TomorrowAssistantResponse(BaseModel):
    weather: WeatherSummary
    morning: TomorrowPlanBlock
    evening: TomorrowPlanBlock
    commute_tip: str


class QuickModeRequest(BaseModel):
    mode: str


class GapInsight(BaseModel):
    title: str
    description: str
    urgency: str


class ClosetGapResponse(BaseModel):
    summary: str
    insights: list[GapInsight]


class PackingRequest(BaseModel):
    city: str
    days: int = Field(ge=1, le=21)
    trip_kind: str = "city break"
    include_commute: bool = False


class PackingSuggestion(BaseModel):
    item_id: int
    reason: str


class PackingResponse(BaseModel):
    city: str
    weather: WeatherSummary
    capsule_summary: str
    suggestions: list[PackingSuggestion]


class ReminderCard(BaseModel):
    title: str
    description: str
    tone: str
    item_ids: list[int] = Field(default_factory=list)


class ReminderResponse(BaseModel):
    repeat_warning: list[ReminderCard]
    laundry_and_care: list[ReminderCard]
    idle_and_seasonal: list[ReminderCard]


class StyleProfilePayload(BaseModel):
    favorite_colors: list[str] = Field(default_factory=list)
    avoid_colors: list[str] = Field(default_factory=list)
    favorite_silhouettes: list[str] = Field(default_factory=list)
    avoid_silhouettes: list[str] = Field(default_factory=list)
    style_keywords: list[str] = Field(default_factory=list)
    dislike_keywords: list[str] = Field(default_factory=list)
    commute_profile: str | None = None
    comfort_priorities: list[str] = Field(default_factory=list)
    wardrobe_rules: list[str] = Field(default_factory=list)
    personal_note: str | None = None


class StyleProfileResponse(StyleProfilePayload):
    model_config = ConfigDict(from_attributes=True)

    user_id: int
    updated_at: datetime | None = None


class RecommendationSignalPayload(BaseModel):
    prompt: str | None = None
    scene: str | None = None
    action: str
    item_ids: list[int] = Field(default_factory=list)
    feedback_note: str | None = None
    metadata_json: dict = Field(default_factory=dict)


class StatusMessageResponse(BaseModel):
    status: str
    message: str


class SavedOutfitPayload(BaseModel):
    name: str
    occasion: str | None = None
    style: str | None = None
    item_ids: list[int] = Field(default_factory=list)
    reasoning: str | None = None


class SavedOutfitResponse(SavedOutfitPayload):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int | None = None
    ai_generated: bool
    created_at: datetime


class WearLogPayload(BaseModel):
    outfit_id: int | None = None
    outfit_name: str | None = None
    item_ids: list[int] = Field(default_factory=list)
    occasion: str | None = None
    period: str = "all-day"
    location_label: str | None = None
    feedback_note: str | None = None
    worn_on: datetime | None = None


class WearLogResponse(WearLogPayload):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    worn_on: datetime


class AssistantTaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    task_type: str
    status: str
    input_payload: dict
    result_payload: dict | None = None
    error_message: str | None = None
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None = None


class AssistantOverviewResponse(BaseModel):
    tomorrow: TomorrowAssistantResponse
    gaps: ClosetGapResponse
    reminders: ReminderResponse
    style_profile: StyleProfileResponse
    recent_saved_outfits: list[SavedOutfitResponse]


class MemoryCardEnvelope(BaseModel):
    item_id: int
    card: ClothingMemoryCardRead
