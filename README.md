# PACES Practice App

A clean, minimal, agent-friendly monorepo starter for the PACES (Practical Assessment of Clinical Examination Skills) practice application.

## Project Purpose

This application is designed to help candidates practice for the PACES clinical examination. It provides a structured environment to simulate clinical stations, manage timers, and record examiner feedback and assessments.

## Repository Structure

This project is structured as a monorepo using **pnpm workspaces**:

```text
├── apps/
│   └── web/                  # Next.js frontend application
├── packages/
│   ├── shared/               # Shared TypeScript types and utility functions
│   └── station-engine/       # Core station, timer, and assessment logic
├── docs/
│   └── architecture.md       # Architecture notes and future roadmap
├── package.json              # Root package configuration
├── pnpm-workspace.yaml       # Workspace definition
└── tsconfig.json             # Root TypeScript configuration
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v20+ recommended)
- [pnpm](https://pnpm.io/) (v9+ recommended)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/aczachariah/paces-loop.git
   cd paces-loop
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

### Development

To start the development server for all applications:

```bash
pnpm dev
```

This will start the Next.js frontend at [http://localhost:3000](http://localhost:3000).

### Building

To build all packages and applications:

```bash
pnpm build
```

### Testing

To run tests across all workspaces:

```bash
pnpm test
pnpm --filter @paces/web lint
```

The test suite uses mocked inference and covers canonical examination findings, signed transcript validation, five-question viva progression, timer transitions, rubric scoring and feedback retries. No live inference is needed for tests.

### Exam integrity and environment

- Clinical case definitions and the public-to-private case mapping are server-only; the browser receives neutral public case metadata and findings revealed by the examiner.
- The examination, presentation and viva answers are carried in an HMAC-signed transcript with a two-hour lifetime.
- `EXAM_SESSION_SECRET` must be a strong random value of at least 32 characters (`openssl rand -hex 32`) in every environment except development/test. The server checks it at start-up (`src/instrumentation.ts`) and on each request, and rejects missing, short or published example values. In development a missing value falls back to a random per-process secret, so tokens reset when the dev server restarts.
- `PACES_ACCESS_CODE` gates `/api/examine` and `/api/tts`. Candidates enter it on the pilot overview page and the browser sends it in the `x-paces-access-code` header. If it is unset in development/test the routes stay open; if it is unset anywhere else they return 503 rather than expose paid inference.
- Rate limits: 120 requests per IP per 10 minutes and 60 requests per signed exam session. Counters are in memory, per server instance; on serverless platforms each instance (and every cold start) has its own counters, so this bounds abuse per instance only. Use a shared store such as Redis/KV before any public launch.
- Feedback is generated at most once per exam session. Because signed tokens are stateless, an older token can always be replayed, so the server keeps an in-memory ledger of session ids that have consumed feedback (a failed generation can be retried) and also marks the returned token. The ledger has the same per-instance limitation as the rate limiter; a durable store is the proper fix.
- Candidate text is sent to the model inside escaped `<candidate_utterance>`/`<candidate_evidence>` delimiters with instructions to treat it as data. Text that is clearly addressed to the grader (for example "ignore previous instructions" or rubric field names) is rejected with a 400 before any inference. The examination-step router returns only fixed correction codes, so free-form model text is never echoed to the browser.
- Configure `ENGY_API_KEY` and optionally `SAYGM_API_KEY` as server-side environment variables. See `.env.example`.
- The LLM selects known examination steps and assesses free-text answers. Clinical findings, viva progression and examination coverage are deterministic.
- Scores are formative practice feedback, not an official PACES result or validated pass prediction. Case content remains draft pending clinician review.
- Examiner speech is disabled until a hosted TTS provider is configured; the viva remains available as text. The old local shell-based `edge-tts` path was removed because it was unsafe and incompatible with serverless deployment.
