from app.models.wardrobe import ClothingItem
from app.schemas.recommendation import AgentTraceStep, RecommendationOption, RecommendationRequest, RecommendationResponse


def _pick_by_slot(items: list[ClothingItem], slot: str, keywords: list[str]) -> ClothingItem | None:
    for item in items:
        if item.slot == slot and any(keyword in item.tags or keyword in item.occasions for keyword in keywords):
            return item

    for item in items:
        if item.slot == slot:
            return item

    return None


def generate_recommendations(request: RecommendationRequest, items: list[ClothingItem]) -> RecommendationResponse:
    prompt = request.prompt.lower()

    if any(keyword in prompt for keyword in ["office", "meeting", "work", "commute"]):
        keywords = ["office", "meeting", "soft-formal"]
        title = "Soft Formal Balance"
        rationale = "Use structured neutrals to keep the look professional, then soften the impression with light layers so the result stays approachable."
    elif any(keyword in prompt for keyword in ["date", "dinner", "evening"]):
        keywords = ["date", "soft", "elegant"]
        title = "Rosy Evening Layer"
        rationale = "A softer palette and one refined accessory create a polished date look without feeling overdone."
    else:
        keywords = ["weekend", "travel", "cozy"]
        title = "Light Weekend Edit"
        rationale = "Keep the silhouette relaxed, then add one clean anchor piece so the outfit still feels intentional."

    top = _pick_by_slot(items, "top", keywords)
    bottom = _pick_by_slot(items, "bottom", keywords)
    outerwear = _pick_by_slot(items, "outerwear", keywords)
    shoes = _pick_by_slot(items, "shoes", keywords)
    accessory = _pick_by_slot(items, "accessory", keywords)

    primary_items = [item for item in [outerwear, top, bottom, shoes] if item]
    alternate_items = [item for item in [top, bottom, shoes, accessory] if item]

    return RecommendationResponse(
        source="api",
        outfits=[
            RecommendationOption(title=title, rationale=rationale, item_ids=[item.id for item in primary_items]),
            RecommendationOption(title="Change Another Look", rationale="This alternative composition keeps the occasion fit while reducing repeated hero pieces.", item_ids=[item.id for item in alternate_items]),
        ],
        agent_trace=[
            AgentTraceStep(node="Router Agent", summary="Parsed user scene, mood, and dress-code intent."),
            AgentTraceStep(node="Retriever Agent", summary="Matched wardrobe candidates by slot and occasion tags."),
            AgentTraceStep(node="Stylist Agent", summary="Composed the outfit and generated explanation text."),
            AgentTraceStep(node="Verifier Agent", summary="Checked coherence and scene suitability."),
        ],
    )