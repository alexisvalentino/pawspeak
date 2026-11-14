# Optional dictionary cue classifier

The app includes RTMPose-Animal AP-10K for body landmarks and limited side-view limb geometry. That pose model does not classify dictionary cues, emotion, or needs. This optional classifier adapter supports dog and cat dictionary IDs because those are the species in PawSpeak's body-language dictionary.

To enable a separately trained TF.js Layers image classifier, provide `model.json` (plus its weight shards) and `manifest.json`:

```json
{
  "modelUrl": "REPLACE_WITH_MODEL_PATH",
  "modelVersion": "REPLACE_WITH_VALIDATED_MODEL_VERSION",
  "inputSize": 224,
  "outputMode": "multi-label-sigmoid",
  "threshold": 0.65,
  "thresholds": {
    "dog-play-bow": 0.82,
    "cat-tail-lashing": 0.9
  },
  "labels": {
    "dog": ["dog-play-bow"],
    "cat": ["cat-loaf", "cat-tail-lashing"]
  },
  "validation": {
    "datasetVersion": "REPLACE_WITH_HELD_OUT_DATASET_VERSION",
    "evaluatedAt": "REPLACE_WITH_EVALUATION_DATE",
    "heldOutAnimals": true,
    "perCue": {
      "dog-play-bow": { "precision": null, "recall": null, "calibrationError": null },
      "cat-loaf": { "precision": null, "recall": null, "calibrationError": null },
      "cat-tail-lashing": { "precision": null, "recall": null, "calibrationError": null }
    }
  }
}
```

The camera first crops the detected dog or cat, then resizes and normalizes RGB pixels to [0,1]. The model must output one independent sigmoid score per manifest label in the same order; several cues may be returned together, each with its own threshold. The UI shows at most three candidates that pass their threshold, alongside the model version. A manifest must include held-out-animal precision, recall, and calibration error for every cue; this example is rejected until genuine evaluation values replace the placeholders. A different preprocessing or output format requires a new explicit adapter and tests. Motion cues that require video and vocal cues that require audio need separate datasets and model paths; a single image classifier cannot cover them all.

Do not use a generic breed, dog/cat, or object classifier as an emotion model. Training labels, rights, evaluation, calibration, supported conditions, and expert review must be documented before enabling user-facing claims.
