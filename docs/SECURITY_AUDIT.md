# Security and privacy audit

Date: 2026-11-15 Â· Scope: repository contents, app runtime behaviour, Android packaging.
Method: static inspection of source and git history, plus inspection of the built bundle and
APK. No dynamic exploitation was performed.

**Verdict: no secrets or private data are committed. Two hardening items should be addressed
before any public release (see Â§6); neither is a leak.**

---

## 1. Secrets in the repository

| Check | Result |
|---|---|
| Credential-shaped strings across **all** git history (`AIzaâ€¦`, `sk-â€¦`, `ghp_â€¦`, `AKIAâ€¦`, `xox[baprs]-â€¦`, PEM private keys) | **No matches** |
| `.env` files present | Only `.env.example` (placeholders `MY_GEMINI_API_KEY`, `MY_APP_URL`) |
| `.env*` ignored by git | Yes, with `!.env.example` allow-list |
| Signing keystores (`*.keystore`, `*.jks`, `*.p12`, `*.pfx`) | None in the repository |
| `google-services.json` | Absent |

The tracked `.env.example` contains only placeholder values and no real key. Note it is *also*
staged for deletion in the working tree; either state is harmless.

## 2. What git actually tracks

49 files: `src/`, `public/`, project config, and **17 PNG screenshots under `.aistudio/`**
left over from an earlier AI Studio session. Those are product mockups, not user data.

Ignored correctly (verified with `git check-ignore`):

```
reference/Cat-Emotional-Analysis/   third-party repo, no licence â€” never redistributed
tools/dataset/.venv/                Python virtualenv
tools/dataset/out*/                 generated datasets
release/                            APKs and PWA zips
*.pt                                downloaded model weights
node_modules/
```

## 3. Runtime data handling

The app's central promise is "frames stay on this device". Verified:

| Claim | Evidence |
|---|---|
| No upload of photos or frames | The only `fetch` in `src/` is `fetch('/models/behavior/manifest.json')` â€” same-origin static asset |
| No analytics, no telemetry, no third-party SDK | No network calls to any external host from app code |
| Native plugin performs no I/O | `PetDetector.java` / `PetDetectorPlugin.java` contain no file writes, no `HttpURLConnection`, no sockets, no `Log.*` calls |
| Photos processed in memory | Canvas/JPEG encoding in `nativePetDetector.ts`; no persistence path |
| Journal is local-only | `localStorage` keys `pawspeak.journal.v2`, `pawspeak.state.v1`, `pawspeak.journal.initialized` |

**Third-party hosts in the built bundle** are of three harmless kinds: (a) the 352 dictionary
source links the user can click (all `https://`), (b) links inside dependency source comments,
and (c) `storage.googleapis.com`, which appears only inside the vendored `coco-ssd` library
chunk as a model-URL default â€” our code always overrides `modelUrl` with a local path.

## 4. Injection and browser-side risk

| Check | Result |
|---|---|
| `dangerouslySetInnerHTML`, `innerHTML =`, `eval(`, `new Function(` | **None** |
| External links | One site (`DictionaryScreen.tsx:64`), rendered `target="_blank" rel="noreferrer"` |
| Dictionary URLs | All 352 are `https://`; no `javascript:` or `data:` schemes |
| React escaping | All user/journal text rendered as JSX children (auto-escaped) |
| Console logging of sensitive data | 9 `console.warn`/`error` calls, all passing `Error` objects only â€” no frames, no journal content, no user text |

## 5. Android packaging

| Check | Result |
|---|---|
| Manifest permissions **declared** | `INTERNET`, `CAMERA`, `RECORD_AUDIO` |
| Permissions **actually requested** in the built APK | `CAMERA`, `INTERNET`, `RECORD_AUDIO` â€” verified by decoding the compiled manifest with `aapt2` |
| `RECORD_AUDIO` used by our native code | **No** â€” used from the web layer for the optional sound check only |
| Cleartext HTTP | Not enabled (`allowMixedContent` false by default; WebView served over `https://localhost`) |
| `android:allowBackup` | **`false`** |
| WebView debugging | Off unless the APK is debuggable â€” Capacitor reads `FLAG_DEBUGGABLE`. The shipped artifact is a **debug-signed test build**, so it is currently ON; a release build disables it automatically |
| Data written to disk by native code | None |

### 5.1 Fixed during this audit: silently inherited permissions

