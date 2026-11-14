# Mobile-first layout verification

- Target: http://localhost:3000
- Date: 2026-11-11
- Session: pawspeak-mobile-20261111; Chromium touch emulation, with Chrome DevTools used for geometry assertions.
- Scope: existing four-tab UI, touch targets, navigation, forms, popovers and modal sizing. Existing visual language preserved.

## Findings addressed

1. Daily-goal popup was positioned 104px outside the left edge. Reproduce by opening Daily Goal on a narrow viewport. Now left-aligned and viewport-constrained. Evidence: before-phone.png and after-phone.png.
2. Visualizer controls were only 22–24px tall, with other actions below 44px. Shared touch target floor now applies to buttons; fixed a flex-child rule that initially overrode minimum widths.
3. Desktop four-column pet/soundboard layouts activated at tablet landscape sizes. Both now retain two readable columns on tablets; translation remains a single task flow.
4. Dialogs had inconsistent height containment and no shared modal focus behavior. All four use a native dialog, body scroll lock, Escape dismissal and safe-area-aware scrollable panels. Phone sheets bottom-align; tablet dialogs center.
5. Form fields used small text that can trigger iOS focus zoom. Inputs, textareas and selects now have a 16px floor. Real iOS keyboard verification remains outstanding.

## Checks

| Check | Expected | Actual | Status |
| --- | --- | --- | --- |
| All four tabs at 320×568 | No horizontal overflow; buttons at least 44×44 | No out-of-viewport main elements, document width 320, zero undersized buttons | PASS |
| All four tabs at 768×1024 | Same constraints, usable tablet layout | Document width 768, zero overflow/undersized buttons | PASS |
| All four tabs at 1024×768 | Same constraints in iPad landscape | Document width 1024, zero overflow/undersized buttons | PASS |
| 390×844 phone | Readable shell, popup and share controls | Inspected rendered screenshots and completed flows | PASS |
| Empty add-pet form | Save disabled | Disabled until name entered | PASS |
| Add pet | Selected pet and profile update | Added Maple / Labrador mix; header and profile updated | PASS |
| Empty mood notes | Save disabled | Disabled before input and after successful save | PASS |
| Save mood | Diary entry and XP update | Test note rendered in diary; XP increased by 50 | PASS |
| Share mood dialog | Correct pet preview and reachable controls | Maple preview rendered, modal scrolls; Escape dismissed | PASS |
| Streak dialog at 667×375 | Panel stays inside viewport and scrolls | Panel y=16, height=343; content height 523; body locked; focus inside modal | PASS |
| Escape dismissal | Dialog removed and body unlocked | Zero dialogs; overflow restored | PASS |
| Type check | No errors | npm run lint passed | PASS |
| Production build | Successful compilation | npm run build passed | PASS |
| Patch whitespace | No whitespace errors | git diff --check passed | PASS |
| Console/network | No app runtime failures | No reported JS errors; existing favicon.ico 404 observed | PASS with note |
| Mechanical design scan | Review findings | Only existing bounce-animation advisories on reward/streak icons | Advisory |
| Flow recording | Playable complete recording | Encoder fell behind at 10 fps on stop; do not treat WebM as reliable evidence | BLOCKED |

## Evidence and limitations

Screenshots are in this directory: before-phone.png, after-phone.png, share-phone.png, after-ipad.png. The iPad screenshot shows the successfully saved mood in the diary after scrolling.

No automated regression suite was added: this repository has no test framework configured. Geometry assertions and explicit browser flows were used alongside type/build checks. No red-green claim is made for the new shared dialog behavior.

Not verified: physical iPhone/Android/iPad devices, Safari/WebKit, soft-keyboard resizing, microphone permissions/audio quality, native sharing/download destinations, reward celebration flow, real notch insets, durable storage or native packaging. This remains a web prototype, not a shipped iOS/Android app.

Build emits an existing Vite future config-loader warning about __dirname. No dependencies installed and no commits made. Pre-existing user changes preserved.