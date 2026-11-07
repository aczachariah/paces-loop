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
- `EXAM_SESSION_SECRET` must be set to a strong random value of at least 32 characters in production. The fallback secret is for local development only.
- Configure `ENGY_API_KEY` and optionally `SAYGM_API_KEY` as server-side environment variables. See `.env.example`.
- The LLM selects known examination steps and assesses free-text answers. Clinical findings, viva progression and examination coverage are deterministic.
- Scores are formative practice feedback, not an official PACES result or validated pass prediction. Case content remains draft pending clinician review.
- Examiner speech is disabled until a hosted TTS provider is configured; the viva remains available as text. The old local shell-based `edge-tts` path was removed because it was unsafe and incompatible with serverless deployment.
