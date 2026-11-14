# Cat body-part dataset pipeline

Offline tooling to build a **part-level** cat detector. This is the prerequisite for
`src/ml/catBodyParts.ts` to ever do anything real: the shipped EfficientDet-Lite2 detects
*animals*, not ears/eyes/mouth/tail/body, so today that module has no detector feeding it.

Nothing here runs during `npm run build` or `npm test`. It is a separate Python toolchain.

## Why this exists

From the DeepCat audit ([DeepCat-audit.md](../reference/DeepCat-audit.md)): the credible
route to body-language analysis is *part detection + geometry*, not a black-box emotion
classifier. DeepCat's most reusable contribution is the label taxonomy and the
auto-labelling method — not its mood thresholds, and not its code (the repo has no licence).

## Setup

```powershell
python -m venv tools/dataset/.venv
tools/dataset/.venv/Scripts/python.exe -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
tools/dataset/.venv/Scripts/python.exe -m pip install ultralytics transformers pillow
```

## Step 1 — auto-label candidate boxes

```powershell
tools/dataset/.venv/Scripts/python.exe tools/dataset/label_parts.py `
  --images path\to\cat-photos --out tools/dataset/out --conf 0.15
```

Outputs `out/images/`, `out/labels/*.txt` (YOLO format), `out/data.yaml`, and
`out/label-manifest.json`.

### Backend choice, measured

| Backend | Result on our test cat photo |
|---|---|
| YOLO-World (`yolov8s-worldv2`) | Cat found at 0.77; **zero part boxes even at conf 0.02** |
| GroundingDINO-tiny | All five parts: ears 0.72, eyes 0.66, mouth 0.52, body 0.31, tail 0.30 |

So the default is `--backend grounding-dino`. DeepCat used the GroundedSAM family; this
matches it. The YOLO-World path is kept only as a documented fallback.

## Step 2 — REVIEW (do not skip)

Auto-labels are candidates. The review step rejects implausible boxes mechanically:

- no anchor `cat` box → reject everything for that image
- box mostly outside the cat (<55% inside) → reject (would otherwise be clipped into a
  plausible-looking lie)
- area <0.5% or >85% of the cat → reject
- multiple boxes for one part → keep the highest score

That still leaves semantic errors a human must catch. **Open `label-manifest.json`, look at
`rejected` reasons, and eyeball a sample of images with their boxes.** A handful of verified
images beats thousands of unreviewed ones.

## Step 3 — train and export

```powershell
tools/dataset/.venv/Scripts/python.exe tools/dataset/train_parts.py `
  --data tools/dataset/out/data.yaml --epochs 60
```

Produces `runs/parts/weights/best.pt` and exports float16 TFLite to
`public/models/cat-parts/cat-parts.tflite`.

## Honest status

- **Verified:** labelling runs end to end on real photos; 5 parts accepted per image;
  YOLO label files validated (classes 0–4, normalised coords in `(0,1)`); 7 geometry tests
  pass (`test_label_parts.py`).
- **NOT done:** the detector is **not trained**. No dataset of sufficient size exists yet,
  and training needs a GPU we do not have (this machine is CPU-only, AMD). Expect CPU
  training of a YOLOv8n at 640px to be slow — hours for a few hundred images.
- **NOT wired into the app.** `catBodyParts.ts` remains inactive until a real
  `cat-parts.tflite` exists and `PetDetector.java` loads it on the animal crop.

## The class order is a contract

`CLASSES = ["ears", "eyes", "mouth", "tail", "body"]` in `label_parts.py` must stay in sync
with `CAT_BODY_PARTS` in `src/ml/catBodyParts.ts`. A Python test asserts the order; a
mismatch would silently relabel every prediction.
