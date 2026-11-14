# PawSpeak product specification

## Current product direction

PawSpeak is a playful dog/cat body-language companion with two primary features: a searchable body-language dictionary and an on-device camera pet detector. A private observation journal is a supporting feature. The product does not claim literal bark/meow translation, emotion certainty, or veterinary diagnosis.

The camera currently uses TensorFlow.js COCO-SSD for on-device object detection. It can detect common COCO animal classes (dog, cat, bird, horse, sheep, cow, elephant, bear, zebra, and giraffe) as well as other objects. Its boxes and labels do not identify posture, emotion, or intent. A separate, trained and validated model is required before suggesting body cues. Still-image cues, motion cues that require video, vocal cues that require audio, and context-only observations need separate evidence and model paths. Dictionary illustrations are for learning and UI; do not treat them as a training set without verifying labels, representativeness, and image rights. Any future voice-clues mode would combine a separately trained audio classifier, body-language cues, and guardian-provided context to suggest possible intent with uncertainty; it must not produce literal human sentences as pet quotes.

## Initial scope

Support dog and cat dictionary content and common-animal object detection. Keep object detection, posture classification, and audio classification as separate model responsibilities. Return unavailable when a required model is not installed and unclear when quality or confidence is insufficient. Do not use breed or generic object classifiers as emotion models.

## Core experience

1. Open the camera only after an explicit user action and explain local processing. Alternatively upload a photo.
2. Run the pet detector on-device and show actual detections, boxes, and model scores without storing the photo.
3. If a dedicated posture model is installed and supported, show observable posture candidates and uncertainty separately from the pet detection.
4. Let users explore matching dog/cat dictionary cues, including what to observe, possible meanings, and context checks.
5. Optionally save guardian-entered observations to the private journal, where they can be corrected, deleted, and exported.

## Result design

Keep detection and interpretation separate. Never convert an object label, breed, bark, or meow into a pet quote or a confident emotional statement. Show uncertainty, alternatives, and an unclear outcome. Future model results must be derived from validated observable cue labels with version and confidence metadata, not generated as unsupported intentions.

## Functional requirements

- Search and filter dog/cat body-language cues and show related cues.
- Capture or import images with explicit consent and visible camera state.
- Release camera tracks when leaving the camera or hiding the page.
- Process frames locally without uploading or silently saving them.
- Keep the searchable dictionary and pet detector available offline after initial setup, and show when offline setup has completed.
- Show stable, temporary boxes for supported animal classes during a live session; present them as object tracking rather than posture or emotion analysis.
- Provide useful dictionary/manual observation paths when camera access is unavailable.
- Keep posture/audio inference behind typed, versioned model adapters with unavailable and unclear states.
- Allow journal corrections, deletion, and export.
- Keep audio/video optional; never require continuous background monitoring.
- Explain model limitations and processing/storage choices before model-backed features are presented as operational.

## Non-goals

- Literal bark/meow-to-sentence translation.
- Diagnosing disease, pain, aggression, or emotional state from one clip.
- Treating dog/cat detection as proof of emotion or intent.
- Recommending training or handling that could put a person or animal at risk.
- Training on user media without separate, explicit opt-in.

## Success measures

- Users can distinguish detected pets from any future posture interpretations.
- Models are evaluated on held-out animals and environments, with calibration and abstention measured separately.
- Low-quality and unsupported inputs reliably produce unavailable/unclear states.
- Users can understand, correct, delete, and export their observations.
- Product claims stay within the validated scope of each installed model.
