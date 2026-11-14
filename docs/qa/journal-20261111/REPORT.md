# Product direction and journal verification

Date: 2026-11-11. Target: http://localhost:3000. User-confirmed direction: follow the project documents and replace the translation game with a dog behavior journal before preparing dog-only audio/video analysis.

## Product findings

The original UI did not match the specification: literal pet quotes, human-to-pet sounds, unsupported species, XP/badges/streaks, personality archetypes, and social trophy cards dominated the experience. Seeded data looked like user history. Essential journal operations and explicit media handling were missing.

The active app now has three destinations: **Observe**, **Journal**, and **Dogs**. The translation game, soundboard, gamification, personality and social-card code have been removed. No model or scientific validation is claimed.

## Implemented and checked

- Fresh installs contain no fabricated pets or activity. An optional example is labeled. Initialization is separate from demo dismissal, so clearing examples does not reimport seed data on reload.
- Migration excludes known seed pets, translated quotes, unsupported species, XP, badges and generated personality data. Only user-created dog notes from the earlier journal are eligible; migrated entries are marked for review rather than assigned a reconstructed historical date.
- Dog profiles can be created and edited. Selecting another dog does not mix journal entries. Deleting a profile removes its observations after confirmation.
- Observation form records guardian-selected observable cues, activity, setting, nearby context, preceding event, timestamp and notes. Missing context/cues produce visible, useful validation. Form text is trimmed before saving.
- Fixed prototype cue guidance can provide cautious possible readings without literal quotes, model-confidence claims or diagnoses. The UI now labels it as prototype guidance requiring expert validation.
- Observation save, edit (same ID, no duplicate), delete with confirmation, selected-pet filtering, browser reload persistence, search, and empty states are implemented.
- Media selection requires consent. Files must be audio/video, <=50MB and <=15 seconds. A 16-second generated tone was rejected; a one-second tone rendered an audio preview. Only consent and an attachment flag are stored; raw media and object URLs are not persisted. Consent removal removes preview.
- Text-only JSON export includes every profile and observation, including those without a suggestion, and includes explicit limitations. A downloaded JSON was found and inspected in Chromium's Downloads directory. Export uses a self-contained data URL, not a short-lived Blob URL. This is not proof of native mobile save destinations.
- Local-data deletion removes profiles and observations and survives reload.

## Checks on final changed state

- `npm test`: **8 passing tests** for empty state, save/edit/delete, profile-scoped deletion, guidance/health escalation, media consent validation, seed exclusion, user-note migration/export and no seed reimport.
- `npm run lint`: **PASS** (TypeScript).
- `npm run build`: **PASS**.
- `git diff --check`: **PASS**.
- Mechanical design scan over `src`: **no findings**.
- Final `browser-errors.txt`: **empty**.
- Browser regression: **43 PASS assertions** across saved `checks-*.json` files. Earlier failures caused by harness state, wrong test expectations, missing module during implementation, and dev-server lifecycle are not counted as passes.

### Final verified browser scenarios

| Area | Results |
| --- | --- |
| Fresh install and example | 4 PASS |
| Dog profile creation/edit | 2 PASS |
| Observation validation and media consent gate | 6 PASS |
| Journal save/edit/delete/reload | 6 PASS |
| Actual audio validation, storage boundary, profile edit/delete | 7 PASS |
| JSON data URL, decoded valid payload, current profile, no raw media, clear/reload | 6 PASS |
| 320x568, 390x844, 768x1024, 1024x768 | All three tabs at every size: no horizontal overflow, 3 header controls, no undersized buttons. 12 layout assertions plus 4 inspectable screenshots. |

Runner: `scripts/verify-journal.mjs`. The final run used isolated task sessions; only those sessions were closed. Shared dashboard remains at http://localhost:4848.

## Remaining product and technical gaps

This is a **working local journal prototype**, not a completed dog behavior-analysis product. It is not called release-ready.

- No validated audio/video model, classifier confidence, direct in-app camera/microphone recording, or media analysis. The small cue rule mapping requires expert review before being described as validated guidance.
- No account, backend, encrypted storage, server backup or cross-device sync. Clearing browser storage deletes local data.
- Media attachment is a temporary preview, not a persisted record that can be replayed after saving.
- No native iOS/Android package or verified mobile native share/download destination. Real iPhones, iPads, Android devices, Safari/WebKit, keyboards, permission prompts, actual camera/microphone workflows and screen readers have not been tested.
- Existing package metadata and unused prototype dependencies remain a cleanup opportunity; no dependency install or lockfile rewrite was done as part of this pass.
- Vite continues to emit its existing `__dirname` future config-loader warning.

No installs, commits or pushes were performed. Existing user changes were preserved.