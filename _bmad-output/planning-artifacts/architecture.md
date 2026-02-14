---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments: ['d:\projets\co-founder\prd.md']
workflowType: 'architecture'
project_name: 'MojiraX'
user_name: 'Oswald'
date: '2026-01-28'
lastStep: 8
status: 'complete'
completedAt: '2026-01-28'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis (Revised)

### Requirements Overview

**Functional Requirements:**
- **Core Identity:** Dual-role system (Founder/Candidate).
- **Intelligent Workflow:** Async content moderation pipeline using AI.
- **Privacy-First Discovery:** Backend-For-Frontend (BFF) pattern to mask sensitive data.
- **Monetization:** Event-driven payment flow (Lygos Pay webhooks).
- **SEO & Social:** Server-Side Rendering (SSR) via Next.js.

**Non-Functional Requirements:**
- **Stack:** Next.js (Front), NestJS (Back), PostgreSQL, Docker.
- **Separation of Concerns:** Strict Frontend/Backend split.
- **Infrastructure:** Containerized deployment on VPS.

**Scale & Complexity:**
- Primary domain: Split Stack Web App
- Complexity level: Medium
- Estimated architectural components: ~8 (Front, Back, DB, Cache, Queue, Storage, AI, Proxy)

### Technical Constraints & Dependencies
- **Next.js:** Responsible for UI, SEO, and BFF (Proxy).
- **NestJS:** Responsible for Logic, DB, Queue, and Security.

## Starter Template Evaluation

### Primary Technology Domain

**Split Stack Web App (Next.js + NestJS)** based on user preference for clean separation of concerns.

### Selected Starters:

**Frontend:** `create-next-app` (Clean)
-   **Role:** Client-side rendering + SEO + BFF Proxy.
-   **Tech:** Next.js 15, Tailwind, Axios/Fetch.

**Backend:** `nest new` (Standard)
-   **Role:** API Source of Truth.
-   **Tech:** NestJS, Prisma, Passport (JWT), BullMQ (Queues).

## Core Architectural Decisions

### Data Architecture

**Decision 1: Privacy Wall Implementation**
-   **Decision:** DTO Pattern in NestJS.
-   **Rationale:** NestJS Interceptors (`ClassSerializerInterceptor`) automatically strip `@Exclude()` fields (email, phone) from the response based on user role. This is cleaner than manual filtering.

**Decision 1b: Profile Page Strategy**
-   **Structure:**
    -   **Frontend:** `/profile` (Protected Route).
    -   **Components:** `ProfileForm` (React Hook Form + Zod).
    -   **State:** Local state + Optimistic UI updates.
-   **Persistence:** `PATCH /users/profile` endpoint using DTOs.
-   **Asset Management:** Profile pictures upload via Frontend -> Firebase Storage (or R2) -> Backend URL update.

### Storage Strategy

**Decision 2: File Storage**
-   **Decision:** Cloudflare R2 (S3 Compatible).
-   **Rationale:** Standard connection via `@aws-sdk/client-s3` in NestJS service.

### Asynchronous Processing

**Decision 3: AI Moderation Queue**
-   **Decision:** BullMQ (Redis) inside NestJS.
-   **Rationale:** Since we have a dedicated long-running Node.js process (NestJS), we can host the queue workers internally without timeouts. Docker handles the Redis instance.

### Communication Pattern

**Decision 4: Frontend-Backend Auth**
-   **Decision:** Firebase Authentication (Managed).
-   **Flow:** 
    1.  Next.js client authenticates with Firebase (Google/Email).
    2.  Token passed to NestJS via Bearer Header.
    3.  NestJS verifies token using `firebase-admin` (Passport Strategy).
    4.  **No Session Cookies:** Pure stateless JWT flow.

## Implementation Patterns & Consistency Rules

### Monorepo Strategy (Turborepo)

**Decision: Shared Types Package**
-   **Structure:**
    -   `apps/web`: Next.js Client.
    -   `apps/api`: NestJS Server.
    -   `packages/types`: Shared TypeScript interfaces/DTOs.
-   **Rule:** The Frontend NEVER manually defines an API response type. It MUST import valid DTOs from `packages/types`.

### Communication Patterns

**API Consumption (Swagger/OpenAPI)**
-   **Pattern:** Generator-based.
-   **Workflow:**
    1.  NestJS decorates Controllers with `@ApiProperty()`.
    2.  CI/CD generates `openapi.json`.
    3.  Frontend generates strict TypeScript client via **Orval**.
-   **Benefit:** Zero "magic string" API calls in the frontend.

### Error Handling Consistency

**Standard:** NestJS `HttpException`
-   **Backend:** Always throw standard exceptions (`BadRequestException`, `ForbiddenException`).
-   **Format:** `{ statusCode: 400, message: "Validation failed", error: "Bad Request" }`.
-   **Frontend:** Global Axios Interceptor catches non-2xx responses and maps `message` to a UI Toast.

### Naming Conventions

**Database (PostgreSQL)**
-   **Standard:** `snake_case` for everything (tables, columns).
-   **Rationale:** Native Postgres standard, easy to read in SQL.

**Types/Code (TypeScript)**
-   **Standard:** `camelCase` for properties, `PascalCase` for classes/interfaces.
-   **Mapping:** Prisma automatically maps `first_name` (DB) to `firstName` (Code).

