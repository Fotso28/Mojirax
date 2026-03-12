# Emails transactionnels Brevo — Plan d'implementation

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un systeme d'emails transactionnels via Brevo, declenche en parallele des push FCM pour chaque notification, avec templates MJML bilingues (FR/EN).

**Architecture:** EmailService parallele a PushService, injecte dans NotificationsModule. Fire & forget via `.catch()`. Templates MJML compiles par EmailCompilerService. Config admin via EmailConfig singleton Prisma.

**Tech Stack:** NestJS 11, Prisma, `@getbrevo/brevo`, `mjml`, `@nestjs/schedule`, Firebase Auth

**Spec:** `docs/superpowers/specs/2026-03-12-email-brevo-design.md`

---

## Chunk 1 : Fondations (Schema + Dependencies + Constants)

### Task 1 : Installer les dependances

**Files:**
- Modify: `api/package.json`

- [ ] **Step 1: Installer les packages**

```bash
cd api && npm install @getbrevo/brevo mjml @nestjs/schedule
```

- [ ] **Step 2: Installer les types MJML**

```bash
cd api && npm install -D @types/mjml
```

- [ ] **Step 3: Verifier la compilation**

```bash
cd api && npx tsc --noEmit
```

Expected: aucune erreur

- [ ] **Step 4: Commit**

```bash
git add api/package.json api/package-lock.json
git commit -m "chore: add brevo, mjml, @nestjs/schedule dependencies"
```

---

### Task 2 : Configurer la copie des assets MJML/JSON

**Files:**
- Modify: `api/nest-cli.json`

NestJS ne copie pas automatiquement les fichiers non-TypeScript dans `dist/`. Sans cette config, les templates MJML et fichiers i18n ne seront pas trouves au runtime.

- [ ] **Step 1: Ajouter les assets dans nest-cli.json**

Ajouter dans `compilerOptions` :

```json
{
  "compilerOptions": {
    "assets": [
      { "include": "notifications/email/templates/**/*.mjml", "watchAssets": true },
      { "include": "notifications/email/i18n/**/*.json", "watchAssets": true }
    ]
  }
}
```

Si le fichier a deja des `assets`, fusionner avec les existants.

- [ ] **Step 2: Commit**

```bash
git add api/nest-cli.json
git commit -m "chore: configure asset copying for MJML templates and i18n"
```

---

### Task 3 : Schema Prisma + migration

**Files:**
- Modify: `api/prisma/schema.prisma`

- [ ] **Step 1: Ajouter les 2 nouveaux enum values a NotificationType**

Dans `api/prisma/schema.prisma`, ajouter a l'enum `NotificationType` (apres `PROFILE_UNLOCKED`) :

```prisma
  WELCOME
  ONBOARDING_REMINDER
```

- [ ] **Step 2: Ajouter `preferredLang` au modele User**

Dans le modele `User`, ajouter le champ :

```prisma
  preferredLang  String       @default("fr") @map("preferred_lang")
```

Et ajouter la relation inverse :

```prisma
  emailLogs      EmailLog[]
```

- [ ] **Step 3: Ajouter le modele EmailConfig**

Apres le modele `PushConfig`, ajouter :

```prisma
model EmailConfig {
  id            String   @id @default("singleton")
  enabled       Boolean  @default(true)
  enabledTypes  String[] @default(["SYSTEM", "APPLICATION_RECEIVED", "APPLICATION_ACCEPTED", "APPLICATION_REJECTED", "MODERATION_ALERT", "DOCUMENT_ANALYZED", "DOCUMENT_ANALYSIS_FAILED", "PROFILE_PUBLISHED", "PROFILE_REVIEW", "PROFILE_UNLOCKED", "WELCOME", "ONBOARDING_REMINDER"]) @map("enabled_types")
  fromName      String   @default("MojiraX") @map("from_name")
  fromEmail     String   @default("noreply@mojirax.com") @map("from_email")
  updatedAt     DateTime @updatedAt @map("updated_at")

  @@map("email_configs")
}
```

- [ ] **Step 4: Ajouter le modele EmailLog**

Apres `EmailConfig`, ajouter :

```prisma
model EmailLog {
  id          String           @id @default(cuid())
  userId      String           @map("user_id")
  type        NotificationType
  to          String
  subject     String
  brevoId     String?          @map("brevo_id")
  status      String           @default("SENT")
  error       String?
  createdAt   DateTime         @default(now()) @map("created_at")
  user        User             @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, createdAt])
  @@index([status])
  @@map("email_logs")
}
```

- [ ] **Step 5: Generer et appliquer la migration**

```bash
cd api && npx prisma migrate dev --name add_email_system
```

Expected: migration creee et appliquee sans erreur

- [ ] **Step 6: Verifier la compilation**

```bash
cd api && npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add api/prisma/
git commit -m "feat(prisma): add EmailConfig, EmailLog models and preferredLang field"
```

---

### Task 3 : Constantes email (mappings type → template/actionUrl)

**Files:**
- Create: `api/src/notifications/email/email.constants.ts`

- [ ] **Step 1: Creer le fichier de constantes**

