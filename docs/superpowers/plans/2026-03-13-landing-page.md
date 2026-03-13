# Landing Page MojiraX — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a modern landing page for non-authenticated visitors at `/`, with dynamic pricing, FAQ, and testimonials managed from the admin panel.

**Architecture:** Client Component at `/` conditionally renders `<LandingPage />` or dashboard based on auth state. 3 new Prisma tables (PricingPlan, Faq, Testimonial) + a public `LandingModule` API + seed data. 10 frontend components in `web/src/components/landing/`.

**Tech Stack:** Next.js 16 (React client components), NestJS 11, Prisma, PostgreSQL, Tailwind CSS, Lucide React, next/image

**Spec:** `docs/superpowers/specs/2026-03-13-landing-page-design.md`

---

## File Map

### Backend — New files
| File | Responsibility |
|------|---------------|
| `api/prisma/schema.prisma` | MODIFY — add 3 models: PricingPlan, Faq, Testimonial |
| `api/prisma/seed.sql` | MODIFY — add seed data for the 3 tables |
| `api/src/landing/landing.module.ts` | Landing module registration |
| `api/src/landing/landing.controller.ts` | 3 GET endpoints (public, no auth) |
| `api/src/landing/landing.service.ts` | Prisma queries with select + take:20 |
| `api/src/app.module.ts` | MODIFY — import LandingModule |

### Frontend — New files
| File | Responsibility |
|------|---------------|
| `web/src/components/landing/landing-page.tsx` | Main landing orchestrator — fetches dynamic data, renders all sections |
| `web/src/components/landing/landing-header.tsx` | Fixed header with logo + 2 CTA buttons |
| `web/src/components/landing/hero-section.tsx` | Hero split layout + glass card visual |
| `web/src/components/landing/for-who-section.tsx` | 3 persona cards |
| `web/src/components/landing/how-it-works-section.tsx` | 4 steps dark section |
| `web/src/components/landing/why-mojirax-section.tsx` | Split layout with images + features |
| `web/src/components/landing/testimonials-section.tsx` | Dynamic testimonial cards |
| `web/src/components/landing/pricing-section.tsx` | Dynamic pricing cards |
| `web/src/components/landing/faq-section.tsx` | Dynamic FAQ accordion |
| `web/src/components/landing/cta-section.tsx` | Final CTA gradient block |
| `web/src/components/landing/landing-footer.tsx` | Footer 4-column layout |

### Frontend — Modified files
| File | Change |
|------|--------|
| `web/src/app/page.tsx` | Conditional render: landing if !user, dashboard if user |
| `web/src/app/layout.tsx` | Update metadata for SEO |
| `web/next.config.ts` | Add `images.unsplash.com` to remotePatterns |

---

## Chunk 1: Database + Backend API

### Task 1: Prisma schema — add 3 landing tables

**Files:**
- Modify: `api/prisma/schema.prisma` (append at end)

- [ ] **Step 1: Add PricingPlan model to schema.prisma**

Append after the last model in the file:

```prisma
// --------------------------------------
// Landing Page Content
// --------------------------------------

model PricingPlan {
  id        String   @id @default(cuid())
  name      String
  price     Int      @default(0)
  period    String   @default("mois")
  features  String[]
  isPopular Boolean  @default(false) @map("is_popular")
  isActive  Boolean  @default(true) @map("is_active")
  order     Int      @default(0)
  ctaLabel  String   @default("Commencer") @map("cta_label")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@index([isActive, order])
  @@map("pricing_plans")
}

model Faq {
  id        String   @id @default(cuid())
  question  String
  answer    String
  isActive  Boolean  @default(true) @map("is_active")
  order     Int      @default(0)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@index([isActive, order])
  @@map("faqs")
}

model Testimonial {
  id        String   @id @default(cuid())
  name      String
  role      String
  location  String
  quote     String
  imageUrl  String   @map("image_url")
  isActive  Boolean  @default(true) @map("is_active")
  order     Int      @default(0)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@index([isActive, order])
  @@map("testimonials")
}
```

- [ ] **Step 2: Generate migration**

```bash
cd api && npx prisma migrate dev --name add_landing_page_tables
```

Expected: Migration created successfully, 3 tables created.

- [ ] **Step 3: Commit**

```bash
git add api/prisma/schema.prisma api/prisma/migrations/
git commit -m "feat(db): add PricingPlan, Faq, Testimonial tables for landing page"
```

---

### Task 2: Seed data for landing tables

**Files:**
- Modify: `api/prisma/seed.sql` (append at end, add table names to TRUNCATE)

- [ ] **Step 1: Add new tables to TRUNCATE list**

In the TRUNCATE block at the top of seed.sql, add `pricing_plans, faqs, testimonials` before `CASCADE;`.

- [ ] **Step 2: Append seed inserts at the end of seed.sql**

