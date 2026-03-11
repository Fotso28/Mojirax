# 04 — Notifications Push + Email

## Résumé

Étendre le système de notifications existant avec des notifications push (Web Push API) et des emails transactionnels pour les événements critiques.

## Contexte

**Ce qui existe :**
- `NotificationsModule` complet (in-app)
- `notify()` appelé par les services (candidature, modération, publication, unlock)
- Dropdown notifications dans le header
- Aucune notification push
- Aucun email transactionnel

## Spécification

### A. Web Push Notifications

**Package :** `web-push`

**Flow :**
1. Frontend demande permission push → obtient un `PushSubscription`
2. `POST /notifications/push/subscribe` sauvegarde l'abonnement en base
3. Quand `notify()` est appelé, en plus de créer la notification en base, envoyer un push
4. Le service worker reçoit le push et affiche la notification native

**Table Prisma :**
```prisma
model PushSubscription {
  id        String   @id @default(cuid())
  userId    String   @map("user_id")
  endpoint  String   @unique
  keys      Json     @db.JsonB  // { p256dh, auth }
  createdAt DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("push_subscriptions")
}
```

**Événements push :**

| Événement | Titre | Message |
|-----------|-------|---------|
| `APPLICATION_RECEIVED` | Nouvelle candidature | "{name} a postulé à {project}" |
| `APPLICATION_ACCEPTED` | Candidature acceptée | "Votre candidature pour {project} a été acceptée" |
| `PROFILE_UNLOCKED` | Profil débloqué | "Quelqu'un a débloqué votre profil" |
| `NEW_MESSAGE` | Nouveau message | "{name} vous a envoyé un message" |

### B. Emails Transactionnels

**Service :** Resend, Brevo, ou Nodemailer + SMTP

**Package :** `@nestjs-modules/mailer` ou `resend`

**Événements email :**

| Événement | Sujet | Quand |
|-----------|-------|-------|
| Bienvenue | "Bienvenue sur CoMatch !" | Première connexion |
| Candidature reçue | "Nouvelle candidature pour {project}" | Candidature reçue |
| Candidature acceptée | "Bonne nouvelle ! Votre candidature est acceptée" | Candidature acceptée |
| Paiement confirmé | "Votre paiement de {amount} XAF est confirmé" | Transaction PAID |
| Profil publié | "Votre profil est maintenant visible" | Après modération IA |

**Templates :** HTML responsive avec le branding CoMatch (couleurs, logo).

### C. Préférences utilisateur

**Table Prisma :**
```prisma
model NotificationPreferences {
  id        String  @id @default(cuid())
  userId    String  @unique @map("user_id")
  pushEnabled  Boolean @default(true) @map("push_enabled")
  emailEnabled Boolean @default(true) @map("email_enabled")

  // Granulaire
  emailApplications Boolean @default(true) @map("email_applications")
  emailMessages     Boolean @default(true) @map("email_messages")
  emailMarketing    Boolean @default(false) @map("email_marketing")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("notification_preferences")
}
```

**Page paramètres :** `/settings/notifications` — toggles pour chaque canal et type.

## Fichiers à créer / modifier

| Fichier | Action |
|---------|--------|
| `api/prisma/schema.prisma` | Ajouter `PushSubscription`, `NotificationPreferences` |
| `api/src/notifications/push.service.ts` | **Créer** |
| `api/src/notifications/email.service.ts` | **Créer** |
| `api/src/notifications/notifications.service.ts` | Étendre `notify()` avec push + email |
| `api/src/notifications/notifications.controller.ts` | Ajouter `POST /notifications/push/subscribe` |
| `web/src/app/(dashboard)/settings/notifications/page.tsx` | **Créer** |
| `web/public/sw-push.js` | **Créer** (service worker push) |

## Tests et validation

- [ ] S'abonner aux push → `PushSubscription` créée en base
- [ ] Recevoir une candidature → notification push affichée sur le device
- [ ] Email envoyé lors d'une candidature acceptée
- [ ] Les préférences utilisateur sont respectées (désactiver email → pas d'email)
- [ ] La page paramètres affiche les toggles et les sauvegarde
- [ ] Désinscription push supprime l'abonnement en base

### Condition de validation finale

> Les utilisateurs reçoivent des notifications push et des emails pour les événements importants. Les préférences sont configurables par l'utilisateur. Les emails sont envoyés avec un template HTML brandé CoMatch.
