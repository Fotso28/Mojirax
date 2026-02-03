# Story 0-4: Configure Swagger & OpenAPI Generator

**Status:** ✅ DONE  
**Date:** 2026-02-02  
**Epic:** 0 - Project Initialization & Infrastructure

---

## Summary

Configured automatic API documentation and typed frontend client generation using Swagger/OpenAPI and Orval.

---

## Implementation

### Backend (NestJS)

**Dependencies Added:**
- `@nestjs/swagger@^8.0.7`

**Files Created:**
1. `apps/api/src/main.ts` - Swagger configuration
2. `apps/api/src/swagger-export.ts` - OpenAPI export script
3. `apps/api/src/health/health.controller.ts` - Example controller
4. `apps/api/src/health/dto/health-check.dto.ts` - Example DTO with decorators

**Scripts Added:**
```json
{
  "swagger:export": "ts-node src/swagger-export.ts"
}
```

**Features:**
- Swagger UI at `/api/docs`
- Auto-generated OpenAPI 3.0 spec
- Example health endpoint with full documentation

---

### Frontend (Next.js)

**Dependencies Added:**
- `axios@^1.7.9`
- `orval@^7.3.0` (dev)

**Files Created:**
1. `apps/web/orval.config.ts` - Orval configuration
2. `apps/web/src/api/axios-instance.ts` - Custom Axios with auth interceptors

**Scripts Added:**
```json
{
  "api:generate": "orval",
  "api:watch": "orval --watch"
}
```

**Features:**
- Auto-generated typed API client
- Auth token injection
- 401 error handling
- Request cancellation support

---

### Configuration

**Environment Variables:**
- `NEXT_PUBLIC_API_URL` - Frontend API base URL

**Gitignore:**
- `apps/web/src/api/generated/`
- `apps/web/openapi.json`
- `.orval`

---

## Acceptance Criteria

✅ **AC1:** NestJS Controller with `@ApiProperty` decorators  
✅ **AC2:** Build command generates `openapi.json`  
✅ **AC3:** `openapi.json` exported to `apps/web/`  
✅ **AC4:** Orval generates typed API client  

---

## Usage

### Generate API Client

```bash
# 1. Export OpenAPI spec from backend
cd apps/api
npm run swagger:export

# 2. Generate frontend client
cd ../web
npm run api:generate
```

### Use in Frontend

```typescript
import { getHealthCheck } from '@/api/generated/health';

const health = await getHealthCheck();
console.log(health.status); // Fully typed!
```

---

## Testing

### Manual Verification

1. **Swagger UI:**
   ```bash
   cd apps/api
   npm run start:dev
   # Visit http://localhost:3001/api/docs
   ```

2. **OpenAPI Export:**
   ```bash
   cd apps/api
   npm run swagger:export
   ls ../web/openapi.json  # Should exist
   ```

3. **Client Generation:**
   ```bash
   cd apps/web
   npm run api:generate
   ls src/api/generated/health.ts  # Should exist
   ```

---

## Files Modified

**Backend:**
- `apps/api/package.json` - Added @nestjs/swagger, swagger:export script
- `apps/api/src/main.ts` - Added Swagger configuration
- `apps/api/src/app.module.ts` - Added HealthController

**Frontend:**
- `apps/web/package.json` - Added axios, orval, api scripts

**Root:**
- `.gitignore` - Added generated files
- `.env.example` - Added NEXT_PUBLIC_API_URL

---

## Documentation

See `swagger-guide.md` for complete usage guide.

---

## Next Steps

- ✅ Epic 0 complete!
- ⏳ Move to Epic 1: Users, Identity & Onboarding
- ⏳ Add authentication endpoints with Swagger docs
- ⏳ Generate auth client for frontend

---

**Swagger UI:** http://localhost:3001/api/docs  
**Example Endpoint:** `GET /health`
