---
title: CoMatch PRD
status: DRAFT
author: Oswald (Project Owner)
date: 2026-01-27
classification:
  domain: General
  projectType: web_app
  complexity: Low
---

# Product Requirements Document (PRD) - CoMatch

## 1. Introduction
**Project Name:** CoMatch
**Version:** 1.2
**Vision:** A responsive web platform and PWA to facilitate connections between Project Founders and Candidate Co-founders in Cameroon, using a Freemium model secured by AI moderation and local infrastructure.

## 2. Goals & Objectives
- **Connect Ecosystem:** Bridge the gap between idea holders and skilled technical/business co-founders.
- **Monetization:** Generate revenue through a "Pay-to-Contact" freemium model.
- **Trust & Quality:** Ensure profile quality via AI validation and secure local data hosting.
- **Accessibility:** Mobile-first PWA approach for broad access.

## 3. User Personas
### 3.1 Project Founder ("Porteur de Projet")
- **Goal:** Find a team to execute an idea.
- **Needs:** Create a project pitch, define needs, search for candidates.

### 3.2 Candidate ("Candidat")
- **Goal:** Find a project to join.
- **Needs:** Showcase skills (Tech Stack, Soft Skills), browse projects.

### 3.3 System Administrator ("Admin")
- **Goal:** Maintain platform integrity and monitor business health.
- **Needs:** Access dashboard KPIs, manage content moderation rules, oversee financial transactions (Lygos Pay logs), and configure AI prompts.

## 3.1 User Journeys (Premium UI/UX Flow)

**Design Philosophy:** "Glassmorphic Professionalism" - Use frosted glass effects, smooth micro-interactions (staggered animations), and distinct vibrant gradients for "Founder" (Blue/Purple) vs "Candidate" (Teal/Green) modes.

### Journey 1: The Visionary (Founder) - From Idea to Match
1.  **Landing:** User lands on a high-energy hero section. "Find your Co-Founder."
2.  **Onboarding (The Pitch):** Instead of a static form, a conversational UI asks: "What are you building?"
    *   *UI Magic:* As they type, AI suggest tags (Fintech, AgriTech) floating in 3D space.
3.  **The Result (The Hook):** Instant "Blur" view of potential matching candidates. "3 Developers match your idea."
    *   *Interaction:* Hovering over a card reveals non-sensitive skills with a "shimmer" effect.
4.  **Conversion:** Clicking "Connect" triggers a sleek Payment Modal (Lygos Pay).
5.  **Success:** Payment confirmed -> Confetti animation -> Contact Details Unlocked.

### Journey 2: The Builder (Candidate) - From Skill to Opportunity
1.  **Import:** "Connect with LinkedIn" (One-click).
    *   *UI Magic:* Profile fills automatically with a "downloading data" visualization.
2.  **Enhancement:** User tweaks their "Ideal Stack".
3.  **Discovery (The Stack):** A Swipe-able (Tinder-style or Grid) feed of Projects.
    *   *Interaction:* Cards flip on click to show "Tech Requirements".
4.  **Application:** "Interested" button sends a standardized, professional notification to the Founder.

### Journey 3: The Guardian (Admin) - Management
1.  **Dashboard:** Dark-mode analytics hub. Real-time counters for "New Users" and "Revenue".
2.  **Moderation Queue:** Grid of "Pending AI" profiles.
    *   *Action:* One-click "Approve" (Green Fade) or "Edit Prompt" (Slide-over panel).

## 4. Functional Requirements

### 4.1 Authentication & User Management
- **Auth:** Email/Password, Google, LinkedIn (via NextAuth).
- **Roles:** Explicit selection (Founder or Candidate).
- **Security:** JWT in HttpOnly Cookies.
- **Profile Management:**
    - Candidates: Bio, Tech Stack, Experience.
    - Founders: Project Pitch, MVP Status, Needs.
    - Media: Photo upload to MinIO.

### 4.2 AI Moderation System
- **Workflow:** New/Edited profiles -> `PENDING_AI` status.
- **Validation:** Background task sends text to LLM/AI.
    - **Approved:** -> `PUBLISHED`.
    - **Rejected:** -> `REJECTED` with reason displayed to user.

### 4.3 Discovery & Privacy (The Feed)
- **Feed:** filterable card grid (City, Skill, Sector).
- **Privacy Wall (Core Feature):**
    - Non-Premium users see masked contact info.
    - **Backend Interceptor:** Removes sensitive fields (Email, Phone, Links) *before* sending to frontend.
    - Frontend displays "Information Hidden".

### 4.4 Payments & Monetization
- **Model:** Pay to unlock contact details.
- **Flow:**
    1. User clicks "See Contact Details".
    2. If Free: Prompt Payment Modale.
    3. Payment via Aggregator (e.g., Lygos Pay).
    4. Webhook confirms payment -> Updates user to `Premium`.
    5. User can now see unmasked details.

### 4.5 Administration
- **Dashboard:** KPIs (Signups, Revenue, Conversion).
- **Configuration:** Toggle hidden fields, Edit AI Prompt.
- **Finance:** Transaction logs, manual Premium override.

## 5. Non-Functional Requirements
- **Architecture:** Next.js (Front), NestJS (Back), PostgreSQL, Docker.
- **Hosting:** VPS hostinger.
- **Performance:** Optimized for mobile (PWA).
- **SEO & Social:** Server-Side Rendering (SSR) for indexability.

## 6. UI/UX Design References
- **Inspiration 1:** [DeepLearning.AI Dev](https://ai-dev.deeplearning.ai/?_gl=1*1vs1zwp*_gcl_au*MTE5NzIxNzA3NC4xNzY5NTIxNjk2*_ga*MTMzODA2NjkxNS4xNzY5NTIxNjk1*_ga_PZF1GBS1R1*czE3Njk1MjE2OTQkbzEkZzAkdDE3Njk1MjE2OTgkajU2JGwwJGgw) - Modern, clean, tech-focused aesthetic.
- **Inspiration 2:** [LinkedIn (Cameroon)](https://cm.linkedin.com/) - Professional networking features, feed layout, and clarity.

## 7. Roadmap Strategy
- **Phase 1 (Month 1):** Valid Core. Auth, Profiles, AI Validation, Feed + Privacy Wall.
- **Phase 2 (Month 2):** Monetization. Payment integration, Admin Dashboard, PWA polish.
- **Phase 3 (Month 3):** Stabilization. Testing, Security audit, Beta, Launch.