```sql
-- ============================================
-- LANDING PAGE CONTENT
-- ============================================

INSERT INTO pricing_plans (id, name, price, period, features, is_popular, is_active, "order", cta_label, created_at, updated_at) VALUES
('plan_free', 'Gratuit', 0, 'mois', ARRAY['Profil complet', 'Explorer et matching', 'Favoris', 'Accès au Plan 30 jours'], false, true, 1, 'Commencer gratuitement', NOW(), NOW()),
('plan_pro', 'Pro', 5000, 'mois', ARRAY['Tout du plan Gratuit', 'Messages illimités', 'Mise en avant du profil', 'Badge de vérification', 'Outils de collaboration'], true, true, 2, 'Devenir Pro', NOW(), NOW());

INSERT INTO faqs (id, question, answer, is_active, "order", created_at, updated_at) VALUES
('faq_1', 'C''est quoi MojiraX ?', 'MojiraX est la plateforme de référence pour connecter les porteurs de projet avec les cofondateurs et talents en Afrique francophone et dans la diaspora.', true, 1, NOW(), NOW()),
('faq_2', 'L''inscription est-elle gratuite ?', 'Oui, la création de profil et l''exploration des profils sont entièrement gratuites. Le plan Pro offre des fonctionnalités supplémentaires comme les messages illimités et la mise en avant de votre profil.', true, 2, NOW(), NOW()),
('faq_3', 'Comment fonctionne le matching ?', 'Notre algorithme analyse vos compétences, objectifs et disponibilité pour vous proposer des profils compatibles. Plus votre profil est complet, plus les suggestions sont pertinentes.', true, 3, NOW(), NOW()),
('faq_4', 'Quels pays sont couverts ?', 'MojiraX couvre l''Afrique francophone (Cameroun, Sénégal, Côte d''Ivoire, Mali, Bénin...) ainsi que la diaspora (France, Canada, Belgique...).', true, 4, NOW(), NOW()),
('faq_5', 'Comment fonctionne le Plan 30 jours ?', 'Une fois connectés, vous et votre cofondateur recevez une roadmap structurée pour les 30 premiers jours de collaboration afin de poser des bases solides.', true, 5, NOW(), NOW());

INSERT INTO testimonials (id, name, role, location, quote, image_url, is_active, "order", created_at, updated_at) VALUES
('test_1', 'Amara Diallo', 'Porteuse de projet', 'Sénégal', 'J''ai trouvé mon CTO en 2 semaines. Notre projet décolle enfin ! MojiraX a changé la donne pour ma startup.', 'https://images.unsplash.com/photo-1670299745460-50e87692474b?w=400&h=400&fit=crop', true, 1, NOW(), NOW()),
('test_2', 'Kwame Mensah', 'Entrepreneur', 'Ghana', 'MojiraX m''a permis de rejoindre un projet passionnant qui a du sens. La qualité des profils est impressionnante.', 'https://images.unsplash.com/photo-1597528380175-69c9e92b59c7?w=400&h=400&fit=crop', true, 2, NOW(), NOW()),
('test_3', 'Zainab Hassan', 'Cofondatrice', 'Kenya', 'Enfin une plateforme pour connecter avec des projets africains sérieux. J''ai rencontré mon cofondateur ici.', 'https://images.unsplash.com/photo-1628334453476-48b1a4c0529a?w=400&h=400&fit=crop', true, 3, NOW(), NOW());
```

- [ ] **Step 3: Run seed**

```bash
cd api && psql $DATABASE_URL -f prisma/seed.sql
```

- [ ] **Step 4: Commit**

```bash
git add api/prisma/seed.sql
git commit -m "feat(seed): add landing page seed data (pricing, faq, testimonials)"
```

---

### Task 3: Landing API module — controller + service

**Files:**
- Create: `api/src/landing/landing.module.ts`
- Create: `api/src/landing/landing.service.ts`
- Create: `api/src/landing/landing.controller.ts`
- Modify: `api/src/app.module.ts`

- [ ] **Step 1: Create landing.service.ts**

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LandingService {
  private readonly logger = new Logger(LandingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getPlans() {
    return this.prisma.pricingPlan.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      take: 20,
      select: {
        id: true,
        name: true,
        price: true,
        period: true,
        features: true,
        isPopular: true,
        order: true,
        ctaLabel: true,
      },
    });
  }

  async getFaq() {
    return this.prisma.faq.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      take: 20,
      select: {
        id: true,
        question: true,
        answer: true,
      },
    });
  }

  async getTestimonials() {
    return this.prisma.testimonial.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      take: 20,
      select: {
        id: true,
        name: true,
        role: true,
        location: true,
        quote: true,
        imageUrl: true,
      },
    });
  }
}
```

- [ ] **Step 2: Create landing.controller.ts**

```typescript
import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { LandingService } from './landing.service';

@ApiTags('Landing')
@Controller('landing')
export class LandingController {
  constructor(private readonly landingService: LandingService) {}

  @Get('plans')
  getPlans() {
    return this.landingService.getPlans();
  }

  @Get('faq')
  getFaq() {
    return this.landingService.getFaq();
  }

