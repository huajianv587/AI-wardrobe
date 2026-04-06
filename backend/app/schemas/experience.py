from pydantic import BaseModel, Field


class ExperienceWardrobeItemPayload(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    category: str
    slot: str
    color: str
    brand: str | None = None
    image_url: str | None = None
    tags: list[str] = Field(default_factory=list)
    occasions: list[str] = Field(default_factory=list)
    style_notes: str | None = None


class ExperienceWardrobeBulkPayload(BaseModel):
    action: str
    item_ids: list[int] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    category: str | None = None
    slot: str | None = None
    color: str | None = None
    note: str | None = None


class ExperienceImportUrlPayload(BaseModel):
    image_url: str | None = None
    source_url: str | None = None
    platform_hint: str | None = None
    name: str | None = None
    category: str = "tops"
    slot: str = "top"
    color: str = "米白"


class ExperienceDecomposeConfirmPayload(BaseModel):
    piece_ids: list[str] = Field(default_factory=list)
    auto_focus_try_on: bool = True


class ExperienceSmartConfigPayload(BaseModel):
    primary_service: str = "R2 解构资产输出"
    remove_bg_key: str | None = None
    fallback_strategy: str = "本地失败后切换 OpenAI / DeepSeek"
    person_detector: str = "YOLO26 · 人体/配件检测"
    face_selector: str = "人物主体锁定"
    garment_segmenter: str = "SAM 2.1 / SCHP / 本地抠图"
    label_model: str = "FashionCLIP + Vision LLM"
    recognition_local_model: str = "FashionCLIP + 本地视觉解构"
    recognition_openai_model: str = "gpt-4.1-mini"
    recognition_deepseek_model: str = "deepseek-chat"
    recognition_retries: int = Field(default=1, ge=0, le=3)
    concurrency: int = Field(default=3, ge=1, le=10)


class ExperienceSmartEditPayload(BaseModel):
    tags: list[str] = Field(default_factory=list)
    occasions: list[str] = Field(default_factory=list)
    style_notes: str | None = None
    name: str | None = None
    color: str | None = None


class ExperienceUploadBatchPayload(BaseModel):
    mode: str = "上传后自动解构单品 + 补全标签"
    default_category: str = "自动识别"
    filenames: list[str] = Field(default_factory=list)


class ExperienceDiaryLogPayload(BaseModel):
    day: int
    year: int
    month: int
    outfit_name: str | None = None
    occasion: str | None = None
    item_ids: list[int] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    note: str | None = None


class ExperienceSuitcasePayload(BaseModel):
    destination: str
    days_label: str
    scene: str


class ExperienceIdleActionPayload(BaseModel):
    action: str


class ExperienceStyleProfilePatch(BaseModel):
    favorite_colors: list[str] | None = None
    avoid_colors: list[str] | None = None
    favorite_silhouettes: list[str] | None = None
    avoid_silhouettes: list[str] | None = None
    style_keywords: list[str] | None = None
    dislike_keywords: list[str] | None = None
    commute_profile: str | None = None
    comfort_priorities: list[str] | None = None
    wardrobe_rules: list[str] | None = None
    personal_note: str | None = None
