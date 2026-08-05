# Cardiology Station Engine

## Overview

The Cardiology Station simulates a 6-minute PACES station where candidates perform cardiovascular examination actions, receive clinical findings, and provide interpretations. The engine drives the state machine, timer, and scoring logic.

## State Machine

```
┌─────────┐     ┌──────────┐     ┌────────────┐     ┌─────────────┐     ┌──────────┐
│  Idle   │────▶│ Listening│────▶│ Examining  │────▶│ Interpreting│────▶│ Scoring  │
└─────────┘     └──────────┘     └────────────┘     └─────────────┘     └──────────┘
       ▲                                                        │
       │                                                        ▼
       └───────────────────────────────────────────────────┌──────────┐
                                                           │ Feedback │
                                                           └──────────┘
```

### States

| State | Description |
|-------|-------------|
| **Idle** | Station not started. Waiting for candidate to begin. |
| **Listening** | Candidate describes what they're doing. System maps speech/text to actions. |
| **Examining** | Candidate performs examination action. System returns clinical finding. |
| **Interpreting** | Candidate interprets the finding. System evaluates accuracy. |
| **Scoring** | Engine calculates score based on rubric and timing. |
| **Feedback** | System presents one high-yield improvement to candidate. |

## Timer

### Configuration

- **Duration:** 6 minutes (360 seconds)
- **Visibility:** Countdown displayed to candidate
- **Hidden Score:** Timing score calculated but not shown until feedback

### Timing Rules

| Time Remaining | Behavior |
|----------------|----------|
| > 4:00 | Normal operation |
| 4:00 - 2:00 | Subtle visual indicator (color shift) |
| < 2:00 | Warning indicator |
| 0:00 | Station ends, auto-transition to Scoring |

### Hidden Timing Score

- **Optimal pace:** ~1 action per 30-45 seconds
- **Rushing penalty:** > 2 actions per 15 seconds
- **Dragging penalty:** > 90 seconds without action
- **Score range:** 0-10 (added to overall station score)

## Action → Finding → Interpretation Flow

### Actions

Actions are predefined examination steps the candidate can perform:

| Action ID | Description | Required Context |
|-----------|-------------|------------------|
| `inspect_hands` | Inspect hands for stigmata | None |
| `inspect_face` | Inspect face for stigmata | None |
| `inspect_eyes` | Inspect eyes (conjunctiva, papilloedema) | None |
| `inspect_nails` | Inspect nails (splinter hemorrhages, clubbing) | None |
| `inspect_jvp` | Measure JVP | Patient must be supine |
| `auscultate_carotids` | Auscultate carotid arteries | None |
| `palpate_apex` | Palpate apex beat | None |
| `auscultate_hear` | Auscultate heart sounds | None |
| `auscultate_murmurs` | Auscultate for murmurs at all areas | None |
| `palpate_pulses` | Palpate radial, femoral, pedal pulses | None |
| `palpate_bp` | Measure blood pressure | None |

### Findings

Each action returns a clinical finding based on the case configuration:

| Action | Finding | Finding ID |
|--------|---------|------------|
| `inspect_hands` | "No clubbing, no splinter hemorrhages" | `F001` |
| `inspect_face` | "No facial stigmata of IE" | `F002` |
| `inspect_eyes` | "No papilloedema, conjunctivae pink" | `F003` |
| `inspect_nails` | "No clubbing" | `F004` |
| `inspect_jvp` | "JVP elevated at 8cm" | `F005` |
| `auscultate_carotids` | "No carotid bruits" | `F006` |
| `palpate_apex` | "Displaced, diffuse apex beat" | `F007` |
| `auscultate_hear` | "S1, S2 present, no extra sounds" | `F008` |
| `auscultate_murmurs` | "Soft systolic murmur at apex, radiates to axilla" | `F009` |
| `palpate_pulses` | "Pulses bounding, radio-radial equal" | `F010` |
| `palpate_bp` | "BP 140/60, wide pulse pressure" | `F011` |

### Interpretations

Candidate interpretations are evaluated against expected answers:

| Finding | Expected Interpretation | Acceptable Variants |
|---------|------------------------|---------------------|
| `F005` (elevated JVP) | "Right heart failure / volume overload" | "RVF", "fluid overload", "heart failure" |
| `F007` (displaced apex) | "Left ventricular enlargement / dilation" | "LVH", "LV dilation", "cardiomegaly" |
| `F009` (systolic murmur) | "Mitral regurgitation" | "MR", "mitral incompetence" |
| `F011` (wide pulse pressure) | "Aortic regurgitation" | "AR", "aortic incompetence" |

## Case Configuration

The station is driven by a JSON config file:

```json
{
  "station_id": "cardiology_01",
  "title": "Cardiovascular Examination",
  "duration_seconds": 360,
  "case": {
    "diagnosis": "Chronic aortic regurgitation with mitral regurgitation",
    "findings": {
      "F001": {"visible": true, "description": "No clubbing, no splinter hemorrhages"},
      "F002": {"visible": true, "description": "No facial stigmata of IE"},
      "F003": {"visible": true, "description": "No papilloedema, conjunctivae pink"},
      "F004": {"visible": true, "description": "No clubbing"},
      "F005": {"visible": true, "description": "JVP elevated at 8cm"},
      "F006": {"visible": true, "description": "No carotid bruits"},
      "F007": {"visible": true, "description": "Displaced, diffuse apex beat"},
      "F008": {"visible": true, "description": "S1, S2 present, no extra sounds"},
      "F009": {"visible": true, "description": "Soft systolic murmur at apex, radiates to axilla"},
      "F010": {"visible": true, "description": "Pulses bounding, radio-radial equal"},
      "F011": {"visible": true, "description": "BP 140/60, wide pulse pressure"}
    },
    "expected_interpretations": {
      "F005": ["right heart failure", "RVF", "fluid overload"],
      "F007": ["left ventricular enlargement", "LV dilation", "cardiomegaly"],
      "F009": ["mitral regurgitation", "MR"],
      "F011": ["aortic regurgitation", "AR"]
    },
    "high_yield_improvement": "Consider linking the wide pulse pressure (F011) and displaced apex (F007) to chronic aortic regurgitation as the unifying diagnosis."
  }
}
```

## Scoring Rubric

### Components

| Component | Max Score | Weight |
|-----------|-----------|--------|
| **Systematic approach** | 10 | 30% |
| **Finding identification** | 20 | 40% |
| **Interpretation accuracy** | 20 | 30% |
| **Timing** | 10 | (hidden) |

### Systematic Approach Scoring

| Criteria | Points |
|----------|--------|
| Inspects hands | 1 |
| Inspects face | 1 |
| Inspects eyes | 1 |
| Inspects nails | 1 |
| Measures JVP | 2 |
| Palpates apex | 2 |
| Auscultates heart | 2 |
| Palpates pulses | 1 |
| Measures BP | 1 |
| **Total** | **12** |

### Finding Identification Scoring

| Finding Identified | Points |
|--------------------|--------|
| Elevated JVP (F005) | 4 |
| Displaced apex (F007) | 4 |
| Systolic murmur (F009) | 4 |
| Wide pulse pressure (F011) | 4 |
| Bounding pulses (F010) | 4 |
| **Total** | **20** |

### Interpretation Scoring

| Interpretation Correct | Points |
|------------------------|--------|
| Links JVP to heart failure | 5 |
| Links apex to LV enlargement | 5 |
| Identifies MR from murmur | 5 |
| Identifies AR from pulse pressure | 5 |
| **Total** | **20** |

## Implementation Notes

### State Machine Library

Consider using `xstate` for the state machine — it provides:
- Visual state diagrams
- Predictable state transitions
- Built-in history and context
- Easy testing

### Config Loading

- Config files stored in `data/stations/`
- Loaded at runtime, not bundled
- Hot-reloadable for development

### UI Integration

- Station engine is a separate module from the UI
- UI subscribes to engine state changes
- Engine exposes events: `actionPerformed`, `findingReturned`, `interpretationSubmitted`, `stationComplete`