  @Get('testimonials')
  getTestimonials() {
    return this.landingService.getTestimonials();
  }
}
```

- [ ] **Step 3: Create landing.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { LandingController } from './landing.controller';
import { LandingService } from './landing.service';

@Module({
  imports: [PrismaModule],
  controllers: [LandingController],
  providers: [LandingService],
})
export class LandingModule {}
```

- [ ] **Step 4: Register LandingModule in app.module.ts**

Add import at top:
```typescript
import { LandingModule } from './landing/landing.module';
```

Add `LandingModule` to the `imports` array (after `MessagingModule`).

- [ ] **Step 5: Verify API starts**

```bash
cd api && npm run start:dev
```

Test endpoints:
```bash
curl http://localhost:3001/landing/plans
curl http://localhost:3001/landing/faq
curl http://localhost:3001/landing/testimonials
```

Each should return JSON arrays with the seeded data.

- [ ] **Step 6: Commit**

```bash
git add api/src/landing/ api/src/app.module.ts
git commit -m "feat(api): add public landing endpoints (plans, faq, testimonials)"
```

---

## Chunk 2: Frontend — Config + Page routing + Static sections

### Task 4: Next.js config — add Unsplash to image domains

**Files:**
- Modify: `web/next.config.ts`

- [ ] **Step 1: Add images.unsplash.com to remotePatterns**

After the existing `api.dicebear.com` entry, add:

```typescript
{
  protocol: 'https',
  hostname: 'images.unsplash.com',
  pathname: '**',
},
```

- [ ] **Step 2: Commit**

```bash
git add web/next.config.ts
git commit -m "feat(config): add unsplash to next/image remote patterns"
```

---

### Task 5: Update page.tsx — conditional landing/dashboard + SEO metadata

**Files:**
- Modify: `web/src/app/page.tsx`
- Modify: `web/src/app/layout.tsx`

- [ ] **Step 1: Update layout.tsx metadata**

Replace the existing `metadata` export:

```typescript
export const metadata: Metadata = {
  title: "MojiraX | Trouvez votre cofondateur idéal en Afrique",
  description: "Rejoignez la plateforme de référence pour connecter porteurs de projet et cofondateurs en Afrique francophone et dans la diaspora.",
  openGraph: {
    title: "MojiraX | Trouvez votre cofondateur idéal en Afrique",
    description: "Rejoignez la plateforme de référence pour connecter porteurs de projet et cofondateurs en Afrique francophone et dans la diaspora.",
    siteName: "MojiraX",
    locale: "fr_FR",
    type: "website",
  },
};
```

- [ ] **Step 2: Rewrite page.tsx for conditional rendering**

```tsx
'use client';

import { useAuth } from '@/context/auth-context';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { FeedStream } from '@/components/feed/feed-stream';
import { LandingPage } from '@/components/landing/landing-page';

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-kezak-primary" />
      </div>
    );
  }

  if (!user) return <LandingPage />;

  return (
    <DashboardShell>
      <div className="max-w-2xl mx-auto space-y-8 pt-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Découvrez les projets
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            Des fondateurs passionnés cherchent leur binôme.
          </p>
        </header>
        <FeedStream />
      </div>
    </DashboardShell>
  );
}
```

- [ ] **Step 3: Create placeholder landing-page.tsx**

Create `web/src/components/landing/landing-page.tsx`:

```tsx
'use client';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <p className="text-gray-500">Landing page en construction...</p>
    </div>
  );
}
```

- [ ] **Step 4: Verify it works — non-auth shows landing, auth shows dashboard**

```bash
cd web && npm run dev
```

Open http://localhost:3000 in incognito → should see "Landing page en construction..."
Open http://localhost:3000 logged in → should see dashboard feed.

- [ ] **Step 5: Commit**

```bash
git add web/src/app/page.tsx web/src/app/layout.tsx web/src/components/landing/landing-page.tsx
git commit -m "feat(web): conditional landing/dashboard routing on home page"
```

---

### Task 6: Landing header + footer

**Files:**
- Create: `web/src/components/landing/landing-header.tsx`
- Create: `web/src/components/landing/landing-footer.tsx`

- [ ] **Step 1: Create landing-header.tsx**

```tsx
'use client';

import Link from 'next/link';

export function LandingHeader() {
  return (
    <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-9 h-9 bg-kezak-primary rounded-xl flex items-center justify-center">
            <span className="text-white font-black text-lg">M</span>
          </div>
          <span className="font-bold text-xl tracking-tight text-gray-900">
            MojiraX
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="h-10 px-4 rounded-lg border-2 border-gray-200 text-gray-600 font-semibold text-sm flex items-center hover:bg-gray-50 transition-all duration-200"
          >
            Connexion
          </Link>
          <Link
            href="/login"
            className="h-10 px-4 rounded-lg bg-kezak-primary text-white font-semibold text-sm flex items-center hover:bg-kezak-dark transition-all duration-200"
          >
            <span className="hidden sm:inline">Créer mon profil</span>
            <span className="sm:hidden">S&apos;inscrire</span>
          </Link>
        </div>
      </nav>
    </header>
  );
}
```

- [ ] **Step 2: Create landing-footer.tsx**

