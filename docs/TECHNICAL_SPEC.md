# PawSpeak technical specification

## Current architecture

The app is a Vite + React + TypeScript single-page frontend with a camera-first animal detector, dog/cat body-language dictionary, and supporting local journal. `src/ml/petClassifier.ts` lazily loads TensorFlow.js and COCO-SSD for on-device object detection. It recognizes ten COCO animal labels and other common objects. A separate optional TF.js Layers adapter crops one detected dog or cat and accepts an independent sigmoid score per still-image cue. Its versioned manifest must provide per-cue precision, recall, and calibration error measured on held-out animals. No cue model is currently installed, and object detections are never converted into posture or emotional claims. This adapter is the active development path; see [DEVELOPMENT_GUIDE](DEVELOPMENT_GUIDE.md) for the build order and the exact manifest contract. Camera frames are processed in memory and are not uploaded or persisted. Journal state uses browser-local storage. There is no implemented backend, authentication, database, or audio inference service. Do not put long-lived secrets in the browser bundle.

The production camera asks for up to 960×720 video and scales detector frames to a maximum 640-pixel side before inference. Live inference is sequential and adapts its delay to inference time; same-species boxes are associated using overlap/center distance, smoothed, and assigned temporary IDs for the current camera session. A single missed pass is held to reduce flicker. This is bounding-box tracking only: it does not identify a pet across sessions or infer posture, emotion, or intent.

The production build packages the COCO-SSD Lite model locally (about 18.6 MB of model JSON and weights) and does not ship any training dataset. A generated service worker caches the app shell and model in separate versioned caches. The app is available offline after the first successful online load and the camera displays “Offline ready” after both caches are installed. App code updates do not redownload unchanged model weights. Browser storage can still be cleared by the user or the operating system; the app requests persistent storage where supported and reports when offline caching is unavailable.

## Proposed architecture

Keep the client responsible for pet profiles, consent, capture controls, context entry, result presentation, and user corrections. Put model inference behind a versioned service interface so the UI does not depend on a specific model provider. The interface should accept a media reference or explicitly uploaded file, species, optional context, and consent metadata; return versioned observable cue labels, confidence/calibration metadata, quality flags, and abstention status. Interpretation text should be derived from an allowlisted, reviewed mapping or carefully constrained service, and must preserve uncertainty.

Prefer on-device inference where practical for privacy and latency. If server inference is selected, use encrypted transport, short-lived access, strict retention limits, deletion support, and documented storage regions and subprocessors. Decide this before implementing upload flows.

## Model boundaries

- Still-image vision: begin with a small dog/cat set of observable cues and curated labels. Predictions must be limited to visible evidence and include uncertainty.
- Video: use a separate temporal model for movement cues such as pacing or tail motion; a still-image classifier cannot infer movement.
- Audio: extract acoustic descriptors (including pitch, loudness, duration, and repetition) and classify only labels supported by annotated data. Frequency alone is insufficient.
- Fusion: combine independently produced cues with user-provided context; do not let an LLM invent sensor findings.
- LLMs are optional for wording. If used, constrain them to validated model outputs and user context, require structured output, and reject unsupported diagnoses or certainty.
- Support `unknown`, `low_quality`, and `out_of_scope` responses.

## Data model direction

An observation should include an opaque ID, pet ID, capture time, media modality, consent state, user-provided context, cue labels with confidence and model version, interpretation candidates with uncertainty, user correction, and retention/deletion state. Avoid collecting location or identity data unless necessary. Keep raw media separate from derived observations and define deletion propagation across storage, logs, backups, and model vendors.

## Security and privacy requirements

- Request camera/microphone access only after a clear user action.
- Explain local versus remote processing before capture/upload.
- Never log raw media, access tokens, or unnecessary personal data.
- Use short-lived upload credentials and enforce file type, size, and duration limits.
- Provide deletion and export paths before enabling account-backed storage.
- Keep API credentials server-side; use environment-specific secret storage if a backend is introduced.
- Review consent, retention, age/guardian handling, and applicable privacy law before public launch.

## Integration sequence

1. Define dog visual and vocal cue labels, annotator guidance, and evaluation criteria.
2. Add manual observation/context flows and honest UI states.
3. Add separate typed vision/audio inference adapters with mocked responses for UI development.
4. Select models and deployment approaches based on data rights, performance, privacy, and cost.
5. Evaluate modalities independently, then evaluate context-aware fusion; implement monitoring, versioning, deletion, and quality safeguards.
6. Release narrowly and expand only when evaluation supports it.
