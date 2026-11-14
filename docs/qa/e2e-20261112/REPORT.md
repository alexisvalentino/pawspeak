# End-to-end bug hunt

Date: 2026-11-12. Target: http://localhost:3000. Scope: Camera, real model results, live guidance, dictionary, journal, media, settings, and phone/iPad layouts.

## Confirmed bugs and fixes

### ISSUE-001 — Pending camera grant survives page hide
- **Reproduction:** start camera with permission pending, hide the page, then grant permission.
- **Before:** stream remained `live` while UI was stuck at “Starting camera…”.
- **Cause:** visibility cleanup only stopped an already-active stream; it did not invalidate pending permission or delayed `video.play()` completion.
- **Fix:** reset/invalidate requests on visibility change, stop late-arriving streams, and guard state changes after play and in catch handlers.
- **After:** late grant ends every track and never reactivates camera UI.

### ISSUE-002 — Settings leaves camera running behind modal
- **Reproduction:** start camera, then open journal settings.
- **Before:** settings opened while video tracks remained `live`.
- **Fix:** menu opening dispatches a camera-suspension event; CameraScreen resets and stops tracks.
- **After:** every track ends and the settings dialog remains usable.

### ISSUE-003 — Future journal observations accepted
- **Reproduction:** create an otherwise valid observation with `2027-01-01T12:00`.
- **Before:** entry saved with that future timestamp despite the picker’s `max` attribute.
- **Cause:** custom validation (`noValidate`) did not compare the timestamp to current time.
- **Fix:** `validateObservation` rejects dates more than five minutes in the future.
- **After:** visible error “Observation time cannot be in the future”; no new record is added.

### ISSUE-004 — Unsupported SVG upload reaches model
- **Reproduction:** upload an SVG through the photo input.
- **Before:** SVG was decoded and processed, resulting in “No dog or cat found” rather than a file-type error.
- **Fix:** accept only JPEG, PNG, and WebP MIME types; clear stale preview/analysis before a new upload.
- **After:** immediate “Choose a JPG, PNG, or WebP photo” error; model is not invoked.

### ISSUE-005 — Live coach cramped at 320px
- **Reproduction:** open live guidance at 320×568.
- **Before:** three narrow columns wrapped labels awkwardly and reduced readability.
- **Fix:** below 360px, use full-width compact coaching rows.
- **After:** readable guidance, no horizontal overflow.
- **Evidence:** `live-coach-320.png` and `live-coach-320-fixed.png`.

## Regression and workflow results

- `npm test`: **15 PASS**, including the future-date regression and model/guidance boundary cases.
- `npm run lint`: **PASS**.
- `npm run build`: **PASS**.
- `git diff --check`: **PASS**.
- `scripts/verify-camera.mjs`: **20 PASS** for dictionary behavior and all four tabs at 320, 390, 768, and 1024px, including primary camera-button clearance.
- `scripts/verify-camera-lifecycle.mjs`: **5 PASS** for late grant on hide, settings suspension, and permission after navigation.
- Journal browser regressions: **32 PASS** across fresh/empty state, profile editing, observation save/edit/reload/delete, validation, media validation/consent, profile deletion, export, and clear-data persistence.
- Actual model runs after fixes: **Dog detected**, **Cat detected**, and bird correctly returned **No dog or cat found** with the bird alternative.
- SVG rejection and future-date rejection were reverified through actual UI interactions.
- Camera permission denial still shows its recovery path.
- Final browser console checks reported **no JavaScript errors**.

## Evidence and limits

- `camera-lifecycle-checks.json`, `layout-checks.json`, and journal `checks-*.json` contain the saved assertions.
- Small-screen coach screenshots are listed above. Existing dog/cat/bird evidence is in `docs/qa/camera-20261112`.
- The 10fps recording failed with encoder lag; no usable WebM was produced, so video is not claimed as evidence.
- Test streams and permission failures were synthesized at browser boundaries; real dog/cat/bird inference used actual COCO-SSD, not mocked classifications.
- No physical iOS/Android hardware, Safari/WebKit, real camera permission prompts, low-end performance, or native packaging was tested.
- Pet detection works, but posture/emotion/intent classification still requires a separately trained model. No such model result is claimed here.
