# PACES-Loop product-direction review

**Review date:** 2026-11-08
**Scope:** two user-supplied candidate interviews, repository research and current examination implementation; official PACES23 guidance, marksheets and sample scenario; current competitor pages; virtual-patient education evidence. This is a product/education review, not a clinical validation of the draft cases.

**Evidence update:** the initial repository-only review missed two directly relevant candidate interviews subsequently supplied by the product owner. They are now the primary user evidence; the older competitor scan is secondary context.

## Executive decision

**Keep the direction, but narrow the claim and change the measure of success.**

Two recent UK candidates, both first-attempt passes, independently valued real-patient practice with a study partner and wanted interactive mock-style station practice. Mareen explicitly requested consultation/examination, presentation, viva and feedback at the end. PACES-Loop therefore has a plausible role as an always-available **mock-exam partner and spoken-reasoning supplement** to bedside teaching.

The observation-led workspace remains a good supporting interaction, but rapid finding reveal is not the core proposition. The current product should not imply that requesting an action and receiving its canonical finding demonstrates physical examination technique or recognition of a physical sign.

The most valuable next step is not more dashboard polish. It is a complete learning loop:

> rehearse an appropriate examination → interpret selected findings → speak a synthesis and differential → answer focused questions → repeat a specific weakness.

The product should explicitly complement, not replace, patients, peers and calibrated clinical examiners.

## What the repository gets right

- **The practice-access problem is credible.** The repository's community themes emphasise repeated practice with real patients, feedback and time pressure. The official examiner-authored preparation guidance likewise emphasises practice and says Skill B, identifying physical signs, is often considered especially challenging.
- **Active performance is a better differentiator than another content library.** Asking the candidate to act, interpret and explain creates a different learning activity from watching a model examination or reading a checklist.
- **A focused observation + next-action workspace fits the activity.** It keeps the immediate clinical task central. Quiet action history and optional coaching are preferable to turning the examination into a chat interface or analytics dashboard.
- **Canonical server-owned findings are the right safety architecture.** A model selects an allowed action; the server resolves the observation. This is preferable to allowing an LLM to invent physical signs.
- **The existing formative-score caveat is appropriate.** The product should not predict a PACES pass from a single draft case.

These are product-design judgements supported by the sources below, not evidence that PACES-Loop itself improves examination outcomes.

## Primary user evidence: Mareen and Mesh

The full transcripts and limitations are preserved in [candidate discovery interviews](interviews/README.md).

- Both UK trainees sat PACES in 2025 and passed on their first attempt.
- Both said real-patient examination with a study partner was their most valuable preparation.
- Both wanted interactive, mock-style practice rather than more passive videos, and both offered to beta test.
- Mareen specifically requested presentation, viva and **feedback at the end**, plus help synthesising findings into differentials.
- Mesh specifically identified repeatable heart/chest-sound material as an unmet need and complexity or price as reasons not to use a product.
- Mareen identified neurology pathway understanding and lesion localisation as another focused learning need.

These interviews directly support the complete mock-station loop and supplement-not-replacement positioning. They do not prove willingness to pay, broader market demand or educational effectiveness. The sample is small, related to the product owner and limited to successful UK candidates; broader discovery remains necessary.

## Official exam facts that should shape the product

The current PACES23 format has five stations, eight encounters and seven skills (A-G), with two independent examiners per station and Satisfactory/Borderline/Unsatisfactory grades. System examination encounters are 10 minutes and assess:

- **A — Physical Examination:** correct, thorough, systematic, fluent and professional technique;
- **B — Identifying Physical Signs:** identify actual signs and do not report absent signs;
- **D — Differential Diagnosis:** construct a sensible differential, including the correct diagnosis;
- **E — Clinical Judgement:** apply knowledge to a sensible, patient-specific management plan;
- **G — Maintaining Patient Welfare:** respect, sensitivity, comfort, safety and dignity.

The official cardiovascular marksheet confirms these anchors. It is therefore insufficient to equate a good examination with collecting all available findings.

Stations 2 and 5 are integrated 20-minute consultations. The official example expects history and relevant examination, explanation, investigation/treatment planning, shared decision-making and attention to patient concerns, followed by examiner discussion. These encounters assess all seven skills. They are a natural later expansion for an AI patient, but should not delay proving one excellent examination encounter.

