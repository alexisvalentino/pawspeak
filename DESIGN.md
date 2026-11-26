# PawSpeak design system

## Direction

PawSpeak follows the approved six-screen vet-friendly concept board: calm clinical daylight, the warmth of the golden puppy and blue cat, and SwiftUI-inspired glass used around real controls. The visual language should help an owner move from seeing an animal, to reading a sourced cue, to recording their own context.

## Foundations

- **Canvas:** porcelain white and pale blue, with a soft cool-blue page wash.
- **Ink:** deep navy for headings and primary labels; blue-grey for secondary copy.
- **Action:** clear blue for primary actions and selected navigation.
- **State:** mint for reassuring checks, warm gold for caution, rose for errors, and violet for future research badges.
- **Material:** translucent white with a cool rim and a soft offset shadow for the bottom dock, camera controls, and grouped information. Avoid blur as a page-wide decoration.
- **Type:** platform-native sans stack with SF Pro first on Apple devices, system scaling enabled, and a compact readable hierarchy.
- **Art:** existing transparent 3D puppy and cat assets, plus the sourced cue artwork. Keep art cut out from surfaces and avoid fake user photos.

## Screen composition

- **Welcome:** paired mascots, the PawSpeak wordmark, a short promise, optional camera permission, and a clear note that Learn works without camera access.
- **Camera:** a prominent camera stage with light, animal, and whole-body warnings anchored inside the live preview; the idle stage explains how to start live guidance. Capture and upload actions stay beside the stage, with optional sound check and the fixed four-item dock below.
- **Learn:** dog/cat segmented selector, search, cue-type filters, illustrated entries, evidence details, and a reminder to consider the whole situation.
- **Observe:** selected cue chips with a focused cue picker, activity and setting, a short narrative, optional context and media, and one clear save action. Prototype guidance stays disclosed and labeled.
- **Journal:** date-grouped observation cards, search and date filters, detail/edit/delete actions, and JSON export.
- **Pets:** profile cards with the selected primary pet, an add action, and an “Exploring” research concept for future eye, nose, movement, and veterinary-summary work.

## Native and responsive behavior

The app keeps four persistent destinations: Camera, Learn, Journal, and Pets. Observe is a task reached from Camera or Journal. Use safe-area insets for the top content and bottom dock, keep the dock clear of content, maintain 44–48 px targets, allow scrolling at large text sizes, and stop decorative mascot motion when reduced motion is enabled. On larger screens, use two-column camera and profile layouts without stretching phone-sized artwork or controls.

## Product limits

Camera framing, on-device detection, dictionary guidance, and owner-recorded notes are current capabilities. PawSpeak does not read feelings, translate vocalizations, or diagnose. Eye/nose health assessment, gait assessment, disease detection, and veterinary summaries remain concepts marked “Exploring” until implemented and validated.