```typescript
import { NotificationType } from '@prisma/client';

/**
 * Mapping NotificationType -> nom du template MJML.
 * MODERATION_ALERT utilise un sous-template base sur data.moderationStatus.
 */
export const EMAIL_TEMPLATE_MAP: Record<NotificationType, string> = {
  SYSTEM: 'system',
  APPLICATION_RECEIVED: 'application-received',
  APPLICATION_ACCEPTED: 'application-accepted',
  APPLICATION_REJECTED: 'application-rejected',
  MODERATION_ALERT: 'moderation-pending', // default, overridden by sub-template logic
  DOCUMENT_ANALYZED: 'document-analyzed',
  DOCUMENT_ANALYSIS_FAILED: 'document-failed',
  PROFILE_PUBLISHED: 'profile-published',
  PROFILE_REVIEW: 'profile-review',
  PROFILE_UNLOCKED: 'profile-unlocked',
  WELCOME: 'welcome',
  ONBOARDING_REMINDER: 'onboarding-reminder',
};

/**
 * Sous-templates pour MODERATION_ALERT bases sur data.moderationStatus.
 */
export const MODERATION_SUB_TEMPLATES: Record<string, string> = {
  published: 'moderation-published',
  rejected: 'moderation-rejected',
  pending: 'moderation-pending',
};

/**
 * Mapping NotificationType -> actionUrl pattern.
 * Les placeholders {projectSlug}, {targetId} sont remplaces par EmailService.
 */
export const EMAIL_ACTION_URL_MAP: Record<NotificationType, string> = {
  WELCOME: '/onboarding/role',
  APPLICATION_RECEIVED: '/my-project/{projectSlug}/applications',
  APPLICATION_ACCEPTED: '/projects/{projectSlug}',
  APPLICATION_REJECTED: '/applications',
  MODERATION_ALERT: '/my-project',
  DOCUMENT_ANALYZED: '/my-project',
  DOCUMENT_ANALYSIS_FAILED: '/my-project',
  PROFILE_PUBLISHED: '/profile',
  PROFILE_REVIEW: '/profile',
  PROFILE_UNLOCKED: '/founders/{targetId}', // default; overridden for project unlocks
  ONBOARDING_REMINDER: '/onboarding/role',
  SYSTEM: '/',
};

/**
 * Resolve le nom d'utilisateur pour les templates.
 */
export function resolveUserName(user: { firstName?: string; name?: string }): string {
  return user.firstName || user.name || 'Utilisateur';
}

/**
 * Resolve le nom du template pour un type donne.
 * Gere la logique sous-template pour MODERATION_ALERT.
 */
export function resolveTemplateName(
  type: NotificationType,
  data?: Record<string, any>,
): string {
  if (type === NotificationType.MODERATION_ALERT && data?.moderationStatus) {
    return MODERATION_SUB_TEMPLATES[data.moderationStatus] || EMAIL_TEMPLATE_MAP[type];
  }
  return EMAIL_TEMPLATE_MAP[type];
}

/**
 * Resolve l'actionUrl pour un type donne en remplacant les placeholders.
 */
export function resolveActionUrl(
  frontendUrl: string,
  type: NotificationType,
  data?: Record<string, any>,
): string {
  let path = EMAIL_ACTION_URL_MAP[type];

  // PROFILE_UNLOCKED: use /projects/ for project unlocks, /founders/ for candidate unlocks
  if (type === 'PROFILE_UNLOCKED' && data?.unlockType === 'project') {
    path = '/projects/{targetId}';
  }

  if (data?.projectSlug) {
    path = path.replace('{projectSlug}', data.projectSlug);
  }
  if (data?.targetId) {
    path = path.replace('{targetId}', data.targetId);
  }

  return `${frontendUrl}${path}`;
}
```

- [ ] **Step 2: Verifier la compilation**

```bash
cd api && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add api/src/notifications/email/
git commit -m "feat(email): add email constants with template/actionUrl mappings"
```

---

### Task 4 : Fichiers i18n (sujets et labels)

**Files:**
- Create: `api/src/notifications/email/i18n/fr.json`
- Create: `api/src/notifications/email/i18n/en.json`

- [ ] **Step 1: Creer fr.json**

```json
{
  "subjects": {
    "welcome": "Bienvenue sur MojiraX !",
    "application-received": "Nouvelle candidature reçue",
    "application-accepted": "Votre candidature a été acceptée !",
    "application-rejected": "Mise à jour de votre candidature",
    "moderation-published": "Votre projet est publié !",
    "moderation-rejected": "Votre projet nécessite des modifications",
    "moderation-pending": "Votre projet est en cours de revue",
    "profile-published": "Votre profil est maintenant visible",
    "profile-review": "Votre profil est en cours de validation",
    "document-analyzed": "Analyse de document terminée",
    "document-failed": "Échec de l'analyse du document",
    "profile-unlocked": "Un profil a été débloqué pour vous",
    "onboarding-reminder": "Complétez votre profil MojiraX",
    "system": "Notification MojiraX"
  },
  "labels": {
    "cta": "Voir sur MojiraX",
    "footer": "Vous recevez cet email car vous êtes inscrit sur MojiraX.",
    "unsubscribe": "Se désinscrire",
    "greeting": "Bonjour {{userName}},",
    "team": "L'équipe MojiraX"
  }
}
```

- [ ] **Step 2: Creer en.json**

```json
{
  "subjects": {
    "welcome": "Welcome to MojiraX!",
    "application-received": "New application received",
    "application-accepted": "Your application has been accepted!",
    "application-rejected": "Update on your application",
    "moderation-published": "Your project is now live!",
    "moderation-rejected": "Your project needs changes",
    "moderation-pending": "Your project is under review",
    "profile-published": "Your profile is now visible",
    "profile-review": "Your profile is under review",
    "document-analyzed": "Document analysis complete",
    "document-failed": "Document analysis failed",
    "profile-unlocked": "A profile has been unlocked for you",
    "onboarding-reminder": "Complete your MojiraX profile",
    "system": "MojiraX Notification"
  },
  "labels": {
    "cta": "View on MojiraX",
    "footer": "You are receiving this email because you are registered on MojiraX.",
    "unsubscribe": "Unsubscribe",
    "greeting": "Hello {{userName}},",
    "team": "The MojiraX Team"
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add api/src/notifications/email/i18n/
git commit -m "feat(email): add FR/EN i18n files for email subjects and labels"
```

---

## Chunk 2 : Templates MJML

### Task 5 : Layout MJML commun

**Files:**
- Create: `api/src/notifications/email/templates/layout.mjml`

- [ ] **Step 1: Creer le layout**

```xml
<mjml>
  <mj-head>
    <mj-attributes>
      <mj-all font-family="'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" />
      <mj-text font-size="15px" line-height="1.6" color="#333333" />
      <mj-button background-color="#0066ff" color="#ffffff" border-radius="8px" font-size="16px" font-weight="600" inner-padding="14px 32px" />
    </mj-attributes>
    <mj-style>
      .footer-link { color: #666666; text-decoration: underline; }
    </mj-style>
  </mj-head>
  <mj-body background-color="#f4f6f9">
    <!-- Header -->
    <mj-section background-color="#001f4d" padding="24px 0">
      <mj-column>
        <mj-text align="center" color="#ffffff" font-size="28px" font-weight="700" letter-spacing="1px">
          MojiraX
        </mj-text>
      </mj-column>
    </mj-section>

    <!-- Content -->
    <mj-section background-color="#ffffff" padding="32px 24px" border-radius="0 0 12px 12px">
      <mj-column>
        {{content}}
      </mj-column>
    </mj-section>

    <!-- Footer -->
    <mj-section padding="24px 0">
      <mj-column>
        <mj-text align="center" font-size="12px" color="#999999" padding="0">
          {{footerText}}
        </mj-text>
        <mj-text align="center" font-size="12px" color="#999999" padding="8px 0 0 0">
          &copy; 2026 MojiraX — Douala, Cameroun
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
```

