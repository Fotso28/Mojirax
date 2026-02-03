# Co-Founder Platform

A modern monorepo for the Co-Founder matching platform, built with Turborepo.

## 🏗️ Project Structure

```
co-founder/
├── apps/
│   ├── web/          # Next.js 16 Frontend (App Router)
│   └── api/          # NestJS Backend API
└── packages/
    └── types/        # Shared TypeScript types & DTOs
```

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18
- npm >= 10

### Installation

```bash
# Install all dependencies
npm install

# Build all packages
npm run build
```

### Development

```bash
# Start all apps in development mode
npm run dev
```

This will start:
- **Frontend** (Next.js): http://localhost:3000
- **Backend** (NestJS): http://localhost:3001

### Available Scripts

- `npm run dev` - Start all apps in development mode
- `npm run build` - Build all apps and packages
- `npm run lint` - Lint all workspaces
- `npm run test` - Run tests across all workspaces
- `npm run format` - Format code with Prettier

## 📦 Workspaces

### apps/web
Next.js 16 frontend application with:
- App Router
- TypeScript
- Tailwind CSS
- Shared types from `@co-founder/types`

### apps/api
NestJS backend API with:
- TypeScript
- REST API
- Shared types from `@co-founder/types`

### packages/types
Shared TypeScript types and DTOs used across frontend and backend.

## 🔧 Architecture

This monorepo follows a strict separation of concerns:
- **Frontend** (`apps/web`) handles UI and user interactions
- **Backend** (`apps/api`) handles business logic and data
- **Shared Types** (`packages/types`) ensures type safety across the stack

See [Architecture Documentation](_bmad-output/planning-artifacts/architecture.md) for detailed architectural decisions.

## 📚 Documentation

- [Development Setup](DEV-SETUP.md)
- [Architecture](_bmad-output/planning-artifacts/architecture.md)
- [Product Requirements](_bmad-output/planning-artifacts/prd.md)

## 🛠️ Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend**: NestJS 11, TypeScript
- **Monorepo**: Turborepo
- **Package Manager**: npm

## 📄 License

UNLICENSED - Private project
