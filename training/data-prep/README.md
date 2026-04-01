# Data Preparation

Use this folder for turning raw datasets into service-ready corpora.

## Stage 1 datasets to care about first

### LLM Recommender

- FashionIQ
- Polyvore Outfits
- your own labeled wardrobe prompts

Target output format:

- JSONL
- one instruction-style sample per line

Recommended schema:

```json
{
  "instruction": "给我一套适合上班通勤、温柔但利落的搭配",
  "input": {
    "weather": "Partly cloudy 16-25C",
    "scene": "office commute",
    "wardrobe_items": [
      {"name": "Ivory Fluid Shirt", "slot": "top", "color": "Ivory", "tags": ["soft", "clean"]},
      {"name": "Charcoal Wide Trouser", "slot": "bottom", "color": "Charcoal", "tags": ["minimal", "formal"]}
    ]
  },
  "output": {
    "outfits": [
      {
        "title": "Soft Formal Balance",
        "item_names": ["Ivory Fluid Shirt", "Charcoal Wide Trouser"],
        "rationale": "..."
      }
    ]
  }
}
```

### Image Processor

Stage 1 does not require full fine-tuning.

Prepare instead:

- test images
- before/after validation pairs
- private product photography samples

This is enough to benchmark RMBG / BiRefNet before you decide whether fine-tuning is worth the cost.