- [ ] **Step 2: Commit**

```bash
git add api/src/notifications/email/templates/layout.mjml
git commit -m "feat(email): add common MJML layout template"
```

---

### Task 6 : Templates FR (14 fichiers)

**Files:**
- Create: `api/src/notifications/email/templates/fr/welcome.mjml`
- Create: `api/src/notifications/email/templates/fr/application-received.mjml`
- Create: `api/src/notifications/email/templates/fr/application-accepted.mjml`
- Create: `api/src/notifications/email/templates/fr/application-rejected.mjml`
- Create: `api/src/notifications/email/templates/fr/moderation-published.mjml`
- Create: `api/src/notifications/email/templates/fr/moderation-rejected.mjml`
- Create: `api/src/notifications/email/templates/fr/moderation-pending.mjml`
- Create: `api/src/notifications/email/templates/fr/profile-published.mjml`
- Create: `api/src/notifications/email/templates/fr/profile-review.mjml`
- Create: `api/src/notifications/email/templates/fr/document-analyzed.mjml`
- Create: `api/src/notifications/email/templates/fr/document-failed.mjml`
- Create: `api/src/notifications/email/templates/fr/profile-unlocked.mjml`
- Create: `api/src/notifications/email/templates/fr/onboarding-reminder.mjml`
- Create: `api/src/notifications/email/templates/fr/system.mjml`

Chaque template est un fragment MJML (pas un document complet) qui sera injecte dans `{{content}}` du layout.

- [ ] **Step 1: welcome.mjml**

```xml
<mj-text font-size="16px" padding="0 0 16px 0">
  Bonjour {{userName}},
</mj-text>
<mj-text padding="0 0 16px 0">
  Bienvenue sur <strong>MojiraX</strong>, la plateforme qui connecte les fondateurs et co-fondateurs en Afrique.
</mj-text>
<mj-text padding="0 0 24px 0">
  Commencez par compléter votre profil pour découvrir des projets et talents qui correspondent à vos ambitions.
</mj-text>
<mj-button href="{{actionUrl}}">
  Compléter mon profil
</mj-button>
```

- [ ] **Step 2: application-received.mjml**

```xml
<mj-text font-size="16px" padding="0 0 16px 0">
  Bonjour {{founderName}},
</mj-text>
<mj-text padding="0 0 16px 0">
  <strong>{{candidateName}}</strong> a postulé pour rejoindre votre projet <strong>{{projectName}}</strong>.
</mj-text>
<mj-text padding="0 0 24px 0">
  Consultez sa candidature et son profil pour prendre votre décision.
</mj-text>
<mj-button href="{{actionUrl}}">
  Voir la candidature
</mj-button>
```

- [ ] **Step 3: application-accepted.mjml**

```xml
<mj-text font-size="16px" padding="0 0 16px 0">
  Bonjour {{candidateName}},
</mj-text>
<mj-text padding="0 0 16px 0">
  Excellente nouvelle ! Votre candidature pour le projet <strong>{{projectName}}</strong> a été <strong style="color: #16a34a;">acceptée</strong>.
</mj-text>
<mj-text padding="0 0 24px 0">
  Rendez-vous sur la page du projet pour commencer la collaboration.
</mj-text>
<mj-button href="{{actionUrl}}">
  Voir le projet
</mj-button>
```

- [ ] **Step 4: application-rejected.mjml**

```xml
<mj-text font-size="16px" padding="0 0 16px 0">
  Bonjour {{candidateName}},
</mj-text>
<mj-text padding="0 0 16px 0">
  Votre candidature pour le projet <strong>{{projectName}}</strong> n'a pas été retenue cette fois-ci.
</mj-text>
<mj-text padding="0 0 24px 0">
  Ne vous découragez pas — de nouveaux projets sont publiés chaque jour. Continuez à explorer les opportunités !
</mj-text>
<mj-button href="{{actionUrl}}">
  Explorer les projets
</mj-button>
```

- [ ] **Step 5: moderation-published.mjml**

```xml
<mj-text font-size="16px" padding="0 0 16px 0">
  Bonjour {{userName}},
</mj-text>
<mj-text padding="0 0 16px 0">
  Votre projet <strong>{{projectName}}</strong> a été approuvé et est maintenant <strong style="color: #16a34a;">publié</strong> sur MojiraX.
</mj-text>
<mj-text padding="0 0 24px 0">
  Les candidats peuvent désormais le découvrir et postuler.
</mj-text>
<mj-button href="{{actionUrl}}">
  Voir mon projet
</mj-button>
```

- [ ] **Step 6: moderation-rejected.mjml**

```xml
<mj-text font-size="16px" padding="0 0 16px 0">
  Bonjour {{userName}},
</mj-text>
<mj-text padding="0 0 16px 0">
  Votre projet <strong>{{projectName}}</strong> n'a pas pu être publié pour la raison suivante :
</mj-text>
<mj-text padding="0 0 16px 0" font-style="italic" color="#dc2626">
  {{reason}}
</mj-text>
<mj-text padding="0 0 24px 0">
  Modifiez votre projet et soumettez-le à nouveau.
</mj-text>
<mj-button href="{{actionUrl}}">
  Modifier mon projet
</mj-button>
```

- [ ] **Step 7: moderation-pending.mjml**

```xml
<mj-text font-size="16px" padding="0 0 16px 0">
  Bonjour {{userName}},
</mj-text>
<mj-text padding="0 0 16px 0">
  Votre projet <strong>{{projectName}}</strong> est en cours de revue par notre équipe.
</mj-text>
<mj-text padding="0 0 24px 0">
  Vous recevrez une notification dès que la modération sera terminée. Cela prend généralement moins de 24 heures.
</mj-text>
<mj-button href="{{actionUrl}}">
  Voir mon projet
</mj-button>
```

- [ ] **Step 8: profile-published.mjml**

```xml
<mj-text font-size="16px" padding="0 0 16px 0">
  Bonjour {{userName}},
</mj-text>
<mj-text padding="0 0 16px 0">
  Votre profil candidat est maintenant <strong style="color: #16a34a;">visible</strong> sur MojiraX.
</mj-text>
<mj-text padding="0 0 24px 0">
  Les fondateurs peuvent vous découvrir et vous contacter pour leurs projets.
</mj-text>
<mj-button href="{{actionUrl}}">
  Voir mon profil
</mj-button>
```

