# Story 1.2: Role Selection & Profile Initialization

Status: in-progress

## Story

As a New User,
I want to select my role (Founder or Candidate),
so that the platform adapts to my needs and I can start building my profile.

## Acceptance Criteria

### Backend
**Given** an authenticated user with role 'USER'
**When** they submit a PATCH request to `/users/profile` with `role: 'FOUNDER'` or `'CANDIDATE'`
**Then** the user's role should be updated in the database
**And** the API should return the updated user object

### Frontend
**Given** the Role Selection page (`/onboarding/role`)
**When** I select "Project Founder" and click Continue
**Then** My role should be updated to `FOUNDER`
**And** I should be redirected to `/onboarding/founder`

**Given** the Role Selection page
**When** I select "Candidate" and click Continue
**Then** My role should be updated to `CANDIDATE`
**And** I should be redirected to `/onboarding/candidate`

## Tasks

### Backend
- [ ] Verify `PATCH /users/profile` handles role updates correctly (Done, verified via code review)
- [ ] Ensure `UserRole` enum in DTO matches Prisma schema (Done, verified)

### Frontend
- [ ] Refine `apps/web/src/app/onboarding/role/page.tsx`
  - [ ] Ensure it uses the correct API endpoint (`/users/profile`)
  - [ ] Handle loading states and errors
  - [ ] Implement redirection based on selected role
- [ ] Create/Verify `apps/web/src/app/onboarding/candidate/page.tsx` (Placeholder for now)
- [ ] Create/Verify `apps/web/src/app/onboarding/founder/page.tsx` (Check existing implementation)

## User Review Required
None.

## Verification
- Manual verification: Sign up a new user, select role, verify redirection and database update.
