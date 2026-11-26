# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Pet owners who want to understand and record the body-language cues of their dogs and cats.

## Product Purpose

PawSpeak helps people observe dog and cat behavior, explore what body-language cues may mean, and keep context-rich notes they can review over time. It is an early research milestone developed under Pawsmatch AI.

## Positioning

PawSpeak combines camera-assisted pet framing and on-device animal detection with a source-backed dog and cat body-language dictionary and owner-recorded context. It encourages users to consider the whole animal and situation rather than treating one cue as a certain interpretation.

## Operating Context

People use PawSpeak in a browser on phones, tablets, and desktop, with the same React application also wrapped for native iOS and Android through Capacitor. Users can allow camera access or continue to the dictionary without it. Pet profiles and observations stay in PawSpeak's local storage on the current device; users can export or clear them. Optional audio or video is previewed locally only after consent, is not uploaded or saved with the observation, and is not model-analyzed.

## Capabilities and Constraints

- Current capabilities include dog and cat profiles; camera guidance and on-device animal detection; a searchable, filterable body-language dictionary with evidence summaries and citations; manual observations with cues and context; prototype cue-based suggestions; and a searchable, editable, exportable local journal.
- Current interpretations are informational prototypes, not AI analysis, veterinary diagnosis, or expert validation.
- Disease detection, eye or nose health assessment, gait health assessment, and vet-ready summaries are research directions only. They must remain clearly marked as concepts until implemented and validated.
- No account or cloud sync is part of the current product. Personal notes remain local to PawSpeak on the current device.

## Brand Commitments

- Product name: PawSpeak; developed under Pawsmatch AI.
- The golden puppy and blue cat are the approved mascot pair.
- The user-selected six-screen design reference for this redesign is `output/imagegen/pawspeak-vet-ui/final-six-screen-design-v2.png`.

## Evidence on Hand

- The current feature implementation lives in `src/components/`, with dog and cat body-language content and source metadata in `src/data/bodyLanguageData.ts`.
- No disease-detection model, medical validation study, or veterinary diagnostic capability is implemented.
- The approved visual reference is the six-screen concept image listed above.

## Product Principles

- Keep dog and cat cues distinct and grounded in their species.
- Pair observed cues with activity, setting, and surrounding context.
- Clearly separate what an owner saw from any prototype interpretation.
- Keep profile and journal data local and make export and deletion understandable.
- Present future clinical directions as exploratory until they are implemented and validated.

## Accessibility & Inclusion

Keep the app responsive across phone, tablet, and desktop widths; usable with touch and keyboard; and compatible with safe-area insets and reduced-motion preferences in the Capacitor wrappers.