- [ ] **Step 9: profile-review.mjml**

```xml
<mj-text font-size="16px" padding="0 0 16px 0">
  Bonjour {{userName}},
</mj-text>
<mj-text padding="0 0 16px 0">
  Votre profil candidat est en cours de validation par notre équipe.
</mj-text>
<mj-text padding="0 0 24px 0">
  Vous serez notifié dès qu'il sera publié.
</mj-text>
<mj-button href="{{actionUrl}}">
  Voir mon profil
</mj-button>
```

- [ ] **Step 10: document-analyzed.mjml**

```xml
<mj-text font-size="16px" padding="0 0 16px 0">
  Bonjour {{userName}},
</mj-text>
<mj-text padding="0 0 16px 0">
  L'analyse du document pour votre projet <strong>{{projectName}}</strong> est terminée.
</mj-text>
<mj-text padding="0 0 24px 0">
  Consultez les résultats sur votre espace projet.
</mj-text>
<mj-button href="{{actionUrl}}">
  Voir les résultats
</mj-button>
```

- [ ] **Step 11: document-failed.mjml**

```xml
<mj-text font-size="16px" padding="0 0 16px 0">
  Bonjour {{userName}},
</mj-text>
<mj-text padding="0 0 16px 0">
  L'analyse du document pour votre projet <strong>{{projectName}}</strong> a échoué :
</mj-text>
<mj-text padding="0 0 16px 0" font-style="italic" color="#dc2626">
  {{reason}}
</mj-text>
<mj-text padding="0 0 24px 0">
  Vous pouvez soumettre un nouveau document.
</mj-text>
<mj-button href="{{actionUrl}}">
  Mon projet
</mj-button>
```

- [ ] **Step 12: profile-unlocked.mjml**

```xml
<mj-text font-size="16px" padding="0 0 16px 0">
  Bonjour {{userName}},
</mj-text>
<mj-text padding="0 0 16px 0">
  Le profil de <strong>{{targetName}}</strong> a été débloqué pour vous.
</mj-text>
<mj-text padding="0 0 24px 0">
  Vous pouvez maintenant consulter ses informations complètes.
</mj-text>
<mj-button href="{{actionUrl}}">
  Voir le profil
</mj-button>
```

- [ ] **Step 13: onboarding-reminder.mjml**

```xml
<mj-text font-size="16px" padding="0 0 16px 0">
  Bonjour {{userName}},
</mj-text>
<mj-text padding="0 0 16px 0">
  Vous avez créé votre compte MojiraX mais n'avez pas encore complété votre profil.
</mj-text>
<mj-text padding="0 0 24px 0">
  Remplissez votre profil en quelques minutes pour commencer à trouver votre co-fondateur idéal.
</mj-text>
<mj-button href="{{actionUrl}}">
  Compléter mon profil
</mj-button>
```

- [ ] **Step 14: system.mjml**

```xml
<mj-text font-size="16px" padding="0 0 16px 0">
  Bonjour {{userName}},
</mj-text>
<mj-text padding="0 0 24px 0">
  {{message}}
</mj-text>
<mj-button href="{{actionUrl}}">
  Ouvrir MojiraX
</mj-button>
```

- [ ] **Step 15: Commit**

```bash
git add api/src/notifications/email/templates/fr/
git commit -m "feat(email): add 14 MJML templates (FR)"
```

---

### Task 7 : Templates EN (14 fichiers)

**Files:**
- Create: `api/src/notifications/email/templates/en/*.mjml` (14 fichiers)

Meme structure que les templates FR, traduits en anglais.

- [ ] **Step 1: welcome.mjml**

```xml
<mj-text font-size="16px" padding="0 0 16px 0">
  Hello {{userName}},
</mj-text>
<mj-text padding="0 0 16px 0">
  Welcome to <strong>MojiraX</strong>, the platform connecting founders and co-founders across Africa.
</mj-text>
<mj-text padding="0 0 24px 0">
  Start by completing your profile to discover projects and talents that match your ambitions.
</mj-text>
<mj-button href="{{actionUrl}}">
  Complete my profile
</mj-button>
```

- [ ] **Step 2: application-received.mjml**

```xml
<mj-text font-size="16px" padding="0 0 16px 0">
  Hello {{founderName}},
</mj-text>
<mj-text padding="0 0 16px 0">
  <strong>{{candidateName}}</strong> has applied to join your project <strong>{{projectName}}</strong>.
</mj-text>
<mj-text padding="0 0 24px 0">
  Review their application and profile to make your decision.
</mj-text>
<mj-button href="{{actionUrl}}">
  View application
</mj-button>
```

- [ ] **Step 3: application-accepted.mjml**

```xml
<mj-text font-size="16px" padding="0 0 16px 0">
  Hello {{candidateName}},
</mj-text>
<mj-text padding="0 0 16px 0">
  Great news! Your application for the project <strong>{{projectName}}</strong> has been <strong style="color: #16a34a;">accepted</strong>.
</mj-text>
<mj-text padding="0 0 24px 0">
  Head to the project page to start collaborating.
</mj-text>
<mj-button href="{{actionUrl}}">
  View project
</mj-button>
```

- [ ] **Step 4: application-rejected.mjml**

```xml
<mj-text font-size="16px" padding="0 0 16px 0">
  Hello {{candidateName}},
</mj-text>
<mj-text padding="0 0 16px 0">
  Your application for the project <strong>{{projectName}}</strong> was not selected this time.
</mj-text>
<mj-text padding="0 0 24px 0">
  Don't give up — new projects are published every day. Keep exploring opportunities!
</mj-text>
<mj-button href="{{actionUrl}}">
  Explore projects
</mj-button>
```

- [ ] **Step 5: moderation-published.mjml**

```xml
<mj-text font-size="16px" padding="0 0 16px 0">
  Hello {{userName}},
</mj-text>
<mj-text padding="0 0 16px 0">
  Your project <strong>{{projectName}}</strong> has been approved and is now <strong style="color: #16a34a;">live</strong> on MojiraX.
</mj-text>
<mj-text padding="0 0 24px 0">
  Candidates can now discover your project and apply.
</mj-text>
<mj-button href="{{actionUrl}}">
  View my project
</mj-button>
```

- [ ] **Step 6: moderation-rejected.mjml**

