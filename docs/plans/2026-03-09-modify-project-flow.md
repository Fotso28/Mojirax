# Modify Project Flow — Plan d'implémentation

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Réutiliser le wizard de création pour l'édition de projet, avec une UX de suppression moderne.

**Architecture:** Le contexte `OnboardingProvider` accepte un mode `edit` avec données initiales et un `projectId`. La route `/modify/project?projectId=xxx` charge les données existantes au lieu du localStorage. L'étape AI Review fait un `PATCH` au lieu d'un `POST` en mode edit.

**Tech Stack:** Next.js 16, React, framer-motion, Lucide React, Axios

---

### Task 1: Étendre OnboardingProvider pour le mode édition

**Files:**
- Modify: `web/src/context/onboarding-context.tsx`

**Changements:**
- Ajouter prop `initialData?: Record<string, any>` et `editProjectId?: string` à `OnboardingProvider`
- Si `initialData` est fourni, l'utiliser au lieu de charger depuis localStorage/serveur
- Exposer `editProjectId` dans le contexte
- Ne PAS sauvegarder le draft serveur en mode edit (pas de PATCH `/users/creating-projet`)

---

### Task 2: Créer la route /modify/project

**Files:**
- Create: `web/src/app/modify/project/page.tsx`

**Comportement:**
- Lit `?projectId=xxx` depuis l'URL
- Appelle `GET /projects/{projectId}` pour charger les données
- Mappe les champs Prisma (camelCase) vers les champs du wizard (snake_case)
- Passe les données comme `initialData` au `OnboardingProvider`
- Réutilise `ProjectWizardContent` tel quel (mêmes composants step)
- Affiche un loader pendant le chargement
- Redirige vers `/my-project` si le projet n'est pas trouvé

---

### Task 3: Adapter AiReviewStep pour le mode édition

**Files:**
- Modify: `web/src/app/create/project/steps/ai-review.tsx`

**Changements:**
- Lire `editProjectId` depuis `useOnboarding()`
- Si `editProjectId` existe : `PATCH /projects/{id}` au lieu de `POST /projects`
- Changer le texte du bouton : "Mettre à jour" au lieu de "Publier le projet"
- Changer le titre : "Mise à jour de votre projet" au lieu de "Revue IA..."
- Après succès : rediriger vers `/my-project` au lieu de `/`
- Toast : "Projet mis à jour avec succès !"

---

### Task 4: Mettre à jour le lien Modifier sur my-project

**Files:**
- Modify: `web/src/app/(dashboard)/my-project/page.tsx`

**Changements:**
- Le bouton "Modifier" pointe vers `/modify/project?projectId={project.id}`
- Le texte est déjà "Modifier" (vérifier)

---

### Task 5: Ajouter bouton Modifier sur la page projet (owner)

**Files:**
- Modify: `web/src/components/project-deck/project-deck.tsx`

**Changements:**
- Dans le footer CTA (ligne ~337), si `dbUser?.id === project.founderId` :
  - Afficher un bouton "Modifier" avec icône Pencil
  - Lien vers `/modify/project?projectId={project.id}`
- Style : bouton secondaire kezak (border kezak-primary, text kezak-dark)

---

### Task 6: Suppression moderne (bottom sheet)

**Files:**
- Create: `web/src/components/ui/delete-bottom-sheet.tsx`
- Modify: `web/src/app/(dashboard)/my-project/page.tsx`

**Comportement du bottom sheet:**
- Slide-up depuis le bas de l'écran (framer-motion)
- Overlay sombre avec backdrop-blur
- Header avec icône Trash2 rouge dans un cercle
- Titre : "Supprimer ce projet"
- Message d'avertissement avec liste des conséquences
- Input de confirmation : taper le nom du projet pour confirmer
- Bouton "Supprimer définitivement" (rouge, disabled tant que le nom n'est pas tapé)
- Bouton "Annuler"
- État loading pendant la suppression

---

### Task 7: Supprimer l'ancienne page d'édition

**Files:**
- Delete: `web/src/app/(dashboard)/my-project/[slug]/edit/page.tsx`

---

### Task 8: Supprimer l'ancien ConfirmDialog

**Files:**
- Delete: `web/src/components/ui/confirm-dialog.tsx`
- Vérifier qu'il n'est utilisé nulle part ailleurs avant suppression
