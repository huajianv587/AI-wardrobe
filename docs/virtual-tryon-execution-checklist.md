# Virtual Try-On Execution Checklist

Use this checklist when preparing the try-on lane for cloud training and deployment.

## 1. Data readiness

- [ ] `model_training/datasets/virtual-tryon/README.generated.md` exists
- [ ] paired JSONL manifests are filled, not just templates
- [ ] every pair is commercially cleared
- [ ] human-review holdout split is separated from training

## 2. Preprocessing readiness

- [ ] person masks generated
- [ ] garment masks generated
- [ ] agnostic masks generated
- [ ] pose keypoints generated
- [ ] category routing checked for `upper_body`, `lower_body`, `dresses`

## 3. Training readiness

- [ ] use [virtual-tryon.stage2.yaml](/e:/项目夹/AI-wardrobe-clean-0418/training/configs/virtual-tryon.stage2.yaml)
- [ ] confirm base model and license lane
- [ ] confirm image resolution and batch plan on the cloud GPU
- [ ] freeze a first bootset before scaling

## 4. Evaluation readiness

- [ ] reviewer sheet exists
- [ ] at least 4 metrics are scored: identity, garment fidelity, edge cleanup, pose compatibility
- [ ] side-by-side comparisons saved for approval

## 5. Deployment readiness

- [ ] worker health endpoint returns readiness detail
- [ ] fallback preview still works when the generative runtime is down
- [ ] checkpoints and runtime dependencies are stored outside git
