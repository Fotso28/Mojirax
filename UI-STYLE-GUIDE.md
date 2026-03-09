# UI Style Guide — MojiraX

> Référence obligatoire avant tout code frontend. Extrait du code existant.

---

## Couleurs

| Token | Hex | Usage |
|-------|-----|-------|
| `kezak-primary` | `#0066ff` | CTA, liens, éléments interactifs |
| `kezak-dark` | `#001f4d` | Titres, texte principal |
| `kezak-light` | `#e6f0ff` | Fonds légers, hover states |
| `kezak-accent` | `#3399ff` | Éléments secondaires interactifs |

**Neutres** : `gray-50` (fond page) → `gray-900` (titres). Corps de texte : `gray-600`. Labels : `gray-700`. Icônes : `gray-400`.

**Statuts** : rouge (`red-500/600`) erreurs/destructif, amber (`amber-50/600`) warnings, vert (`green-50/600`) succès, bleu (`blue-50/600`) info.

---

## Typographie

- **Font** : Inter (fallback Geist Sans)
- **Titres page** : `text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight`
- **Titres section** : `text-lg font-bold text-gray-900`
- **Corps** : `text-sm text-gray-600` ou `text-base text-gray-600`
- **Labels form** : `block text-sm font-medium text-gray-700`
- **Meta/timestamps** : `text-xs text-gray-500`
- **Line clamp** : `line-clamp-2` (cards) ou `line-clamp-4` (descriptions)

---

## Composants

### Boutons

```
Primaire :   h-[52px] px-6 rounded-lg bg-kezak-primary text-white font-semibold hover:bg-kezak-dark
Secondaire : h-[52px] px-6 rounded-lg border-2 border-gray-200 text-gray-600 font-semibold hover:bg-gray-50
Danger :     h-[44px] px-4 rounded-lg border border-red-200 text-red-500 hover:bg-red-50
Icône :      p-2 rounded-full hover:bg-gray-100 text-gray-600
```

Focus : `focus:ring-2 focus:ring-offset-2 focus:ring-kezak-primary`
Disabled : `disabled:opacity-50 cursor-not-allowed`
Transition : `transition-all duration-200`

### Inputs

```
Standard :  h-[52px] px-4 rounded-lg border border-gray-300 text-gray-900
            focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary
Textarea :  min-h-[120px] px-4 py-3 rounded-lg (mêmes styles border/focus)
Erreur :    border-red-500 + <p className="mt-1 text-sm text-red-600">message</p>
```

### Cards

```
bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow
```

### Modals

```
Overlay :    fixed inset-0 z-50 bg-black/50 backdrop-blur-sm
Container :  max-w-md rounded-2xl bg-white shadow-2xl p-6  (petit)
             max-w-5xl rounded-2xl bg-white shadow-2xl     (grand)
Animation :  framer-motion scale 0.95→1, opacity 0→1, y 10→0, duration 0.2
```

### Badges / Tags

```
Statut :  text-xs font-medium px-2.5 py-1 rounded-full bg-[color]-50 text-[color]-600
Tag :     text-xs px-3 py-1 rounded-full border cursor-pointer
          Normal:   border-gray-200 text-gray-600 hover:border-gray-300
          Actif:    border-kezak-primary bg-kezak-light text-kezak-primary
```

### Avatars

```
Petit (header) :  w-9 h-9 rounded-full
Moyen :           w-16 h-16 rounded-full (sm), w-24 h-24 (md), w-32 h-32 (lg)
Ring hover :      ring-2 ring-transparent hover:ring-kezak-primary/20
```

---

## Layout

### Breakpoints

| Breakpoint | Taille | Usage |
|-----------|--------|-------|
| `xs` | 400px | Custom, petits mobiles |
| `sm` | 640px | Mobile large |
| `md` | 768px | Tablette |
| `lg` | 1024px | Desktop |
| `xl` | 1280px | Grand écran |

### Grille Dashboard

```
Mobile :   1 colonne
md :       grid-cols-[80px_1fr]          (nav icônes + contenu)
lg :       grid-cols-[280px_1fr_300px]   (nav + contenu + sidebar)
Container: max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8
Header :   fixed top-0, h-16, z-50, bg-white/80 backdrop-blur-md
Offset :   pt-20 md:pt-24 (contenu sous le header)
```

### Spacing

- **Gap entre éléments** : `gap-2` (compact), `gap-4` (standard), `gap-6` (sections)
- **Padding cards** : `p-5` ou `p-6`
- **Padding pages** : `p-4 sm:p-8`
- **Espacement vertical sections** : `space-y-4` (listes), `space-y-8` (sections)

---

## Icônes

- **Librairie** : Lucide React
- **Tailles** : `w-4 h-4` (inline), `w-5 h-5` (boutons), `w-6 h-6` (navigation)
- **Couleurs** : héritent du parent text-color

---

## Z-Index

| Couche | Valeur | Usage |
|--------|--------|-------|
| Normal | auto | Contenu standard |
| Sticky | `z-10` | Headers internes |
| Overlay | `z-50` | Modals, drawers, dropdowns |

---

## Patterns interactifs

- **Hover cards** : `hover:shadow-md transition-shadow`
- **Nav active** : `bg-kezak-primary/10 text-kezak-primary font-semibold`
- **Loading spinner** : `w-5 h-5 border-2 border-kezak-primary/30 border-t-kezak-primary rounded-full animate-spin`
- **Skeleton** : `bg-gray-200 rounded animate-pulse` (hauteur variable selon le contenu)
- **Toast** : via `useToast()` context — `showToast(message, 'success' | 'error')`
- **Glassmorphism header** : `bg-white/80 backdrop-blur-md border-b border-gray-100`
