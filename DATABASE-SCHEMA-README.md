# Database Schema Implementation - Quick Reference

**Status:** ✅ READY FOR MIGRATION  
**Version:** 2.0 (AI-Enhanced)  
**Date:** 2026-02-02

---

## 📊 Schema Overview

**13 Tables | 5 Enums | 20+ Indexes | AI-Powered Search**

### Tables by Category

**Authentication (4):**
- `users` - Contact: firstName, lastName, phone, address, email
- `accounts` - OAuth (Google, LinkedIn)
- `sessions` - JWT sessions
- `verification_tokens` - Email verification

**Profiles (2):**
- `candidate_profiles` - 35+ fields, vector embeddings, preferences
- `projects` - Requirements, tech stack, budget, embeddings

**AI & Search (2):** ⭐ NEW
- `match_scores` - AI matching cache (24h TTL)
- `search_logs` - Analytics & trending

**Moderation (2):**
- `moderation_logs` - AI review audit
- `admin_logs` - Admin actions

**Payments (3):**
- `transactions` - Stripe (EUR)
- `payment_audit_logs` - Webhook audit
- `unlocks` - Privacy wall unlocks

**Matching (1):**
- `applications` - Candidate → Project

**System (1):**
- `notifications` - In-app alerts

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd apps/api
npm install
```

### 2. Setup pgvector
```bash
docker exec -it co-founder-postgres psql -U admin -d co_founder_db \
  -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### 3. Generate & Migrate
```bash
npm run prisma:generate
npm run prisma:migrate:dev --name init_ai_search
```

### 4. Verify
```bash
npm run prisma:studio
# Opens http://localhost:5555
```

---

## 🔑 Key Features

### Vector Embeddings (pgvector)
- **Model:** `text-embedding-3-small` (1536 dims)
- **Fields:** `bioEmbedding`, `skillsEmbedding`, `descriptionEmbedding`
- **Usage:** Semantic search, similarity matching

### AI Match Scoring
- **Cache:** `match_scores` table (24h TTL)
- **Scores:** Overall, skills, experience, location, cultural fit
- **Reasoning:** AI-generated explanations

### Search Analytics
- **Tracking:** Queries, filters, results, clicks
- **Metrics:** CTR, trending searches, zero-results
- **ML:** Training data for improvements

---

## 📋 New Fields Summary

### User
- `firstName`, `lastName`, `phone`, `address` ✅

### CandidateProfile (+20 fields)
**Preferences:**
- `desiredSectors[]`, `desiredStage[]`, `desiredLocation[]`
- `minSalary`, `maxSalary`, `availability`
- `willingToRelocate`, `remoteOnly`

**Details:**
- `yearsOfExperience`, `languages[]`, `certifications[]`
- `portfolioUrl`, `githubUrl`

**AI:**
- `bioEmbedding`, `skillsEmbedding`
- `profileCompleteness`, `qualityScore`

### Project (+15 fields)
**Details:**
- `teamSize`, `fundingStatus`, `techStack[]`
- `websiteUrl`, `demoUrl`, `deadline`

**Requirements:**
- `requiredSkills[]`, `niceToHaveSkills[]`
- `location`, `commitment`, `budget`
- `isRemote`, `isUrgent`

**AI:**
- `descriptionEmbedding`, `urgency`, `qualityScore`

---

## 🎯 Search Strategy

```
1. FILTER (SQL)      → 1000 results
   ↓ status, sector, skills
2. VECTOR SEARCH     → 50 results
   ↓ pgvector similarity
3. AI SCORING        → 10 results
   ↓ GPT-4 analysis
4. CACHE             → Instant
   ↓ match_scores table
```

---

## 📈 Performance Targets

- **Vector Search:** < 100ms
- **Cache Hit Rate:** > 80%
- **Match Calculation:** < 2s (with AI)
- **Search Latency:** < 500ms (end-to-end)

---

## 🔐 Privacy Wall

**Rule:** Contact hidden until unlocked

**Check:**
```typescript
const unlock = await prisma.unlock.findUnique({
  where: {
    userId_targetCandidateId: {
      userId: viewer.id,
      targetCandidateId: profile.id
    }
  }
});
```

---

## 📦 Files Created

- `apps/api/prisma/schema.prisma` - Complete schema
- `_bmad-output/planning-artifacts/database-schema.md` - Full docs
- `apps/api/package.json` - Prisma scripts added

---

## ⚡ Next Steps

1. ✅ Schema created
2. ⏳ Run migration
3. ⏳ Implement embedding service
4. ⏳ Implement matching AI service
5. ⏳ Create search API endpoints

---

**Full Documentation:** See `_bmad-output/planning-artifacts/database-schema.md`
