# PACES AI Examiner — v0 Implementation Plan

> **Goal:** Build an interactive AI-powered PACES station simulator where the AI acts as the examiner — replacing the study partner role for presentation, viva, and structured feedback.

**Core Design Philosophy:** We don't simulate patients. The AI acts as the **examiner**, not the patient. The candidate examines a real patient (or reviews structured case data), then presents to the AI, gets vivad, and receives detailed PACES-style feedback. This solves the exact gap both interviewees identified: the lack of interactive practice that mimics the study buddy experience.

**Tech Stack:** Next.js 14 (App Router), TypeScript, pnpm monorepo, OpenAI-compatible API (Engy/DeepSeek)

---

## The Interactive Flow (v0)

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI EXAMINER MODE                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐   │
│  │ 1. CASE  │    │ 2. EXAM  │    │ 3. PRES  │    │ 4. VIVA  │   │
│  │  BRIEF   │───▶│  PHASE   │───▶│  ENT     │───▶│  + FEED  │   │
│  │          │    │          │    │  TO AI   │    │  BACK    │   │
│  │  Read the│    │ Timer    │    │ Type your│    │ AI asks  │   │
│  │  brief.  │    │ runs     │    │ findings │    │ questions│   │
│  │  (60s)   │    │ (9 min)  │    │ +        │    │ then     │   │
│  │          │    │          │    │ differen-│    │ scores & │   │
│  │          │    │ Case     │    │ tial     │    │ gives    │   │
│  │          │    │ findings │    │          │    │ feedback │   │
│  │          │    │ + audio  │    │          │    │          │   │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**What makes this unique vs. existing tools:**

| Existing Tool | What it does | What we do instead |
|--------------|-------------|-------------------|
| Pastest | Watch videos of someone else exam | **You** present, get vivad, get personalized feedback |
| Study buddy | Practice together | Available 24/7, unlimited cases, structured objective feedback |
| ChatGPT (workaround used by Interviewee 2) | Generic medical Q&A | **PACES-specific** cases, realistic viva style, station-timed structure |
| PACES courses (£1-2k) | In-person with examiners | Fraction of cost, practice anytime, unlimited repetition |

---

## Architecture Changes

### New Types Needed

```
┌─────────────────────────────────────────┐
│             SHARED TYPES                │
├─────────────────────────────────────────┤
│ CaseDefinition {                        │
│   id: string                            │
│   system: 'cardio'|'resp'|'abdo'|'neuro'│
│   title: string                         │
│   brief: string  (what candidate reads) │
│   clinicalData: {                       │
│     history: string                     │
│     examFindings: string[]             │
│     audioClips: AudioClip[]            │
│     investigations: string[]           │
│   }                                     │
│   expectedDifferentials: string[]       │
│   examinerNotes: string                 │
│   difficulty: 'basic'|'intermediate'|'advanced'
│ }                                       │
└─────────────────────────────────────────┘
```

### New API Route

```
POST /api/examine
  Body: { caseId, phase: 'present'|'viva', userInput, conversationHistory }
  Response: { message, followUp, score?, feedback? }
```

The AI is prompted to act as a **PACES examiner** — not a helpful tutor, but an examiner who:
- Listens to the candidate's presentation
- Asks probing viva questions (like real PACES)
- Challenges differentials
- Gives structured feedback at the end in PACES format

### Component Tree (New + Modified)

```
apps/web/src/
├── app/
│   ├── page.tsx                       # MODIFIED: Add AI examiner mode selector
│   └── api/
│       └── examine/
│           └── route.ts               # NEW: AI examiner API route
├── components/
│   ├── AIExaminer.tsx                  # NEW: Main AI examiner station flow
│   ├── CaseBrief.tsx                   # NEW: Case brief display with timer
│   ├── PresentationInput.tsx           # NEW: Text input for candidate presentation
│   ├── VivaChat.tsx                    # NEW: Viva Q&A chat interface
│   ├── AIScoreFeedback.tsx             # NEW: AI-generated feedback display
│   └── (existing files remain unchanged)
packages/shared/src/
├── stations/
│   ├── cardiovascular.ts              # EXISTING (can extend)
│   ├── cases.ts                       # NEW: Case library with structured AI-examiner data
│   ├── respiratory.ts                 # NEW: Respiratory case
│   ├── neurology.ts                   # NEW: Neurology case (with lesion localization)
│   └── gastrointestinal.ts            # NEW: Abdo case
```

---

## Implementation Tasks

### Task 1: Create structured case library

**Objective:** Define 4-6 realistic PACES cases with structured data the AI examiner can use.

