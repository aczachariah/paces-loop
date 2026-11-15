# "What do you hear?" heart-sound sign-recognition station (prototype)

Route: `/signs`. A timed drill that plays a real heart-sound recording with no interpretation shown. The
candidate commits structured findings (plus an optional free-text impression), gets immediate per-finding
feedback against the dataset's label, and a session summary with accuracy by finding type. Missed clips are
remembered in `localStorage` (`paces.signs.review.v1`, simple Leitner boxes) and come back first in the next
drill; "Retry missed" re-runs the misses straight away. Scoring is deterministic and never uses AI.

## Library
`scripts/build-heart-sound-library.py` (python3 stdlib + ffmpeg) deterministically downloads and encodes 32
clips into `apps/web/public/signs/audio/` (≈2.2 MB) and writes `packages/shared/src/signs/manifest.json`.

| Deck | Source | Clips | Labels used (only what the dataset records) |
|---|---|---|---|
| Adult valve lesions | PhysioNet/CinC 2016 `training-c`, signal-quality = 1 | 16 (6 AS, 6 MR, 4 controls) | `heartSounds` normal/abnormal (reference class); `diagnosis` group (AS / MR / normal) |
| Murmur characterisation | CirCor DigiScope v1.0.3, children/adolescents | 16 (11 murmur, 5 no murmur) | `murmur` present/absent; systolic murmur present, timing, shape, Levine grade (I–III); diastolic murmur present |

CirCor clips use the recording at the annotated *most audible location*, so the auscultation site shown to the
candidate is real context, not a question. Murmur annotations in CirCor are patient-level.

## Running it
```
pnpm install
EXAM_SESSION_SECRET=<32+ random chars> pnpm --filter @paces/web dev   # then open http://localhost:3000/signs
pnpm test && pnpm build
python3 scripts/build-heart-sound-library.py   # optional: rebuild the clips (needs ffmpeg + network)
```
The drill needs no API keys or access code: it is static audio plus client-side scoring.

## Known limitations
- Labels are the datasets' own and have **not yet been reviewed by a clinician**.
- PhysioNet 2016 `diagnosis` is the patient's diagnosis group, not an auscultation annotation; there is no
  murmur timing/grade label for those adult clips, so none is asked.
- CirCor is paediatric; grades only go to III/VI; only a handful of diastolic murmurs exist.
- Labels ship in the client bundle (this is practice, not a secure exam).
- TODO: hand committed findings + impression to the AI examiner (`/api/examine`) for a follow-up
  differential question. That needs a new phase behind the existing access-code / rate-limit / session-token
  protections, so it is deliberately not wired up in this prototype.
