# Development guide — cue translation to release

Status: working guide · Last revised 2026-11-16 · Companion to
[PET_AI_STRATEGY](PET_AI_STRATEGY.md), [TECHNICAL_SPEC](TECHNICAL_SPEC.md),
[PRODUCT_SPEC](PRODUCT_SPEC.md), [ROADMAP](ROADMAP.md), [DATA_AND_EVALUATION](DATA_AND_EVALUATION.md).

This is the build order from the current state to a shippable release. It assumes the
direction recorded in [PET_AI_STRATEGY](PET_AI_STRATEGY.md) §6: **cue translation, not
emotion inference.**

---

## 0. Starting position (verified 2026-11-16)

What exists and works:

- `npm run build` — clean (7.39 s). `npm run lint` (`tsc --noEmit`) — clean.
- Detector, pose, sound-event, dictionary, journal, profiles all wired and shipping.
- `release/PawSpeak-debug.apk` and `PawSpeak-release.apk` build.
- 102 dictionary entries (49 cat, 53 dog) with `plainWords`, evidence tiers, and 352 citations.
- `getBehaviorClassifier()` is already called from `CameraScreen.tsx` and returns `null` when
  no manifest is present. **The entire cue feature is one model file away from working.**
- Cat support in the journal is complete: `PetProfile` carries `species`, and
  `DOG_BODY_CUES` / `CAT_BODY_CUES` are split with a `cuesForSpecies()` selector. This is
  already the species-conditioned shape the cue model needs (§4.1).

What does not exist:

- No cue model. No `public/models/behavior/manifest.json`.
- No `public/models/behavior/model.json`.
- The part detector (`catBodyParts.ts`) is inert — no native code references it.

> **Run `npm test` in your own terminal before starting.** It could not be executed in the
> authoring sandbox — Node forks a child process per test file and the sandbox blocks it
> (`spawn EPERM`). `lint` and `build` are verified clean; the suite is not. Note that
> `src/utils/journal.test.ts` still imports `DogProfile` and asserts against a `dogs` key
> while the refactor renames user-facing concepts to "pet"; confirm those tests still express
> the intended behaviour rather than merely passing.

### 0.1 Large uncommitted refactor on `main`

The working tree carries an in-flight pet-profile refactor that predates this guide:

| Area | Files |
|---|---|
| Species support | `src/types/journal.ts`, `src/utils/journal.ts`, `src/components/PetForm.tsx` (new), `DogForm.tsx` (deleted) |
| UI | `App.tsx`, `AppHeader.tsx`, `AppNavigation.tsx`, `CameraScreen.tsx`, `DictionaryScreen.tsx`, `ObservationForm.tsx`, `ProfilesScreen.tsx` |
| Native / build | `capacitor.config.ts`, `android/app/capacitor.build.gradle`, `android/capacitor.settings.gradle`, `scripts/build-android-release.mjs` |
| Deps | `package.json`, `package-lock.json` (`@capacitor/app`, `@capacitor/keyboard`) |

One naming wart to settle before it calcifies: `JournalState` still declares `dogs: PetProfile[]`
while holding both species. Rename to `pets` — but that is a persisted-schema change, so it
needs a migration step and a test, not a find-and-replace. Do it now, while the tree is already
open, or accept the name permanently.

---

## 1. Phase 1 — Land the trunk (half a day)

Goal: a clean, committed baseline so that model work is separable from UI work.

1. Verify the environment.
   ```powershell
   npm ci
   npm run lint
   npm test
   npm run build
   ```
2. Review the uncommitted diff and commit it in **two** commits, not one — the refactor and
   the native fix are unrelated and reviewing them together is harder:
   ```powershell
   # 1: species-aware pet profiles + UI
   git add src/
   git commit -m "feat: species-aware pet profiles (dog + cat)"
   # 2: native shell behaviour
   git add capacitor.config.ts android/ scripts/ package.json package-lock.json
   git commit -m "feat: android hardware back, keyboard resize, release build"
   ```
3. Decide the `dogs` → `pets` rename (see §0.1) or record it as accepted debt.
4. Bump `versionCode` / `versionName` in `android/app/build.gradle` when you next cut an APK.
   Currently `versionCode 1`, `versionName "1.0"`, `applicationId "com.pawspeak.app"`.

**Exit criteria:** clean tree, green suite, refactor and native fix committed separately.

---

## 2. Phase 2 — Choose the cue set (one day, no code)

This is the highest-leverage day in the plan. Everything downstream is bounded by it.

### 2.1 Selection rules

A cue qualifies only if **all** of the following hold:

1. **Visible in a single still frame.** Reject anything needing motion (tail lashing, helicopter
   tail, swishing) — those belong to a temporal model, later.
2. **Observable on the cropped animal**, not requiring a human-animal interaction to be present.
3. **Evidence tier ≥ 6.** Below that the dictionary itself says the support is weak or
   contested, and a detector would be manufacturing false authority.
4. **Not a myth entry.** Tier-1 entries exist to *correct* misinformation
   (`cat-myth-tail-wag-happy`, confidence 1). Never a detection target.
5. **Single, unambiguous visual definition.** If two annotators looking at the same photo
   could reasonably disagree on whether the cue is present, it is not ready.

### 2.2 Recommended starter set

Twelve cues, six per species, all meeting the rules above. IDs are real dictionary IDs.

**Cat**

| ID | Cue | Tier | Note |
|---|---|---|---|
| `cat-tail-up` | Tail held straight up | 8 | Sourced to a peer-reviewed study; strong start |
| `cat-ears-flat` | Ears flattened against the head | 8 | Distinct silhouette |
| `cat-ears-forward` | Ears upright, facing forward | 7 | Useful contrast class with above |
| `cat-loaf` | Sitting loaf, paws tucked | 5 | Tier 5 — see caution below |
| `cat-tail-puffed` | Puffed bottle-brush tail | 7 | Distinctive; rare in practice |
| `cat-slow-blink` | Slow blink / half-closed eyes | 7 | Highest owner recognition |

**Dog**

| ID | Cue | Tier | Note |
|---|---|---|---|
| `dog-play-bow` | Play bow | 8 | Unmistakable posture; best dog starter |
| `dog-ears-pinned-back` | Ears pinned flat back | 8 | Distinct silhouette |
| `dog-tail-tucked` | Tail tucked between legs | 7 | Strong welfare relevance |
| `dog-relaxed-open-mouth` | Relaxed open mouth | 7 | Common; good negative-class balance |
| `dog-tail-loose-wag` | Loose wide tail wag | 7 | **Fails rule 1** — see caution |
| `dog-low-posture-cowering` | Crouching low, cowering | 8 | High welfare value |

### 2.3 Two cautions on the list above

- `cat-loaf` is tier 5. The dictionary explicitly flags this band as "mixed or conflicting
  findings." Either drop it, or ship it with the tier visible and no action advice.
- `dog-tail-loose-wag` implies motion. If you keep it, the label must mean *"tail held in a
  loose, wide arc"* (a still-frame property), not wagging. If annotators cannot apply that
  distinction consistently, drop it and take `dog-soft-eyes` (tier 7) instead.

**Do not** substitute a cue from the excluded list without re-checking rules 1–5. The excluded
set — lashing, helicopter tail, stress panting, whale eye at distance, tail-wag-side-bias —
is excluded for reasons that will resurface as failures later.

**Exit criteria:** twelve IDs written down, each with a one-sentence visual definition and a
one-sentence exclusion, agreed before any photo is taken.

---

## 3. Phase 3 — Collect and label (the real bottleneck)

The manifest validator (§4.2) will not accept placeholders. Real numbers are required, so this
phase cannot be skipped or simulated.

### 3.1 Volume targets

| Purpose | Per cue | Total (12 cues) |
|---|---|---|
| Train | 120–200 positives | ~2,000 |
| Val | 25–40 positives | ~400 |
| Test (held-out) | 40+ positives | ~500 |
| Negatives / hard cases | — | ~1,000 |

Hundreds, not thousands, per cue. Fewer *verified* images beat many unreviewed ones.

### 3.2 Collection rules that determine whether the model is real

- **Split by animal, not by image.** The same cat must never appear in both train and test.
  Adjacent frames from one video are effectively the same image — never split them.
- **Hold out environment and device** where possible, not just animal.
- **Labelled `absent` is as valuable as `present`.** A dataset of only positives teaches a
  model to see the cue everywhere.
- **Capture hard negatives deliberately:** same cue on the wrong species, similar silhouette
  in a different cue, partial occlusion, odd lighting, night/IR, motion blur.
- **Record quality metadata:** obvious, partially visible, borderline. Borderline images are
  what calibrate the abstention threshold.
- **Media rights and consent** per [DATA_AND_EVALUATION](DATA_AND_EVALUATION.md). Dictionary
  illustrations are **not** training data — their rights and representativeness are unverified.

### 3.3 Annotation protocol

