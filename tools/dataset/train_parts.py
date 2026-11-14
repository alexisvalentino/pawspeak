#!/usr/bin/env python
"""
Train a cat body-part detector on auto-labelled data, then export TFLite.

This is the step after label_parts.py. It is a thin wrapper around Ultralytics so the
exact settings are recorded instead of living in someone's shell history.

WARNING before you run this: auto-labels are candidates, not ground truth. A part detector
trained on unreviewed GroundingDINO boxes will reproduce its mistakes with high confidence.
Review `label-manifest.json`, delete bad label files, and re-check a sample by eye first.
A dataset of a few hundred *verified* images beats tens of thousands of unreviewed ones.

Usage:
  python train_parts.py --data ./out/data.yaml --epochs 60 --imgsz 640
  python train_parts.py --data ./out/data.yaml --export-only
"""

from __future__ import annotations

import argparse
import shutil
import sys
from pathlib import Path


def train(data: Path, epochs: int, imgsz: int, model: str, out: Path):
    from ultralytics import YOLO

    run = YOLO(model)
    results = run.train(data=str(data), epochs=epochs, imgsz=imgsz, project=str(out), name="parts")
    return Path(getattr(results, "save_dir", out / "parts"))


def export(run_dir: Path, imgsz: int, out: Path) -> Path | None:
    """Export best.pt to TFLite (float16) for the Android app."""
    from ultralytics import YOLO

    best = run_dir / "weights" / "best.pt"
    if not best.exists():
        print(f"No best.pt in {run_dir}; nothing to export.", file=sys.stderr)
        return None
    model = YOLO(str(best))
    exported = model.export(format="tflite", imgsz=imgsz, half=True, int8=False)
    exported_path = Path(exported)
    out.mkdir(parents=True, exist_ok=True)
    target = out / "cat-parts.tflite"
    shutil.copy2(exported_path, target)
    print(f"Copied {exported_path.name} -> {target}")
    return target


def main() -> int:
    parser = argparse.ArgumentParser(description="Train and export the cat body-part detector.")
    parser.add_argument("--data", required=True, type=Path, help="data.yaml from label_parts.py")
    parser.add_argument("--epochs", type=int, default=60)
    parser.add_argument("--imgsz", type=int, default=640)
    parser.add_argument("--model", default="yolov8n.pt", help="Base weights; nano is the mobile default.")
    parser.add_argument("--out", default=Path("runs"), type=Path)
    parser.add_argument("--export-only", action="store_true", help="Skip training, export runs/parts.")
    parser.add_argument("--dest", default=Path("../../public/models/cat-parts"), type=Path,
                        help="Where to place the exported TFLite asset.")
    args = parser.parse_args()

    if not args.data.exists():
        print(f"data.yaml not found: {args.data}", file=sys.stderr)
        return 2

    run_dir = args.out / "parts" if args.export_only else train(args.data, args.epochs, args.imgsz, args.model, args.out)
    print(f"Run directory: {run_dir}")
    exported = export(run_dir, args.imgsz, args.dest)
    if exported is None:
        return 1
    print("\nNext steps:")
    print("  1. Add a second detector asset beside pet-detector/ and load it in PetDetector.java")
    print("  2. Feed it the crop from the animal detector, as the pose estimator already does")
    print("  3. Keep catBodyParts.ts as the gate: two corroborating parts or no cue")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
