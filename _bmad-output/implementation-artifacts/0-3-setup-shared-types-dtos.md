# Story 0.3: Setup Shared Types & DTOs

Status: done

## User Story

As a Fullstack Developer,
I want a shared typescript package for DTOs,
So that my frontend client is always in sync with my backend API.

## Acceptance Criteria

**Given** the `packages/types` directory
**When** I define a `UserDTO` interface in `packages/types`
**Then** I should be able to import it in `apps/api` (NestJS)
**And** I should be able to import it in `apps/web` (Next.js)
**And** Changing the DTO should cause TypeScript errors in both apps

## Completion Notes

Story 0-3 was completed as part of Story 0-1 (Initialize Turborepo Monorepo).

**What was implemented:**
- ✅ `packages/types` package created with TypeScript
- ✅ `UserDTO` interface defined with id, email, role
- ✅ `API_VERSION` constant exported
- ✅ Package importable in both `apps/api` and `apps/web`
- ✅ TypeScript compilation ensures type safety across apps

**Files:**
- `packages/types/src/index.ts` - Shared types and DTOs
- `packages/types/package.json` - Package configuration
- `packages/types/tsconfig.json` - TypeScript config

**Validation:**
- Both apps successfully import from `@co-founder/types`
- Build process validates types across monorepo
- Changes to DTOs trigger TypeScript errors in consuming apps

**Note:** This story was implemented proactively during monorepo initialization to demonstrate shared types functionality.