```tsx
import Link from 'next/link';
import { Facebook, Twitter, Linkedin, Instagram } from 'lucide-react';

export function LandingFooter() {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
        <div className="md:col-span-1">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-kezak-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-black">M</span>
            </div>
            <span className="font-bold text-xl tracking-tight">MojiraX</span>
          </div>
          <p className="text-gray-400 text-sm leading-relaxed">
            Trouvez votre cofondateur idéal en Afrique francophone et dans la
            diaspora.
          </p>
        </div>
        <div>
          <h5 className="font-bold mb-4">Navigation</h5>
          <ul className="space-y-3 text-sm text-gray-400">
            <li>
              <Link href="#" className="hover:text-white transition-colors">
                Profils
              </Link>
            </li>
            <li>
              <Link href="#faq" className="hover:text-white transition-colors">
                FAQ
              </Link>
            </li>
            <li>
              <Link
                href="#pricing"
                className="hover:text-white transition-colors"
              >
                Tarifs
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h5 className="font-bold mb-4">Légal</h5>
          <ul className="space-y-3 text-sm text-gray-400">
            <li>
              <Link href="#" className="hover:text-white transition-colors">
                Mentions légales
              </Link>
            </li>
            <li>
              <Link href="#" className="hover:text-white transition-colors">
                Confidentialité
              </Link>
            </li>
            <li>
              <Link href="#" className="hover:text-white transition-colors">
                CGU
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h5 className="font-bold mb-4">Réseaux sociaux</h5>
          <div className="flex gap-3">
            {[Facebook, Twitter, Linkedin, Instagram].map((Icon, i) => (
              <a
                key={i}
                href="#"
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-gray-400 hover:bg-kezak-primary hover:text-white transition-all"
              >
                <Icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 pt-8 border-t border-gray-800 text-center">
        <p className="text-xs text-gray-500">
          © 2026 MojiraX. Tous droits réservés.
        </p>
      </div>
    </footer>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add web/src/components/landing/landing-header.tsx web/src/components/landing/landing-footer.tsx
git commit -m "feat(landing): add header and footer components"
```

---

### Task 7: Hero section

**Files:**
- Create: `web/src/components/landing/hero-section.tsx`

- [ ] **Step 1: Create hero-section.tsx**

```tsx
import Image from 'next/image';
import Link from 'next/link';
import { Handshake } from 'lucide-react';

export function HeroSection() {
  return (
    <section className="relative pt-28 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
      {/* Blob shapes */}
      <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-[500px] h-[500px] bg-kezak-primary/5 rounded-[42%_58%_70%_30%/45%_45%_55%_55%] animate-[spin_20s_linear_infinite]" />
      <div className="absolute bottom-0 left-0 translate-y-1/4 -translate-x-1/4 w-[400px] h-[400px] bg-kezak-accent/5 rounded-[42%_58%_70%_30%/45%_45%_55%_55%] animate-[spin_20s_linear_infinite_reverse]" />

      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left — Text */}
          <div>
            <span className="inline-block px-4 py-1.5 mb-6 rounded-full bg-kezak-primary/10 text-kezak-primary text-xs font-bold uppercase tracking-wider">
              La plateforme des fondateurs africains
            </span>
            <h1 className="text-4xl lg:text-6xl font-bold mb-6 leading-tight text-gray-900">
              Trouvez votre cofondateur{' '}
              <span className="text-kezak-primary">idéal</span>
            </h1>
            <p className="text-lg text-gray-600 mb-10 max-w-lg leading-relaxed">
              Rejoignez des centaines d&apos;entrepreneurs en Afrique
              francophone et dans la diaspora. MojiraX connecte les porteurs de
              projet avec les talents qui feront décoller leur vision.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/login"
                className="h-[52px] px-6 rounded-lg bg-kezak-primary text-white font-semibold flex items-center justify-center hover:bg-kezak-dark transition-all duration-200 shadow-lg shadow-kezak-primary/20"
              >
                Créer mon profil gratuitement
              </Link>
              <Link
                href="/login"
                className="h-[52px] px-6 rounded-lg border-2 border-gray-200 text-gray-600 font-semibold flex items-center justify-center hover:bg-gray-50 transition-all duration-200"
              >
                Voir les profils
              </Link>
            </div>
          </div>

          {/* Right — Visual card (desktop only) */}
          <div className="relative hidden lg:block">
            <div className="relative z-20 bg-white/70 backdrop-blur-sm border border-white/40 p-8 rounded-[2.5rem] shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                  Match Intelligence
                </span>
              </div>

              <div className="flex items-center justify-around py-8">
                <div className="relative">
                  <div className="absolute inset-0 bg-kezak-primary/20 rounded-full blur-2xl" />
                  <Image
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face"
                    alt="Entrepreneur"
                    width={96}
                    height={96}
                    className="relative w-24 h-24 rounded-3xl object-cover border-4 border-white shadow-xl animate-[float_4s_ease-in-out_infinite]"
                  />
                </div>
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg text-kezak-primary z-10">
                  <Handshake className="w-5 h-5" />
                </div>
                <div className="relative">
                  <div className="absolute inset-0 bg-kezak-accent/20 rounded-full blur-2xl" />
                  <Image
                    src="https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&h=400&fit=crop&crop=face"
                    alt="Cofondatrice"
                    width={96}
                    height={96}
                    className="relative w-24 h-24 rounded-3xl object-cover border-4 border-white shadow-xl animate-[float_4s_ease-in-out_infinite_-2s]"
                  />
                </div>
              </div>

              <div className="bg-gray-50 p-5 rounded-2xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-gray-900">
                    Compatibilité Vision
                  </span>
                  <span className="text-sm font-black text-kezak-primary">
                    98%
                  </span>
                </div>
                <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                  <div className="bg-kezak-primary h-full w-[98%] rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/components/landing/hero-section.tsx
git commit -m "feat(landing): add hero section with split layout and match card"
```

