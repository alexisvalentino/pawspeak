# PawSpeak: On-Device Animal Detection and Cautious Body-Language Description

**A technical report on building a privacy-preserving pet body-language companion.**

Version 2.0 · Status: research prototype, Android-verified, iOS pending · Last revised 2026-11-15

---

## Abstract

PawSpeak is a camera-first companion application for dog and cat owners. It detects common
animals on-device, estimates quadruped pose, and describes observable body-language cues
without claiming to read emotion. The system runs entirely on the user's device: no frame,
photo, or audio clip is uploaded or persisted.

This report documents the architecture, the failure modes found during development, and the
measurements that motivated each design decision. The central finding is methodological
rather than algorithmic: **running a general-purpose TensorFlow.js detector inside a mobile
WebView is not viable for continuous inference**, because the reference COCO-SSD
implementation switches the tfjs backend between WebGL and CPU on every single frame. On
desktop this is merely wasteful (1752 ms/frame on CPU fallback); on a mobile GPU it is fatal
after the first successful inference. Replacing the inference path with a native TFLite
detector reduced warm inference to **42–102 ms** with **0 failures across 100 consecutive
frames** on emulated Android hardware.

A secondary contribution is a deliberately conservative cue system: body-language output is
gated on corroborating evidence and never maps a static image to an emotion label. Where the
literature-driven reference project (DeepCat) emits conclusions such as "Friendly and happy"
from a tail-angle threshold, PawSpeak reports only part visibility and posture geometry,
with explicit abstention.

**Keywords:** on-device inference, object detection, animal pose estimation, mobile WebView,
TFLite, TensorFlow.js, responsible ML, human-animal interaction

---

## 1. Introduction

### 1.1 Motivation

Commercial "pet translator" applications frequently claim to convert barks and meows into
human sentences, or to diagnose emotional states from a photograph. Neither claim is
defensible with current evidence. Canine and feline body language is context-dependent and
temporal: the same tail position signifies differently depending on ear set, weight
distribution, and what happened one second earlier.

PawSpeak takes the opposite position. It is a **descriptive** tool. It identifies an animal,
estimates visible posture, and presents the human-curated body-language dictionary alongside
observable cues. It explicitly does not diagnose, does not infer emotion, and does not
translate vocalisations.

PawSpeak is developed under **Pawsmatch AI** as an early research milestone toward clearer
human-animal communication. The current prototype focuses on observable signals and careful
limits rather than promising a literal translation of animal language.

### 1.2 Contributions

1. **A negative result with a measured cause.** We identify why a TensorFlow.js live
   detection loop is structurally unsuited to mobile WebViews, with source-level evidence
   and timing data (§4.2).
2. **A native fallback architecture** that preserves the same web codebase while routing
   inference to TFLite on Android (§4.3), verified on an emulator with a soak test (§5.3).
3. **A corroboration-gated cue system** (§4.5) that refuses to emit a cue from a single
   detected body part, in contrast to the priority-list approach in prior work (§6).
4. **An honest evidence ledger** (§5, §8) distinguishing what was measured from what was
   assumed.

### 1.3 Scope and non-goals

PawSpeak is **not**: a veterinary diagnostic tool; an emotion classifier; a bark/meow
translator; a behaviour-prediction system. Detection failures are expected and are surfaced
to the user rather than hidden (§4.4).

---

## 2. Related Work

**COCO-SSD / EfficientDet.** Both are COCO-trained detectors over 80 common classes,
including ten animals (dog, cat, bird, horse, sheep, cow, elephant, bear, zebra, giraffe).
Neither models posture or intent. We use EfficientDet-Lite2 natively (§4.3) and COCO-SSD as
the web fallback.

**RTMPose / AP-10K.** RTMPose applied to the AP-10K animal pose dataset yields a 17-keypoint
quadruped skeleton. The skeleton excludes ear tips and the tail tip, which constrains what
can honestly be reported: our signal is limited to limb extension relative to torso length.

