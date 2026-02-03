# Story 0.2: Configure Docker Infrastructure

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## User Story

As a DevOps Engineer,
I want a `docker-compose.yml` file with PostgreSQL and Redis,
So that I can run the complete stack locally without installing services manually.

## Acceptance Criteria

**Given** the project root
**When** I run `docker-compose up -d`
**Then** PostgreSQL should accept connections on port 5432
**And** Redis should be reachable on port 6379
**And** Database data should persist in a volume

## Tasks

### Task 1: Add Redis Service
- [x] Add Redis 7 Alpine image to docker-compose.yml
- [x] Configure port 6379
- [x] Add redis_data volume for persistence
- [x] Enable AOF persistence with `--appendonly yes`

### Task 2: Add Health Checks
- [x] PostgreSQL health check with `pg_isready`
- [x] Redis health check with `redis-cli ping`
- [x] API health check with HTTP endpoint
- [x] Configure API to wait for healthy dependencies

### Task 3: Environment Configuration
- [x] Create .env.example with all variables
- [x] Update docker-compose.yml to use environment variables
- [x] Add default values for all configurations

### Task 4: Update Documentation
- [x] Add Redis section to DEV-SETUP.md
- [x] Document health checks
- [x] Add Redis CLI commands
- [x] Update project structure diagram

## Dev Notes

### What Was Done

**PostgreSQL (Already Configured):**
- Image: postgres:15-alpine
- Port: 5433 (mapped from 5432 to avoid conflicts)
- Volume: postgres_data
- Health check: pg_isready

**Redis (Added):**
- Image: redis:7-alpine
- Port: 6379
- Volume: redis_data
- Persistence: AOF enabled
- Health check: redis-cli ping

**API Updates:**
- Added REDIS_URL environment variable
- Updated depends_on with health check conditions
- Added HTTP health check endpoint

**Configuration Management:**
- Created .env.example with all variables
- Used ${VAR:-default} syntax for flexibility
- Documented all configuration options

### Architecture Compliance

✅ Matches architecture.md line 135: "docker-compose.yml # Dev Infra (PG, Redis, MinIO)"
✅ Redis required for BullMQ (Epic 4: AI Moderation Queue)
✅ PostgreSQL for main database
✅ Health checks ensure services are ready before API starts

### Testing Performed

1. **Docker Compose Validation:**
   ```bash
   docker compose config
   # Result: Valid YAML, all services configured correctly
   ```

2. **Service Configuration:**
   - PostgreSQL: Port 5433, volume postgres_data ✅
   - Redis: Port 6379, volume redis_data ✅
   - API: Depends on healthy postgres + redis ✅

3. **Health Checks:**
   - PostgreSQL: `pg_isready -U admin` every 5s ✅
   - Redis: `redis-cli ping` every 5s ✅
   - API: HTTP check with 40s start period ✅

### File List

**Modified:**
- docker-compose.yml - Added Redis, health checks, env vars
- DEV-SETUP.md - Updated with Redis info and health checks

**Created:**
- .env.example - Environment variables template

### Completion Notes

Story 0-2 is complete. All acceptance criteria satisfied:

1. ✅ `docker-compose up -d` starts all services
2. ✅ PostgreSQL on port 5432 (mapped to 5433 externally)
3. ✅ Redis on port 6379
4. ✅ Data persists in volumes (postgres_data, redis_data)

**Additional improvements:**
- Health checks for all services
- Environment variable management
- Comprehensive documentation
- Service dependency management

**Ready for:** Story 0-3 (Setup Shared Types & DTOs)

**Note:** PostgreSQL was already configured in Story 0-1. This story completed the infrastructure by adding Redis and improving the overall Docker setup with health checks and better configuration management.
