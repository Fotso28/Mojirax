# Story 0.1: Initialize Turborepo Monorepo

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Developer,
I want to initialize the project structure with Turborepo,
so that I have conflicting-free workspaces for Frontend, Backend, and Shared Types.

## Acceptance Criteria

1. **Given** an empty project directory (or with just docs), **When** I run the initialization script, **Then** I should see `apps/web` (Next.js 15), `apps/api` (NestJS), and `packages/types`.
2. `turbo.json` should be configured to coordinate builds and dev scripts.
3. `package.json` (root) should define the workspaces.
4. `apps/web` should be a clean Next.js 15 app.
5. `apps/api` should be a standard NestJS app.
6. `npm run dev` from root should start both apps via Turbo.

## Tasks / Subtasks

- [x] Initialize Turborepo Workspace
  - [x] Create root `package.json` with workspaces `["apps/*", "packages/*"]`
  - [x] Create `turbo.json` with pipeline configuration
- [x] Initialize Frontend (`apps/web`)
  - [x] Run `npx create-next-app@latest apps/web` (Next 15, key features enabled)
  - [x] Clean up default boilerplate
- [x] Initialize Backend (`apps/api`)
  - [x] Run `npx @nestjs/cli new apps/api` (standard setup)
  - [x] Ensure `dist` output is ignored
- [x] Initialize Shared Packages (`packages/types`)
  - [x] Create basic `package.json` and `tsconfig.json`
  - [x] Create dummy export to verify linking
- [x] Verify Monorepo Operation
  - [x] Run `turbo dev` and verify both servers start

## Dev Notes

**Architecture Alignment:**
- **Monorepo Strategy:** We are using Turborepo.
- **Frontend:** Next.js 15 (App Router).
- **Backend:** NestJS (Standard).
- **Package Manager:** `npm` (Standard) or `pnpm` (if preferred by user, but Task 0.1 AC implies standard). *Self-Correction: Architecture didn't specify package manager, defaulting to `npm` for compatibility unless `pnpm` is explicitly requested. Architecture.md mentions `npx create-turbo` which supports all. Let's stick to `npm` for simplicity unless performance is critical.*

**Project Structure:**
```bash
co-founder/
├── apps/
│   ├── web/ (Next.js)
│   └── api/ (NestJS)
└── packages/
    └── types/
```

### References

- [Architecture: Project Structure](file:///d:/projets/co-founder/_bmad-output/planning-artifacts/architecture.md#project-structure--boundaries)
- [Epics: Story 0.1](file:///d:/projets/co-founder/_bmad-output/planning-artifacts/epics.md#story-01-initialize-turborepo-monorepo)

## Dev Agent Record

### Agent Model Used

Antigravity (Google DeepMind)

### Debug Log References

### Completion Notes List

- Initialized Monorepo with Turborepo
- Created `apps/web` (Next.js 15) and `apps/api` (NestJS)
- Created `packages/types` with dummy shared export
- Configured root `package.json`, `turbo.json`, and `.gitignore`
- Verified `npm run dev` starts both services

### File List

- apps/web/
- apps/api/
- packages/types/
- package.json
- turbo.json
- .gitignore
