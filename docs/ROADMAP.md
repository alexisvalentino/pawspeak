# PawSpeak roadmap and phase board

Last reviewed: 2026-11-26

This file is the phase-status board for PawSpeak. The [development guide](DEVELOPMENT_GUIDE.md)
holds the detailed build instructions and gates; the [product spec](PRODUCT_SPEC.md),
[AI strategy](PET_AI_STRATEGY.md), and [data and evaluation plan](DATA_AND_EVALUATION.md)
define product boundaries and evidence requirements.

## How an AI agent should use this board

When asked to build a phase, an agent should:

1. Read this board and the linked detail for that phase.
2. Inspect the current code and working tree first. Treat status notes as a starting point,
   not proof that work still exists or is complete.
3. Work only on the requested phase and its independent prerequisites. Do not start later
   phases or add adjacent features.
4. Never invent training data, permissions, expert approval, evaluation metrics, or product
   capabilities. Stop at a decision or evidence gate when its requirement is unmet.
5. Update the task card with its status and a short evidence note. Mark it done only when its
   acceptance criteria are met, then update the phase heading and summary row. Preserve
   unrelated user changes; do not commit, publish, or deploy unless asked.

Use these task states consistently:

- **DONE** — acceptance criteria are met and there is evidence in the repo or a recorded
  review.
- **IN PROGRESS** — work has started in the current session or branch.
- **READY** — actionable now; prerequisites are available.
- **BLOCKED** — name the missing decision, permission, data, or earlier phase.
- **LATER** — intentionally outside current scope.

Roadmap stages are the user-facing phases. Their execution-guide phase numbers are mapped
below so an agent does not confuse the two numbering systems.

## Phase board

| Roadmap phase | Scope | Status | Detailed guide |
|---|---|---|---|
| 0 — Honest prototype | State what the current product does and does not do | **DONE** | [Product spec](PRODUCT_SPEC.md) and [AI strategy](PET_AI_STRATEGY.md) |
| 1 — Camera and dictionary foundation | Keep the current usable foundation reliable | **DONE** | [Development guide §1](DEVELOPMENT_GUIDE.md) |
| 2 — Define and label cue targets | Decide which visual cues are observable and eligible for future modeling | **IN PROGRESS** | [Development guide §2 and §3 protocol](DEVELOPMENT_GUIDE.md) |
| 3 — Evaluated on-device cue models | Collect approved data, train, integrate, and evaluate narrow models | **BLOCKED** until Phase 2 exits | [Development guide §3 collection and §§4–6](DEVELOPMENT_GUIDE.md) |
| 4 — Limited release | Ship only cues that passed evaluation and device checks | **BLOCKED** until Phase 3 exits | [Development guide §7](DEVELOPMENT_GUIDE.md) |
| 5 — Native pose and multimodal research | Evaluate additional platforms, modalities, and species | **LATER** | Requires a separate scope and evidence plan |

### Phase 0 — Honest prototype · DONE

- [x] **P0-1 — State product boundaries.** The product documents that it does not provide
  literal pet-speech translation, certain emotion labels, or veterinary diagnosis. **Evidence:**
  [product spec](PRODUCT_SPEC.md), [AI strategy](PET_AI_STRATEGY.md).
- [x] **P0-2 — Separate observation from interpretation.** Detection, visible posture cues,
  body-language references, and guardian-entered observations have distinct roles. **Evidence:**
  [product spec](PRODUCT_SPEC.md).

### Phase 1 — Camera and dictionary foundation · DONE

- [x] **P1-1 — Provide the learning path.** Searchable dog and cat body-language guides with
  source and evidence context. **Evidence:** `src/components/DictionaryScreen.tsx`,
  `src/data/bodyLanguageData.ts`.
- [x] **P1-2 — Provide the camera foundation.** On-device animal detection, explicit camera
  controls, photo upload, and honest unsupported/unclear states. **Evidence:**
  `src/components/CameraScreen.tsx`, `src/ml/petClassifier.ts`.
- [x] **P1-3 — Keep a private observation path.** Pet profiles and guardian-entered journal
  notes can be reviewed, corrected, deleted, and exported. **Evidence:**
  `src/components/ProfilesScreen.tsx`, `src/components/JournalList.tsx`, `src/utils/journal.ts`.
- [x] **P1-4 — Keep model boundaries explicit.** A missing cue model does not turn generic
  detection or pose estimates into an emotion result. Audio interpretation is not part of the
  current release. **Evidence:** [product spec](PRODUCT_SPEC.md),
  `src/components/AppInfoSheet.tsx`.

### Phase 2 — Define and label cue targets · IN PROGRESS

**Goal:** establish a small, reviewable set of dog and cat cues that can be judged from one
still image. This phase is definition and data planning; it does not train or install a model.

- [ ] **IN PROGRESS · P2-1 — Reconcile the proposed starter list.** Review the list in
  [development guide §2.2](DEVELOPMENT_GUIDE.md) against its own
  selection rules. Resolve the documented conflicts: `cat-loaf` is below the evidence-tier
  rule, and `dog-tail-loose-wag` implies movement unless redefined as a static tail position.
  **Done when:** every retained candidate passes the rules or is explicitly excluded with a
  reason.
