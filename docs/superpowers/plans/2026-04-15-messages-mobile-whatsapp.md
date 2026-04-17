# Messages Mobile WhatsApp — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre la page /messages plein écran sur mobile (style WhatsApp), sans marges ni card styling, collée juste sous la barre top.

**Architecture:** Sur mobile (<md), le DashboardShell supprime son padding latéral et top réduit pour la page messages. Le conteneur principal de messages/page.tsx perd ses classes card (rounded, border, shadow) sur mobile. Desktop inchangé.

**Tech Stack:** Next.js 16, Tailwind CSS, React 19

---

### Task 1: DashboardShell — supprimer padding sur mobile pour /messages

**Files:**
- Modify: `web/src/components/layout/dashboard-shell.tsx`

Le DashboardShell ajoute `px-4 sm:px-6 lg:px-8 pt-20 md:pt-24 pb-8` à toutes les pages. Pour /messages sur mobile, on doit supprimer le padding latéral et réduire le padding top pour coller la page sous le header.

- [ ] **Step 1: Ajouter la détection de route messages**

Ajouter `usePathname` et conditionner les classes du conteneur principal :

```tsx
// En haut du fichier, ajouter l'import
import { usePathname } from 'next/navigation';

// Dans le composant, après les useState
const pathname = usePathname();
const isMessagesPage = pathname === '/messages';
```

- [ ] **Step 2: Conditionner le padding du conteneur principal**

Remplacer les classes statiques du div conteneur principal (ligne 34) :

```tsx
<div className={cn(
    "flex-1 max-w-[1600px] w-full mx-auto pb-8",
    isMessagesPage
        ? "px-0 md:px-4 md:sm:px-6 lg:px-8 pt-16 md:pt-24 pb-0 md:pb-8"
        : "px-4 sm:px-6 lg:px-8 pt-20 md:pt-24"
)}>
```

- [ ] **Step 3: Vérifier visuellement**

Run: ouvrir http://localhost:3000/messages sur mobile (DevTools, 375px)
Expected: Le conteneur n'a plus de marge latérale sur mobile, mais les garde sur desktop.

- [ ] **Step 4: Commit**

```bash
git add web/src/components/layout/dashboard-shell.tsx
git commit -m "feat(messages): remove shell padding on mobile for fullscreen messages"
```

---

### Task 2: messages/page.tsx — supprimer card styling sur mobile

**Files:**
- Modify: `web/src/app/(dashboard)/messages/page.tsx`

Le conteneur principal a `rounded-2xl border border-gray-100 shadow-sm`. On les garde uniquement sur md+.

- [ ] **Step 1: Modifier les classes du conteneur principal**

Ligne 149, remplacer :
```tsx
<div className="relative h-[calc(100vh-6rem)] flex bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
```

Par :
```tsx
<div className="relative h-[calc(100vh-4rem)] md:h-[calc(100vh-6rem)] flex bg-white md:rounded-2xl md:border md:border-gray-100 md:shadow-sm overflow-hidden">
```

Changements :
- `h-[calc(100vh-4rem)]` sur mobile (header 64px = 4rem, collé directement)
- `md:h-[calc(100vh-6rem)]` sur desktop (padding supplémentaire)
- `rounded-2xl` → `md:rounded-2xl` (pas de radius sur mobile)
- `border border-gray-100` → `md:border md:border-gray-100`
- `shadow-sm` → `md:shadow-sm`

- [ ] **Step 2: Ajuster les fallback/loading states**

Ligne 26, le Suspense fallback utilise `h-[calc(100vh-5rem)]`. Harmoniser :
```tsx
<div className="flex items-center justify-center h-[calc(100vh-4rem)] md:h-[calc(100vh-5rem)]">
```

Ligne 137, idem pour le loading auth :
```tsx
<div className="flex items-center justify-center h-[calc(100vh-4rem)] md:h-[calc(100vh-5rem)]">
```

- [ ] **Step 3: Vérifier visuellement**

Run: ouvrir http://localhost:3000/messages sur mobile (DevTools, 375px)
Expected: Plus de border-radius, plus de bordure, plus d'ombre — juste du blanc plein écran sous le header. Sur desktop (>768px), le style card reste intact.

- [ ] **Step 4: Commit**

```bash
git add web/src/app/(dashboard)/messages/page.tsx
git commit -m "feat(messages): remove card styling on mobile for WhatsApp-like fullscreen"
```

---

### Task 3: conversation-list.tsx — supprimer le border-right dupliqué sur mobile

**Files:**
- Modify: `web/src/components/messaging/conversation-list.tsx`

La conversation list a `border-r border-gray-100` sur son conteneur racine (ligne 36). Le parent dans messages/page.tsx ajoute aussi `md:border-r md:border-gray-100` (ligne 157). Le border du parent est déjà conditionné à md+, mais celui de conversation-list ne l'est pas.

- [ ] **Step 1: Conditionner le border-right à md+**

Ligne 36, remplacer :
```tsx
<div className="flex flex-col h-full border-r border-gray-100">
```

Par :
```tsx
<div className="flex flex-col h-full md:border-r md:border-gray-100">
```

- [ ] **Step 2: Vérifier visuellement**

Run: ouvrir http://localhost:3000/messages sur mobile
Expected: Pas de bordure droite visible sur mobile. Sur desktop, la bordure séparant liste/chat reste visible.

- [ ] **Step 3: Commit**

```bash
git add web/src/components/messaging/conversation-list.tsx
git commit -m "fix(messages): hide conversation list right border on mobile"
```

---

### Task 4: Test final cross-breakpoints

- [ ] **Step 1: Test mobile (375px)**

Run: DevTools → 375px width sur http://localhost:3000/messages
Expected:
- Liste conversations plein écran, collée sous le header, pas de marges
- Clic sur une conversation → chat slide plein écran
- Bouton retour → retour à la liste
- Pas de border-radius, pas de bordure, pas d'ombre

- [ ] **Step 2: Test tablette (768px)**

Run: DevTools → 768px width
Expected:
- Layout deux colonnes (liste + chat côte à côte)
- Card styling visible (rounded, border, shadow)
- Padding latéral du shell présent

- [ ] **Step 3: Test desktop (1280px)**

Run: DevTools → 1280px width
Expected:
- Layout identique à avant (aucun changement visible)
- Sidebar gauche + messages + (sidebar droite masquée)

- [ ] **Step 4: Commit final si ajustements**

Si des ajustements ont été nécessaires :
```bash
git add -A
git commit -m "fix(messages): fine-tune mobile fullscreen breakpoints"
```
