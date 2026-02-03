# Story 1.1: Authentication via Firebase & Google OAuth

Status: ready-for-dev

<!-- Adapted from original NextAuth story to use Firebase Authentication -->

## Story

As a User,
I want to sign in with Google using Firebase Authentication,
so that I can access the platform securely without managing passwords.

## Acceptance Criteria

### Backend (NestJS)

**Given** a Firebase ID token from the frontend
**When** the backend receives an authentication request
**Then** it should verify the token using Firebase Admin SDK
**And** create or update a User record in PostgreSQL with firebaseUid
**And** return the synchronized user data

### Frontend (Next.js)

**Given** the Login Page with premium white design
**When** I click "Continuer avec Google"
**Then** I should be redirected to Google OAuth via Firebase
**And** upon successful authentication, receive a Firebase ID token
**And** be redirected to the onboarding/role-selection page
**And** my user data should be synced with the backend

### Database

**Given** the User model in Prisma
**When** a user authenticates for the first time
**Then** a new User record should be created with:
- email (from Google)
- firebaseUid (from Firebase)
- firstName, lastName (parsed from displayName)
- image (from Google profile photo)
- role (default: USER)

### UI/UX

**Given** the login page design
**When** the page loads
**Then** it should display:
- Pure white background (#FFFFFF or #F3F2EF)
- Co-Founder logo and tagline
- "Continuer avec Google" button (white bg, gray border, Google logo)
- "Continuer avec LinkedIn" button (disabled, LinkedIn blue)
- Clean, minimal, professional aesthetic (LinkedIn-inspired)
- Responsive design (mobile + desktop)

## Tasks / Subtasks

### Backend Tasks

- [x] Task 1: Firebase Admin SDK Setup (AC: Backend #1)
  - [x] Create FirebaseModule with Admin SDK initialization
  - [x] Add environment variables (FIREBASE_PROJECT_ID, CLIENT_EMAIL, PRIVATE_KEY)
  - [x] Test Firebase Admin initialization

- [x] Task 2: Firebase JWT Strategy (AC: Backend #1)
  - [x] Create FirebaseStrategy using passport-firebase-jwt
  - [x] Implement token verification logic
  - [x] Create FirebaseAuthGuard

- [x] Task 3: User Sync Service (AC: Backend #1, Database #1)
  - [x] Create AuthService.syncUser() method
  - [x] Implement upsert logic (create or update user)
  - [x] Handle firebaseUid, email, name, image fields

- [ ] Task 4: Update Prisma Schema (AC: Database #1)
  - [ ] Add `firebaseUid` field to User model
  - [ ] Make firebaseUid unique and indexed
  - [ ] Run migration

- [x] Task 5: Auth Controller Endpoints (AC: Backend #1)
  - [x] Create POST /auth/sync endpoint
  - [x] Protect with FirebaseAuthGuard
  - [x] Return synchronized user data

### Frontend Tasks

- [ ] Task 6: Design System - Premium White Theme (AC: UI/UX #1)
  - [ ] Create color tokens (white, gray, purple/blue accents)
  - [ ] Define typography system (Inter/SF Pro Display)
  - [ ] Set up spacing and shadow utilities
  - [ ] Create Tailwind config for premium white theme

- [ ] Task 7: UI Components (AC: UI/UX #1)
  - [ ] Create Button component (Primary, Secondary, Social variants)
  - [ ] Create Input component with floating labels
  - [ ] Create Card component
  - [ ] Create Divider component

- [ ] Task 8: Login Page - Premium White Design (AC: Frontend #1, UI/UX #1)
  - [ ] Implement desktop layout (split screen with illustration)
  - [ ] Implement mobile layout (stacked, centered)
  - [ ] Add Co-Founder logo and branding
  - [ ] Style Google OAuth button (white bg, gray border)
  - [ ] Style LinkedIn button (disabled state)
  - [ ] Add security message and footer links

- [ ] Task 9: Firebase Client Integration (AC: Frontend #1)
  - [ ] Configure Firebase client SDK in lib/firebase.ts
  - [ ] Implement signInWithGoogle() in AuthContext
  - [ ] Handle authentication state changes
  - [ ] Store Firebase ID token

- [ ] Task 10: Backend Sync Integration (AC: Frontend #1)
  - [ ] Create API client for /auth/sync endpoint
  - [ ] Call sync endpoint after Firebase authentication
  - [ ] Handle sync errors gracefully
  - [ ] Store user data in context/state

- [ ] Task 11: Routing & Redirects (AC: Frontend #1)
  - [ ] Redirect to /onboarding/role-selection after successful auth
  - [ ] Handle authentication errors
  - [ ] Add loading states during auth flow

### Testing Tasks

- [ ] Task 12: Backend Testing
  - [ ] Test Firebase token verification with valid token
  - [ ] Test Firebase token verification with invalid token
  - [ ] Test user creation on first login
  - [ ] Test user update on subsequent logins
  - [ ] Test /auth/sync endpoint with Postman/curl

- [ ] Task 13: Frontend Testing
  - [ ] Test Google OAuth flow in browser
  - [ ] Test responsive design (mobile, tablet, desktop)
  - [ ] Test loading states
  - [ ] Test error handling (network errors, auth failures)
  - [ ] Verify UI matches premium white design spec

- [ ] Task 14: Integration Testing
  - [ ] Test complete flow: Login → Firebase → Backend → Database
  - [ ] Verify user data persistence in PostgreSQL
  - [ ] Test protected routes with FirebaseAuthGuard
  - [ ] Test logout flow

## Dev Notes

### Architecture Patterns

- **Authentication Flow**: Firebase Client (Frontend) → Firebase Admin (Backend) → PostgreSQL
- **Token Verification**: Stateless JWT verification using Firebase Admin SDK
- **User Sync**: Upsert pattern to handle both new and returning users
- **Guard Pattern**: NestJS Guards with Passport strategy for route protection

### Design System

**Color Palette (Premium White)**
```css
--bg-primary: #FFFFFF;        /* Pure white */
--bg-secondary: #F3F2EF;      /* LinkedIn off-white */
--accent-primary: #8B5CF6;    /* Purple branding */
--accent-linkedin: #0A66C2;   /* LinkedIn blue */
--text-primary: #1F2937;      /* Almost black */
--text-secondary: #6B7280;    /* Medium gray */
--border-light: #E5E7EB;      /* Very light gray */
--border-medium: #D1D5DB;     /* Medium gray */
```

**Typography**
- Font Family: Inter, SF Pro Display, system fonts
- Headings: 24-32px, semi-bold (600)
- Body: 16px, regular (400)
- Small: 14px, regular (400)

**Spacing**
- Card padding: 48px (desktop), 32px (mobile)
- Element gaps: 24px minimum
- Button height: 52px (desktop), 48px (mobile)
- Border radius: 8-12px

### Project Structure Notes

**Backend Structure**
```
apps/api/src/
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── firebase.strategy.ts
│   └── firebase-auth.guard.ts
├── firebase/
│   └── firebase.module.ts
└── prisma/
    └── schema.prisma
```

**Frontend Structure**
```
apps/web/src/
├── app/
│   ├── login/
│   │   └── page.tsx (Premium white design)
│   └── onboarding/
│       └── role-selection/
│           └── page.tsx
├── components/
│   ├── ui/
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   └── divider.tsx
├── context/
│   └── auth-context.tsx
└── lib/
    ├── firebase.ts
    └── api.ts
```

### References

- [Architecture: Authentication](file:///Users/wilson/Desktop/PROJETS/co-founder/_bmad-output/planning-artifacts/architecture.md)
- [Database Schema: User Model](file:///Users/wilson/Desktop/PROJETS/co-founder/apps/api/prisma/schema.prisma#L26-L61)
- [Epic 1: Users, Identity & Onboarding](file:///Users/wilson/Desktop/PROJETS/co-founder/_bmad-output/planning-artifacts/epics.md#L167-L225)
- [UI Design Analysis](file:///Users/wilson/.gemini/antigravity/brain/5502ad4e-da9a-44ef-8add-194f92edba2a/ui-design-analysis.md)
- [Firebase Admin SDK Credentials](file:///Users/wilson/Desktop/PROJETS/co-founder/apps/web/co-founder-babf6-firebase-adminsdk-fbsvc-69e0e80e9a.json)

### Security Considerations

- ✅ Firebase Admin credentials stored in environment variables (never in code)
- ✅ Firebase service account JSON file should be moved to secure location
- ✅ HTTPS required for production OAuth redirects
- ✅ Token verification on every protected endpoint
- ✅ CORS configuration for frontend-backend communication

### Known Issues & Decisions

1. **NextAuth vs Firebase**: Original epic specified NextAuth, but current implementation uses Firebase Auth directly for simpler integration
2. **LinkedIn OAuth**: Disabled in UI (marked "Bientôt"), will be implemented in future story
3. **Service Account File**: Currently in apps/web/, should be moved to secure location or use environment variables only

## Dev Agent Record

### Agent Model Used

Claude 3.7 Sonnet (Antigravity)

### Debug Log References

- Initial planning session: 2026-02-02
- UI design iteration: Premium white theme selected over gradient design

### Completion Notes List

- [ ] Backend: Firebase Admin SDK configured
- [ ] Backend: User sync endpoint tested
- [ ] Database: Migration applied with firebaseUid field
- [ ] Frontend: Premium white design implemented
- [ ] Frontend: Google OAuth flow working
- [ ] Integration: End-to-end authentication tested
- [ ] Documentation: Walkthrough created

### File List

**Backend Files**
- apps/api/src/firebase/firebase.module.ts (existing)
- apps/api/src/auth/auth.module.ts (existing)
- apps/api/src/auth/auth.controller.ts (existing)
- apps/api/src/auth/auth.service.ts (existing)
- apps/api/src/auth/firebase.strategy.ts (existing)
- apps/api/src/auth/firebase-auth.guard.ts (existing)
- apps/api/prisma/schema.prisma (to update)

**Frontend Files**
- apps/web/src/lib/firebase.ts (existing)
- apps/web/src/context/auth-context.tsx (existing)
- apps/web/src/app/login/page.tsx (to update with premium white design)
- apps/web/src/components/ui/button.tsx (to create)
- apps/web/src/components/ui/input.tsx (to create)
- apps/web/src/components/ui/card.tsx (to create)
- apps/web/tailwind.config.ts (to update)
- apps/web/src/app/globals.css (to update)

**Configuration Files**
- .env (to update with Firebase credentials)
- .env.example (to update)
