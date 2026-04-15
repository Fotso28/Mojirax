# Design : Plans tarifaires administrables

> Date : 2026-03-13
> Statut : Validé

## Contexte

MojiraX a besoin de 4 plans tarifaires (Gratuit, Plus, Pro, Elite) affichés sur la landing page, avec gestion complète (CRUD) depuis le panel admin. Les prix sont en EUR (décision utilisateur).

## 1. Base de données

### Modifications du modèle `PricingPlan`

- `price`: `Int` → `Decimal` (pour stocker 4.99, 9.99, etc.)
- Ajout `currency`: `String @default("EUR")`
- Ajout `description`: `String?` (sous-titre du plan)

**Sérialisation Decimal :** Prisma retourne `Decimal` comme objet string-like. Le service doit convertir avec `Number(plan.price)` avant de retourner au client.

### Seed des 4 plans par défaut

| Ordre | Nom     | Prix   | Période | isPopular | Description                                                        |
|-------|---------|--------|---------|-----------|--------------------------------------------------------------------|
| 0     | Gratuit | 0      | mois    | false     | Parfait pour découvrir MoJiraX et commencer à explorer.            |
| 1     | Plus    | 4.99   | mois    | false     | Idéal pour améliorer votre visibilité et augmenter vos chances.    |
| 2     | Pro     | 9.99   | mois    | true      | Le plan le plus choisi pour multiplier les connexions.             |
| 3     | Elite   | 19.99  | mois    | false     | L'expérience MoJiraX la plus complète pour maximiser vos résultats.|

### Features par plan

**Gratuit :**
- Profil complet
- Explorer & matcher
- Ajouter des profils en favoris
- Accès aux fonctionnalités de base
- Découverte de la plateforme pendant 30 jours

**Plus :**
- Tout le plan Gratuit
- Voir qui a consulté votre profil
- Filtres avancés pour trouver des profils plus pertinents
- Retour arrière sur le dernier swipe
- Plus de visibilité dans les résultats

**Pro :**
- Tout le plan Plus
- Voir qui vous a aimé
- Messages illimités
- 5 boosts de visibilité par mois
- Accès prioritaire aux profils les plus actifs
- Statistiques de profil (vues, matchs, activité)
- Badge Pro visible sur votre profil

**Elite :**
- Tout le plan Pro
- Mise en avant prioritaire dans les recherches
- Boosts supplémentaires pour plus de visibilité
- Mode navigation privée (profil invisible)
- Accès anticipé aux nouvelles fonctionnalités
- Support prioritaire
- Badge Elite exclusif

## 2. API — Endpoints admin

Tous protégés par `FirebaseAuthGuard` + `AdminGuard`. Suivre le pattern existant : créer un `PlansAdminController` dédié sous `@Controller('admin')` avec `@UseGuards(FirebaseAuthGuard, AdminGuard)` au niveau classe.

