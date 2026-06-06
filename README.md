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
```