**Files:**
- Create: `packages/shared/src/stations/cases.ts`
- Create: `packages/shared/src/stations/neurology.ts`
- Create: `packages/shared/src/stations/respiratory.ts`
- Create: `packages/shared/src/stations/gastrointestinal.ts`

**Content per case:**
```typescript
export const cardioCase1: CaseDefinition = {
  id: 'cardio-mitral-regurg',
  system: 'cardio',
  title: 'Mitral Regurgitation',
  difficulty: 'intermediate',
  brief: 'A 68-year-old retired teacher presents with a 6-month history of progressive shortness of breath on exertion and palpitations. She has a history of hypertension and was told she had a "heart murmur" 5 years ago.',
  clinicalData: {
    history: 'SOB on exertion (NYHA II-III), orthopnoea, paroxysmal nocturnal dyspnoea, palpitations. No chest pain. No oedema.',
    examFindings: [
      'Atrial fibrillation (irregularly irregular pulse)',
      'Elevated JVP with prominent v waves',
      'Displaced, hyperdynamic apex beat',
      'Pan-systolic murmur loudest at apex radiating to axilla',
      'Soft S1, wide-splitting S2',
      'Bibasal fine crackles'
    ],
    audioClips: [
      { label: 'Pan-systolic murmur (mitral regurgitation)', url: '/audio/mitral-regurg.mp3' },
      { label: 'Atrial fibrillation', url: '/audio/afib.mp3' }
    ],
    investigations: [
      'ECG: Atrial fibrillation, LVH',
      'CXR: Cardiomegaly, upper lobe blood diversion',
      'Echo: Severe mitral regurgitation, LV dilated, LVEF 45%'
    ]
  },
  expectedDifferentials: ['Mitral regurgitation', 'Left ventricular failure', 'Atrial fibrillation'],
  examinerNotes: 'Key signs: pan-systolic murmur at apex radiating to axilla, displaced apex, AF. Candidate should suggest echo to confirm and mention medical vs surgical management.',
};
```

Each case has enough structured data that the AI examiner can evaluate the candidate's presentation against the known findings.

---

### Task 2: Create AI examiner API route

**Objective:** Backend endpoint that takes user input (presentation/viva answer) and returns AI examiner response.

**Files:**
- Create: `apps/web/src/app/api/examine/route.ts`

**Behavior:**
```
POST /api/examine
{
  case: CaseDefinition,
  phase: 'present' | 'viva' | 'feedback',
  userInput: string,
  conversationHistory: { role: string, content: string }[]
}

Response:
{
  examinerResponse: string,   // AI's spoken response
  vivaQuestion?: string,      // Next viva question (if phase='viva')
  feedback?: ExaminerFeedback, // Final feedback (if phase='feedback')
  complete: boolean           // Is the viva phase done?
}
```

**AI Prompt Engineering (for DeepSeek):**
```
You are a PACES examiner conducting a clinical examination station.
You are NOT a helpful tutor - you are an examiner assessing the candidate's ability.

You have access to the case details including the patient's history, clinical findings,
and expected differentials. The candidate does NOT know what you know.

Phase 1 - PRESENTATION:
The candidate has examined the patient and now presents their findings.
Evaluate: Did they identify the key signs? Is their differential reasonable?
Respond as an examiner would - nod, prompt for more, ask clarifying questions.
Do NOT reveal findings they missed - note them for later feedback.

Phase 2 - VIVA:
Ask probing PACES-style questions:
- "What other signs would you look for?"
- "What is your differential diagnosis and why?"
- "What is the most likely cause in this patient?"
- "What investigation would you arrange and why?"
- "How would you manage this patient?"

Phase 3 - FEEDBACK:
Provide structured PACES-style feedback covering:
- Presentation quality
- Key signs identified vs missed
- Differential diagnosis reasoning
- Suggested areas for improvement
- A score out of 10 (where 7+ = pass)
```

**Important:** Use the Engy API endpoint (`api.engy.ai/v1/chat/completions`) with the DeepSeek model. The API key is already set as `HERMES_CUSTOM_API_ENGY_AI_API_KEY` in the environment.

---

### Task 3: Build AI Examiner UI flow component

**Objective:** Replace/expand the current page to include an AI examiner mode alongside the existing manual practice mode.

**Files:**
- Create: `apps/web/src/components/AIExaminer.tsx`
- Create: `apps/web/src/components/CaseBrief.tsx`
- Create: `apps/web/src/components/PresentationInput.tsx`
- Create: `apps/web/src/components/VivaChat.tsx`
- Create: `apps/web/src/components/AIScoreFeedback.tsx`
- Modify: `apps/web/src/app/page.tsx`

