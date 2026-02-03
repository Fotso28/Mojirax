---
stepsCompleted: [1, 2, 3, 4]
status: complete
completedAt: '2026-01-28'
inputDocuments: ['d:\projets\co-founder\prd.md', 'd:\projets\co-founder\_bmad-output\planning-artifacts\architecture.md']
---

# CoMatch - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for CoMatch, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: Authentication & User Management
- Secure Auth (Email/Pass, Google, LinkedIn) via NextAuth + NestJS JWT.
- **LinkedIn Integration:** specific scope to Import Profile Data (Skills, Bio, Experience) for Candidates.
- Dual Role Selection (Founder/Candidate) with distinct profiles.
- Profile Management (Bio, Stack, Pitch, Media execution).

FR2: AI Moderation System
- Async Workflow: New content -> PENDING_AI status.
- AI Validation: Background LLM check for quality/safety.
- Outcome Handling: Auto-publish or Reject with reason.

FR3: Discovery & Privacy (The Feed)
- Filterable Project/Candidate Feed (City, Skill, Sector).
- **Privacy Wall**: Non-premium users see masked contact details (Data Access Layer enforcement).

FR4: Payments & Monetization (Freemium)
- Pay-to-Contact Model (View unmasked details).
- Payment Integration (Lygos Pay via Webhooks).
- Transaction Logging and Access Granting.

FR5: Administration Dashboard
- Business KPIs (Signups, Revenue).
- Moderation Queue (Manual override of AI decisions).
- Content & Prompt Configuration.

### NonFunctional Requirements

NFR1: Security
- Stateless JWT authentication (HttpOnly cookies).
- Secure Webhook verification (Lygos Pay signatures).

NFR2: Architecture & Performance
- Split Stack: Next.js (SSR/SEO) + NestJS (API/Logic).
- Monorepo (Turborepo) for shared type safety.
- PWA optimization for mobile users.

NFR3: Hosting & Ops
- Dockerized deployment on Hostinger VPS.
- Cloudflare R2 for scalable object storage.
- BullMQ (Redis) for robust async processing.

### Additional Requirements

**From Architecture:**
- **Structure:** Initialize project as a Turborepo (`apps/web`, `apps/api`, `packages/types`).
- **Communication:** Implement Swagger/OpenAPI generator for strict frontend clients.
- **Storage:** Use Cloudflare R2 SDK in NestJS.
- **Queue:** Implement BullMQ for the AI Moderation pipeline.

**From UX Design (User Journeys):**
- **Aesthetics:** "Glassmorphic Professionalism" (Frosted glass, gradients).
- **Onboarding:** Conversational UI for Founders (instead of static forms).
- **Micro-interactions:** 3D floating tag suggestions, Blur/Shimmer effects for Privacy Wall.

### FR Coverage Map

FR1 (Auth/User) -> Epic 1: core Authentication & Identity
FR2 (AI Moderation) -> Epic 4: Trust & Safety (AI Moderation)
FR3 (Discovery) -> Epic 3: Discovery & Matching Engine
FR4 (Payments) -> Epic 5: Monetization & Payments
FR5 (Admin) -> Epic 6: Administration & Oversight
Architecture/Ops -> Epic 0: Project Initialization & Infrastructure

## Epic List

### Epic 0: Project Initialization & Infrastructure
**Goal:** Establish the Turborepo foundation, CI/CD pipeline, and core architectural patterns (Shared Types, Swagger) to enable parallel development.
**FRs covered:** NFR2, NFR3, Additional (Architecture).

### Epic 1: Users, Identity & Onboarding
**Goal:** Enable Founders and Candidates to securely sign up (LinkedIn/Email), select roles, and complete detailed profiles using the Conversational UI.
**FRs covered:** FR1, NFR1, Additional (UX Onboarding).

### Epic 2: Core Platform Utilities (File Uploads & Notifications)
**Goal:** Implement shared services required by other features, specifically Cloudflare R2 storage for media and a basic notification system.
**FRs covered:** Additional (Storage), NFR3.

### Epic 3: Discovery & Matching Engine
**Goal:** Allow users to explore projects and candidates via a filterable feed, while enforcing the "Privacy Wall" for non-premium users.
**FRs covered:** FR3.

### Epic 4: Trust & Safety (AI Moderation)
**Goal:** Automate content quality control using an Async AI pipeline (BullMQ + LLM) to approve or reject profiles without blocking the user flow.
**FRs covered:** FR2.

### Epic 5: Monetization & Payments
**Goal:** Generate revenue by implementing the "Pay-to-Contact" flow via Lygos Pay webhooks and audit logging.
**FRs covered:** FR4.


