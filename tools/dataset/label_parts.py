#!/usr/bin/env python
"""
Auto-label cat body parts for a future part-level detector.

Method borrowed from DeepCat (Arwa-Fawzy/Cat-Emotional-Analysis, IEEE 79630): generate
boxes with an open-vocabulary detector instead of hand-annotating everything. Unlike
DeepCat, which trains on raw auto-labels, this treats auto-labels as *candidate*
annotations and rejects ones that fail geometry sanity checks — a part detector trained on
bad boxes will confidently find tails in trees.

Backend note: YOLO-World was tried first and could not localise a single cat part even at
conf 0.02 on this hardware; GroundingDINO (the "GroundedSAM" family DeepCat used) finds all
five at zero-shot. That is why the default backend is GroundingDINO.

Output is YOLO-format text next to each image, plus a manifest for human review. Nothing
here runs during `npm run build`; it is an offline tool.

Usage:
  python label_parts.py --images ./photos --out ./dataset --limit 50
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

# The five DeepCat part labels plus "cat" as the anchor box used for containment checks.
PART_PROMPTS = ["cat ears", "cat eyes", "cat mouth", "cat tail", "cat body"]
ANCHOR_PROMPT = "cat"

CLASSES = ["ears", "eyes", "mouth", "tail", "body"]
CLASS_INDEX = {name: index for index, name in enumerate(CLASSES)}

# Prompt text -> our label. GroundingDINO returns the prompt string verbatim.
PROMPT_TO_LABEL = {prompt: prompt.split()[-1] for prompt in PART_PROMPTS}

# Sanity limits as fractions of the animal box area.
# A real tail/ear box is rarely under 0.5% of the cat; GroundingDINO sometimes emits
# sub-1% slivers around a whisker, which would poison training as a "tail" label.
MIN_PART_AREA = 0.005
MAX_PART_AREA = 0.85
# A part box must sit mostly inside the animal box.
MIN_INSIDE_FRACTION = 0.55
DEFAULT_BACKEND = "grounding-dino"
DEFAULT_MODEL = "IDEA-Research/grounding-dino-tiny"


def box_area(box: tuple[float, float, float, float]) -> float:
    return max(0.0, box[2] - box[0]) * max(0.0, box[3] - box[1])


def intersection_area(a: tuple[float, float, float, float], b: tuple[float, float, float, float]) -> float:
    left = max(a[0], b[0])
    top = max(a[1], b[1])
    right = min(a[2], b[2])
    bottom = min(a[3], b[3])
    return max(0.0, right - left) * max(0.0, bottom - top)


def to_yolo(box, width: int, height: int) -> tuple[float, float, float, float]:
    """Convert xyxy absolute pixels to YOLO cx cy w h normalized."""
    x1, y1, x2, y2 = box
    cx = ((x1 + x2) / 2) / width
    cy = ((y1 + y2) / 2) / height
    w = (x2 - x1) / width
    h = (y2 - y1) / height
    return cx, cy, w, h


def clamp(value: float) -> float:
    return min(0.999, max(0.001, value))


def review_boxes(animal, parts, width: int, height: int):
    """
    Keep only plausible part boxes. Returns (accepted, rejected) where rejected entries
    carry a reason so a human can audit the auto-labelling step.
    """
    accepted = []
    rejected = []
    if animal is None:
        return accepted, [{"label": "all", "reason": "no animal box"}]
    animal_area = box_area(animal)
    if animal_area <= 0:
        return accepted, [{"label": "all", "reason": "degenerate animal box"}]

    best_by_label: dict[str, tuple[float, tuple[float, float, float, float]]] = {}
    for label, score, box in parts:
        if label not in CLASS_INDEX:
            continue
        # Check the ORIGINAL box before clipping. A box that mostly sits outside the cat
        # is a bad label (background mistaken for a tail), and clipping it would quietly
        # manufacture a plausible-looking box from a wrong detection.
        original_area = box_area(box)
        if original_area <= 0:
            rejected.append({"label": label, "reason": "degenerate box"})
            continue
        inside = intersection_area(box, animal) / original_area
        if inside < MIN_INSIDE_FRACTION:
            rejected.append({"label": label, "reason": f"mostly outside animal ({inside:.2f})"})
            continue
        clipped = (
            max(box[0], animal[0]),
            max(box[1], animal[1]),
            min(box[2], animal[2]),
            min(box[3], animal[3]),
        )
        if clipped[2] <= clipped[0] or clipped[3] <= clipped[1]:
            rejected.append({"label": label, "reason": "outside animal box"})
            continue
        area_ratio = box_area(clipped) / animal_area
        if area_ratio < MIN_PART_AREA:
            rejected.append({"label": label, "reason": f"too small ({area_ratio:.4f})"})
            continue
        if area_ratio > MAX_PART_AREA:
            rejected.append({"label": label, "reason": f"too large ({area_ratio:.4f})"})
            continue
        previous = best_by_label.get(label)
        if previous is None or score > previous[0]:
            best_by_label[label] = (score, clipped)

    for label, (score, box) in best_by_label.items():
        accepted.append((label, score, box))
    return accepted, rejected


def load_grounding_dino(model_id: str):
    from transformers import AutoModelForZeroShotObjectDetection, AutoProcessor

    processor = AutoProcessor.from_pretrained(model_id)
    model = AutoModelForZeroShotObjectDetection.from_pretrained(model_id)
    model.eval()
    return processor, model


def detect_parts_grounding_dino(processor, model, image_path: Path, threshold: float):
    """Return (animal_box, [(label, score, box)]) in absolute pixel coordinates."""
    import torch
    from PIL import Image

    image = Image.open(image_path).convert("RGB")
    width, height = image.size
    caption = ". ".join([ANCHOR_PROMPT, *PART_PROMPTS]) + "."
    inputs = processor(images=image, text=caption, return_tensors="pt")
    with torch.no_grad():
        outputs = model(**inputs)
    result = processor.post_process_grounded_object_detection(
        outputs,
        inputs.input_ids,
        threshold=threshold,
        text_threshold=threshold,
        target_sizes=[image.size[::-1]],
    )[0]

    animal = None  # (score, box)
    parts = []
    for raw_label, score, box in zip(result["labels"], result["scores"], result["boxes"]):
        label = str(raw_label).strip().lower()
        coords = tuple(float(v) for v in box.tolist())
        value = float(score)
        if label == ANCHOR_PROMPT:
            if animal is None or value > animal[0]:
                animal = (value, coords)
            continue
        mapped = PROMPT_TO_LABEL.get(label)
        if mapped:
            parts.append((mapped, value, coords))
    return (animal[1] if animal else None), parts, width, height


def detect_parts_yolo_world(weights: str, image_path: Path, threshold: float):
    """Fallback backend. Note: on our hardware this produced no part boxes at all."""
    from ultralytics import YOLO

    model = YOLO(weights)
    if not hasattr(model, "set_classes"):
        raise SystemExit(f"{weights} is not an open-vocabulary model.")
    model.set_classes([ANCHOR_PROMPT, *PART_PROMPTS])
    result = model.predict(str(image_path), conf=threshold, verbose=False)[0]
    height, width = result.orig_shape
    names = result.names
    animal = None  # (score, box)
    parts = []
    for box in result.boxes:
        label = str(names[int(box.cls)]).strip().lower()
        score = float(box.conf)
        coords = tuple(float(v) for v in box.xyxy[0].tolist())
        if label == ANCHOR_PROMPT:
            if animal is None or score > animal[0]:
                animal = (score, coords)
            continue
        mapped = PROMPT_TO_LABEL.get(label)
        if mapped:
            parts.append((mapped, score, coords))
    return (animal[1] if animal else None), parts, width, height


def label_folder(images: Path, out: Path, backend: str, weights: str, model_id: str,
                 limit: int | None, conf: float):
    out_images = out / "images"
    out_labels = out / "labels"
    out_images.mkdir(parents=True, exist_ok=True)
    out_labels.mkdir(parents=True, exist_ok=True)

    extensions = {".jpg", ".jpeg", ".png", ".webp"}
    files = sorted(p for p in images.iterdir() if p.suffix.lower() in extensions)
    if limit:
        files = files[:limit]
    if not files:
        print(f"No images found in {images}", file=sys.stderr)
        return {"images": 0, "accepted": 0, "rejected": 0, "withAnimal": 0}

    processor = model = None
    if backend == "grounding-dino":
        processor, model = load_grounding_dino(model_id)

    manifest = []
    for index, path in enumerate(files, start=1):
        try:
            if backend == "grounding-dino":
                animal_box, parts, width, height = detect_parts_grounding_dino(processor, model, path, conf)
            else:
                animal_box, parts, width, height = detect_parts_yolo_world(weights, path, conf)
        except Exception as error:  # one bad image must not abort a long batch
            manifest.append({"image": path.name, "error": str(error), "accepted": [], "rejected": []})
            continue

        accepted, rejected = review_boxes(animal_box, parts, width, height)

        if accepted:
            lines = []
            for label, score, box in accepted:
                cx, cy, w, h = to_yolo(box, width, height)
                lines.append(f"{CLASS_INDEX[label]} {clamp(cx):.6f} {clamp(cy):.6f} {clamp(w):.6f} {clamp(h):.6f}")
            (out_labels / f"{path.stem}.txt").write_text("\n".join(lines), encoding="utf-8")
            target = out_images / path.name
            if not target.exists():
                try:
                    target.hardlink_to(path)
                except OSError:
                    target.write_bytes(path.read_bytes())

        manifest.append({
            "image": path.name,
            "animalBox": list(animal_box) if animal_box else None,
            "accepted": [{"label": label, "score": round(score, 4)} for label, score, _ in accepted],
            "rejected": rejected,
        })
        if index % 10 == 0:
            print(f"  labelled {index}/{len(files)}", flush=True)

    (out / "data.yaml").write_text(
        f"path: {out.resolve().as_posix()}\n"
        "train: images\n"
        "val: images\n"
        f"nc: {len(CLASSES)}\n"
        f"names: {CLASSES}\n",
        encoding="utf-8",
    )
    (out / "label-manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    accepted_total = sum(len(item["accepted"]) for item in manifest)
    rejected_total = sum(len(item.get("rejected", [])) for item in manifest)
    with_animal = sum(1 for item in manifest if item.get("animalBox"))
    return {
        "images": len(manifest),
        "withAnimal": with_animal,
        "accepted": accepted_total,
        "rejected": rejected_total,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Auto-label cat body parts for a part detector.")
    parser.add_argument("--images", required=True, type=Path, help="Folder of cat photos.")
    parser.add_argument("--out", required=True, type=Path, help="Output dataset folder.")
    parser.add_argument("--backend", choices=["grounding-dino", "yolo-world"], default=DEFAULT_BACKEND)
    parser.add_argument("--model", default=DEFAULT_MODEL, help="GroundingDINO model id.")
    parser.add_argument("--weights", default="yolov8s-worldv2.pt", help="YOLO-World weights (fallback backend).")
    parser.add_argument("--limit", type=int, default=None, help="Only process the first N images.")
    parser.add_argument("--conf", type=float, default=0.15, help="Detector confidence floor.")
    args = parser.parse_args()

    if not args.images.is_dir():
        print(f"--images is not a folder: {args.images}", file=sys.stderr)
        return 2

    summary = label_folder(args.images, args.out, args.backend, args.weights, args.model,
                           args.limit, args.conf)
    print(json.dumps(summary, indent=2))
    print(f"Wrote YOLO dataset to {args.out}")
    if summary["accepted"] == 0:
        print(
            "No usable boxes were produced. Nothing was written for training.\n"
            "If this is unexpected, lower --conf or check that --images contains cat photos.",
            file=sys.stderr,
        )
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
