# Mobile install and test checklist

## Android APK

1. Build with `npm run android:apk` and transfer `release/PawSpeak-debug.apk` to the phone.
2. Install it and allow camera access when prompted.
3. Check the camera preview, switch cameras if available, start/stop tracking, capture a pet, and upload a JPG/PNG/WebP image.
4. Confirm supported animal detections show a box. On a clear quadruped photo, confirm pose landmarks appear; oblique/incomplete photos should stay unclear, and birds should report unsupported pose landmarks. The bundled COCO model includes dog, cat, bird, horse, sheep, cow, elephant, bear, zebra, and giraffe classes.
5. Keep the camera fixed while an animal moves across the frame; after several checks, confirm the screen reports position change. Keep the animal still and move only the camera; confirm the caveat says camera movement can affect that observation.
6. Tap **Check nearby sounds**, allow microphone access, and confirm listening lasts about four seconds. Check that a possible event is shown only as a sound label and model score, and that no recording is saved or uploaded. Deny microphone access and confirm the rest of the camera still works.
7. Open the dictionary, search and filter entries, and follow a source link while online.
8. Add a dog profile and journal observation, edit/delete one, and export the journal.
9. Enable airplane mode, relaunch the app, and check that the dictionary, local journal, detector, and any pose model previously used remain available.

## iOS Safari PWA

1. Deploy the contents of `dist/` to an HTTPS static host. The camera API is blocked on ordinary non-secure LAN HTTP addresses.
2. Open the HTTPS address in Safari, use **Share → Add to Home Screen**, then open PawSpeak from the home-screen icon.
3. Allow camera access and repeat the camera, photo, sound, dictionary, and journal checks above.
4. Open the app online once and wait for core offline setup to complete. Run pose and sound checks at least once while online, then enable airplane mode and verify those optional models can load from their local cache.

## Device notes

- PWA setup caches the app and approximately 18.6 MB detector. Pose weights (27.5 MB) and LiteRT WASM runtimes download/cache on first use, so allow extra storage and network time.
- Android APK assets include the detector, pose model, and LiteRT runtime at install time; test final APK size and first-launch performance.
- Camera and model performance depend on device/browser support and available memory. This checklist is for manual real-device verification; no physical phone is attached to this build environment. Position movement is a box-tracking observation rather than an action classifier.
