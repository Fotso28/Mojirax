# Design : Emails transactionnels via Brevo

**Date** : 2026-03-12
**Statut** : Approuve
**Auteur** : Claude + Oswald

---

## 1. Objectif

Ajouter un systeme d'emails transactionnels professionnels a MojiraX via Brevo. Chaque evenement de notification existant (14 types) + 2 nouveaux (WELCOME, ONBOARDING_REMINDER) declenche un email en parallele du push FCM. Les emails sont bilingues (FR/EN), bases sur des templates MJML versionnees dans le repo.

## 2. Decisions architecturales

| Decision | Choix | Justification |
|----------|-------|---------------|
| Provider | Brevo (API transactionnelle) | SDK officiel, plan gratuit 300/jour, dashboard tracking |
| Templates | MJML dans le repo | Versionne, testable, independant du provider |
| i18n | FR + EN | Marche Afrique francophone + anglophone |
| Architecture | EmailService parallele a PushService | Suit le pattern existant, minimal |
| Declenchement | Fire & forget dans `notify()` | Ne bloque jamais la notification |
| Config | EmailConfig singleton Prisma | Admin peut activer/desactiver par type |

## 3. Modele de donnees

### 3.1 Modifications au modele User

```prisma
model User {
  // ... champs existants ...
  preferredLang  String  @default("fr") @map("preferred_lang") // "fr" | "en"
}
```

### 3.2 Nouveau modele EmailConfig

```prisma
model EmailConfig {
  id            String   @id @default("singleton")
  enabled       Boolean  @default(true)
  enabledTypes  String[] @map("enabled_types")
  fromName      String   @default("MojiraX") @map("from_name")
  fromEmail     String   @default("noreply@mojirax.com") @map("from_email")
  updatedAt     DateTime @updatedAt @map("updated_at")
  @@map("email_configs")
}
```

### 3.3 Nouveau modele EmailLog

```prisma
model EmailLog {
  id          String           @id @default(cuid())
  userId      String           @map("user_id")
  type        NotificationType
  to          String
  subject     String
  brevoId     String?          @map("brevo_id")
  status      String           @default("SENT") // SENT, FAILED
  error       String?
  createdAt   DateTime         @default(now()) @map("created_at")
  user        User             @relation(fields: [userId], references: [id])
  @@index([userId, createdAt])
  @@index([status])
  @@map("email_logs")
}
```

### 3.4 Nouveaux types de notification

```prisma
enum NotificationType {
  // ... 10 existants ...
  WELCOME
  ONBOARDING_REMINDER
}
```

## 4. Architecture

### 4.1 Flux d'envoi

```
notify(userId, type, title, message, data)
  |-- Create Notification in DB
  |-- sendPush() [PushService] (fire & forget)
  |-- sendEmail() [EmailService] (fire & forget)
       |-- Check EmailConfig.enabled + type in enabledTypes
       |-- Fetch User (email, preferredLang, firstName)
       |-- Build variables from data (resolve names, slugs)
       |-- Build actionUrl from type + data
       |-- Compile template (lang + type -> MJML -> HTML)
       |-- Resolve subject from i18n/{lang}.json
       |-- Call Brevo API (POST /v3/smtp/email)
       |-- Log to EmailLog
```

### 4.2 EmailService

```typescript
class EmailService {
  async sendEmail(userId: string, type: NotificationType, data?: Record<string, any>): Promise<void>
  async sendWelcome(userId: string): Promise<void>
  async sendOnboardingReminder(userId: string): Promise<void>
}
```

- Injecte dans `NotificationsModule`
- Utilise `@getbrevo/brevo` SDK
- Fire & forget avec `.catch()` — ne bloque jamais

### 4.3 EmailCompilerService

```typescript
class EmailCompilerService {
  compile(templateName: string, lang: string, variables: Record<string, string>): string
}
```

- Charge layout.mjml + template specifique par langue
- Remplace les variables `{{varName}}`
- Compile MJML en HTML responsive via package `mjml`
- Cache les layouts compiles en memoire

