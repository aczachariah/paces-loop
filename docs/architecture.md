# Architecture Notes

This document outlines the architectural decisions and future roadmap for the PACES practice application.

## Core Principles

1. **Domain-Driven Design**: Core business logic (stations, timers, assessments) is decoupled from the presentation layer (Next.js) and resides in the `@paces/station-engine` package.
2. **Type Safety**: Shared types are defined in `@paces/shared` to ensure consistency across the frontend, backend, and packages.
3. **Agent-Friendly Layout**: The repository structure is kept simple, flat, and highly modular, making it easy for AI agents to locate, understand, and modify specific parts of the codebase.

## Future Roadmap

### 1. Next.js Frontend (`apps/web`)
- Interactive station timer with audio/visual alerts.
- Examiner assessment forms with structured rubrics.
- Candidate dashboard to track progress and feedback.

### 2. PostgreSQL-Backed Backend
- A future backend service (or Next.js API routes with Prisma/Drizzle) to persist:
  - User profiles (candidates, examiners, patients).
  - Station definitions and clinical scenarios.
  - Completed assessments and feedback history.

### 3. Station Engine Enhancements (`packages/station-engine`)
- Support for complex station flows (e.g., reading time, examination time, questioning time).
- Real-time synchronization for multi-user practice sessions (candidate + examiner + patient).
