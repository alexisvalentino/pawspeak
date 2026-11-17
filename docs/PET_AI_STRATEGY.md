# PawSpeak strategy and future directions

Status: working document · Last revised 2026-11-16 · Supersedes nothing; complements
[ROADMAP](ROADMAP.md), [PRODUCT_SPEC](PRODUCT_SPEC.md), and [DATA_AND_EVALUATION](DATA_AND_EVALUATION.md).

This document records the reasoning behind PawSpeak's chosen direction, the adjacent
capabilities that were considered and deferred, and the business structures those capabilities
imply. It exists so that future work does not re-litigate settled questions, and so that the
scope decisions are visible to anyone reading the code.

---

## 1. What PawSpeak is, stated precisely

> Detect an observable cue on-device, look it up in a sourced dictionary, and show the
> dictionary's sentence together with its evidence tier — abstaining when the cue is not
> visible.

That is the whole product. Everything below is either consistent with that sentence or
explicitly out of scope.

The important consequence: **the "translation" happens in the dictionary, not in a model.**
102 entries carry hand-written human phrasing (`plainWords`), plain-language meaning
(`whatItCanMean`), context, recommended action, and cited sources with an evidence tier. That
content is the asset. The model is the search interface for it, and no model can invent a
sentence that has no citation behind it.

---

## 2. The distinction that governs every scope decision

"Pet behaviour to human language" describes two different products that are easy to conflate.

| | Definition | Defensible? | Status in repo |
|---|---|---|---|
| **A. Cue translation** | "Tail held straight up — usually a friendly greeting." Sourced, tiered, conditional on a visible cue. | **Yes.** It translates an *observation*, not a mind. | Dictionary complete. Detector **missing** — this is the build. |
| **B. Emotion inference** | "Your cat is happy." | **No.** Single frame, no validated mapping, no calibration. | Blocked by design. A unit test fails the build on emotion vocabulary. |

Option B is what commercial "pet translator" apps sell. It is also the thing this codebase
refuses to compile. That refusal is a deliberate architectural asset and should not be
traded away for a demo.

**The abstention path is a feature, not a failure.** `catBodyParts.ts` requires two
corroborating parts before emitting anything; `classifyPoseSignals` returns `'unclear'` when
the torso is not roughly horizontal. A front-facing seated cat genuinely has no side-on limb
geometry, and saying so is correct behaviour. Preserve this — it is what makes an evidence
tier meaningful.

---

## 3. Capability ladder — what is actually reachable

Assessed against the current architecture: 17 AP-10K keypoints, RTMPose-Animal, EfficientDet-Lite2
detection, a web-only TF.js still-image classifier adapter, and no server.

### 3.1 Why CCTV is a mixed proposition

A fixed camera is a genuine upgrade in one respect and a structural downgrade in another.

**What improves.** The largest confound in `motionCue.ts` disappears — its own header warns
that camera motion can produce the same signal. A wall-mounted camera has a fixed reference
frame, known geometry, free background subtraction, and continuous rather than 3-second
observation.

**What degrades, and does not recover.**

- `classifyPoseSignals` requires a torso of ≥ 12 px and `|Δy| / torsoLength ≤ 0.4`. That is a
  side-on assumption. An overhead or 45° camera foreshortens the torso and fails the gate,
  producing `'unclear'` almost always.
- The AP-10K skeleton contains **no ear tips and no tail tip** — the two highest-information
  parts for both species. At ceiling distance they are below the resolution where any model
  could recover them.
- Night IR gives grayscale, blown highlights, and motion blur. Cats are crepuscular, so the
  hours of most interest are the hours the sensor sees least.

**Conclusion.** CCTV does not extend the current feature set; it replaces it. It is viable
only for *quantities*, never *qualities*. This is the central technical finding of this document:

> Low resolution is fine for counting. It is fatal for describing.

### 3.2 Feasibility by capability