---

### Task 8: For-who section

**Files:**
- Create: `web/src/components/landing/for-who-section.tsx`

- [ ] **Step 1: Create for-who-section.tsx**

```tsx
import { Lightbulb, TrendingUp, Globe } from 'lucide-react';

const personas = [
  {
    icon: Lightbulb,
    title: 'Porteur de projet',
    description:
      'Vous avez une idée et recherchez les compétences pour la réaliser',
    hoverBg: 'hover:bg-kezak-primary',
  },
  {
    icon: TrendingUp,
    title: 'Entrepreneur / Talent',
    description:
      'Vous avez des compétences et recherchez un projet à impact',
    hoverBg: 'hover:bg-kezak-accent',
  },
  {
    icon: Globe,
    title: 'Diaspora',
    description:
      "Vous voulez contribuer au développement de l'Afrique depuis l'étranger",
    hoverBg: 'hover:bg-gray-900',
  },
];

export function ForWhoSection() {
  return (
    <section className="py-20 lg:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            POUR QUI
          </h2>
          <p className="text-lg text-gray-500">
            MojiraX s&apos;adresse à tous les entrepreneurs francophones
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {personas.map((p) => (
            <div
              key={p.title}
              className={`group p-10 rounded-2xl bg-gray-50 ${p.hoverBg} hover:text-white transition-all duration-500 shadow-sm hover:shadow-xl`}
            >
              <div className="w-16 h-16 bg-kezak-primary/10 group-hover:bg-white/20 rounded-2xl flex items-center justify-center mb-8 transition-colors">
                <p.icon className="w-7 h-7 text-kezak-primary group-hover:text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-4">{p.title}</h3>
              <p className="text-gray-500 group-hover:text-white/80 leading-relaxed">
                {p.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/components/landing/for-who-section.tsx
git commit -m "feat(landing): add for-who section with 3 persona cards"
```

---

### Task 9: How-it-works section

**Files:**
- Create: `web/src/components/landing/how-it-works-section.tsx`

- [ ] **Step 1: Create how-it-works-section.tsx**

```tsx
import { UserPlus, Search, MessageCircle, Handshake } from 'lucide-react';

const steps = [
  {
    num: '01',
    icon: UserPlus,
    title: 'Créez votre profil',
    desc: 'Renseignez vos compétences, objectifs et disponibilité',
    bg: 'bg-kezak-primary',
    offset: false,
  },
  {
    num: '02',
    icon: Search,
    title: 'Définissez votre recherche',
    desc: 'Précisez le type de cofondateur ou partenaire idéal',
    bg: 'bg-kezak-accent',
    offset: true,
  },
  {
    num: '03',
    icon: MessageCircle,
    title: 'Matchez & échangez',
    desc: 'Découvrez des profils compatibles et engagez la conversation',
    bg: 'bg-kezak-primary',
    offset: false,
  },
  {
    num: '04',
    icon: Handshake,
    title: 'Planifiez 30 jours',
    desc: 'Structurez votre collaboration avec notre roadmap',
    bg: 'bg-kezak-accent',
    offset: true,
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-20 lg:py-24 bg-gray-900 text-white overflow-hidden relative">
      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            COMMENT ÇA MARCHE
          </h2>
          <p className="text-lg text-gray-400 mb-6">
            4 étapes simples pour trouver votre cofondateur
          </p>
          <div className="w-20 h-1.5 bg-kezak-primary mx-auto rounded-full" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {steps.map((s) => (
            <div
              key={s.num}
              className={`relative group p-8 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all ${s.offset ? 'lg:mt-12' : ''}`}
            >
              <div className="text-8xl font-black text-white/5 absolute -top-6 -left-2 group-hover:text-kezak-primary/20 transition-colors select-none">
                {s.num}
              </div>
              <div
                className={`w-14 h-14 ${s.bg} rounded-xl flex items-center justify-center mb-6 shadow-lg`}
              >
                <s.icon className="w-6 h-6 text-white" />
              </div>
              <h4 className="text-lg font-bold mb-2">{s.title}</h4>
              <p className="text-gray-400 text-sm leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/components/landing/how-it-works-section.tsx
git commit -m "feat(landing): add how-it-works section with 4 steps"
```

---