### 4.4 Integration Brevo

```typescript
const apiInstance = new brevo.TransactionalEmailsApi();
apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, BREVO_API_KEY);

await apiInstance.sendTransacEmail({
  sender: { name: config.fromName, email: config.fromEmail },
  to: [{ email: user.email, name: user.firstName }],
  subject,
  htmlContent,
  tags: [type],
});
```

## 5. Templates

### 5.1 Structure des fichiers

```
api/src/notifications/email/
|-- templates/
|   |-- layout.mjml
|   |-- fr/
|   |   |-- welcome.mjml
|   |   |-- application-received.mjml
|   |   |-- application-accepted.mjml
|   |   |-- application-rejected.mjml
|   |   |-- moderation-published.mjml
|   |   |-- moderation-rejected.mjml
|   |   |-- moderation-pending.mjml
|   |   |-- profile-published.mjml
|   |   |-- profile-review.mjml
|   |   |-- document-analyzed.mjml
|   |   |-- document-failed.mjml
|   |   |-- profile-unlocked.mjml
|   |   |-- onboarding-reminder.mjml
|   |   |-- system.mjml
|   |-- en/
|       |-- (memes 14 fichiers, traduits)
|-- i18n/
|   |-- fr.json
|   |-- en.json
|-- email.service.ts
|-- email-compiler.service.ts
|-- email.constants.ts
```

### 5.2 Layout commun (layout.mjml)

