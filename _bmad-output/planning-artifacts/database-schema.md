---
title: Database Schema Design
date: 2026-01-28
author: Winston (System Architect)
status: APPROVED
tags: [architecture, database, prisma, postgres]
---

# Database Schema Architecture

This document defines the optimized and coherent relational database structure for **CoMatch**.
Based on the **NestJS + Prisma + PostgreSQL** stack decision, the schema is defined using **Prisma DDL** for strict type safety and migration management.

## 1. High-Level Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    User ||--o{ Account : "has (OAuth)"
    User ||--o{ Session : "has"
    User ||--o| CandidateProfile : "optional profile"
    User ||--o{ Project : "owns (Founder)"
    User ||--o{ Transaction : "makes"
    User ||--o{ Unlock : "purchased"

    CandidateProfile ||--o{ ModerationLog : "reviewed in"
    CandidateProfile ||--o{ Application : "applies with"
    
    Project ||--o{ ModerationLog : "reviewed in"
    Project ||--o{ Application : "receives"
    
    CandidateProfile ||--o{ Skill : "has"
    
    Unlock }|--|| CandidateProfile : "unlocks candidate"
    Unlock }|--|| Project : "unlocks project"
    
    Transaction ||--o{ Unlock : "pays for"

    %% Enums
    class UserRole {
        AGENT
        ADMIN
        FOUNDER
        CANDIDATE
    }

    class ModerationStatus {
        DRAFT
        PENDING_AI
        PUBLISHED
        REJECTED
    }
```

## 2. Optimized Prisma Schema

### 2.1 Core Principals
- **Standardization**: `snake_case` for database columns (mapped to `camelCase` in JS).
- **Performance**: Indexes on frequently filtered fields (`email`, `status`, `tags`).
- **Flexibility**: `JSONB` for unstructured data like `experience` or `ai_feedback`.
- **Integrity**: `ON DELETE CASCADE` for clean cleanup of related data.

### 2.2 Schema Definition

```prisma
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// --------------------------------------
// 1. User & Authentication (NextAuth)
// --------------------------------------

enum UserRole {
  ADMIN
  FOUNDER
  CANDIDATE
  USER // Default before selection
}

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified DateTime? @map("email_verified")
  image         String?   // Avatar URL (R2)
  role          UserRole  @default(USER)
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  // Relations
  accounts      Account[]
  sessions      Session[]
  
  // Profile Relations (One-to-One or One-to-Many based on future needs)
  candidateProfile CandidateProfile?
  projects         Project[]        // A founder can have multiple projects

  // Monetization
  transactions     Transaction[]
  unlocks          Unlock[]
  notifications    Notification[]

  @@map("users")
}

model Account {
  id                 String  @id @default(cuid())
  userId             String  @map("user_id")
  type               String
  provider           String
  providerAccountId  String  @map("provider_account_id")
  refresh_token      String? @db.Text
  access_token       String? @db.Text
  expires_at         Int?
  token_type         String?
  scope              String?
  id_token           String? @db.Text
  session_state      String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique @map("session_token")
  userId       String   @map("user_id")
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
  @@map("verification_tokens")
}

// --------------------------------------
// 2. Profiles & Domain Entities
// --------------------------------------

enum ModerationStatus {
  DRAFT
  PENDING_AI
  PUBLISHED
  REJECTED
}

model CandidateProfile {
  id          String   @id @default(cuid())
  userId      String   @unique @map("user_id")
  
  // Core Data
  title       String   // e.g., "Senior React Developer"
  bio         String   @db.Text
  location    String?
  linkedinUrl String?  @map("linkedin_url")
  resumeUrl   String?  @map("resume_url") // R2 Link
  
  // Skills & Tags (Array for simple filtering)
  skills      String[] 
  
  // Computed/Synced Data (LinkedIn Import)
  experience  Json?    @db.JsonB // Flexible structure for job history
  education   Json?    @db.JsonB
  
  // Privacy & Monetization
  isContactVisible Boolean @default(false) @map("is_contact_visible")

  // Moderation
  status      ModerationStatus @default(DRAFT)
  
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  // Relations
  user           User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  moderationLogs ModerationLog[]
  unlocks        Unlock[]        // Track who unlocked this profile
  applications   Application[]

  @@map("candidate_profiles")
  @@index([status])
  @@index([skills]) // GIN Index for array searching
}

model Project {
  id          String   @id @default(cuid())
  founderId   String   @map("founder_id")
  
  // Content
  name        String
  pitch       String   @db.Text // Short tagline
  description String   @db.Text // Full AI-analyzed text
  sector      String?  // Fintech, Health, etc.
  stage       String?  // Idea, MVP, Growth
  logoUrl     String?  @map("logo_url")
  
  // Moderation
  status      ModerationStatus @default(DRAFT)

  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  // Relations
  founder        User            @relation(fields: [founderId], references: [id], onDelete: Cascade)
  moderationLogs ModerationLog[]
  unlocks        Unlock[]        // Track who unlocked this project
  applications   Application[]

  @@map("projects")
  @@index([status])
  @@index([sector])
}

// --------------------------------------
// 3. Moderation & Trust
// --------------------------------------

model ModerationLog {
  id                String   @id @default(cuid())
  
  // Targets (Polymorphic-ish via nullable FKs)
  candidateProfileId String? @map("candidate_profile_id")
  projectId         String?  @map("project_id")
  
  // AI Result
  aiScore           Float    @map("ai_score") // 0.0 to 1.0 confidence
  aiReason          String?  @map("ai_reason")
  aiPayload         Json?    @map("ai_payload") @db.JsonB // Full LLM response
  
  // Decision
  status            ModerationStatus
  reviewedAt        DateTime @default(now()) @map("reviewed_at")

  // Relations
  candidateProfile  CandidateProfile? @relation(fields: [candidateProfileId], references: [id])
  project           Project?          @relation(fields: [projectId], references: [id])

  @@map("moderation_logs")
}

model AdminLog {
  id          String   @id @default(cuid())
  adminId     String   @map("admin_id")
  action      String   // "OVERRIDE_MODERATION", "UPDATE_PROMPT"
  targetId    String   @map("target_id")
  details     Json?    @db.JsonB
  
  createdAt   DateTime @default(now()) @map("created_at")

  admin       User     @relation(fields: [adminId], references: [id])

  @@map("admin_logs")
}

// --------------------------------------
// 4. Monetization (Lygos Pay)
// --------------------------------------

enum TransactionStatus {
  PENDING
  PAID
  FAILED
  REFUNDED
}

model Transaction {
  id              String   @id @default(cuid())
  userId          String   @map("user_id")
  
  amount          Decimal  @db.Decimal(10, 2)
  currency        String   @default("XAF")
  status          TransactionStatus @default(PENDING)
  
  // External Reference
  provider        String   @default("LYGOS")
  externalId      String?  @unique @map("external_id") // Lygos Transaction ID
  
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  // Relations
  user            User     @relation(fields: [userId], references: [id])
  unlocks         Unlock[]

  @@map("transactions")
}

model PaymentAuditLog {
  id              String   @id @default(cuid())
  transactionId   String   @map("transaction_id")
  event           String   // "WEBHOOK_RECEIVED", "SIGNATURE_VALIDATED"
  payload         Json     @db.JsonB
  
  createdAt       DateTime @default(now()) @map("created_at")
  
  transaction     Transaction @relation(fields: [transactionId], references: [id], onDelete: Cascade)

  @@map("payment_audit_logs")
}

model Unlock {
  id                 String   @id @default(cuid())
  userId             String   @map("user_id") // The Payer
  transactionId      String   @map("transaction_id")
  
  // What was unlocked?
  targetCandidateId  String?  @map("target_candidate_id")
  targetProjectId    String?  @map("target_project_id")
  
  createdAt          DateTime @default(now()) @map("created_at")

  // Relations
  user               User             @relation(fields: [userId], references: [id])
  transaction        Transaction      @relation(fields: [transactionId], references: [id])
  candidate          CandidateProfile? @relation(fields: [targetCandidateId], references: [id])
  project            Project?          @relation(fields: [targetProjectId], references: [id])

  @@unique([userId, targetCandidateId]) // Prevent double payment
  @@unique([userId, targetProjectId])
  @@map("unlocks")
}

// --------------------------------------
// 5. Applications / Matching
// --------------------------------------

enum ApplicationStatus {
  PENDING
  ACCEPTED // Founder wants to talk
  REJECTED
  IGNORED
}

model Application {
  id                String            @id @default(cuid())
  
  candidateId       String            @map("candidate_id")
  projectId         String            @map("project_id")
  
  status            ApplicationStatus @default(PENDING)
  message           String?           @db.Text // Optional cover note
  
  createdAt         DateTime          @default(now()) @map("created_at")
  updatedAt         DateTime          @updatedAt @map("updated_at")

  // Relations
  candidate         CandidateProfile  @relation(fields: [candidateId], references: [id], onDelete: Cascade)
  project           Project           @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@unique([candidateId, projectId]) // One application per candidate per project
  @@index([projectId, status])       // Founder dashboard query
  @@index([candidateId])             // Candidate "My Applications" query
  @@map("applications")
}

// --------------------------------------
// 6. System Utilities
// --------------------------------------

enum NotificationType {
  SYSTEM
  APPLICATION_RECEIVED
  APPLICATION_ACCEPTED
  APPLICATION_REJECTED
  MODERATION_ALERT
}

model Notification {
  id        String           @id @default(cuid())
  userId    String           @map("user_id")
  type      NotificationType
  title     String
  message   String
  isRead    Boolean          @default(false) @map("is_read")
  data      Json?            @db.JsonB // Link to Application ID or Project ID
  
  createdAt DateTime         @default(now()) @map("created_at")

  user      User             @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, isRead])
  @@map("notifications")
}