```xml
<mj-text font-size="16px" padding="0 0 16px 0">
  Hello {{userName}},
</mj-text>
<mj-text padding="0 0 16px 0">
  Your project <strong>{{projectName}}</strong> could not be published for the following reason:
</mj-text>
<mj-text padding="0 0 16px 0" font-style="italic" color="#dc2626">
  {{reason}}
</mj-text>
<mj-text padding="0 0 24px 0">
  Please update your project and resubmit.
</mj-text>
<mj-button href="{{actionUrl}}">
  Edit my project
</mj-button>
```

- [ ] **Step 7: moderation-pending.mjml**

```xml
<mj-text font-size="16px" padding="0 0 16px 0">
  Hello {{userName}},
</mj-text>
<mj-text padding="0 0 16px 0">
  Your project <strong>{{projectName}}</strong> is currently under review by our team.
</mj-text>
<mj-text padding="0 0 24px 0">
  You will be notified once the review is complete. This usually takes less than 24 hours.
</mj-text>
<mj-button href="{{actionUrl}}">
  View my project
</mj-button>
```

- [ ] **Step 8: profile-published.mjml**

```xml
<mj-text font-size="16px" padding="0 0 16px 0">
  Hello {{userName}},
</mj-text>
<mj-text padding="0 0 16px 0">
  Your candidate profile is now <strong style="color: #16a34a;">visible</strong> on MojiraX.
</mj-text>
<mj-text padding="0 0 24px 0">
  Founders can now discover you and reach out for their projects.
</mj-text>
<mj-button href="{{actionUrl}}">
  View my profile
</mj-button>
```

- [ ] **Step 9: profile-review.mjml**

```xml
<mj-text font-size="16px" padding="0 0 16px 0">
  Hello {{userName}},
</mj-text>
<mj-text padding="0 0 16px 0">
  Your candidate profile is currently under review.
</mj-text>
<mj-text padding="0 0 24px 0">
  You will be notified once it's published.
</mj-text>
<mj-button href="{{actionUrl}}">
  View my profile
</mj-button>
```

- [ ] **Step 10: document-analyzed.mjml**

```xml
<mj-text font-size="16px" padding="0 0 16px 0">
  Hello {{userName}},
</mj-text>
<mj-text padding="0 0 16px 0">
  The document analysis for your project <strong>{{projectName}}</strong> is complete.
</mj-text>
<mj-text padding="0 0 24px 0">
  Check the results on your project dashboard.
</mj-text>
<mj-button href="{{actionUrl}}">
  View results
</mj-button>
```

- [ ] **Step 11: document-failed.mjml**

```xml
<mj-text font-size="16px" padding="0 0 16px 0">
  Hello {{userName}},
</mj-text>
<mj-text padding="0 0 16px 0">
  The document analysis for your project <strong>{{projectName}}</strong> failed:
</mj-text>
<mj-text padding="0 0 16px 0" font-style="italic" color="#dc2626">
  {{reason}}
</mj-text>
<mj-text padding="0 0 24px 0">
  You can submit a new document.
</mj-text>
<mj-button href="{{actionUrl}}">
  My project
</mj-button>
```

- [ ] **Step 12: profile-unlocked.mjml**

```xml
<mj-text font-size="16px" padding="0 0 16px 0">
  Hello {{userName}},
</mj-text>
<mj-text padding="0 0 16px 0">
  The profile of <strong>{{targetName}}</strong> has been unlocked for you.
</mj-text>
<mj-text padding="0 0 24px 0">
  You can now view their full information.
</mj-text>
<mj-button href="{{actionUrl}}">
  View profile
</mj-button>
```

- [ ] **Step 13: onboarding-reminder.mjml**

```xml
<mj-text font-size="16px" padding="0 0 16px 0">
  Hello {{userName}},
</mj-text>
<mj-text padding="0 0 16px 0">
  You created your MojiraX account but haven't completed your profile yet.
</mj-text>
<mj-text padding="0 0 24px 0">
  Fill out your profile in just a few minutes to start finding your ideal co-founder.
</mj-text>
<mj-button href="{{actionUrl}}">
  Complete my profile
</mj-button>
```

- [ ] **Step 14: system.mjml**

```xml
<mj-text font-size="16px" padding="0 0 16px 0">
  Hello {{userName}},
</mj-text>
<mj-text padding="0 0 24px 0">
  {{message}}
</mj-text>
<mj-button href="{{actionUrl}}">
  Open MojiraX
</mj-button>
```

- [ ] **Step 15: Commit**

```bash
git add api/src/notifications/email/templates/en/
git commit -m "feat(email): add 14 MJML templates (EN)"
```

---

## Chunk 3 : Services (EmailCompiler + EmailService)

### Task 8 : EmailCompilerService

**Files:**
- Create: `api/src/notifications/email/email-compiler.service.ts`

- [ ] **Step 1: Creer EmailCompilerService**

