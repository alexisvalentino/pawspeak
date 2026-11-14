# Phone / iPad consistency and workflow follow-up

Date: 2026-11-11. Target: http://localhost:3000. Final browser regression session: `pawspeak-regression-20261111173959`.

## What was actually wrong

- The header deliberately hid streak/share below the `sm` breakpoint. Phone and iPad therefore offered different controls. The previous layout pass did not resolve that inconsistency.
- Oversized companion/status cards pushed the primary microphone action below the first phone screen. The mood screen also led with a large gamification banner rather than the journal task.
- App data lived only in component state and was lost on reload.
- Reward calculation ran inside a state updater with stale entry counts. Badge rewards could be announced without being added to total XP.
- Recent demo results were not scoped to the selected pet.
- Denied or unavailable microphones could fall through to random sample results. Auto-stop used a stale frequency value and the listening effect cleared the timeout.
- The share configuration object was recreated every render while its effect updated state, repeatedly regenerating the high-resolution canvas.
- Share/copy fallbacks could report success without completing the operation. Async errors in `toBlob` callbacks escaped the outer error handler.
- Saving a custom sound under a different selected category could leave the newly created tile invisible. Routine/food pitch settings did not match the saved frequency.

## Changes

- One 65px toolbar with exactly three controls on every target size: home, current pet, app menu. Phone and tablet menus expose the same goal, streak, sharing and sound controls. The bottom navigation remains the same four destinations.
- Compact recording header, visible microphone action on 390×844, task-first journal, two-pane translation at larger tablet widths, and scroll clearance for fixed bars.
- Versioned browser-local persistence, selected-pet restoration, daily rollover, duplicate-entry protection, single daily claim, atomic XP/badge updates, and visible save failure feedback.
- Pet-filtered history; per-pet form state resets; real dates on new records; associated form labels and input limits; a fresh add-pet form each time it opens.
- Microphone requests have visible permission states, errors, cancellation guards, stream/timer cleanup, and a four-second maximum. Recorded audio is previewed locally, not saved/uploaded or converted into an invented translation. Preset demos remain explicitly labeled.
- Idle spectrum no longer runs a perpetual animation loop; live drawing is limited to approximately 15fps. Idle labels no longer claim LIVE or show fake input energy.
- Stable memoized card configuration, unlocked-only trophy picker, per-pet mood-card association, export status, awaited native sharing, explicit cancellation/unavailable-API recovery, and honest clipboard/download messages.
- Custom sound visibility/tone fixes, consistent mute behavior and disabled playback, empty states, and removal of unsupported acoustic-verification copy on cards.

## Verification from final changed state

### Automated tests — PASS

`npm test`: 15 passing Node/tsx tests, including the existing engine tests, a header regression and new state/reward/persistence cases. The header regression was observed failing against the old header (`6 !== 3`) before the fix. The new state tests initially failed because the new module did not exist; that is not claimed as behavioral red/green evidence against the old in-memory App implementation.

`npm run lint`: PASS (TypeScript check). `npm run build`: PASS. `git diff --check`: PASS. Existing Vite `__dirname` future-config-loader warning remains; Git also notes LF/CRLF normalization on an edited file.

### Saved browser regression — PASS, 67 assertions

Runner: `C:\Users\alexi\vscode\pawspeak\scripts\verify-mobile.mjs`. It uses the installed agent-browser executable and actual UI actions for the flows. Commands and required phase order are documented in the project README. Assertions are saved in the `checks-*.json` files here. The final rerun used an isolated task session after correcting test-harness issues; earlier failed attempt logs are not app-completion evidence.

| Area | Explicit outcomes checked |
| --- | --- |
| Profiles | Blank save disabled; age 31 rejected; new profile selected; reload restores it; next add form is empty |
| Journal | Blank notes disabled; entry belongs to selected pet; XP including any unlocked badges added exactly once |
| Daily goal | Claim persisted; reload shows disabled Claimed today; reducer additionally checks duplicate claims and next-day rollover |
| Custom sound | Created tile is visible in selected category; 420Hz routine choice saved; phrase and mute survive reload |
| Microphone denied | Visible permission error; no fabricated record |
| Audio lifecycle | Synthetic stream automatically stops; all tracks ended; a late permission grant after navigation is released |
| Demo history | Sample saved to correct pet; cat history excludes dog result; human phrase creates exactly one record and clears input |
| Sharing | Only unlocked badges offered; 1080×1920 canvas; valid PNG data; cancellation handled; unsupported sharing and clipboard failure show recovery; modal closes and unlocks page |
| Playback | Muted controls disabled; enabled sound changes playback UI, adds 15XP once, returns to idle; locked/unlocked badge filters work |
| Layout / parity | All four tabs at 320×568, 390×844, 768×1024 and 1024×768: no document horizontal overflow, zero buttons below 44×44, three header controls, 65px header, same menu feature access |

Audio input and native share/clipboard failures were synthesized at browser API boundaries. Playback assertions cover browser/UI scheduling, not human auditory assessment. Final `browser-errors.txt` is empty. No failed status codes were found in final `browser-network.txt`.

### Visual evidence

- `phone-final.png`: compact phone header and recording task.
- `ipad-final.png`: same toolbar and tablet two-pane task/result layout.
- `ipad-mood.png`: task-first journal layout.
- `share-recovery.png`: export/share fallback evidence.

Screenshots were inspected, not just captured. Recording at 10fps failed with encoder lag, including a short add-pet recording. No usable video artifact exists, and video is not counted as evidence. The design detector reported only existing bounce-animation advisories on reward/streak icons.

## Release readiness — NOT claimed

This is still a local frontend prototype. Seeded pets, activity, XP and badges are demo data. Browser storage is neither encrypted nor a server backup, and clearing browser data loses records. There is no authentication, cross-device sync, journal edit/delete workflow, account-level privacy controls, native iOS/Android package, camera model, or validated behavior/audio inference service.

Physical iPhone/Android/iPad hardware, Safari/WebKit, real keyboard/safe-area behavior, actual microphone permissions/background interruptions, OS-native share sheets, successful clipboard access across browsers, and a file appearing in a device's Downloads/Photos have NOT been verified. PNG generation and the download request were verified, not the final OS destination.

No installs, commits or pushes were performed. Existing user changes were preserved. Only this task's browser sessions were closed; the shared dashboard remains available.