The built APK initially requested **seven** permissions, not three. AGP's manifest merger had
auto-injected `WRITE_EXTERNAL_STORAGE`, `READ_EXTERNAL_STORAGE` and `READ_PHONE_STATE` because
`org.tensorflow.lite.task.core` ships a manifest with a missing `targetSdkVersion`:

```
uses-permission#android.permission.READ_PHONE_STATE
    IMPLIED from ... reason: src.java.org.tensorflow.lite.task.core has a targetSdkVersion < 4
```

These are removed explicitly with `tools:node="remove"`. A weather app requesting
`READ_PHONE_STATE` is a classic red flag; a pet camera requesting it would be worse. Verified
after the fix by decoding the compiled manifest: exactly the three declared permissions remain.

`android.permission.DUMP` also still appears in the merged manifest, but it is **not a
requested permission** â€” it is the protection level guarding
`androidx.profileinstaller`'s `ProfileInstallReceiver`. No action needed.

Post-change regression: installed the rebuilt APK on the emulator, launched it (no crash, no
`SecurityException` from app code), and ran real inference â€” `["dog 85%"]`, unchanged.

## 6. Dependency vulnerabilities

`npm audit --omit=dev`: **0 vulnerabilities** reported at time of audit.

## 7. Items addressed before release

All four items from the original audit have been implemented and verified.

### 7.1 Release build hardening

`android:debuggable` is no longer present in a release build, and R8 is enabled:

| Setting | Before | After |
|---|---|---|
| `minifyEnabled` | `false` | **`true`** (R8) |
| `shrinkResources` | unset | **`true`** |
| `debuggable` | `true` (debug) | **absent** (release) |
| APK size | 97.4 MB (debug) | **88.5 MB** (release) |

**R8 required explicit keeps for TensorFlow Lite.** `tensorflow-lite-task-vision` ships **no**
consumer ProGuard rules, and its JNI bridge resolves Java classes by name at runtime — exactly
the pattern R8 breaks silently at compile time and fatally at runtime. `proguard-rules.pro` now
keeps `org.tensorflow.lite.**`, native methods, its support library, and the Capacitor plugin
surface.

**Verified after minification** on the emulator: plugin registered, `isAvailable()` true, and
real inference returned **`["dog 85%"]`** — identical to the unminified build. A signing
keystore generated for this purpose lives at `~/.pawspeak-keys/` **outside the repository**;
`*.jks`, `*.keystore` and `keystore.properties` are git-ignored, and
`scripts/build-android-release.mjs` **refuses to build** if the keystore path resolves inside
the project or if no key password is supplied.

### 7.2 Content-Security-Policy

`index.html` now carries a CSP:

```
default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self' blob:;
style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:;
media-src 'self' blob: mediastream:; connect-src 'self' blob: data:;
font-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'none';
```

`script-src` deliberately **omits `'unsafe-inline'`**, so an injected `<script>` cannot execute.
The relaxations are narrow and justified: `'wasm-unsafe-eval'` for the LiteRT runtime,
`'unsafe-inline'` for CSS only (React sets `style` attributes for overlay positions),
`data:`/`blob:` for captured frames, and `mediastream:` for the live preview.

**Verified with zero violations**: instrumented `securitypolicyviolation`, then exercised a
model fetch, image decode, canvas `toDataURL`, and the full photo-detection path — result:
*Dog detected, `Dog · 99% model score`, pose overlay rendered, `violations: []`*.

### 7.3 Remaining recommendations

1. **`RECORD_AUDIO` is justified by the web-layer sound check**; remove the permission if that
   feature is ever dropped. An unused microphone permission on a pet app invites distrust.
2. **The generated keystore uses a development password** and is not suitable for Play Store
   distribution. Generate a production keystore, store it in a secrets manager, and never
   commit it. Losing it permanently prevents updates to an app already published under it.

## 8. Notes on the audited third-party repository

`reference/Cat-Emotional-Analysis/` has **no licence**, so it is git-ignored, not vendored, and
no code was copied from it (`src/ml/catBodyParts.ts` is an independent reimplementation).
This matters for both legal and supply-chain reasons: unaudited third-party Python would have
been the most likely place for a credential-stealing or exfiltration payload to hide.

## 9. Disclaimer

This is a best-effort static audit of a prototype. It is not a penetration test and does not
cover the Android WebView runtime, the TFLite native libraries, or OS-level attacks. Before a
public release, run a dependency audit (`npm audit`), a mobile-specific review, and treat the
`android/` and `ios/` native projects as part of the attack surface.