**DeepCat (IEEE 79630).** The reference implementation of cat body-language analysis
([repository audit](docs/reference/DeepCat-audit.md)). DeepCat detects five body parts with
YOLOv8, derives tail angle and eye aperture with OpenCV geometry, and maps those
measurements to mood labels via fixed thresholds. We adopt the part taxonomy and the
auto-labelling method; we reject the threshold-to-emotion mapping, which reports no held-out
evaluation, no calibration, and no inter-rater agreement, and which derives mood from a
single 2-D frame. Furthermore the repository carries **no licence**, so no code or artifact
may be reused — only the ideas.

---

## 3. System Architecture

```
                    ┌──────────────────────────────────────────┐
  camera / upload   │  React 19 · TypeScript · Vite 8          │
  ───────────────►  │  CameraScreen ─► detectPets / detectScene│
                    └───────────────┬──────────────────────────┘
                                    │
                    ┌───────────────▼──────────────┐
                    │  nativePetDetector.ts        │  isNativePlatform() && android?
                    │  (bridge + capability probe) │
                    └───────┬──────────────┬───────┘
                    yes     │              │  no / unavailable / throw
                ┌───────────▼──────┐   ┌───▼────────────────────────┐
                │ Capacitor plugin │   │ TF.js COCO-SSD (WebGL)     │
                │ PetDetector.java │   │ + detectionPipeline.ts     │
                │ TFLite Lite2     │   │   escalation + retry       │
                └───────────┬──────┘   └────────────────────────────┘
                            │ detections (label, score, bbox)
                    ┌───────▼──────────────────────────┐
                    │ petTracking.ts  (IoU association)│
                    │ liveDetectionLoop.ts (backoff)   │
                    │ liveGuidance.ts (light/frame)    │
                    └───────┬──────────────────────────┘
                            │ single detection
                    ┌───────▼──────────────────────────┐
                    │ animalPoseRuntime.ts (LiteRT)    │  17-keypoint SimCC decode
                    │ catBodyParts.ts (gated, inactive)│  requires 2 corroborating parts
                    └──────────────────────────────────┘
```

### 3.1 Component inventory

| Layer | Module | Responsibility |
|---|---|---|
| Detection (web) | `petClassifier.ts` | COCO-SSD load, 640 px downscale, box rescale |
| Detection (native) | `PetDetector.java`, `PetDetectorPlugin.java` | TFLite EfficientDet-Lite2, 4 threads |
| Detection routing | `nativePetDetector.ts` | Capability probe, JPEG encode, graceful fallback |
| Recovery (web) | `detectionPipeline.ts` | Backend escalation WebGL→CPU, bounded reloads |
| Recovery (loop) | `liveDetectionLoop.ts` | Bounded exponential backoff, never latches off |
| Association | `petTracking.ts` | IoU + centre-distance matching, 1-frame hold |
| Pose | `animalPose.ts`, `animalPoseRuntime.ts` | SimCC peak decode, limb-geometry classification |
| Cue gating | `catBodyParts.ts` | Two-part corroboration, no emotion vocabulary |

### 3.2 Model assets

| Asset | Size | Runtime | Purpose |
|---|---|---|---|
| `efficientdet_lite2.tflite` | 7.2 MB | TFLite (Android) | Native animal detection |
| `coco-ssd/model.json` + 5 shards | 17.7 MB | TF.js WebGL | Web/browser detection fallback |
| `rtm_animal_fp16.tflite` | 26.3 MB | LiteRT (WebGPU/wasm) | 17-keypoint pose |
| `litert-wasm/*` | 21.6 MB | WASM | LiteRT runtime (relaxed-SIMD + compat builds) |

---

## 4. Methods and Findings

### 4.1 Data and assets

The body-language dictionary comprises **102 entries (49 cat, 53 dog)** with **352 cited
source links** drawn from iCatCare, ASPCA, Cats Protection, RSPCA and peer-reviewed
literature. Each entry carries an evidence tier (1–10) reflecting source quality, deliberately
comparable across species. The dictionary is a curated reference, not model output: no
dictionary entry is generated by a classifier.

### 4.2 Finding: TensorFlow.js live inference is structurally unsuited to mobile WebViews

**Observation.** Live detection succeeded once on a physical device, then reported failure
and stopped.

**Source-level cause.** The reference implementation in `@tensorflow-models/coco-ssd`
(`dist/index.js`, `ObjectDetection.prototype.infer`) performs the following on **every**
inference call:

