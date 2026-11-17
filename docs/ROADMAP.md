# PawSpeak roadmap

## Stage 0 — Honest prototype

Document heuristic behavior, remove platform-specific setup assumptions, and make clear that seeded results are demonstrations.

## Stage 1 — Camera and dictionary foundation (current implementation)

The app now has a searchable dog/cat body-language dictionary, on-device COCO-SSD detection for ten common animal classes, explicit camera controls, photo upload, and a supporting dog observation journal. Detection labels and boxes are not posture or emotion classification. A typed dog/cat still-image classifier adapter and unavailable/unclear states are implemented, but no trained cue model is installed.

## Stage 2 — Define and label cue targets

> **Active.** The concrete build order, cue shortlist, manifest requirements, and release
> gates for this stage are in [DEVELOPMENT_GUIDE](DEVELOPMENT_GUIDE.md). The direction it
> serves, and the alternatives that were rejected, are in
> [PET_AI_STRATEGY](PET_AI_STRATEGY.md).

Choose a small set of observable dog/cat still-image cues first. Keep movement cues that require video, vocal cues that require audio, and context-only observations separate. The external model recommendation classifies the existing 102 dictionary entries into these groups, but those modality labels are not stored in the dictionary and its analysis script is not present in this checkout; review the classifications before using them as a training plan. The dictionary and its illustrations are product content, not a training set. Establish media rights, consent, annotation guidance, and held-out animal/environment splits before model training.

## Stage 3 — Evaluated on-device cue models

Train and evaluate narrow per-species visual models on curated, multi-label examples. Evaluate motion and audio separately on appropriately labeled video and sound. Enable cue suggestions only after per-class performance, calibration, uncertainty handling, and expert review are documented. Map outputs to observable dictionary entries; never translate them into certain emotions, diagnoses, or literal pet speech.

## Stage 4 — Limited release

Deploy versioned inference with privacy controls, model monitoring, correction workflows, and clear supported-scope documentation. Review failures before expanding labels or species.

## Stage 5 — Native pose support and multimodal expansion

Evaluate platform-native animal-pose APIs as a keypoint source, then verify whether their points support specific observable cues. Combine audio, video, and user context only after each modality is independently evaluated. Expand cue interpretation to other species with dedicated data and evaluation rather than reusing dog/cat assumptions.

## Decisions still required

- Initial label set and expert review process.
- On-device versus server inference and acceptable latency/cost.
- Data sources and rights for training/evaluation.
- Whether user accounts and cloud sync are in scope.
- Target jurisdictions and privacy review.