```typescript
import { Injectable, Logger } from '@nestjs/common';
import * as mjml2html from 'mjml';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class EmailCompilerService {
  private readonly logger = new Logger(EmailCompilerService.name);
  private layoutCache: string | null = null;
  private readonly i18nCache = new Map<string, any>();
  private readonly templateDir = path.join(__dirname, 'templates');
  private readonly i18nDir = path.join(__dirname, 'i18n');

  /**
   * Compile un template MJML en HTML responsive.
   * 1. Charge le layout commun (cache en memoire)
   * 2. Charge le template specifique par langue
   * 3. Injecte le template dans le layout
   * 4. Remplace les variables {{varName}}
   * 5. Compile MJML -> HTML
   */
  compile(
    templateName: string,
    lang: string,
    variables: Record<string, string>,
  ): string | null {
    try {
      const layout = this.getLayout();
      const templateContent = this.getTemplate(templateName, lang);

      if (!templateContent) {
        this.logger.warn(`Template not found: ${lang}/${templateName}.mjml`);
        return null;
      }

      // Load i18n labels
      const labels = this.getLabels(lang);

      // Inject template into layout
      let mjmlContent = layout.replace('{{content}}', templateContent);
      mjmlContent = mjmlContent.replace('{{footerText}}', labels.footer || '');

      // Replace all variables
      for (const [key, value] of Object.entries(variables)) {
        mjmlContent = mjmlContent.replace(
          new RegExp(`{{${key}}}`, 'g'),
          value || '',
        );
      }

      // Replace any remaining label variables
      for (const [key, value] of Object.entries(labels)) {
        mjmlContent = mjmlContent.replace(
          new RegExp(`{{${key}}}`, 'g'),
          value || '',
        );
      }

      // Compile MJML to HTML
      const result = mjml2html(mjmlContent, {
        validationLevel: 'soft',
        minify: true,
      });

      if (result.errors?.length) {
        this.logger.warn(`MJML warnings for ${templateName}:`, result.errors);
      }

      return result.html;
    } catch (error) {
      this.logger.error(`Failed to compile template ${templateName}:`, error);
      return null;
    }
  }

  /**
   * Recupere le sujet d'email pour un template et une langue donnee.
   */
  getSubject(templateName: string, lang: string): string {
    const i18nData = this.getI18nData(lang);
    return i18nData?.subjects?.[templateName] || 'MojiraX Notification';
  }

  private getLayout(): string {
    if (!this.layoutCache) {
      const layoutPath = path.join(this.templateDir, 'layout.mjml');
      this.layoutCache = fs.readFileSync(layoutPath, 'utf-8');
    }
    return this.layoutCache;
  }

  private getTemplate(templateName: string, lang: string): string | null {
    try {
      const templatePath = path.join(
        this.templateDir,
        lang,
        `${templateName}.mjml`,
      );
      return fs.readFileSync(templatePath, 'utf-8');
    } catch {
      return null;
    }
  }

  private getI18nData(lang: string): any {
    if (this.i18nCache.has(lang)) {
      return this.i18nCache.get(lang);
    }
    try {
      const i18nPath = path.join(this.i18nDir, `${lang}.json`);
      const data = JSON.parse(fs.readFileSync(i18nPath, 'utf-8'));
      this.i18nCache.set(lang, data);
      return data;
    } catch {
      return {};
    }
  }

  private getLabels(lang: string): Record<string, string> {
    const data = this.getI18nData(lang);
    return data?.labels || {};
  }
}
```

- [ ] **Step 2: Verifier la compilation**

```bash
cd api && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add api/src/notifications/email/email-compiler.service.ts
git commit -m "feat(email): add EmailCompilerService for MJML compilation"
```

---

### Task 9 : EmailService (integration Brevo)

**Files:**
- Create: `api/src/notifications/email/email.service.ts`

- [ ] **Step 1: Creer EmailService**

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationType } from '@prisma/client';
import { Cron } from '@nestjs/schedule';
import * as brevo from '@getbrevo/brevo';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailCompilerService } from './email-compiler.service';
import {
  resolveUserName,
  resolveTemplateName,
  resolveActionUrl,
} from './email.constants';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly apiInstance: brevo.TransactionalEmailsApi;
  private readonly frontendUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly compiler: EmailCompilerService,
  ) {
    this.apiInstance = new brevo.TransactionalEmailsApi();
    const apiKey = this.configService.get<string>('BREVO_API_KEY');
    if (apiKey) {
      this.apiInstance.setApiKey(
        brevo.TransactionalEmailsApiApiKeys.apiKey,
        apiKey,
      );
    } else {
      this.logger.warn('BREVO_API_KEY not set — emails will be skipped');
    }
    this.frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
  }

  /**
   * Envoie un email pour une notification.
   * Appele depuis NotificationsService.notify() en fire & forget.
   */
  async sendEmail(
    userId: string,
    type: NotificationType,
    data?: Record<string, any>,
  ): Promise<void> {
    try {
      // 1. Check config
      const config = await this.getConfig();
      if (!config.enabled || !config.enabledTypes.includes(type)) {
        return;
      }

      // 2. Fetch user
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          name: true,
          preferredLang: true,
        },
      });
      if (!user?.email) return;

      const lang = user.preferredLang || 'fr';
      const userName = resolveUserName(user);

      // 3. Resolve template
      const templateName = resolveTemplateName(type, data);
      const actionUrl = resolveActionUrl(this.frontendUrl, type, data);

      // 4. Build variables
      const variables: Record<string, string> = {
        userName,
        actionUrl,
        ...(data?.candidateName && { candidateName: data.candidateName }),
        ...(data?.founderName && { founderName: data.founderName }),
        ...(data?.projectName && { projectName: data.projectName }),
        ...(data?.targetName && { targetName: data.targetName }),
        ...(data?.reason && { reason: data.reason }),
        ...(data?.message && { message: data.message }),
      };

      // 5. Compile template
      const htmlContent = this.compiler.compile(templateName, lang, variables);
      if (!htmlContent) return;

      // 6. Get subject
      const subject = this.compiler.getSubject(templateName, lang);

      // 7. Send via Brevo
      const apiKey = this.configService.get<string>('BREVO_API_KEY');
      if (!apiKey) {
        this.logger.warn('BREVO_API_KEY not set — skipping email');
        return;
      }

      const response = await this.apiInstance.sendTransacEmail({
        sender: { name: config.fromName, email: config.fromEmail },
        to: [{ email: user.email, name: userName }],
        replyTo: { email: config.fromEmail, name: config.fromName },
        subject,
        htmlContent,
        tags: [type],
      });

      // 8. Log success
      await this.prisma.emailLog.create({
        data: {
          userId: user.id,
          type,
          to: user.email,
          subject,
          brevoId: response?.body?.messageId || null,
          status: 'SENT',
        },
      });

      this.logger.log(`Email sent: ${type} to ${user.id}`);
    } catch (error) {
      this.logger.error(`Email failed: ${type} to ${userId}`, error);

      // Log failure
      await this.prisma.emailLog
        .create({
          data: {
            userId,
            type,
            to: 'unknown',
            subject: 'unknown',
            status: 'FAILED',
            error: error instanceof Error ? error.message : String(error),
          },
        })
        .catch((e) => this.logger.error('Failed to log email error', e));
    }
  }

  /**
   * Envoie l'email de bienvenue (pas de notification in-app).
   */
  async sendWelcome(userId: string): Promise<void> {
    return this.sendEmail(userId, NotificationType.WELCOME);
  }

  /**
   * Envoie le rappel d'onboarding (cron quotidien a 10h).
   */
  async sendOnboardingReminder(userId: string): Promise<void> {
    return this.sendEmail(userId, NotificationType.ONBOARDING_REMINDER);
  }

  /**
   * Cron: envoie les rappels d'onboarding aux utilisateurs inactifs.
   * Cible: crees il y a 48h+, sans role defini, max 1 rappel par user.
   * Traitement par batch de 50.
   * Note: ne cree PAS de notification in-app ici pour eviter la dependance
   * circulaire EmailService <-> NotificationsService. L'email est envoye
   * directement. L'integration dans notify() gere les notifs in-app + email
   * pour les autres types.
   */
  @Cron('0 10 * * *')
  async handleOnboardingReminders(): Promise<void> {
    this.logger.log('Running onboarding reminder cron...');

    try {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      // Users crees il y a 48h+ sans role defini et sans rappel envoye
      const users = await this.prisma.user.findMany({
        where: {
          createdAt: { lte: twoDaysAgo },
          role: 'USER', // pas encore choisi fondateur/candidat
          emailLogs: {
            none: { type: NotificationType.ONBOARDING_REMINDER },
          },
        },
        select: { id: true },
        take: 50,
      });

      this.logger.log(`Found ${users.length} users for onboarding reminder`);

      for (const user of users) {
        // Create in-app notification
        await this.prisma.notification
          .create({
            data: {
              userId: user.id,
              type: NotificationType.ONBOARDING_REMINDER,
              title: 'Complétez votre profil',
              message: 'Remplissez votre profil pour trouver votre co-fondateur idéal.',
            },
          })
          .catch((e) => this.logger.warn(`Onboarding notif failed for ${user.id}`, e));

        // Send email
        await this.sendOnboardingReminder(user.id).catch((e) =>
          this.logger.error(`Onboarding reminder email failed for ${user.id}`, e),
        );
      }
    } catch (error) {
      this.logger.error('Onboarding reminder cron failed', error);
    }
  }

  private async getConfig() {
    let config = await this.prisma.emailConfig.findUnique({
      where: { id: 'singleton' },
    });

    if (!config) {
      config = await this.prisma.emailConfig.create({
        data: { id: 'singleton' },
      });
    }

    return config;
  }
}
```

- [ ] **Step 2: Verifier la compilation**

```bash
cd api && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add api/src/notifications/email/email.service.ts
git commit -m "feat(email): add EmailService with Brevo integration and onboarding cron"
```

---

## Chunk 4 : Integration (Module + notify + Auth + Admin)

### Task 10 : Mettre a jour NotificationsModule

**Files:**
- Modify: `api/src/notifications/notifications.module.ts`

- [ ] **Step 1: Ajouter EmailService et EmailCompilerService au module**

Ajouter les imports et providers :

```typescript
import { EmailService } from './email/email.service';
import { EmailCompilerService } from './email/email-compiler.service';
```

Ajouter `EmailService` et `EmailCompilerService` aux `providers` et `EmailService` aux `exports`.

Le module devrait ressembler a :

```typescript
@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, PushService, EmailService, EmailCompilerService],
  exports: [NotificationsService, PushService, EmailService],
})
export class NotificationsModule {}
```

- [ ] **Step 2: Verifier la compilation**

```bash
cd api && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add api/src/notifications/notifications.module.ts
git commit -m "feat(email): register EmailService in NotificationsModule"
```

---

### Task 11 : Ajouter ScheduleModule a AppModule

**Files:**
- Modify: `api/src/app.module.ts`

- [ ] **Step 1: Importer ScheduleModule.forRoot()**

Ajouter l'import :

```typescript
import { ScheduleModule } from '@nestjs/schedule';
```

Ajouter `ScheduleModule.forRoot()` dans le tableau `imports` du `@Module()`.

- [ ] **Step 2: Verifier la compilation**

```bash
cd api && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add api/src/app.module.ts
git commit -m "feat: add ScheduleModule.forRoot() for cron support"
```

---

### Task 12 : Integrer sendEmail() dans notify()

**Files:**
- Modify: `api/src/notifications/notifications.service.ts`

- [ ] **Step 1: Injecter EmailService dans NotificationsService**

Ajouter l'import et l'injection dans le constructeur :

```typescript
import { EmailService } from './email/email.service';
```

Ajouter au constructeur :

```typescript
constructor(
  private readonly prisma: PrismaService,
  private readonly pushService: PushService,
  private readonly emailService: EmailService,
) {}
```

- [ ] **Step 2: Appeler sendEmail() dans notify()**

Apres l'appel fire & forget de `sendPush()` (ligne ~50), ajouter :

```typescript
// Fire & forget email
this.emailService
  .sendEmail(userId, type, data as Record<string, any>)
  .catch((e) => this.logger.warn('Email failed', e));