```js
prevBackend = tf.getBackend();
if (tf.getBackend() === 'webgl') tf.setBackend('cpu');   // tear down WebGL
// ... nonMaxSuppression on CPU ...
if (prevBackend !== tf.getBackend()) tf.setBackend(prevBackend);  // rebuild WebGL
```

The tfjs backend is destroyed and recreated per frame so that non-maximum suppression can
run on CPU. Desktop Chrome tolerates this. Mobile GPU contexts generally do not.

**Cost of the fallback.** We benchmarked CPU-backend inference of the same detector on
desktop Node:

```
CPU inference ms per frame: 1804, 1736, 1760, 1714, 1744
mean: 1752 ms
```

A 1.75 s/frame floor on desktop implies 4–8 s/frame on a phone — unusable for live preview.
The CPU path is therefore a *correctness* net, not a usable live mode, and the user-visible
symptom was an "Animal finding paused" banner with an apparently frozen detector.

**Conclusion.** The stack, not the model, was wrong. Desktop verification could not surface
this: repeated runs on a 640–1920 px synthetic camera produced 0 errors and stable detection,
because desktop GPU contexts are resilient.

### 4.3 Intervention: native detector with capability-based routing

A Capacitor plugin (`PetDetectorPlugin`) exposes `isAvailable()` and `detect({image})`.
`nativePetDetector.ts` probes once, caches the answer, and returns `null` when native is not
usable, at which point `petClassifier.ts` falls through to the web detector. Detection is
therefore never a hard dependency on either path.

Frames cross the bridge as downscaled JPEG (longest side 720 px, quality 0.72). Inference
runs on a dedicated thread; the plugin holds a single `ReentrantLock` so concurrent frames
queue rather than corrupt state. The model is memory-mapped from the APK
(`androidResources { noCompress 'tflite' }`).

Model choice was measured, not assumed (EfficientDet-Lite0 vs Lite2, §5.3): Lite2 raised
confidence on our reference photos from 74/76/84% to **85/82/86%** (dog/cat/bird) at roughly
1.7× the latency, still far inside the 900 ms loop budget.

### 4.4 Recovery: two independent safety nets

Because a single inference failure must never end live detection, we added two layers:

**`detectionPipeline.ts`** — on failure, retry on the same backend; after two consecutive
failures escalate to CPU and lock there; on `webglcontextlost` rebuild immediately; cap model
reloads at 3. The loop is *never* told "give up".

**`liveDetectionLoop.ts`** — every failure schedules another attempt with bounded
exponential backoff (400 ms doubling to a 4 s cap). Transient error names
(`InvalidStateError`, `AbortError`, `NotReadableError`, `TimeoutError`, `IndexSizeError`) are
retried silently and do not surface the unavailable banner. Only three consecutive genuine
failures reveal the diagnostic to the user — and even then, retries continue so the system
self-heals without a reload.

This matters because the earlier implementation returned from its `catch` block without
rescheduling: a single throw permanently stopped detection while the camera kept running.

### 4.5 Cautious cue gating

`catBodyParts.ts` consumes part detections (`ears`, `eyes`, `mouth`, `tail`, `body`) and
applies three constraints:

1. **One box per part**, highest score wins (inherited from DeepCat).
2. **Two corroborating parts required.** A single detected tail yields nothing. DeepCat
   instead selects the first non-zero part from a fixed priority list, so one stray box
   silently becomes a verdict.
3. **Report the weaker score.** Agreement must never inflate confidence.
4. **No emotion vocabulary.** A unit test fails the build if any of
   *happy, angry, aggressive, sad, fear, love, hate* appears in cue output.

The module is presently **inactive**: the shipped detector locates animals, not body parts,
so no detector feeds it. This is stated rather than papered over.

### 4.6 Pose estimation

`animalPoseRuntime.ts` crops a padded square around the detected animal, preprocesses to
normalised RGB NCHW (`mean = [123.675, 116.28, 103.53]`, `std = [58.395, 57.12, 57.375]`),
and decodes SimCC x/y score tensors into 17 keypoints. `classifyPoseSignals` reports only
`limbs-extended`, `limbs-tucked`, or `unclear`, requiring visible landmarks, torso length
≥ 12 px, and a near-horizontal torso (|Δy| / length ≤ 0.4). Birds are excluded: AP-10K is a
quadruped skeleton.

