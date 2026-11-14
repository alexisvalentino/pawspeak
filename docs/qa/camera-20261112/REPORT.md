# Camera, dictionary, and ML verification

Date: 2026-11-12. Target: http://localhost:3000. Product direction confirmed with the user: playful dog/cat body-language companion, with Camera and Dictionary as primary features and Journal as supporting history.

## Implemented

- Restored playful sky-blue/amber/mint styling with standard header and bottom navigation: Camera, Learn, Journal, Pets.
- Real lazy-loaded TensorFlow.js + COCO-SSD `lite_mobilenet_v2` dog/cat detection, with actual model confidence and bounding boxes. First use downloads model files from the COCO-SSD host; photos are processed locally in memory.
- Camera permission/start/stop/switch controls, live capture, JPG/PNG/WebP upload, model loading/error states, retry, and track cleanup on unmount/page hiding.
- Searchable dog/cat dictionary with category filters, detailed observations, cautious possible meanings, context checks, and related cues.
- Optional behavior-classifier adapter with a separate posture-model manifest, versioned labels, input size, score threshold, unavailable state, and unclear low-confidence result. No behavior model is installed.
- Voice clues is disclosed as a future trained audio-classification mode, not a literal translator.

## Verified from current source

- `npm test`: **10 PASS** (journal behavior plus pet filtering/confidence ordering and posture-manifest validation).
- `npm run lint`: **PASS**.
- `npm run build`: **PASS**. TF modules remain lazy-loaded; Vite reports large TF chunks and an existing `__dirname` config warning.
- `git diff --check`: **PASS**.
- Design scan over `src`: **no findings**.
- Saved `layout-checks.json`: **19 PASS**: cat-specific content, dictionary search/details, and all four tabs at 320×568, 390×844, 768×1024, and 1024×768. No horizontal overflow, no buttons below 44×44, three consistent header controls.
- Actual COCO-SSD browser inference: dog test image **99%**, cat test image **98%**. Screenshots `dog-detection.png` and `cat-detection.png`. Both correctly show that behavior reading is unavailable rather than inventing emotions.
- Camera denial synthesized at `getUserMedia`: visible permission error with upload/retry.
- Synthetic MediaStream lifecycle: navigating away changed every video track to `ended`.

## Responsive fixes found during testing

A fixed camera minimum height interacted with aspect ratio and produced 354px document width at 320px. The camera is now width-constrained and fluid. Category filters were also raised to 44px. The complete responsive suite passed after those changes.

## Evidence and limitations

- `camera-idle.png`, `dog-detection.png`, `cat-detection.png`, `dictionary.png`, and `layout-*.png` were captured and inspected.
- Recording at 10fps again failed with encoder lag. No usable WebM was produced; video is not counted as evidence.
- Final layout `browser-errors.txt` is empty. Model-inference runs also reported no browser errors.
- Test photos are downloaded Unsplash images used only for local QA. They are not presented as user pets or training/evaluation data.

## Not a finished emotion/intent classifier

COCO-SSD detects dogs and cats. It cannot infer body language, emotion, hunger, or intent. The optional posture adapter is implemented and its manifest validation is tested, but **no trained posture model or real posture inference was verified**. Enabling it requires a TF.js Layers model and manifest, appropriately licensed labeled data, preprocessing compatibility, evaluation on held-out animals/environments, calibration, abstention tests, and expert review.

Physical iPhones, iPads, Android devices, Safari/WebKit, actual camera permissions/hardware, low-end model performance, real native packaging, and any audio/intent model remain untested. This is a functional camera/dictionary prototype with real pet detection—not a completed pet translator or validated emotion reader.

## Cute visual refinement — follow-up

The previous UI was functional but visually restrained: a large dark camera placeholder dominated phone and tablet screens, the header lacked identity, and most dictionary surfaces were white or gray.

Implemented after inspecting phone/iPad renders:

- Warmer cream app background and more saturated sky-blue, sunny-yellow, mint, and coral surfaces.
- Paw-led logo, pet picker, friendlier product copy, and consistent icon styling.
- Bright gradient camera welcome with dog/cat icons, paw accents, and a compact scan guide. Live camera remains a practical preview.
- More colorful dictionary cards and category/species controls with retained text contrast.
- Short-screen camera layout keeps the primary action above bottom navigation.
- Captured photos retain their natural aspect ratio, keeping detection boxes aligned instead of cropping images for visual symmetry.

Final visual checks: **20 browser assertions PASS** (the previous 19 plus the 320px camera-action clearance assertion), **10 automated tests PASS**, TypeScript and production build PASS, design scan no findings. Real dog inference was rerun after the redesign and the aligned result was inspected in `cute-dog-result.png`.

Evidence: `before-cute-phone.png`, `before-cute-ipad.png`, `cute-phone.png`, `cute-ipad.png`, `cute-dictionary.png`, `cute-small-final.png`, `cute-dog-result.png`, and refreshed `layout-*.png`.

## Live eKYC-style camera guidance

The static landing-page scan-tip cards were removed. During live camera use, a compact in-preview coach now evaluates lighting (sampled frame luminance), pet count (real COCO-SSD detections), and approximate framing (bounding-box edge/size checks). Inference is throttled rather than run continuously at display frame rate. Guidance does not claim whole-body or emotion recognition.

Verification: **13 automated tests PASS**, including lighting, pet-count, cutoff, and small-subject cases; **20 responsive/dictionary browser assertions PASS**; TypeScript and production build PASS; design scan no findings. A synthetic live dog-video stream produced "Lighting looks good," "One pet found," and "Framing looks good." Capture still returned Dog detected, and every video track ended. Evidence: `live-coach.png`.

## Out-of-scope / non-pet results

The detector now retains other COCO classes separately from dog/cat detections. When no supported pet is found, the UI says "No dog or cat found" and can explain what was detected instead. It avoids claiming the image definitely contains no pet because unclear animals can be missed.

Verified with a real bird photo: the app displayed "The model found bird instead. PawSpeak currently supports dogs and cats." A subsequent dog upload still returned Dog detected. **14 automated tests PASS**, TypeScript and production build PASS. Evidence: `bird-out-of-scope.png`.