```

- [ ] **Step 3: Verifier la compilation**

```bash
cd api && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add api/src/notifications/notifications.service.ts
git commit -m "feat(email): integrate sendEmail into notify() as fire & forget"
```

---

### Task 13 : Enrichir data dans ApplicationsService et UnlockService

**Files:**
- Modify: `api/src/applications/applications.service.ts`
- Modify: `api/src/unlock/unlock.service.ts`

Les appels a `notify()` doivent inclure `projectSlug` et `targetName` dans le `data` pour que les actionUrl des emails soient correctement resolues.

- [ ] **Step 1: Enrichir data dans ApplicationsService**

Dans chaque appel a `this.notificationsService.notify()`, ajouter `projectSlug` au data :

Pour `APPLICATION_RECEIVED` (quand un candidat postule) :
```typescript
// Ajouter projectSlug au data passe a notify()
await this.notificationsService.notify(
  project.founderId,
  NotificationType.APPLICATION_RECEIVED,
  title,
  message,
  { applicationId: application.id, projectId: project.id, projectSlug: project.slug, candidateName: candidateName },
);
```

Pour `APPLICATION_ACCEPTED` et `APPLICATION_REJECTED` :
```typescript
// Ajouter projectSlug au data
{ applicationId: application.id, projectId: project.id, projectSlug: project.slug }
```

- [ ] **Step 2: Enrichir data dans UnlockService**

Dans l'appel a `notify()` pour `PROFILE_UNLOCKED`, ajouter `targetName` et `unlockType` :

```typescript
// Ajouter targetName et unlockType au data
await this.notificationsService.notify(
  userId,
  NotificationType.PROFILE_UNLOCKED,
  title,
  message,
  { targetId, targetName, unlockType }, // unlockType: 'candidate' | 'project'
);
```

- [ ] **Step 3: Verifier la compilation**

```bash
cd api && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add api/src/applications/applications.service.ts api/src/unlock/unlock.service.ts
git commit -m "feat(email): enrich notify() data with projectSlug and targetName"
```

---

### Task 14 : Declencheur WELCOME dans AuthService (syncUser)

**Files:**
- Modify: `api/src/auth/auth.service.ts`

- [ ] **Step 1: Injecter EmailService dans AuthService**

Le module `AuthModule` doit importer `NotificationsModule` (s'il ne le fait pas deja). Ajouter l'injection :

```typescript
import { EmailService } from '../notifications/email/email.service';
```

Ajouter au constructeur :

```typescript
private readonly emailService: EmailService,
```

- [ ] **Step 2: Modifier syncUser() pour detecter les nouveaux utilisateurs**

Dans `syncUser()`, apres la creation d'un nouvel utilisateur (le block `if (!existingUser)`), ajouter l'appel fire & forget :

```typescript
// Send welcome email (fire & forget)
this.emailService.sendWelcome(newUser.id).catch((e) =>
  this.logger.warn('Welcome email failed', e),
);
```

- [ ] **Step 3: Verifier que AuthModule importe NotificationsModule**

Dans `api/src/auth/auth.module.ts`, ajouter si absent :

```typescript
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  // ...
})
```

- [ ] **Step 4: Verifier la compilation**

```bash
cd api && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add api/src/auth/auth.service.ts api/src/auth/auth.module.ts
git commit -m "feat(email): send welcome email on new user registration"
```

---

### Task 15 : Endpoints admin email-config

**Files:**
- Modify: `api/src/admin/admin.service.ts`
- Modify: `api/src/admin/admin.controller.ts`
- Create: `api/src/admin/dto/update-email-config.dto.ts`

- [ ] **Step 1: Creer le DTO UpdateEmailConfigDto**

```typescript
import {
  IsOptional,
  IsBoolean,
  IsArray,
  IsEnum,
  IsString,
  IsEmail,
  MaxLength,
} from 'class-validator';
import { NotificationType } from '@prisma/client';