Header avec logo MojiraX + footer avec liens legaux. Utilise les couleurs kezak-primary (#0066ff) et kezak-dark (#001f4d).

### 5.3 Variables par type

| Type | Variables |
|------|-----------|
| WELCOME | userName, actionUrl |
| APPLICATION_RECEIVED | founderName, candidateName, projectName, actionUrl |
| APPLICATION_ACCEPTED | candidateName, projectName, actionUrl |
| APPLICATION_REJECTED | candidateName, projectName, actionUrl |
| MODERATION_ALERT (published) | userName, projectName, actionUrl |
| MODERATION_ALERT (rejected) | userName, projectName, reason, actionUrl |
| MODERATION_ALERT (pending) | userName, projectName, actionUrl |
| PROFILE_PUBLISHED | userName, actionUrl |
| PROFILE_REVIEW | userName, actionUrl |
| DOCUMENT_ANALYZED | userName, projectName, actionUrl |
| DOCUMENT_ANALYSIS_FAILED | userName, projectName, reason, actionUrl |
| PROFILE_UNLOCKED | userName, targetName, actionUrl |
| ONBOARDING_REMINDER | userName, actionUrl |
| SYSTEM | userName, actionUrl |

### 5.4 Mapping actionUrl

| Type | URL |
|------|-----|
| WELCOME | /onboarding/role |
| APPLICATION_RECEIVED | /my-project/{projectSlug}/applications |
| APPLICATION_ACCEPTED | /projects/{projectSlug} |
| APPLICATION_REJECTED | /applications |
| MODERATION_ALERT | /my-project |
| DOCUMENT_ANALYZED | /my-project |
| DOCUMENT_ANALYSIS_FAILED | /my-project |
| PROFILE_PUBLISHED | /profile |
| PROFILE_REVIEW | /profile |
| PROFILE_UNLOCKED (candidate) | /founders/{targetId} |
| PROFILE_UNLOCKED (project) | /projects/{targetId} |
| ONBOARDING_REMINDER | /onboarding/role |
| SYSTEM | / |

## 6. Declencheurs

### 6.1 Evenements existants (14)

Tous les appels `notify()` existants declenchent automatiquement un email en plus du push. Aucune modification de logique metier — l'email est ajoute dans `notify()` lui-meme.

### 6.2 WELCOME (nouveau)

- Declencheur : `AuthService.syncUser()` quand `isNewUser === true`
- Pas de notification in-app — uniquement email
- Appel direct : `this.emailService.sendWelcome(user.id)`

### 6.3 ONBOARDING_REMINDER (nouveau)

- Declencheur : Cron job NestJS (`@Cron('0 10 * * *')`) — tous les jours a 10h
- Cible : Users crees il y a 48h+ sans role defini ou sans projet/profil candidat
- Max 1 reminder par utilisateur (verifie via EmailLog)
- Cree une notification in-app + email

## 7. Admin

### 7.1 Endpoints

| Methode | Path | Guard | Description |
|---------|------|-------|-------------|
| GET | /admin/email-config | AdminGuard | Recuperer la config email |
| PATCH | /admin/email-config | AdminGuard | Activer/desactiver globalement ou par type |

### 7.2 DTO

```typescript
class UpdateEmailConfigDto {
  @IsOptional() @IsBoolean()
  enabled?: boolean;

  @IsOptional() @IsArray() @IsString({ each: true })
  enabledTypes?: string[];

  @IsOptional() @IsString() @MaxLength(100)
  fromName?: string;

  @IsOptional() @IsEmail()
  fromEmail?: string;
}
```

## 8. Gestion des erreurs

| Scenario | Comportement |
|----------|-------------|
| Brevo down / timeout | Catch + log EmailLog (status: FAILED) — ne bloque pas |
| Email invalide | Brevo retourne erreur, loggee dans EmailLog |
| Template manquant | Log warning, skip envoi |
| Rate limit Brevo (300/jour gratuit) | Log warning, skip envoi |
| User sans email | Skip (ne devrait pas arriver — Firebase Auth) |

## 9. Variables d'environnement

```env
BREVO_API_KEY=xkeysib-...
EMAIL_FROM_NAME=MojiraX           # fallback si EmailConfig pas encore init
EMAIL_FROM_EMAIL=noreply@mojirax.com
```

`FRONTEND_URL` existe deja et sera utilise pour construire les actionUrl.

## 10. Dependances

```bash
npm install @getbrevo/brevo mjml @nestjs/schedule
```

- `@getbrevo/brevo` — SDK officiel API transactionnelle
- `mjml` — Compilation MJML vers HTML responsive
- `@nestjs/schedule` — Cron pour ONBOARDING_REMINDER

## 11. Fichiers impactes

### A creer

| Fichier | Role |
|---------|------|
| `api/src/notifications/email/email.service.ts` | Envoi via Brevo |
| `api/src/notifications/email/email-compiler.service.ts` | MJML -> HTML + i18n |
| `api/src/notifications/email/email.constants.ts` | Mapping type -> template, actionUrl |
| `api/src/notifications/email/i18n/fr.json` | Sujets + labels FR |
| `api/src/notifications/email/i18n/en.json` | Sujets + labels EN |
| `api/src/notifications/email/templates/layout.mjml` | Layout commun |
| `api/src/notifications/email/templates/fr/*.mjml` | 14 templates FR |
| `api/src/notifications/email/templates/en/*.mjml` | 14 templates EN |
| Migration Prisma | Ajouter preferredLang, EmailConfig, EmailLog, enum values |

### A modifier

| Fichier | Modification |
|---------|-------------|
| `api/prisma/schema.prisma` | +preferredLang, +EmailConfig, +EmailLog, +2 enum values |
| `api/src/notifications/notifications.module.ts` | +EmailService, +EmailCompilerService, +ScheduleModule |
| `api/src/notifications/notifications.service.ts` | Appeler emailService.sendEmail() dans notify() |
| `api/src/auth/auth.service.ts` | Appeler emailService.sendWelcome() sur nouveau user |
| `api/src/admin/admin.service.ts` | +getEmailConfig(), +updateEmailConfig() |
| `api/src/admin/admin.controller.ts` | +GET/PATCH /admin/email-config |
| `api/src/applications/applications.service.ts` | Enrichir data avec projectSlug |
| `api/src/unlock/unlock.service.ts` | Enrichir data avec targetName |

### Inchange

- Frontend (pas de page preferences email)
- PushService
- Endpoints notifications existants
- Composants UI