### Task 10: Why-MojiraX section

**Files:**
- Create: `web/src/components/landing/why-mojirax-section.tsx`

- [ ] **Step 1: Create why-mojirax-section.tsx**

```tsx
import Image from 'next/image';
import Link from 'next/link';
import { Check } from 'lucide-react';

const points = [
  'Correspondance intelligente basée sur vos compétences et objectifs',
  "Profils vérifiés d'entrepreneurs et talents sérieux",
  'Plan 30 jours pour structurer votre collaboration',
];

export function WhyMojiraxSection() {
  return (
    <section className="py-20 lg:py-24 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-20 items-center">
          {/* Images grid — hidden on mobile */}
          <div className="relative hidden lg:block">
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-5">
                <Image
                  src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=1000&fit=crop"
                  alt="Réunion professionnelle"
                  width={400}
                  height={500}
                  className="w-full h-72 object-cover rounded-3xl shadow-xl"
                />
                <Image
                  src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&h=640&fit=crop"
                  alt="Coworking"
                  width={400}
                  height={320}
                  className="w-full h-56 object-cover rounded-3xl shadow-xl translate-x-8"
                />
              </div>
              <div className="space-y-5 pt-10">
                <Image
                  src="https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800&h=640&fit=crop"
                  alt="Équipe startup"
                  width={400}
                  height={320}
                  className="w-full h-56 object-cover rounded-3xl shadow-xl"
                />
                <Image
                  src="https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=1000&fit=crop"
                  alt="Collaboration"
                  width={400}
                  height={500}
                  className="w-full h-72 object-cover rounded-3xl shadow-xl -translate-x-8"
                />
              </div>
            </div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-kezak-accent/5 rounded-[42%_58%_70%_30%/45%_45%_55%_55%] -z-10" />
          </div>

          {/* Text */}
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 leading-tight text-gray-900">
              Arrêtez de chercher.{' '}
              <span className="text-kezak-primary">Commencez à matcher.</span>
            </h2>
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              Nous croyons que les meilleures startups naissent de la rencontre
              des bons talents. Sur MojiraX, des milliers d&apos;entrepreneurs
              au Cameroun, Sénégal, Côte d&apos;Ivoire et dans la diaspora
              collaborent déjà.
            </p>
            <ul className="space-y-4 mb-10">
              {points.map((point) => (
                <li key={point} className="flex items-center gap-4">
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-600 flex-shrink-0">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-semibold text-gray-700">{point}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/login"
              className="inline-flex h-[52px] px-8 rounded-lg bg-kezak-primary text-white font-semibold items-center hover:bg-kezak-dark transition-all duration-200 shadow-lg"
            >
              Commencer maintenant
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/components/landing/why-mojirax-section.tsx
git commit -m "feat(landing): add why-mojirax section with images grid"
```

---

### Task 11: CTA final section

**Files:**
- Create: `web/src/components/landing/cta-section.tsx`

- [ ] **Step 1: Create cta-section.tsx**

```tsx
import Link from 'next/link';

export function CtaSection() {
  return (
    <section className="py-20 lg:py-24 px-4">
      <div className="max-w-6xl mx-auto rounded-[3rem] bg-gradient-to-br from-kezak-primary to-kezak-accent p-12 md:p-20 text-center text-white relative overflow-hidden shadow-2xl">
        <div className="relative z-10 max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
            Prêt à trouver votre cofondateur idéal ?
          </h2>
          <p className="text-lg opacity-80 mb-10">
            Rejoignez des centaines d&apos;entrepreneurs qui ont déjà trouvé
            leur partenaire sur MojiraX
          </p>
          <Link
            href="/login"
            className="inline-flex bg-white text-kezak-primary px-10 py-4 rounded-2xl font-bold text-lg hover:shadow-2xl hover:scale-105 transition-all"
          >
            Créer mon profil gratuitement
          </Link>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/components/landing/cta-section.tsx
git commit -m "feat(landing): add CTA final section"
```

---

## Chunk 3: Frontend — Dynamic sections + Assembly

### Task 12: Testimonials section (dynamic)

**Files:**
- Create: `web/src/components/landing/testimonials-section.tsx`

- [ ] **Step 1: Create testimonials-section.tsx**