- [ ] **READY · P2-2 — Classify dictionary cues by evidence and modality.** Review the current
  dog and cat entries; classify each as still-image, movement/video, vocal/audio, or
  context/manual observation. Record its evidence tier, observable signs, exclusions, and
  confounders in the development guide. Do not use dictionary illustrations as training data.
  **Done when:** every candidate has a modality and a short reason, and the still-image
  candidates are separated from the rest.
- [ ] **BLOCKED · P2-3 — Approve the still-image shortlist.** Requires P2-1 and P2-2 plus a
  domain reviewer. Select twelve or fewer cues with a one-sentence visual definition and
  one-sentence exclusion for each. Do not imply that a draft has expert approval.
  **Done when:** the approved IDs and review record are linked from this roadmap.
- [ ] **READY · P2-4 — Prepare the data and annotation protocol.** Document image sources,
  rights, consent, quality labels, present/absent/not-visible rules, annotator roles, and an
  animal-disjoint train/validation/test split. Include environment/device separation where
  feasible and the agreement threshold in [data and evaluation](DATA_AND_EVALUATION.md).
  **Done when:** the protocol is reviewable and no source is treated as cleared without
  evidence of permission.

**Phase 2 exit gate:** approved cue IDs, definitions and exclusions; modality classification;
documented data rights and consent; a reviewable annotation protocol; and a frozen
animal-disjoint split plan. Do not collect examples or begin model training before this gate
passes.

### Phase 3 — Evaluated on-device cue models · BLOCKED

**Goal:** train and ship only narrow visual cues that pass the agreed evaluation. Detailed
execution is in [development guide §§3–6](DEVELOPMENT_GUIDE.md).

- [ ] **BLOCKED · P3-1 — Collect and label the approved dataset.** Requires Phase 2 exit.
  Label only approved cues; retain hard negatives and `not visible` as a distinct state. Follow
  [development guide §3](DEVELOPMENT_GUIDE.md).
  **Done when:** provenance, label quality, agreement results, and the animal-disjoint frozen
  split are recorded.
- [ ] **BLOCKED · P3-2 — Train and version the model.** Requires P3-1. Compare a baseline with
  the agreed per-species approach. Record training artifacts and model version; do not enter
  placeholder or hand-estimated metrics.
  **Done when:** the model is reproducible and a candidate evaluation report is ready.
- [ ] **BLOCKED · P3-3 — Evaluate and prune.** Measure per-cue precision, recall, F1,
  calibration, hard-negative errors, and coverage on the frozen evaluation split. Record
  results in [data and evaluation](DATA_AND_EVALUATION.md). Remove cues that miss their agreed
  gates; use only measured values in the manifest.
  **Done when:** each retained cue has recorded results and reviewer sign-off, and the
  manifest passes the app validator.
- [ ] **BLOCKED · P3-4 — Integrate guarded cue output.** Requires P3-3 and its valid manifest.
  Show observable cue first, then evidence/context; preserve `unclear` and unsupported states.
  Keep output separate from pet detection and never map it to a certain feeling or intent.
  **Done when:** supported, unclear, unavailable, and error paths are implemented and reviewed.

**Phase 3 exit gate:** only evaluated cues remain in the manifest; uncertainty and failure
states work; metrics, limitations, and model version are recorded; device and offline checks
pass. See the manifest gate and definition of done in the [development guide](DEVELOPMENT_GUIDE.md).

### Phase 4 — Limited release · BLOCKED

**Goal:** release a small, accurately described feature set after Phase 3 passes.

- [ ] **BLOCKED · P4-1 — Verify release builds and supported devices.** Follow the manual
  [mobile test plan](MOBILE_TESTING.md); cover camera permissions, upload, offline relaunch,
  model errors, and the supported Android/web paths. Record any platform not verified.
- [ ] **BLOCKED · P4-2 — Complete privacy, licensing, and store review.** Confirm data flows,
  model/data permissions, notices, current platform requirements, and any target-jurisdiction
  review applicable to the release.
- [ ] **BLOCKED · P4-3 — Publish accurate release notes.** List supported cues, measured
  results, coverage, device scope, and known limitations. Make no claim beyond the evidence.

**Phase 4 exit gate:** release artifacts match the evaluated manifest; manual checks and
required reviews are recorded; the release notes match tested behavior. Signing, publishing,
or deployment still requires an explicit user request.

### Phase 5 — Native pose and multimodal research · LATER

- [ ] **LATER · P5-1 — Evaluate native pose APIs** as keypoint sources, then measure whether
  the points support specific observable cues on supported devices.
- [ ] **LATER · P5-2 — Evaluate movement and audio separately.** Each needs its own task,
  consented data, labels, held-out evaluation, and product review. Event detection alone does
  not translate vocalizations or establish intent/emotion.
- [ ] **LATER · P5-3 — Expand to other species** only with species-specific data, definitions,
  and evaluation. Do not reuse dog/cat assumptions.

## Decisions and standing boundaries

- Initial cue IDs and domain-review owner — **P2-3**.
- Training-data sources, rights, and consent — **P2-4**.
- On-device versus server inference — decide from measured accuracy, latency, privacy, and
  cost during **Phase 3**; do not assume a server path.
- Accounts and cloud sync — out of scope until explicitly approved as a product direction.
- Target jurisdictions and release-specific privacy review — **P4-2**.
- Emotion certainty, literal bark/meow translation, and diagnosis — not product goals.