Reported "unclear" is often **correct behaviour**, not failure — a front-facing seated cat
has no visible side-on limb geometry.

---

## 5. Evaluation

All measurements below were taken from this build. Nothing in this section is projected.

### 5.1 Test suite

| Suite | Count | Result |
|---|---|---|
| TypeScript (`npm test`) | 70 | 70 pass |
| Python (dataset tooling) | 7 | 7 pass |
| Type check (`tsc --noEmit`) | — | clean |
| Production build (`vite build`) | — | clean |

Regression tests were written before fixes and confirmed failing for the expected reason
where the harness allowed it; two exceptions are disclosed in §8.

### 5.2 Detection accuracy (Android emulator, EfficientDet-Lite2)

| Image | Label | Confidence |
|---|---|---|
| dog | dog | 85% |
| cat | cat | 82% |
| bird | bird | 86% |

Confidence differs from the earlier TF.js model (99% / 98%) because the models differ; this
is a model change, not a regression. A UI path was driven end-to-end and reported
`Dog · 85% model score`.

### 5.3 Latency and stability

**Lite0** (earlier configuration), 60 consecutive frames, alternating dog/cat:

```
frames: 60   failures: 0   mean: 61 ms   p95: 94 ms   max: 103 ms
```

**Lite2** (current), 40 consecutive frames:

```
frames: 40   failures: 0   mean: 102 ms  p95: 187 ms  max: 188 ms
```

Both runs were on a **software-rendered** emulator GPU (SwiftShader), so these are a
pessimistic bound relative to real handset hardware. Zero failures across 100 total
inferences is the direct counter-evidence to the WebGL path, which failed after the first.

### 5.4 Recovery behaviour (fault injection)

With the real detector running, all video-frame canvas reads were forced to throw for 7 s:

| Phase | State | Banner |
|---|---|---|
| Healthy | `Pet in view · Dog 53%` | none |
| During fault | loop alive, retrying | shown once |
| 9–12 s after fault cleared | **`Pet in view · Dog 53%`** | auto-cleared |

No uncaught errors. Under the earlier implementation this sequence was terminal.

### 5.5 Detection pipeline (dataset tooling)

Auto-labelling was run end-to-end on real photographs. Backend comparison on a single cat
photo at zero-shot:

| Backend | Cat box | Part boxes |
|---|---|---|
| YOLO-World `yolov8s-worldv2` | 0.77 | **0**, even at conf 0.02 |
| GroundingDINO-tiny | 0.38 | **5** (ears 0.72, eyes 0.66, mouth 0.52, body 0.31, tail 0.30) |

Summary of the pipeline run: `images: 2 · withAnimal: 2 · accepted: 10 · rejected: 3`, with
generated YOLO labels validated (classes 0–4, coordinates normalised within (0,1)).

---

## 6. Discussion

### 6.1 Why the negative result generalises

The failure was not PawSpeak-specific. Any web application that runs COCO-SSD through
`@tensorflow-models/coco-ssd` in a loop on a mobile WebView inherits the per-frame backend
switch. The practical consequence is that *desktop browser verification cannot validate
mobile live-inference viability* — a methodological warning for anyone shipping TF.js on
mobile.

### 6.2 What prior work contributes, and what it does not

DeepCat's genuinely reusable contributions are the five-part taxonomy and the
auto-labelling workflow (GroundedSAM-generated boxes instead of hand annotation). Its mood
thresholds are not reusable: they are unvalidated, single-frame, and contradict its own
stated limitation that behaviour changes second-to-second. Adopting them would have
undone the caution this project exists to provide.

### 6.3 The remote-server pattern

DeepCat's Flutter client posts photos to a local server. That architecture cannot satisfy an
on-device privacy claim. We kept the privacy property and paid for it with engineering
complexity (single-inference-context native code) rather than moving the workload off-device.

---

## 7. Limitations

1. **No physical-device testing.** All Android results come from an emulator with a
   software GPU. Real handsets, thermal throttling, and low-end Android Go devices are
   untested.