export class UpdateEmailConfigDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsArray()
  @IsEnum(NotificationType, { each: true })
  enabledTypes?: NotificationType[];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  fromName?: string;

  @IsOptional()
  @IsEmail()
  fromEmail?: string;
}
```

- [ ] **Step 2: Ajouter getEmailConfig() et updateEmailConfig() dans AdminService**

Ajouter les methodes (suivre le pattern de getPushConfig/updatePushConfig) :

```typescript
async getEmailConfig() {
  let config = await this.prisma.emailConfig.findUnique({
    where: { id: 'singleton' },
  });

  if (!config) {
    config = await this.prisma.emailConfig.create({
      data: { id: 'singleton' },
    });
  }

  const emailCount = await this.prisma.emailLog.count({
    where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
  });

  return { ...config, emailsSentLast24h: emailCount };
}

async updateEmailConfig(data: UpdateEmailConfigDto) {
  const config = await this.prisma.emailConfig.upsert({
    where: { id: 'singleton' },
    update: {
      ...(data.enabled !== undefined && { enabled: data.enabled }),
      ...(data.enabledTypes && { enabledTypes: data.enabledTypes }),
      ...(data.fromName && { fromName: data.fromName }),
      ...(data.fromEmail && { fromEmail: data.fromEmail }),
    },
    create: { id: 'singleton' },
  });

  this.logger.log('Email config updated');
  return config;
}
```

- [ ] **Step 3: Ajouter les endpoints dans AdminController**

Ajouter apres les endpoints push-config :

```typescript
import { UpdateEmailConfigDto } from './dto/update-email-config.dto';

@Get('email-config')
@UseGuards(FirebaseAuthGuard, AdminGuard)
getEmailConfig() {
  return this.adminService.getEmailConfig();
}

@Patch('email-config')
@UseGuards(FirebaseAuthGuard, AdminGuard)
updateEmailConfig(@Body() dto: UpdateEmailConfigDto) {
  return this.adminService.updateEmailConfig(dto);
}
```

- [ ] **Step 4: Verifier la compilation**

```bash
cd api && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add api/src/admin/
git commit -m "feat(admin): add GET/PATCH /admin/email-config endpoints"
```

---

### Task 16 : Variables d'environnement + test final

**Files:**
- Modify: `api/.env` (ajouter les variables)

- [ ] **Step 1: Ajouter les variables d'environnement**

Ajouter a `api/.env` :

```env
BREVO_API_KEY=
EMAIL_FROM_NAME=MojiraX
EMAIL_FROM_EMAIL=noreply@mojirax.com
```

> Note: La cle API Brevo sera configuree plus tard. Sans elle, les emails sont silencieusement ignores (le service log un warning).

- [ ] **Step 2: Verifier la compilation complete**

```bash
cd api && npx tsc --noEmit
```

- [ ] **Step 3: Demarrer le serveur et verifier qu'il boot**

```bash
cd api && npm run start:dev
```

Expected: le serveur demarre sans erreur, le cron est enregistre.

- [ ] **Step 4: Tester l'endpoint admin email-config**

```bash
curl http://localhost:3001/admin/email-config -H "Authorization: Bearer <ADMIN_TOKEN>"
```

Expected: 200 avec la config par defaut.

- [ ] **Step 5: Commit final**

```bash
git add api/.env
git commit -m "feat(email): add Brevo env vars and finalize email system"
```

---

## Fichiers crees/modifies — Resume

| Action | Fichier |
|--------|---------|
| Create | `api/src/notifications/email/email.constants.ts` |
| Create | `api/src/notifications/email/email-compiler.service.ts` |
| Create | `api/src/notifications/email/email.service.ts` |
| Create | `api/src/notifications/email/i18n/fr.json` |
| Create | `api/src/notifications/email/i18n/en.json` |
| Create | `api/src/notifications/email/templates/layout.mjml` |
| Create | `api/src/notifications/email/templates/fr/*.mjml` (14 fichiers) |
| Create | `api/src/notifications/email/templates/en/*.mjml` (14 fichiers) |
| Create | `api/src/admin/dto/update-email-config.dto.ts` |
| Create | Migration Prisma |
| Modify | `api/prisma/schema.prisma` |
| Modify | `api/src/app.module.ts` |
| Modify | `api/src/notifications/notifications.module.ts` |
| Modify | `api/src/notifications/notifications.service.ts` |
| Modify | `api/src/auth/auth.service.ts` |
| Modify | `api/src/auth/auth.module.ts` |
| Modify | `api/src/admin/admin.service.ts` |
| Modify | `api/src/admin/admin.controller.ts` |
| Modify | `api/src/applications/applications.service.ts` |
| Modify | `api/src/unlock/unlock.service.ts` |
| Modify | `api/nest-cli.json` |
| Modify | `api/.env` |
