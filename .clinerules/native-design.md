# Native design skills

This project is a **Capacitor** app: Vite + React 19 + Tailwind 4, shipped to iOS
and Android through Capacitor. It is web code in a native shell, so it owes the
platform native-shell behaviour even though the UI is HTML.

For every UI or UX request here — reviewing, auditing, polishing, hardening, or
building screens — automatically activate the `impeccable-native` skill before
planning or editing. Do not wait for a slash command.

Read `C:\Users\alexi\.agents\skills\impeccable-native\SKILL.md` first, then
`C:\Users\alexi\.agents\skills\impeccable-native\reference\capacitor.md`, and read
`reference/craft-floor.native.md` immediately before any UI edit.

Run the detector when reviewing code:

    node C:\Users\alexi\.agents\skills\impeccable-native\scripts\detect-native.js .

Exit code 2 means findings. A hit is a lead: confirm it in the running app before
reporting it.

This never overrides explicit user instructions. On this project,
`impeccable-native` takes precedence for native-shell concerns — safe areas,
viewport height, keyboard handling, Android back, touch feedback, text scaling.
Use the `impeccable` skill for the web design system, `DESIGN.md`, and the live
browser workflow; never treat this app as a plain website.