| Méthode | Route                    | Description                          |
|---------|--------------------------|--------------------------------------|
| GET     | `/admin/plans`           | Liste tous les plans (actifs + inactifs), triés par `order` |
| POST    | `/admin/plans`           | Créer un nouveau plan                |
| POST    | `/admin/plans/reorder`   | Réordonner les plans (body: `[{id, order}]`) — **POST** pour éviter le conflit de route avec `:id` |
| PATCH   | `/admin/plans/:id`       | Modifier un plan existant            |
| DELETE  | `/admin/plans/:id`       | Supprimer un plan (hard delete — pas de souscription liée pour l'instant) |

**Important :** La route `/admin/plans/reorder` doit être déclarée **avant** `/admin/plans/:id` dans le controller pour éviter que NestJS interprète "reorder" comme un `:id`.

### DTOs

**CreatePlanDto :**
- `name`: `@IsString() @MaxLength(50)`, required
- `price`: `@IsNumber() @Min(0)`, required
- `period`: `@IsString() @IsOptional()`, default "mois"
- `currency`: `@IsString() @IsOptional()`, default "EUR"
- `description`: `@IsString() @MaxLength(200) @IsOptional()`
- `features`: `@IsArray() @IsString({ each: true })`, required
- `isPopular`: `@IsBoolean() @IsOptional()`, default false
- `isActive`: `@IsBoolean() @IsOptional()`, default true
- `ctaLabel`: `@IsString() @MaxLength(50) @IsOptional()`, default "Commencer"
- `order`: `@IsInt() @Min(0) @IsOptional()`, default 0

**UpdatePlanDto :** `PartialType(CreatePlanDto)`

**ReorderPlansDto :**
- `plans`: `@IsArray() @ArrayMaxSize(20) @ValidateNested({ each: true })` contenant des objets `{ id: @IsString(), order: @IsInt() @Min(0) }` (nested DTO `ReorderPlanItemDto`)
- Si un ID n'existe pas, il est ignoré silencieusement

### Logging admin (AdminLog)

Toute opération CRUD sur les plans (création, modification, suppression) doit créer une entrée `AdminLog` avec l'action et le plan concerné, conformément à CLAUDE.md A09.

## 3. Frontend — Section pricing (landing)

### Adaptations de `pricing-section.tsx`

- Support 4 colonnes : container `max-w-7xl`, grille `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`
- Afficher le prix en EUR : `4,99 €` (format français avec `toLocaleString('fr-FR')`)
- Afficher `/mois` comme période
- Plan `isPopular` → badge "Populaire", border bleue, léger scale
- Plan Gratuit → ctaLabel "Commencer gratuitement"
- Afficher la `description` sous le prix
- Chaque feature affichée avec un check vert
- Skeleton loader : 4 cards au lieu de 2

### Endpoint public `/landing/plans`

Mettre à jour le `select` dans `LandingService.getPlans()` pour inclure `description` et `currency` en plus des champs existants.

## 4. Frontend — Admin (onglet "Tarifs")

### Nouvel onglet dans `/admin`

- Ajout d'un 6ème onglet **"Tarifs"** après "Notifications"
- Vue liste des plans en cards, ordonnées par `order`

### Fonctionnalités

- **Créer** : bouton "+ Nouveau plan" ouvre un modal
- **Modifier** : clic sur une card ou bouton "Modifier" ouvre le modal pré-rempli
- **Supprimer** : bouton avec `ConfirmDialog`
- **Réordonner** : boutons flèche haut/bas sur chaque card
- **Toggle actif/inactif** : switch directement sur la card
- **Badge "Populaire"** : toggle sur la card (un seul plan populaire à la fois)

### Modal création/édition

Champs :
- Nom du plan (input text)
- Prix (input number, step 0.01)
- Période (input text, default "mois")
- Description (textarea)
- Features (liste dynamique : ajout/suppression de lignes)
- Label du bouton CTA (input text)
- Populaire (checkbox)
- Actif (checkbox)

## 5. Décisions techniques

- **Monnaie** : EUR pour les plans tarifaires. Le champ `currency` permet l'évolution future. Les transactions Lygos Pay restent en XAF (scope séparé).
- **Prix** : type `Decimal` Prisma, converti en `number` via `Number(plan.price)` dans le service avant sérialisation JSON
- **Endpoint public** : `/landing/plans` existant, mis à jour pour inclure `description` et `currency` dans le `select`
- **Pas de drag & drop** : boutons flèche haut/bas pour la simplicité
- **Un seul plan populaire** : si on active `isPopular` sur un plan, les autres sont désactivés automatiquement côté API via `prisma.$transaction()`
- **Hard delete** : acceptable car `PricingPlan` n'a pas de FK entrante (pas de souscription utilisateur pour l'instant). L'alternative `isActive: false` sert de soft-hide.
- **AdminLog** : chaque CRUD plan est loggé