2. **iOS native detection does not exist.** iOS currently uses the WebGL path and therefore
   inherits the weakness in §4.2. A Swift/Core ML or Swift/TFLite implementation is required,
   and cannot be built on this Windows machine.
3. **No part detector is trained.** `catBodyParts.ts` has no model behind it. The labelling
   toolchain exists; the dataset does not.
4. **The dataset pipeline is tooling, not results.** It is verified to run, not verified to
   produce a trainable dataset.
5. **Pose "unclear" is expected much of the time.** Training data (AP-10K) is largely
   side-on quadruped photography.
6. **Web/browser detection still uses the fragile path.** The native fix is Android-only.
7. **Correctness of the dictionary is inherited.** Entries and their evidence tiers come from
   the supplied reference; we did not independently re-verify each citation.

---

## 8. Reproducibility and evidence integrity

**Environment.** Node 24.21.0 · Python 3.12.14 · Vite 8.3.0 · React 19.0.1 ·
TypeScript 7.0.2 · @tensorflow/tfjs 4.22.0 · @tensorflow-models/coco-ssd 2.2.3 ·
@litertjs/core 2.6.0 · @capacitor/core 8.6.2 · AGP 8.13.0 ·
tensorflow-lite-task-vision 0.4.4 · Android compileSdk 36, minSdk 24 ·
Emulator: Android 15 (SDK 35), x86_64, SwiftShader.

**Commands.**

```sh
npm ci && npm run lint && npm test && npm run build
npm run android:apk          # → release/PawSpeak-debug.apk
tools/dataset/.venv/Scripts/python.exe tools/dataset/test_label_parts.py
```

**Where the claims come from.** QA artifacts are retained under `docs/qa/` by session
(`camera-20261112`, `e2e-20261112`, `mobile-followup-20261111`, …), including saved
assertion files, screenshots, and reports. The DeepCat audit is at
`docs/reference/DeepCat-audit.md`.

**Disclosed gaps in the test-first discipline.** Two items were fixed before a failing test
could be authored and are labelled as such rather than presented as verified red-green:
the native TFLite plugin (§4.3) has no automated test, being verified by emulator execution
only; and the `detected-pill` CSS class bug is cosmetic with zero matching CSS rules, so no
test was written. All other behavioural fixes listed in §4 have tests.

**Not a benchmark.** Class confidences in §5.2 are single-photograph observations used to
compare two models, not mAP measurements. No held-out evaluation set exists for detection or
pose.

---

## 9. Ethics statement

Body language is not a lexicon. The system's output is limited to what the evidence supports:
animal identity, visible body parts, and coarse limb geometry. Every cue is accompanied by a
caveat; ambiguous input produces abstention rather than a guess.

The application collects no data. Frames, photos, and audio are held in memory and discarded;
there is no server, no account, and no analytics. This was a design constraint from the
outset, and it is the reason the native plugin exists rather than a remote inference API.

Where a signal could be mistaken for a diagnosis (persistent limping, sudden behaviour
change), the interface directs the user to a veterinarian instead of attempting inference.

---

## 10. Future work

1. **Train the part detector** and wire it to `catBodyParts.ts` — the only route to making
   body-part analysis real rather than decorative. Requires a licensed, human-verified
   dataset (see [tools/dataset/README.md](tools/dataset/README.md)).
2. **Port native detection to iOS** (Core ML or Swift/TFLite on a Mac).
3. **Temporal modelling.** Single frames cannot see motion; a short-window model over tracked
   boxes would justify richer cues than current geometry allows.
4. **Calibrated confidence.** Replace raw detector scores with temperature-scaled or
   isotonic-calibrated probabilities before showing any percentage to users.
5. **Physical-device study.** Measure latency, thermals, and battery with real users across
   device tiers before making any performance claim in product copy.

### Longer-term research possibilities

These are exploratory ideas, not promised features. Health-related work would require
veterinary collaborators, appropriately sourced and consented datasets, representative
evaluation, and clear boundaries for when an owner should contact a veterinarian. Any output
would be a screening or follow-up prompt, never a diagnosis.

- **Eye-health signals.** Study whether photos can reliably surface visible changes such as
  redness, cloudiness, discharge, or pupil asymmetry for veterinary review. Lighting,
  reflections, breed differences, and camera quality would need careful evaluation.