## Epic 0: Project Initialization & Infrastructure

**Goal:** Establish the Turborepo foundation, CI/CD pipeline, and core architectural patterns (Shared Types, Swagger) to enable parallel development.

### Story 0.1: Initialize Turborepo Monorepo

As a Developer,
I want to initialize the project structure with Turborepo,
So that I have conflicting-free workspaces for Frontend, Backend, and Shared Types.

**Acceptance Criteria:**

**Given** an empty project directory
**When** I run the initialization script
**Then** I should see `apps/web` (Next.js 15), `apps/api` (NestJS), and `packages/types`
**And** `turbo.json` should be configured to coordinate builds
**And** I can run `npm run dev` from root to start both apps

### Story 0.2: Configure Docker Infrastructure

As a DevOps Engineer,
I want a `docker-compose.yml` file with PostgreSQL and Redis,
So that I can run the complete stack locally without installing services manually.

**Acceptance Criteria:**

**Given** the project root
**When** I run `docker-compose up -d`
**Then** PostgreSQL should be accepted connections on port 5432
**And** Redis should be reachable on port 6379
**And** Database data should persist in a volume

### Story 0.3: Setup Shared Types & DTOs

As a Fullstack Developer,
I want a shared typescript package for DTOs,
So that my frontend client is always in sync with my backend API.

**Acceptance Criteria:**

**Given** the `packages/types` directory
**When** I define a `UserDTO` interface in `packages/types`
**Then** I should be able to import it in `apps/api` (NestJS)
**And** I should be able to import it in `apps/web` (Next.js)
**And** Changing the DTO should cause TypeScript errors in both apps

### Story 0.4: Configure Swagger & OpenAPI Generator

As a Frontend Developer,
I want the Backend to generate an `openapi.json` file,
So that I can auto-generate a strict Axios client for the Frontend.

**Acceptance Criteria:**

**Given** a NestJS Controller with `@ApiProperty` decorators
**When** I run the build command
**Then** an `openapi.json` file should be generated in `apps/web`
**And** I can generate a typed API client using `orval` or `openapi-typescript`

## Epic 1: Users, Identity & Onboarding

**Goal:** Enable Founders and Candidates to securely sign up (LinkedIn/Email), select roles, and complete detailed profiles using the Conversational UI.

### Story 1.1: Authentication via NextAuth & NestJS

As a User,
I want to allow users to sign in with Google or LinkedIn,
So that I can access the platform without remembering a password.

**Acceptance Criteria:**

**Given** the Login Page
**When** I click "Sign in with LinkedIn"
**Then** I should be redirected to LinkedIn OAuth
**And** Upon return, a User record should be created in Postgres
**And** I should receive a JWT session cookie

### Story 1.2: Role Selection & Profile Initialization

As a New User,
I want to select my role (Founder or Candidate),
So that the platform adapts to my needs.

**Acceptance Criteria:**

**Given** a newly registered user
**When** I am presented with the Role Selection screen
**Then** I can choose "Project Founder" or "Candidate"
**And** My choice is saved to the Backend
**And** I am redirected to the appropriate Onboarding flow

### Story 1.3: LinkedIn Profile Import (Candidate)

As a Candidate,
I want my skills and bio to be imported from LinkedIn,
So that I don't have to manually type my entire resume.

**Acceptance Criteria:**

**Given** I authenticated with LinkedIn
**When** I enter the Candidate Onboarding
**Then** My "Bio", "Skills", and "Experience" fields should be pre-filled
**And** I should be able to edit them before saving

### Story 1.4: Conversational Onboarding (Founder)

As a Founder,
I want a conversational UI to describe my project,
So that I can articulate my vision naturally without a boring form.

**Acceptance Criteria:**

**Given** the Founder Onboarding
**When** The AI asks "What are you building?"
**And** I type my description
**Then** The system should extract keywords (Tags) and display them floating
**And** I can confirm or remove these tags before saving

## Epic 2: Core Platform Utilities

**Goal:** Implement shared services required by other features, specifically Cloudflare R2 storage for media and a basic notification system.

### Story 2.1: Cloudflare R2 Integration (NestJS)

As a Developer,
I want a unified Service to upload files to Cloudflare R2,
So that I can store user avatars and project images cheaply.

**Acceptance Criteria:**

**Given** a file provided by the Frontend
**When** The Backend receives the upload request
**Then** It should authenticate with R2 using S3 SDK
**And** The file should be saved to the bucket
**And** A public URL should be returned

### Story 2.2: Media Upload Component (Frontend)

As a User,
I want to upload my profile picture,
So that my profile looks professional.

