"""Geometry and review tests for the body-part auto-labeler.

The review step is the only thing standing between "generated boxes" and "a model that
hallucinates tails". These tests pin its behaviour without needing torch or a model.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from label_parts import CLASS_INDEX, clamp, review_boxes, to_yolo  # noqa: E402

ANIMAL = (100.0, 100.0, 500.0, 400.0)  # 400 x 300 = 120000 px


def test_class_index_matches_reduced_port():
    # Must stay in sync with CAT_BODY_PARTS in src/ml/catBodyParts.ts
    assert list(CLASS_INDEX.keys()) == ["ears", "eyes", "mouth", "tail", "body"]


def test_implausible_boxes_are_rejected_with_reasons():
    accepted, rejected = review_boxes(
        ANIMAL,
        [
            ("tail", 0.9, (110.0, 110.0, 130.0, 130.0)),  # far too small
            ("body", 0.9, (100.0, 100.0, 500.0, 400.0)),  # whole animal, too large
            ("eyes", 0.9, (480.0, 100.0, 520.0, 140.0)),  # hangs outside the animal
            ("mouth", 0.8, (300.0, 300.0, 340.0, 330.0)),  # plausible
        ],
        640,
        480,
    )
    labels = [label for label, _, _ in accepted]
    assert labels == ["mouth"], labels
    reasons = {entry["label"] for entry in rejected}
    assert {"tail", "body", "eyes"} <= reasons


def test_missing_animal_box_rejects_everything():
    accepted, rejected = review_boxes(None, [("tail", 0.9, (200.0, 200.0, 300.0, 260.0))], 640, 480)
    assert accepted == []
    assert rejected[0]["reason"] == "no animal box"


def test_highest_scoring_box_wins_per_part():
    accepted, _ = review_boxes(
        ANIMAL,
        [
            ("tail", 0.30, (300.0, 150.0, 380.0, 230.0)),
            ("tail", 0.85, (310.0, 160.0, 390.0, 240.0)),
        ],
        640,
        480,
    )
    assert len(accepted) == 1
    label, score, box = accepted[0]
    assert label == "tail"
    assert score == 0.85
    assert box == (310.0, 160.0, 390.0, 240.0)


def test_part_box_is_clipped_into_the_animal_box():
    accepted, _ = review_boxes(ANIMAL, [("mouth", 0.7, (300.0, 350.0, 520.0, 420.0))], 640, 480)
    assert len(accepted) == 1
    _, _, box = accepted[0]
    assert box[2] <= ANIMAL[2] and box[3] <= ANIMAL[3], "boxes must not extend past the cat"


def test_yolo_conversion_is_normalized_and_in_range():
    cx, cy, w, h = to_yolo((100.0, 100.0, 300.0, 200.0), 640, 480)
    assert 0 < cx < 1 and 0 < cy < 1 and 0 < w < 1 and 0 < h < 1
    assert abs(cx - 200 / 640) < 1e-9
    assert abs(w - 200 / 640) < 1e-9


def test_clamp_keeps_zero_size_boxes_writable():
    assert clamp(0.0) > 0
    assert clamp(1.0) < 1
    assert clamp(-5.0) > 0


if __name__ == "__main__":
    failures = 0
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                fn()
                print(f"PASS {name}")
            except AssertionError as error:
                failures += 1
                print(f"FAIL {name}: {error}")
    raise SystemExit(1 if failures else 0)
