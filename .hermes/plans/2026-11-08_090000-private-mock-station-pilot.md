# Private cardiovascular mock-station pilot

## Approved outcome

Build one private, locally testable encounter for Mareen and Mesh:

> select guided/mock mode → timed cardiovascular examination → spoken presentation → spoken viva → formative feedback → targeted retry

Use existing validated server findings, signed stateless sessions and five-answer recovery. Do not deploy or expose confidential case data. Draft case content remains explicitly unreviewed.

## Implementation slices

1. **Shared reviewed voice input**
   - One-shot Web Speech recognition; interim transcript is local only.
   - Final transcript enters a review state and is never auto-submitted.
   - Confirm exactly once; retain text on request/network failure.
   - Typed input and microphone-denied fallback.
   - Abort recognition and ignore stale callbacks on unmount/submission.

2. **Pilot setup and focused examination**
   - Cardiovascular pilot entry with guided and mock mode descriptions.
   - Brief and absolute-deadline examination timer.
   - Latest observation adjacent to next action; restrained action history.
   - Mock mode suppresses corrective coaching while retaining canonical observations; end-of-station synthesis/viva/feedback remains unchanged.
   - Existing stale-response, abort and zero-finding clarification contracts preserved.

3. **Spoken presentation and viva**
   - Reuse reviewed voice input for both phases.
   - Preserve current presentation request, five ordered answers and ambiguous final-response recovery.
   - Text examiner only; no TTS provider or audio claims.

4. **Feedback and retry**
   - Rename action-derived evidence to examination actions rehearsed/missed.
   - Never claim requested findings prove sign recognition.
   - Present formative narrative, differentials and next steps without dominant pass/score framing.
   - Explicitly mark physical technique, sign recognition and patient welfare as not directly assessed by action logs.
   - Targeted retry starts a fresh guided attempt of the same case and carries the selected next-practice goal into the UI. It must not mutate or reuse a completed signed encounter.

5. **Verification and handoff**
   - RED/GREEN tests for reviewed speech, transcript editing, one submission, mode selection, recovery and retry state.
   - Existing full test suite, typecheck, lint and production build.
   - Browser exercise of desktop/mobile complete encounter using deterministic mocked API responses; real provider/microphone checks reported separately if credentials/permissions allow.
   - Independent code review before commit. No deployment.

## Scope exclusions

No new cases, consultation stations, sign-recognition scoring, adaptive viva, avatars, hosted TTS, audio library, analytics, pricing or public access controls. No clinician-review claim from engineering checks.
