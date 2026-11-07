# PACES-Loop exam integrity stabilisation

Approved scope: review items 1–4. Preserve independent examine calls and DeepSeek runtime.

1. Add structured, versioned case findings and case-specific viva questions. The examine LLM returns only a validated finding ID; the server returns canonical case text. Ambiguous input returns a correction rather than invented findings.
2. Lift the examination record into AIExaminer. Replace global timers with effect-scoped timers, auto-transition at zero, and recognise only explicit examination-complete phrases.
3. Replace the viva regex/free-text progression with question IDs. Presentation immediately returns the first question; five answers deterministically lead to feedback.
4. Send examination record, presentation and viva answers to feedback. Calculate examination coverage and technique deterministically; validate bounded LLM presentation/differential/viva assessment. Clearly label the score formative, not an official PACES pass prediction.
5. Expose neutral public case metadata rather than shipping confidential case definitions to the browser.
6. Add Node tests for selection, progression, completion phrases and feedback; run full tests, typecheck/build and independent review. No production commit or deployment without verification.

Clinical content remains draft pending clinician review. No inference calls are needed for unit tests.