**Sources:** [official format and skills](https://www.thefederation.uk/examinations/paces/format); [official cardiovascular marksheet](https://www.thefederation.uk/sites/default/files/uploads/PACES23%20-%20Cardiovascular.pdf); [official sample consultation](https://www.thefederation.uk/sites/default/files/uploads/PACES23%20Consultation%20example%201.pdf).

## Important gaps and mismatches

### 1. Action coverage is not sign identification

`buildFormativeFeedback` counts required finding IDs requested by the candidate and labels them “Key signs identified”. In the present interaction, the system supplies the canonical finding after the request. That demonstrates **which examination actions were requested**, not that the candidate recognised the sign.

**Change:** rename the metric to “required examination actions rehearsed” or “action coverage”. Assess recognition separately through an interpretation task: selected audio/image/observation, followed by the candidate's own description and synthesis. Do not infer Skill B from API action history.

### 2. The app cannot see hands-on technique

Typed or spoken “I percuss the chest” does not demonstrate correct percussion, fluency, positioning or professional handling. Speech/audio alone also cannot establish patient dignity or physical safety.

**Change:** report observable rehearsal behaviours only: action selection, sequence, stated positioning/technique where captured, pacing and completion. Mark technique and welfare as **not directly assessed in virtual mode** unless a suitable observation method and validation exist. Do not map the internal coverage score to official Skill A or G.

### 3. Voice-first stops before the highest-value spoken performance

The examination step supports browser speech recognition, but `PresentationInput` requires typing and the viva is text-based. Presentation, differential and management reasoning are central to the proposed value and should be rehearsed aloud.

**Change:** make spoken presentation and spoken viva part of the first complete mock-station pilot, not a deferred enhancement. Keep editable transcripts and typed alternatives. Preserve one final utterance → one validated submission and do not submit partial speech.

### 4. Rapid feedback needs two distinct modes

Immediate observations can support guided rehearsal and reduce interface friction. They do not reproduce an unaided examination performance and can encourage checklist collection rather than interpretation.

**Change:** support:
- **Guided rehearsal:** immediate observations, optional prompts and action-linked record;
- **Unprompted practice:** observations without coaching, then spoken synthesis;
- **Exam rehearsal:** no corrective feedback until the encounter ends, with clear timing and explicit progression.

Near-real-time response is useful, but speed alone is not the learning outcome.

### 5. The current viva is too templated for examiner realism

All five cases share the same five question structure. This is acceptable for a constrained first slice but should not be presented as an adaptive or realistic senior examiner.

**Change:** keep bounded, case-approved questions initially; add clinically reviewed follow-ups tied to the candidate's presentation and answers. Evaluate question-selection and feedback agreement against clinician reference judgements before making stronger claims.

### 6. The case set is thin and clinically unvalidated

There are five cases across four examination systems, all explicitly marked `draft-needs-clinician-review`. Their audio lists are empty. Simulated audio in the prototype is not a clinical content asset.

**Change:** clinician review and a small, deliberately selected case matrix precede public release. Include common presentations, meaningful negative findings and variation that tests reasoning rather than memorising a fixed checklist. Do not imply that audio reproduces palpation, inspection or the full examination.

## What the education evidence does—and does not—support

Kononowicz et al.'s 2019 systematic review included 51 trials and 4,696 participants. It found **low-to-modest, mixed evidence** that virtual patients could improve skills compared with traditional education and at least match knowledge outcomes. The authors emphasise clinical reasoning, methodological limitations and heterogeneity; they also state that virtual patients should **complement, not replace**, real-patient contact.

That is support for investigating a structured virtual rehearsal product. It is **not direct evidence** for PACES-Loop, an LLM examiner, this spoken-action interaction, or improved PACES pass rates.

**Source:** [Kononowicz et al., 2019, DOI: 10.2196/14676](https://doi.org/10.2196/14676).

The official trainee account is consistent with the repository's community themes: books, videos and courses did not replace repeated bedside work with colleagues and consultants. It is an individual account, not comparative effectiveness evidence, but it is a useful warning against claiming virtual substitution.

**Source:** [official trainee perspective](https://www.thefederation.uk/examinations/paces/preparation/how-i-failed-and-passed-paces-uk-trainees-perspective).

## Market-research corrections

The existing documents are useful idea inventories, but not a stable evidence base:

- Some search/Reddit summaries have no preserved item-level links or archived raw results, so their provenance and representativeness cannot be audited reliably.
- Vendor feature lists and testimonials show positioning, not learning effectiveness or willingness to pay.
- The previous conclusion that Pastest had no PACES-specific product is obsolete. Its current page advertises patient cases, teaching cases, role-play exercises, feedback, skills tests and 135 example cases.
- PACESAid currently advertises a PACES-specific interactive textbook, real-patient images/videos, digital auscultations and structured presentations.
- The current public Oncourse homepage does not substantiate the earlier report's PACES-specific claims; that report needs revalidation rather than repetition.
- A blocked Geeky Medics page means this review did not independently verify its current feature set.

**Current pages:** [Pastest MRCP PACES](https://www.pastest.com/products/mrcp-paces); [PACESAid](https://pacesaid.com/); [Oncourse](https://getoncourse.ai/).

**Positioning decision:** retire “no direct competitor”. A defensible hypothesis is: **more active, convenient spoken rehearsal with specific next-practice feedback**. Even that needs user and competitive testing, not just a feature comparison.

## Recommended product sequence

### Next: prove one complete mock-station loop

1. Keep the focused observation/next-action composition.
2. Relabel action coverage; stop calling requested findings “identified”.
3. Add a small number of genuine interpretation moments using reviewed source material.
4. Implement spoken presentation and viva with transcript review and accessible typed fallback.
5. Give end-of-station, evidence-linked formative feedback and one targeted retry action.
6. Keep guided practice separate from an uninterrupted mock; keep official scoring separate from internal practice metrics.
7. Have the pilot case and feedback rubric clinically reviewed, then ask Mareen and Mesh to test separately using real microphone input.

### After the core loop works

- Expand the clinician-reviewed case matrix rather than generating a large unreviewed library.
- Add a consultation pilot only after the examination interaction is demonstrably useful.
- Test focused neurology-localisation and reviewed auscultation activities as subsequent interview-backed opportunities, not automatic first-pilot scope.
- Offer paired bedside practice: assign a real-patient task, use PACES-Loop for rehearsal/reflection, and optionally capture peer/examiner observations separately.

### Do not prioritise yet

- Pass-rate or readiness prediction;
- large analytics dashboards or peer rankings;
- animated avatars as a substitute for clinical content;
- automated claims of physical technique assessment from text/audio;
- hundreds of generated cases before review.

## Validation plan before stronger claims

### Usability and learning value

Begin with separate observed sessions with Mareen and Mesh, then recruit a small mixed group of unrelated current/recent PACES candidates and an experienced PACES examiner. Include IMGs, candidates who have failed an attempt, different accents and different levels of bedside access. Test with real microphone input, not just clickable mock responses.

Ask participants to complete a full encounter, speak a synthesis, respond to viva and perform a targeted retry. Compare guided and unprompted modes. Measure:

- successful task completion without facilitator rescue;
- speech-recognition corrections and action-routing errors;
- time from completed utterance to correct observation;
- whether feedback identifies the actual omission/error;
- whether the retry addresses that weakness;
- perceived usefulness **alongside**, not instead of, bedside teaching.
- whether they would choose the mock-exam partner between real-patient sessions, and why.

Do not use satisfaction alone as evidence of competence or examination success.

### Clinical and examiner validity

- Independent qualified clinical review of every case, observation, differential, investigation, management item and source asset;
- clinician-authored acceptable/unacceptable action and interpretation examples;
- blinded comparison of AI feedback with clinician judgements on a fixed set of transcripts;
- disagreement review and prompt/case revisions before expansion;
- explicit records of what the system can observe and what remains unassessed.

### Claims gate

Only claim outcomes that have been measured. “Clinically reviewed content”, “examiner-aligned feedback” and “improves PACES performance” are separate claims requiring separate evidence. Until then: **formative virtual rehearsal, not an official score or substitute for bedside examination**.

## Bottom line

The direction is worth pursuing, and the newly incorporated interviews explain why: candidates wanted an interactive version of the useful study-partner workflow. The opportunity is an **available mock-exam partner that turns an attempt into a specific better next attempt**, not “AI that reveals examination findings quickly”. Keep the focused workspace and deterministic findings as supporting interactions. Make the complete timed encounter, spoken presentation, viva and end-of-station feedback the pilot. Change the success metric, obtain clinical review and validate with Mareen, Mesh and a broader candidate group before expanding.