**Component structure:**

```tsx
function AIExaminer() {
  // State machine: 'briefing' | 'examining' | 'presenting' | 'viva' | 'feedback'
  const [phase, setPhase] = useState('select-case');
  const [currentCase, setCurrentCase] = useState<CaseDefinition | null>(null);
  const [conversation, setConversation] = useState([]);
  const [timer, setTimer] = useState(0);

  // Renders different UI based on phase
  // Phase 'select-case': Grid of cases by system
  // Phase 'briefing': Case brief + 60s countdown
  // Phase 'examining': Timer + case findings + audio clips
  // Phase 'presenting': Text input + submit to AI
  // Phase 'viva': Chat interface with AI asking questions
  // Phase 'feedback': AI's scored feedback
}
```

**UI States:**

| Phase | User sees | User does |
|-------|-----------|-----------|
| Select case | Grid of cases by body system | Picks a case |
| Briefing | Case brief text + 60s timer | Reads the brief (or starts early) |
| Examining | Timer (9 min) + case findings panel + audio clips | Examines real patient OR reviews findings + listens to audio signs |
| Presenting | Text input box + "Present to Examiner" button | Types their presentation + differential |
| Viva | Chat interface showing AI's questions + their answers | Types answers to 3-5 viva questions |
| Feedback | Structured feedback card + score | Reviews and can retry |

**Navigation bar:**
```
[Select Case] → [Brief] → [Examine] → [Present] → [Viva] → [Feedback]
     ↑                                                        |
     └───────────── Try Another Case ←───────────────────────┘
```

---

### Task 4: Update page.tsx with mode selector

**Objective:** Let user choose between "Manual Practice" (existing mode) and "AI Examiner" (new mode).

**Files:**
- Modify: `apps/web/src/app/page.tsx`

Add a mode toggle at the top:

```
┌─────────────────────────────────────┐
│  [Manual Practice] [AI Examiner]   │
│  ────────                         │
└─────────────────────────────────────┘
```

When "Manual Practice" is selected, render the existing components.
When "AI Examiner" is selected, render the new AIExaminer component.

---

### Task 5: Create clinical signs audio placeholder

**Objective:** Set up the audio library structure so cases can reference audio clips.

**Files:**
- Create: `apps/web/public/audio/.gitkeep`

For v0, audio clips are placeholders. The UI shows:
- Label and "Play" button
- If audio file exists locally, play it
- If not, show a "Coming soon" badge

This lets us build the UI structure now and add real audio later.

---

### Task 6: Style and polish

**Objective:** Light polish to ensure clean, professional look consistent with existing app.

Use existing CSS-in-JS pattern (inline styles) to maintain consistency.

**Key styling touches:**
- Timer should be prominent and change color when < 30s remaining
- Viva chat should scroll to bottom on new messages
- Feedback card should use the same green/blue/red scheme as existing FeedbackReport
- Case selection grid should use system icons (🧠 Cardio, etc.)

---

## What's NOT in v0 (saved for later)

| Feature | Reason deferred |
|---------|----------------|
| User accounts / auth | Not needed for MVP |
| Persistent case history | No database yet |
| Real audio recordings | Need to source/record clinical signs |
| Progress tracking | Add after core flow is validated |
| Multiple examiners / peer review | v1 feature |
| Mobile app | Web-first for now |
| Payment / subscriptions | Validate value first |

---

## Verification

After each task, run:
```bash
cd ~/paces-loop
pnpm install        # if deps changed
pnpm dev           # start dev server
```

Then manually test:
- [ ] Case selection grid renders correctly
- [ ] Brief phase shows timer and case text
- [ ] Examining phase shows findings + audio buttons
- [ ] Presentation input submits to API
- [ ] AI responds as examiner
- [ ] Viva phase cycles through 3-5 questions
- [ ] Feedback phase shows score and structured feedback
- [ ] Mode toggle switches between Manual and AI Examiner

---

## Open Questions

1. **Where should the Engy API key be stored?** It's already in env as `HERMES_CUSTOM_API_ENGY_AI_API_KEY`. The Next.js API route can use `process.env.HERMES_CUSTOM_API_ENGY_AI_API_KEY`.
2. **Should cases start hidden or visible during examination phase?** Case data (findings, audio) should be visible during examination phase so users who can't access a real patient can still practice presentation + viva.
3. **How long should viva phase run?** Fixed at 5 questions for v0, user can end early.