```tsx
'use client';

import Image from 'next/image';
import { MapPin } from 'lucide-react';

interface Testimonial {
  id: string;
  name: string;
  role: string;
  location: string;
  quote: string;
  imageUrl: string;
}

interface Props {
  testimonials: Testimonial[];
  loading: boolean;
}

function Skeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto px-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-2xl p-8 animate-pulse">
          <div className="w-20 h-20 rounded-full bg-gray-200 mx-auto mb-6" />
          <div className="h-4 bg-gray-200 rounded mb-3" />
          <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-6" />
          <div className="h-3 bg-gray-200 rounded w-1/2 mx-auto" />
        </div>
      ))}
    </div>
  );
}

export function TestimonialsSection({ testimonials, loading }: Props) {
  if (loading) {
    return (
      <section className="py-20 lg:py-24 bg-gray-50">
        <div className="text-center mb-16 max-w-7xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">TÉMOIGNAGES</h2>
          <p className="text-lg text-gray-500">Ils ont trouvé leur cofondateur sur MojiraX</p>
        </div>
        <Skeleton />
      </section>
    );
  }

  if (testimonials.length === 0) return null;

  return (
    <section className="py-20 lg:py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            TÉMOIGNAGES
          </h2>
          <p className="text-lg text-gray-500">
            Ils ont trouvé leur cofondateur sur MojiraX
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((t) => (
            <div
              key={t.id}
              className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow text-center"
            >
              <div className="relative mb-6 inline-block">
                <div className="w-20 h-20 rounded-full p-1 bg-gradient-to-br from-kezak-primary to-kezak-accent">
                  <Image
                    src={t.imageUrl}
                    alt={t.name}
                    width={80}
                    height={80}
                    className="w-full h-full rounded-full object-cover border-2 border-white"
                  />
                </div>
              </div>
              <p className="text-gray-600 italic mb-6 leading-relaxed">
                &laquo; {t.quote} &raquo;
              </p>
              <h4 className="font-bold text-lg text-gray-900 mb-1">
                {t.name}
              </h4>
              <p className="text-kezak-primary font-medium text-sm mb-2">
                {t.role}
              </p>
              <div className="flex items-center justify-center gap-1 text-xs text-gray-500">
                <MapPin className="w-3 h-3" />
                <span>{t.location}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/components/landing/testimonials-section.tsx
git commit -m "feat(landing): add dynamic testimonials section"
```

---

### Task 13: Pricing section (dynamic)

**Files:**
- Create: `web/src/components/landing/pricing-section.tsx`

- [ ] **Step 1: Create pricing-section.tsx**

```tsx
'use client';

import Link from 'next/link';
import { CircleCheck } from 'lucide-react';

interface PricingPlan {
  id: string;
  name: string;
  price: number;
  period: string;
  features: string[];
  isPopular: boolean;
  ctaLabel: string;
}

interface Props {
  plans: PricingPlan[];
  loading: boolean;
}

function formatPrice(price: number): string {
  return price.toLocaleString('fr-FR');
}

function Skeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
      {[1, 2].map((i) => (
        <div key={i} className="bg-gray-50 rounded-2xl p-10 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
          <div className="h-10 bg-gray-200 rounded w-1/2 mb-8" />
          <div className="space-y-3 mb-8">
            {[1, 2, 3].map((j) => (
              <div key={j} className="h-4 bg-gray-200 rounded w-3/4" />
            ))}
          </div>
          <div className="h-12 bg-gray-200 rounded" />
        </div>
      ))}
    </div>
  );
}

export function PricingSection({ plans, loading }: Props) {
  if (loading) {
    return (
      <section id="pricing" className="py-20 lg:py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">TARIFS</h2>
            <p className="text-lg text-gray-500">Choisissez le plan qui vous convient</p>
          </div>
          <Skeleton />
        </div>
      </section>
    );
  }

  if (plans.length === 0) return null;

  const gridCols =
    plans.length === 1
      ? 'max-w-md mx-auto'
      : plans.length === 2
        ? 'grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto'
        : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto';

  return (
    <section id="pricing" className="py-20 lg:py-24 bg-white">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            TARIFS
          </h2>
          <p className="text-lg text-gray-500">
            Choisissez le plan qui vous convient
          </p>
        </div>
        <div className={`grid gap-8 ${gridCols}`}>
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`p-10 rounded-2xl flex flex-col ${
                plan.isPopular
                  ? 'border-2 border-kezak-primary shadow-xl scale-105 bg-white relative'
                  : 'bg-gray-50 border border-gray-100'
              }`}
            >
              {plan.isPopular && (
                <span className="absolute top-6 right-6 bg-kezak-primary text-white text-[10px] font-black uppercase px-3 py-1 rounded-full">
                  Populaire
                </span>
              )}
              <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
              <div className="text-4xl font-black text-gray-900 mb-8">
                {formatPrice(plan.price)}{' '}
                <span className="text-base text-gray-400 font-normal">
                  FCFA
                </span>
                {plan.price > 0 && (
                  <span className="text-lg text-gray-400 font-medium">
                    /{plan.period}
                  </span>
                )}
              </div>
              <div className="space-y-4 mb-10 flex-grow">
                {plan.features.map((feature) => (
                  <div
                    key={feature}
                    className="flex items-center gap-3 text-gray-600"
                  >
                    <CircleCheck className="w-5 h-5 text-kezak-primary flex-shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
              <Link
                href="/login"
                className={`w-full h-12 rounded-lg font-semibold flex items-center justify-center transition-all duration-200 ${
                  plan.isPopular
                    ? 'bg-kezak-primary text-white hover:bg-kezak-dark'
                    : 'border-2 border-kezak-primary text-kezak-primary hover:bg-kezak-primary/10'
                }`}
              >
                {plan.ctaLabel}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/components/landing/pricing-section.tsx
git commit -m "feat(landing): add dynamic pricing section"
```