| Capability | CCTV fit | Close-up phone fit | Verdict |
|---|---|---|---|
| Activity budget, circadian rhythm | Excellent — needs no detail | Good | **Reachable now** |
| Eating / drinking / litter-box visits | Excellent — zone annotation only | Poor | **Reachable now** |
| Grooming and scratching frequency | Good | Good | Reachable; strong clinical signal |
| Seizure, vomiting events | Good — distinctive posture | Poor | High value, low frequency |
| Gait / lameness grading | Medium — needs side view + resolution | **Good** | Reachable; see §4 |
| Pain via facial grimace | Poor at range | **Excellent** | Phone only |
| Emotion / mood | Structurally unavailable | Structurally unavailable | **Out of scope, permanently** |

Emotion is excluded not on timidity but on evidence: at CCTV distance the evidence for an
emotion claim is strictly weaker than the handheld case the project already rejected.

### 3.3 "Sickness detection" needs reframing before it is safe

Disease is not read from an image. It is inferred as **deviation from an individual animal's
own baseline**, and escalated. The failure modes are asymmetric:

- A false alarm costs a vet visit.
- **False reassurance** — "your pet seems fine" — carries real welfare harm.

Therefore any future health feature must obey the existing abstention rule *more* strictly,
not less, and must never assert wellness.

The reframed version is also more defensible: circadian rest-activity disruption is a
documented early illness sign; anorexia and polydipsia are the two cardinal owner-reported
signs veterinarians ask about; litter-box visit frequency is a genuine FLUTD signal. All are
measurable at low resolution, from a fixed camera, without emotion vocabulary.

### 3.4 Validated instrument already in the literature

The **Feline Grimace Scale** is a published, validated instrument for acute pain in cats,
composed of five facial action units including ear position and whisker angle. It requires a
close-up face, so it belongs in the phone app rather than the ceiling camera. It is the honest
version of "detect sickness," and it is the most credible near-term health claim available.

### 3.5 Capabilities not previously considered

- Post-operative and palliative monitoring — "is she eating and using the box?" is the primary
  question after surgery, and owners are currently sent home with a leaflet.
- Elimination outside the litter box — the largest single behavioural reason for surrender and
  euthanasia, and conspicuously under-tooled.
- Multi-pet conflict mapping — who avoids whom, measured over weeks. Invisible to humans.
- Automated ethograms at scale — markerless pose for behaviour research is an established
  lineage (DeepLabCut / SLEAP); pose-sequence classification is standard practice. An open,
  labelled, longitudinal dataset would be a real scientific contribution and fits the
  Apache-2.0 research-prototype framing.
- Estrus and breeding-cycle detection — commercially valuable in breeding, purely quantitative.

---

## 4. Business options considered

Five candidate directions were evaluated. Verdicts below are specific to this project's
constraints: solo developer, Windows machine, CPU-only, no iOS build capability.

| Option | Verdict | Reasoning |
|---|---|---|
| **Vision-based disease detection** | **Primary long-term** | Narrow it to **gait**. The machinery is half-built: `classifyPoseSignals` already computes limb extension from 17 keypoints. Human lameness grading is unreliable, objective ground truth exists (force-plate pressure measurement), and phone video suffices. |
| **Nose-print / facial identity** | **Enabler, not product** | Lost-pet recovery is a weak business (microchips already universal, event too rare for retention). The paying customer is **insurance claim verification**, **shelter intake deduplication**, and **breeder registries**. Critically, persistent identity is the prerequisite for the longitudinal data that disease detection requires. |
| **Virtual vet assistant** | Strong business, wrong founder | Best of the rejects, but it is a services marketplace: the product is licensed veterinarians, the constraint is supply per jurisdiction, and the AI is decorative triage. Free 24/7 vet chat from large retailers caps standalone pricing. Works in vet-scarce markets, which makes it a geography bet rather than a technology one. |
| **Robotic companion** | Wrong instrument | The paying market is therapeutic use in dementia and isolation care, where institutions and insurers pay. That requires a factory, supply chain, device certification, and capital. |
| **Sitter / walker marketplace** | **Do not** | Marketplace liquidity is local, requiring city-by-city wins against an entrenched incumbent. Temperament matching is seasoning on a liquidity problem, and the liability surface (bites, loss, negligence) is severe. |

