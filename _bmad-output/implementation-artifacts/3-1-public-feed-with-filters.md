# Story 3-1: Public Feed & Dashboard Layout

Status: in-progress

## Story

As an authenticated User (Founder or Candidate),
I want to access my personal Dashboard,
so that I can discover projects ("Public Feed"), manage my own project ("My Project"), and navigate the app easily on any device.

## Acceptance Criteria

### Layout & Navigation
**Given** an authenticated user on any device
**When** they access `/` (Dashboard)
**Then** they should see a responsive layout:
-   **Desktop**: Left Nav (280px), Center Feed, Right Widgets (300px).
-   **Tablet**: Slim Nav (Icons only), Center Feed.
-   **Mobile**: Hamburger Menu (Left Drawer), Feed (100%), Widgets Button (Right Drawer).
-   **Constraint**: No Bottom Bar, No Floating Action Button.

**Given** the Left Navigation Menu
**When** I view the items
**Then** I should see the following sections:
1.  **Home** (Dashboard/Feed)
2.  **My Project** (Founder) OR **My Applications** (Candidate)
3.  **Messages**
4.  **Profile**
5.  **Settings** (About, Billing, Logout)

### Project Management Logic
**Given** the "My Project" section
**When** I have not created a project yet
**Then** I should see a "Launch Project" button/CTA.

**Given** the "My Project" section
**When** I have an existing project
**Then** I should see my project details and a **"Public / Draft" toggle**.

### Feed & Publicité
**Given** the Main Feed
**When** I scroll through projects
**Then** every 5th item should be a "Sponsored" Native Ad card.

## Tasks

### Frontend (Layout)
- [ ] Implement `DashboardShell` (CSS Grid + Responsive Breakpoints)
- [ ] Create `SidebarNav` with logic for "My Project" vs "Create Project"
- [ ] Build Mobile `NavDrawer` (Hamburger) and `WidgetDrawer` (Bento)
- [ ] Implement `TopHeader` (Sticky, Search Bar)

### Frontend (Feed)
- [ ] Create `ProjectCard` component
- [ ] Implement `FeedStream` with automated Ad Injection (1 per 5 posts)
- [ ] Integrate into `apps/web/src/app/page.tsx`

## User Review Required
**Navigation Structure**: Validated by user (Home, Project, Messages, Profile, Settings).