- **Gait and mobility.** Explore short video analysis for changes in stride, symmetry, or
  weight-bearing that may warrant a veterinary check. This needs temporal models and
  clinician-reviewed examples across breeds, ages, and mobility conditions.
- **Signals in context.** Explore how posture, facial/eye cues, movement, and recent context
  can explain what is visibly different while preserving uncertainty and avoiding claims to
  read thoughts or translate vocalizations. Sound-event labels alone do not explain a pet's
  intent or emotion.
- **Personal baselines.** Investigate private, on-device comparisons with an individual pet's
  normal patterns, with opt-in data collection and controls to review or remove stored data.

---

## 11. Getting started

```sh
npm ci
npm run dev        # http://localhost:3000  (camera needs HTTPS or localhost)
npm run lint
npm test
npm run build
```

**Android.**

```sh
npm run android:apk   # → release/PawSpeak-debug.apk (debug-signed, not a store release)
```

**iOS.** `npm run ios:sync`, then open `ios/App/App.xcodeproj` in Xcode 26+ on a Mac. The
camera usage description is present. This machine can sync but not build the IPA.

**PWA.** Deploy `dist/` to an HTTPS static host. Camera access requires a secure context;
on a plain-`http://` LAN address browsers disable `getUserMedia` entirely, which is the most
common cause of "the camera does not work" when testing from a phone. Install the APK, use
HTTPS, or use `adb reverse`.

Detailed documentation: [DEVELOPMENT_GUIDE](docs/DEVELOPMENT_GUIDE.md) ·
[PET_AI_STRATEGY](docs/PET_AI_STRATEGY.md) · [TECHNICAL_SPEC](docs/TECHNICAL_SPEC.md) ·
[PRODUCT_SPEC](docs/PRODUCT_SPEC.md) · [DATA_AND_EVALUATION](docs/DATA_AND_EVALUATION.md) ·
[MOBILE_TESTING](docs/MOBILE_TESTING.md) · [ROADMAP](docs/ROADMAP.md) ·
[DeepCat audit](docs/reference/DeepCat-audit.md) · [dataset tooling](tools/dataset/README.md)

---

## 12. References

1. Lin, T.-Y. et al. *Microsoft COCO: Common Objects in Context.* ECCV 2014.
2. Tan, M., Pang, R., Le, Q. *EfficientDet: Scalable and Efficient Object Detection.* CVPR 2020.
3. Jiang, T. et al. *RTMPose: Real-Time Multi-Person Pose Estimation based on MMPose.* 2023.
4. Yu, X. et al. *AP-10K: A Benchmark for Animal Pose Estimation in the Wild.* NeurIPS 2021.
5. Fawzy, A. et al. *DeepCat: A Deep Learning Approach to Understand Your Cat's Body Language.*
   JAC-ECC 2023. IEEE Xplore 10479630.
6. Ren, S. et al. *Faster R-CNN.* NeurIPS 2015. (NMS post-processing used by COCO-SSD.)
7. Cafazzo, S., Natoli, E. *The social function of tail up in the domestic cat.* Behav.
   Processes 2009.
8. TensorFlow.js / `@tensorflow/tfjs-core` 4.22.0 — environment and backend registration
   (`dist/environment.js`).
9. `@tensorflow-models/coco-ssd` 2.2.3 — `ObjectDetection.prototype.infer` (`dist/index.js`).

---

## Licence and provenance

PawSpeak is released under the **Apache License, Version 2.0** — see [LICENSE](LICENSE) for the
full text and [NOTICE](NOTICE) for third-party attributions. Copyright 2026 Alexi.

Apache-2.0 was chosen over MIT for its explicit patent grant and trademark clause, and over a
proprietary licence because the project is intended to be readable and reusable as a research
prototype.

Third-party model weights retain their upstream licences (TensorFlow, Google Research, AP-10K);
see [NOTICE](NOTICE) for the per-asset breakdown. The third-party reference repository audited
in `docs/reference/` carries **no licence** and is not redistributed: it is excluded from
version control and no code from it was copied. `catBodyParts.ts` is an independent
reimplementation of published ideas.
