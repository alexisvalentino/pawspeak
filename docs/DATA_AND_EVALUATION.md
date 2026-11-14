# Data and evaluation plan

## Dataset requirements

Use media with documented rights and consent for the intended use. Start with dog/cat still-image cues, then establish separate data for dog/cat movement and audio cues. Labels should describe visible posture, movement, or sound patterns separately from inferred meaning. Record species, individual animal identity (pseudonymous), environment, camera/microphone conditions, annotator guidance, and disagreement. Avoid treating owner interpretation as objective ground truth; retain multiple labels or uncertainty where experts disagree.

The current 102 dictionary entries define learning content, not model training labels. A separate recommendation groups them into still-image, motion, audio, context-only, and myth candidates; this grouping is an analysis that needs review before becoming a label schema. Dictionary illustrations should not be used for training unless image rights, representativeness, and whether the cue is actually shown are verified.

Do not split adjacent frames or clips from the same animal across training and test sets. Hold out animals and, where possible, environments and devices to measure generalization. Keep a clear data lineage and deletion process.

## Annotation protocol

- Define each cue label with inclusion/exclusion examples and an “uncertain/not visible” option.
- Use multiple trained annotators for ambiguous behaviors and measure agreement.
- Label observable facts first; store affective interpretation separately and with provenance.
- Capture contextual factors without exposing guardian identity.
- Audit class balance, breed/body-shape coverage, age, coat, lighting, camera angle, and environment.

## Evaluation

Report per-class precision, recall, F1, confusion matrices, calibration, and abstention/coverage separately for vision and audio. Measure performance on held-out animals and conditions. Include low-light, occlusion, motion blur, multiple animals, partial bodies, background noise, overlapping sounds, and out-of-scope species. Evaluate fusion separately so context does not conceal weak sensor performance. Evaluate false reassurance and harmful interpretations through a reviewed safety set. Test whether explanations faithfully describe model outputs and whether users understand uncertainty.

Set release thresholds with domain experts before selecting a production model. Overall accuracy alone is insufficient. Document model version, dataset scope, known failure modes, evaluation date, and supported conditions for each release.

## Feedback and retraining

Corrections are user feedback, not automatically verified labels. Do not use them for training by default. Require a separate opt-in, a documented retention period, withdrawal/deletion handling, quality review, and a process for preventing data leakage into evaluation sets.