**API Endpoints**
-   **Standard:** REST `kebab-case`. concept/resource.

## Project Structure & Boundaries

### Complete Project Directory Structure (Turborepo)

```bash
co-founder/
├── package.json            # Workspace root
├── turbo.json              # Build orchestration
├── docker-compose.yml      # Dev Infra (PG, Redis, MinIO)
├── README.md
│
├── apps/
│   ├── web/                # Next.js 15 Client
│   │   ├── package.json
│   │   ├── next.config.js
│   │   ├── src/
│   │   │   ├── app/        # App Router Pages
│   │   │   ├── components/ # UI Components
│   │   │   ├── lib/        # API Client (Axios + Interceptors)
│   │   │   └── hooks/      # React Query / SWR
│   │   └── public/
│   │
│   └── api/                # NestJS Server
│       ├── package.json
│       ├── nest-cli.json
│       ├── prisma/         # Database Schema
│       └── src/
│           ├── main.ts
│           ├── app.module.ts
│           └── modules/    # Feature Modules
│               ├── auth/
│               ├── users/
│               └── payment/
│
└── packages/
    ├── types/              # Shared DTOs
    │   ├── index.ts
    │   └── package.json
    ├── config/             # Shared Configs
    │   ├── eslint-preset.js
    │   └── package.json
    └── ui/                 # (Optional) Shared UI Kit
```

### Architectural Boundaries

**API Boundaries (The Contract)**
-   **Definition:** `apps/api/src/main.ts` (Swagger/OpenAPI).
-   **Enforcement:** `apps/api` publishes DTOs to `packages/types`. `apps/web` consumes them.
-   **Traceability:** Backend changes -> Update DTOs -> Frontend Build Failure (Type Safety).

**Data Boundaries**
-   **Database:** Owned exclusively by `apps/api` (NestJS). `apps/web` NEVER connects to DB.
-   **File Storage:** Managed by `apps/api` (via S3/R2 Service). Frontend receives Pre-signed URLs.

### Requirements to Structure Mapping

**Epic: User Management**
-   **Frontend:** `apps/web/src/app/(dashboard)/profile/`
-   **Backend:** `apps/api/src/modules/users/`
-   **Shared:** `packages/types/src/user.dto.ts`

**Epic: AI Moderation**
-   **Backend:** `apps/api/src/modules/ai/` (BullMQ Producer)
-   **Worker:** `apps/api/src/modules/ai/ai.processor.ts` (BullMQ Consumer)
-   **Frontend:** `apps/web/src/components/status/ModerationBadge.tsx`

**Epic: Payments (Lygos)**

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
-   **Split Stack:** The decision to separate Frontend (Next.js) and Backend (NestJS) aligns with the requirement for "Strict Separation of Concerns".
-   **Monorepo:** The Turborepo structure bridges the gap between the two apps using shared types, resolving the primary risk of "drift" between Front and Back.
-   **Communication:** OpenAPI/Swagger is the correct choice to glue strongly-typed NestJS DTOs to the Next.js client.

**Structure Alignment:**
-   The `apps/` and `packages/` structure perfectly supports the architectural decisions.
-   Data boundaries are respected: `prisma` lives strictly in `apps/api`.

### Requirements Coverage Validation ✅

**Epic Coverage:**
-   **User Management:** Covered by `modules/users` (Back) and `profile/` (Front).
-   **AI Moderation:** Covered by `modules/ai` + BullMQ (to handle async timeouts).
-   **Payments:** Covered by `modules/payment` + Webhook Controller + Transaction Logs.

**Functional Requirements:**
-   **Privacy Wall:** Natively handled by NestJS `ClassSerializer` (DTOs) + Backend Logic.
-   **SEO:** Handled by Next.js SSR.

**Non-Functional Requirements:**
-   **Security:** JWTs are stateless and secure.
-   **Performance:** Next.js optimizes the PWA delivery; NestJS handles heavy logic nicely.

### Implementation Readiness Validation ✅

**Readiness Status:**
-   **Structure:** Complete `tree` defined.
-   **Patterns:** Critical "Shared Types" pattern defined.
-   **Decisions:** Validated.

### Gap Analysis Results

**Minor Gaps (Non-Blocking):**
-   **Mobile App:** Not defined yet, but the architecture (API-First via NestJS) makes adding it trivial later (`apps/mobile`).
-   **Specific Deployment Scripts:** `Dockerfile` details needed during implementation.

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified

**✅ Architectural Decisions**
- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined

**✅ Implementation Patterns**
- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified

**✅ Project Structure**
- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High

**Key Strengths:**
1.  **Strict Typing:** Shared DTOs prevent bugs.
2.  **Scalability:** Independent scaling of Front and Back.
3.  **Clarity:** Clear boundaries (API = Data, Web = UI).

**Areas for Future Enhancement:**
-   Adding a dedicated `apps/mobile` (React Native/Expo).

### Implementation Handoff

**AI Agent Guidelines:**
-   **Frontend Agents:** NEVER touch `apps/api`. Use `packages/types` for interfaces.
-   **Backend Agents:** NEVER touch `apps/web`. Expose clean Swagger endpoints.
-   **Fullstack Agents:** When adding a feature, start with Backend (Data/API), then `turbo build`, then Frontend.

**First Implementation Priority:**
Initialize the Turborepo workspace.

```bash
npx create-turbo@latest co-founder
```
