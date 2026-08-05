# PACES-Loop Architecture

## Overview

PACES-Loop is an AI-powered practice examiner for the UK MRCP PACES exam. It simulates clinical stations, evaluates candidate responses, and provides examiner-style feedback with one high-yield improvement per attempt.

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     User Interface                       │
│  (Next.js/React, config-driven station UI)               │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                   Station Engine                         │
│  - State machine (action → finding → interpretation)     │
│  - Timer (6-minute stations)                             │
│  - Hidden timing score                                   │
│  - Config-driven station definitions                     │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                 Evaluation Layer                         │
│  - Speech-to-text (future)                               │
│  - Action mapping (speech → exam actions)                │
│  - Rubric-based scoring                                  │
│  - Feedback generation (one improvement per attempt)     │
└─────────────────────────────────────────────────────────┘
```

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Framework | Next.js (React) |
| Language | TypeScript |
| Hosting | Vercel |
| Node Version | ≥22.13.0 |
| UI | Config-driven components |
| State | React state management |

## Data Flow

1. **Config** → Station definitions loaded from config files
2. **Engine** → State machine processes candidate actions
3. **UI** → Renders station state and candidate input
4. **Evaluation** → Scores response against rubric
5. **Feedback** → Generates one high-yield improvement

## Cardiology Station Engine

### State Machine

```
Idle → Listening → Examining → Interpreting → Scoring → Feedback
```

### Timer

- 6-minute countdown per station
- Hidden timing score (penalizes rushing or dragging)
- Visual countdown for candidate

### Action Flow

1. **Action** — Candidate performs exam action (e.g., "inspect chest")
2. **Finding** — System returns clinical finding (e.g., "systolic murmur")
3. **Interpretation** — Candidate interprets finding (e.g., "aortic stenosis")
4. **Scoring** — Rubric-based evaluation of interpretation

## Future Expansion

- **Speech-first evaluation** — Candidates talk through stations, speech maps to actions
- **Additional stations** — Neurology, GI, Musculoskeletal, etc.
- **Adaptive difficulty** — Adjust case complexity based on performance
- **Progress tracking** — Historical performance analytics

## Design Principles

- **Config-driven** — New stations added via config, not code
- **Modular** — Station engine independent of UI
- **Testable** — State machine and scoring logic unit-testable
- **Extensible** — Easy to add new stations and evaluation methods