- Two annotators on a random 10% sample. Measure agreement (Cohen's κ) **before** labelling
  the rest. If κ < 0.6 the cue definition is broken, not the annotators — fix §2.2 and restart
  that cue.
- Every image gets `present` / `absent` / `not visible`. "Not visible" is not "absent" and
  must not be merged with it.
- Store labels keyed by dictionary ID. The ID *is* the contract with the app (§4.2).

**Exit criteria:** twelve cues labelled, κ measured and recorded, animal-disjoint train/val/test
split frozen.

---

## 4. Phase 4 — Train and produce the manifest

### 4.1 Training

A TF.js Layers multi-label sigmoid classifier over the crop produced by the existing detector.
No native work. This is the cheap path and it is why cue classification was chosen over part
detection.

Because the input is already an animal crop (`createPoseCropRect` and the classifier adapter
both crop), a small transfer-learning model is sufficient — MobileNet-class backbone, input
size 224, one sigmoid output per label.

Rules:

- One sigmoid per label, in the **same order as the manifest's `labels` array**. A silent
  reordering relabels every prediction — a Python-side assertion is worth writing.
- Train one model per species (cats and dogs are separate label sets), or a single model with
  species-conditional heads. Do not pool them naively; the same visual pattern means different
  things.
- Save at least one deliberately over-fit baseline so you can prove the pipeline learns at all
  before trusting a low-quality run.

### 4.2 The manifest gate — read this before training

`parseBehaviorManifest` in [`src/ml/petClassifier.ts`](../src/ml/petClassifier.ts) rejects the
manifest unless:

- `modelUrl`, `modelVersion`, integer `inputSize` present;
- `outputMode === 'multi-label-sigmoid'`;
- `labels.dog` and `labels.cat` both non-empty, no duplicates;
- **every label exists in the dictionary with a matching species**;
- `validation.datasetVersion` and `validation.evaluatedAt` present;
- `validation.heldOutAnimals === true`;
- **every cue has finite `precision`, `recall`, and `calibrationError` in [0, 1]**;
- all `thresholds` are in [0, 1].

Placeholders are structurally rejected. Producing these numbers is the point of Phase 3.

### 4.3 Choosing per-cue thresholds

Set each threshold from the test split, not by feel. Optimise for **precision over recall**:
a wrong cue shown confidently costs more trust than a missed one, because the missed cue reads
as `unclear`, which is already a supported and honest state.

### 4.4 Output files

```
public/models/behavior/
  manifest.json          # validated by parseBehaviorManifest
  model.json             # TF.js Layers topology
  group1-shard1of1.bin   # weights
```

Also update [public/models/behavior/README.md](../public/models/behavior/README.md) to replace
its placeholder manifest example with the real one.

**Exit criteria:** manifest in place, app loads it, cue chips appear in the camera UI with a
model version label.

---

## 5. Phase 5 — Wire and harden the UI

`getBehaviorClassifier()` is already called. Work here is presentation and honesty, not
plumbing.

1. **Lead with the cue, not a mood.** "Tail held straight up" → then the meaning, then the
   evidence tier. Never the reverse; the observation is the product.
2. **Show the tier.** `EVIDENCE_SCALE` already defines 1–10 in plain language. Rendering it is
   the differentiator — competitors cannot fake a citation.
3. **Show the model version** next to any cue, from `BehaviorResult.modelVersion`.
4. **Respect `status`.** `Safe` / `Caution` / `Stop` already exists per entry. `Stop` must be
   visually distinct and actionable ("stop petting") without asserting fear.
5. **`unclear` is a first-class state**, with a reason where known ("face not visible" vs
   "low confidence"). Do not render an empty panel; the abstention must look deliberate.
6. **Cap at three candidates** — already enforced in the adapter. Do not raise it.
7. **Re-check the native-shell concerns** per `.clinerules/native-design.md`: safe areas,
   viewport height, keyboard, Android back, touch feedback, text scaling. Run the detector:
   ```powershell
   node C:\Users\alexi\.agents\skills\impeccable-native\scripts\detect-native.js .
   ```
   Exit code 2 means findings; confirm each in the running app before reporting it.
8. **Add a regression test asserting no emotion vocabulary** reaches cue output, extending the
   existing guard. It currently protects `catBodyParts.ts`; extend it to the classifier path.

**Exit criteria:** cue → meaning → tier → action renders correctly for one cat and one dog
photo, and `unclear` renders for a deliberately bad input.

---

## 6. Phase 6 — Evaluate honestly (do not skip)

Produce, per cue, on the frozen test split:

- precision, recall, F1;
- calibration error (the number the manifest demands);
- confusion on hard negatives;
- **coverage**: what fraction of real photos produce any cue at all. A detector that abstains
  95% of the time is honest but useless; measure it rather than discovering it from users.

Write the results into `docs/DATA_AND_EVALUATION.md` as a dated section. If a cue fails its
threshold, **remove it from the manifest** rather than lowering the bar. The manifest is a
public claim about what the app can see.

**Exit criteria:** a dated evaluation table, and a manifest containing only cues that earned
their place.

---

## 7. Phase 7 — Release

### 7.1 Two release channels, different bar heights

| Channel | Build | Gate |
|---|---|---|
| **PWA** | `dist/` to an HTTPS static host | Evaluation table complete; no store review |
| **Android APK** | `npm run android:apk` | Same, plus the manual device checklist |

`npm run android:release` exists for a release build. Note both are **debug-signed** today;
a store release needs a real keystore, and `*.jks` / `keystore.properties` are already
gitignored — keep them that way.

### 7.2 Manual verification before either channel

Follow [MOBILE_TESTING](MOBILE_TESTING.md) end to end. The items that matter most for this
release:

1. Camera preview, capture, upload; confirm no frame is uploaded or persisted.
2. Cue appears on a clear photo; `unclear` on an oblique one.
3. Airplane mode relaunch: dictionary, journal, detector, and cue model all still available.
4. iOS Safari PWA path — camera needs HTTPS or localhost; LAN `http://` disables
   `getUserMedia` entirely and is the most common false "camera broken" report.
5. iOS native detection still does not exist and inherits the WebGL weakness documented in
   [README](../README.md) §4.2. **State this in release notes rather than implying parity.**

### 7.3 Version and store metadata

- Update `versionCode` / `versionName` in `android/app/build.gradle`.
- Confirm `appId: 'com.pawspeak.app'` in `capacitor.config.ts` is the identity you want to
  keep permanently — changing it later creates a new app.
- Regenerate icons via `npm run assets:generate` if branding changed.
- Keep `NOTICE` current; third-party weights retain upstream licences.

### 7.4 Release notes must claim only what was measured

Include: which cues ship, per-cue precision/recall, the coverage figure, and the scope limits
(still image only; no motion, audio, emotion, or diagnosis). This is the project's differentiator
and it costs nothing to state.

---

## 8. Definition of done

- [ ] Clean tree, green `lint` / `test` / `build` on your machine
- [ ] Twelve (or fewer) cues, each with a written visual definition and exclusion
- [ ] Animal-disjoint train/val/test split, frozen and dated
- [ ] Inter-annotator κ recorded per cue; any cue below 0.6 dropped
- [ ] `manifest.json` passes `parseBehaviorManifest` with real metrics
- [ ] Cue → meaning → evidence tier → action renders; `unclear` renders with a reason
- [ ] Emotion-vocabulary regression test covers the classifier path
- [ ] Dated evaluation table in [DATA_AND_EVALUATION](DATA_AND_EVALUATION.md)
- [ ] Manual device checklist completed; offline relaunch verified
- [ ] Release notes list cues, metrics, coverage, and limits
- [ ] iOS limitation stated, not implied away

---

## 9. Explicitly out of scope for this release

Recording these prevents scope creep mid-build:

- Emotion or mood labels — permanent exclusion ([PET_AI_STRATEGY](PET_AI_STRATEGY.md) §2).
- Motion cues (tail lashing, pacing, helicopter tail) — needs a temporal model.
- Audio cues — YAMNet surfaces labels only and is not calibrated for animals.
- The body-part detector (`catBodyParts.ts`) — deprecated from the critical path; cue
  classification replaces it. Leave the module and its tests in place, but do not wire it.
- CCTV / fixed-camera monitoring — a different product (`PET_AI_STRATEGY` §3.1).
- Disease, pain, or lameness detection — roadmap stage 3+, requires clinical partners.
- Accounts, cloud sync, analytics — conflicts with the privacy claim.
- iOS native detection — needs a Mac.

---

## 10. The cheapest falsifying experiment

If Phase 3 looks expensive, run this first, this week, before committing:

> **One fixed camera, one animal, two weeks, activity budget only.** No new models, no part
> detector, no pose. Derive presence/absence and motion from the boxes the app already
> produces. Plot the circadian curve.

If the curve is stable and visibly shifts when the animal is off-colour, the longitudinal
direction is real and worth the dataset. If it is noise, you have saved a year for the price
of an afternoon.

Whatever you build in Phase 3, design the output shape so this experiment can produce data in
it — otherwise the two-week test becomes throwaway work.
