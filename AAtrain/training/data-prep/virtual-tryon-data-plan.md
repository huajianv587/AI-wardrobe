# Virtual Try-On Data Plan

Use this plan when you want the virtual-tryon lane to move from demo to trainable.

## Target outcome

Build a paired dataset that teaches the model to preserve:

1. person identity
2. garment silhouette
3. garment texture and edge fidelity
4. believable drape under the target pose

## Minimum workable dataset

### Bootset

- train: `400`
- eval: `50`
- use: pipeline debugging only

### Beta candidate

- train: `3000`
- eval: `400`
- holdout human-review set: `200`

### Strong launch candidate

- train: `8000`
- eval: `800`
- holdout human-review set: `400`

## Pair schema

Each row should include:

```json
{
  "pair_id": "train-studio-top-001",
  "split": "train",
  "category": "upper_body",
  "person_image": "person_images/train/studio-top-001-person.jpg",
  "garment_image": "garment_images/train/studio-top-001-garment.png",
  "target_image": "paired_targets/train/studio-top-001-target.jpg",
  "person_mask": "masks/person/train/studio-top-001-person-mask.png",
  "garment_mask": "masks/garment/train/studio-top-001-garment-mask.png",
  "agnostic_mask": "agnostic_masks/train/studio-top-001-agnostic.png",
  "pose_json": "pose/train/studio-top-001-openpose.json",
  "source": "private-approved",
  "review_status": "approved",
  "quality_score": 0.93,
  "fit_notes": ["front-view", "garment fully visible", "arms clear"],
  "license_bucket": "commercial-approved"
}
```

## Data collection rules

1. Start with front-view or near-front pairs.
2. Keep one clear garment category per pair.
3. Reject extreme self-occlusion in the first production lane.
4. Keep lighting soft and exposure stable.
5. Use isolated garment product images with transparent or clean backgrounds.
6. Keep category labels consistent: `upper_body`, `lower_body`, `dresses`.

## Human QA checklist

Every approved target should pass:

- face and body identity still look like the source person
- target garment matches color and silhouette
- sleeve / hem / waist alignment is believable
- edges are not melting into the body
- no obvious duplicated limbs, fingers, or fabric folds

## Recommended review gates

For a model to be considered launch-candidate quality:

- identity preservation reviewer pass: `>= 80%`
- garment fidelity reviewer pass: `>= 85%`
- edge cleanup reviewer pass: `>= 85%`
- pose compatibility reviewer pass: `>= 80%`

## Execution order

1. bootstrap the dataset workspace
2. collect and clear private data
3. generate masks and pose assets
4. fill pair manifests
5. run a bootset training pass
6. review failures and tighten the dataset
7. scale to the beta candidate split