**Acceptance Criteria:**

**Given** the Profile Edit page
**When** I drag and drop an image
**Then** It should utilize the Backend R2 Service (Story 2.1)
**And** Show a progress bar

## Epic 3: Discovery & Matching Engine

**Goal:** Allow users to explore projects and candidates via a filterable feed, while enforcing the "Privacy Wall" for non-premium users.

### Story 3.1: Public Feed with Filters

As a User,
I want to browse projects or candidates filtered by "City", "Skill", or "Sector",
So that I can find relevant matches quickly.

**Acceptance Criteria:**

**Given** the Explore Page
**When** I toggle filters to "Douala" and "Fintech"
**Then** The grid should update to show only matching cards
**And** The results should be paginated (Infinite Scroll)

### Story 3.2: Privacy Wall Implementation (Backend Interceptor)

As a Founder,
I want candidate contact info to be hidden from free users,
So that I can monetize the platform.

**Acceptance Criteria:**

**Given** an authenticated user with "Free" tier
**When** I request a Candidate's profile via API
**Then** The Backend (NestJS Interceptor) must return `null` or `***` for `email` and `phone` fields
**And** This must happen at the DTO serialization level, not just the Controller

### Story 3.3: Profile View & Privacy UI

As a User,
I want to see a blurry/locked view of sensitive info if I am not Premium,
So that I understand I need to upgrade to see more.

**Acceptance Criteria:**

**Given** I am a Free user viewing a profile
**When** I scroll to the "Contact" section
**Then** Use a "Blur" effect or "Lock" icon over the contact details
**And** Display a "Unlock Contact" button

## Epic 4: Trust & Safety (AI Moderation)

**Goal:** Automate content quality control using an Async AI pipeline (BullMQ + LLM) to approve or reject profiles without blocking the user flow.

### Story 4.1: Async Moderation Queue Setup

As a System,
I want to queue new profiles for moderation instead of blocking the save,
So that the user experience remains fast.

**Acceptance Criteria:**

**Given** a user saves their profile
**When** The data is persisted to Postgres
**Then** A job should be added to the `moderation-queue` (BullMQ)
**And** The User Profile status should be set to `PENDING_REVIEW`
**And** The API returns 200 OK immediately

### Story 4.2: AI Content Validation Worker

As an Admin,
I want an AI worker to analyze text for inappropriate content,
So that I don't have to review every single profile manually.

**Acceptance Criteria:**

**Given** a new Candidate Profile or Project is submitted
**When** The Backend receives it
**Then** It sends the Bio/Pitch to an LLM (DeepSeek AI)
**And** The AI returns a "Flagged" or "Approved" status
**And** If flagged, the content is hidden until Admin review with a reason

## Epic 5: Monetization & Payments

**Goal:** Generate revenue by implementing the "Pay-to-Contact" flow via Lygos Pay webhooks and audit logging.

### Story 5.1: Payment Initiation (Unlock Contact)

As a Free User,
I want to pay to unlock contact details for a specific match,
So that I can get in touch.

**Acceptance Criteria:**

**Given** I clicked "Unlock Contact"
**When** I confirm the purchase
**Then** The Backend should create a "Pending Transaction"
**And** Return a Lygos Pay payment URL
**And** The Frontend should redirect me to that URL

### Story 5.2: Secure Webhook Handler

As a System,
I want to receive secure confirmations from Lygos Pay,
So that I can grant premium access automatically.

**Acceptance Criteria:**

**Given** a POST request to `/api/webhooks/lygos`
**When** The request arrives
**Then** Verify the crypto signature (HMAC) to ensure it's from Lygos
**And** If valid, update the Transaction status to `PAID`
**And** Unlock the specific contact for the user
**And** Log the event in `payment_audit_log`

## Epic 6: Administration & Oversight

**Goal:** innovative dashboard for Admins to monitor KPIs, manage the moderation queue, and configure system prompts.

### Story 6.1: Admin Dashboard & KPIs

As an Admin,
I want to see daily signups and revenue,
So that I can track business health.

**Acceptance Criteria:**

**Given** an authenticated Admin
**When** I load the dashboard
**Then** I see graphs for "New Users (Last 30d)" and "Total Revenue"
**And** These queries are optimized (cached or aggregate tables)

### Story 6.2: Manual Moderation Queue

As an Admin,
I want to review profiles that the AI rejected (or flagged),
So that I can correct false positives.

**Acceptance Criteria:**

**Given** the Moderation View
**When** I see a list of `REJECTED` profiles
**Then** I can read the AI's reason
**And** I can override the decision to `PUBLISHED`