### 4.1 Why the consumer pet-camera path is not recommended

The category was won on things that are not replicable at this scale: LTE modem and battery
economics, microchip readers and retail shelf space, or a literal scale that measures weight
and visit frequency with no vision at all. The most successful cat-health product on the market
deliberately avoided cameras — vision was never the constraint, *validity of the claim* was.

A consumer launch would enter with a worse hardware position and a claim correctly judged
unmakable. Honesty is a marketing liability to consumers and a regulatory asset to
professionals. **Sell to the buyer who values the asset.**

### 4.2 The only durable moat

Models are commodities. YOLO, RTMPose, GroundingDINO, and SAM are open, free, and improve
every quarter without effort. A competent competitor matches the detector in a weekend.

What cannot be compressed is **calendar time**. Longitudinal behavioural data with clinical
outcomes takes years to accumulate; a competitor starting later is structurally behind, and no
amount of funding closes that gap. It is the only advantage a small team can hold — which
argues for **beginning to log now, before the product is settled**, even if early logs go
nowhere.

### 4.3 The real bottleneck is not engineering

100,000 cat photos teach nothing about sickness. The useful version requires roughly 50 animals
with confirmed diagnoses, continuous video, consent, and ethics review — a **partnership and
clinical-validation problem**, not a dataset-size problem. No amount of coding substitutes.

---

## 5. Recommended sequence

| Stage | What is sold | Gate to pass |
|---|---|---|
| **0. Instrument** | Behaviour-quantification tooling to ethology labs, pet-food R&D, shelters | Do three outsiders pay? |
| **1. Single claim** | One species, one condition, one sentence | Does a veterinarian repeat the sentence unprompted? |
| **2. Clinical** | At-home monitoring sold through clinics | One study, one partner clinic, publishable |
| **3. Consumer** | Only if 1–2 succeeded | — |

Stage 0 is the one most often skipped and the one that matters. Research tooling has customers
today, needs no diagnostic claim, no regulatory review, and no consumer trust. Shelters are the
underrated wedge: large behavioural datasets, genuine operational pain, no regulatory burden,
and they will supply data for free.

**Structural advantage worth knowing:** veterinary devices in the United States have no
premarket clearance regime comparable to human medical devices — there is no 510(k) or De Novo
path. The gate is commercial credibility, not a regulator. This is the single biggest reason a
small team can compete in this category.

### 5.1 Privacy stance to protect

The ethics statement's strongest asset is "no frame is persisted." A home camera recording a
living room also records **people**. The defensible design is to persist **derived features
only** — bounding-box and keypoint timeseries, never pixels — making the claim "we keep the
numbers, never the pictures." This is novel in the category and should be enforced
architecturally from the outset.

---

## 6. Decisions recorded

1. **Emotion inference is permanently out of scope.** Not a deferral. It invites competitors
   who lie better, is uninsurable, and caps pricing at consumer nice-to-have levels.
2. **The camera app is the data-collection client**, not the product.
3. **Prioritise cue classification over body-part detection.** The part detector was the
   reference project's route; this project's route is direct cue classification, which is
   web-only, requires no native work, and emits the actual dictionary sentence.
4. **Identity precedes longitudinal health claims.** Whether or not identity ships as a
   product, it is required infrastructure for anything temporal.

## 7. Open questions

- Which single claim is defensible in writing within 12 months: gait, itch, or activity budget?
- Is a clinical partner obtainable, and does that partner define the label schema?
- Does the dataset get published (reproducibility, reputation) or held (defensibility)?
- How is derived-feature-only retention verified, not merely asserted?