---

### Task 14: FAQ section (dynamic)

**Files:**
- Create: `web/src/components/landing/faq-section.tsx`

- [ ] **Step 1: Create faq-section.tsx**

```tsx
'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

interface Props {
  faqs: FaqItem[];
  loading: boolean;
}

function Skeleton() {
  return (
    <div className="max-w-3xl mx-auto space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white rounded-xl p-5 border border-gray-100 animate-pulse">
          <div className="h-5 bg-gray-200 rounded w-3/4" />
        </div>
      ))}
    </div>
  );
}

function FaqAccordionItem({ item }: { item: FaqItem }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left"
      >
        <span className="font-bold text-gray-900 pr-4">{item.question}</span>
        <ChevronDown
          className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-96 pb-5 px-5' : 'max-h-0'}`}
      >
        <p className="text-gray-600 leading-relaxed">{item.answer}</p>
      </div>
    </div>
  );
}

export function FaqSection({ faqs, loading }: Props) {
  if (loading) {
    return (
      <section id="faq" className="py-20 lg:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">FAQ</h2>
            <p className="text-lg text-gray-500">Questions fréquemment posées</p>
          </div>
          <Skeleton />
        </div>
      </section>
    );
  }

  if (faqs.length === 0) return null;

  return (
    <section id="faq" className="py-20 lg:py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            FAQ
          </h2>
          <p className="text-lg text-gray-500">
            Questions fréquemment posées
          </p>
        </div>
        <div className="max-w-3xl mx-auto space-y-3">
          {faqs.map((faq) => (
            <FaqAccordionItem key={faq.id} item={faq} />
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/components/landing/faq-section.tsx
git commit -m "feat(landing): add dynamic FAQ accordion section"
```

---

### Task 15: Assemble landing-page.tsx — orchestrator with data fetching

**Files:**
- Modify: `web/src/components/landing/landing-page.tsx`

- [ ] **Step 1: Rewrite landing-page.tsx as the main orchestrator**

```tsx
'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { LandingHeader } from './landing-header';
import { HeroSection } from './hero-section';
import { ForWhoSection } from './for-who-section';
import { HowItWorksSection } from './how-it-works-section';
import { WhyMojiraxSection } from './why-mojirax-section';
import { TestimonialsSection } from './testimonials-section';
import { PricingSection } from './pricing-section';
import { FaqSection } from './faq-section';
import { CtaSection } from './cta-section';
import { LandingFooter } from './landing-footer';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function LandingPage() {
  const [plans, setPlans] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [plansRes, faqsRes, testimonialsRes] = await Promise.allSettled([
          axios.get(`${API_URL}/landing/plans`),
          axios.get(`${API_URL}/landing/faq`),
          axios.get(`${API_URL}/landing/testimonials`),
        ]);

        if (plansRes.status === 'fulfilled') setPlans(plansRes.value.data);
        if (faqsRes.status === 'fulfilled') setFaqs(faqsRes.value.data);
        if (testimonialsRes.status === 'fulfilled') setTestimonials(testimonialsRes.value.data);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <LandingHeader />
      <main>
        <HeroSection />
        <ForWhoSection />
        <HowItWorksSection />
        <WhyMojiraxSection />
        <TestimonialsSection testimonials={testimonials} loading={loading} />
        <PricingSection plans={plans} loading={loading} />
        <FaqSection faqs={faqs} loading={loading} />
        <CtaSection />
      </main>
      <LandingFooter />
    </div>
  );
}
```

- [ ] **Step 2: Verify the full landing page renders**

```bash
cd web && npm run dev
```

Open http://localhost:3000 in incognito — should see the complete landing page with all sections.
Check: header, hero, pour qui, comment ca marche, why mojirax, testimonials, pricing, FAQ, CTA, footer.
Check mobile view (responsive).

- [ ] **Step 3: Commit**

```bash
git add web/src/components/landing/landing-page.tsx
git commit -m "feat(landing): assemble all sections with dynamic data fetching"
```

---

### Task 16: Add float animation to globals.css

**Files:**
- Modify: `web/src/app/globals.css`

- [ ] **Step 1: Add float keyframe animation**

Append to globals.css before the `body` block:

```css
@keyframes float {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-12px) rotate(1deg); }
}
```

- [ ] **Step 2: Commit**

```bash
git add web/src/app/globals.css
git commit -m "feat(landing): add float keyframe animation"
```

---

### Task 17: Final verification and cleanup

- [ ] **Step 1: Start both API and web**

```bash
cd api && npm run start:dev &
cd web && npm run dev
```

- [ ] **Step 2: Test complete flow**

1. Open http://localhost:3000 in incognito → full landing page
2. Click "Créer mon profil" → redirects to /login
3. Click "Connexion" → redirects to /login
4. Login → dashboard feed appears
5. Test mobile responsive (Chrome DevTools)
6. Verify all 3 dynamic sections load (testimonials, pricing, FAQ)

- [ ] **Step 3: Final commit if any fixups needed**

```bash
git add -A && git commit -m "fix(landing): final adjustments"
```
