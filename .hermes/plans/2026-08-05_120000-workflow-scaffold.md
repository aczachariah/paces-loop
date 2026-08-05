# Workflow Scaffold & Architecture Doc

**Goal:** Set up the planning, experimentation, and documentation structure for the PACES-Loop project, and draft the initial architecture design.

**Architecture:** Monorepo-style structure within the existing `paces-loop` repo. Plans live in `.hermes/plans/`, throwaway experiments in `spikes/`, and design docs in `docs/`. The first doc covers the high-level system architecture and the Cardiology Station Engine.

**Tech Stack:** Next.js/React (Vercel), Node ≥22.13.0, TypeScript, config-driven station UI.

---

### Task 1: Scaffold directories

**Objective:** Create the folder structure for plans, spikes, and design docs.

**Files:**
- Create: `.hermes/plans/`
- Create: `spikes/`
- Create: `docs/`
- Create: `docs/stations/`

**Step 1: Create directories**
```bash
mkdir -p paces-loop/.hermes/plans paces-loop/spikes paces-loop/docs/stations
```

### Task 2: Write architecture design doc

**Objective:** Document the high-level system architecture, data flow, and tech stack decisions.

**Files:**
- Create: `docs/architecture.md`

**Step 1: Write the doc**
- Save the content from the design doc below to `docs/architecture.md`.

---

**Approval:** Awaiting your go-ahead to create the directories and write the file.