# MojiraX - Guide de Style UI

## Référence rapide pour garantir la cohérence sur toutes les pages

---

## Couleurs Brand
```
--kezak-brand-dark:    #001f4d   → bg-kezak-dark, text-kezak-dark
--kezak-brand-primary: #0066ff   → bg-kezak-primary, text-kezak-primary
--kezak-brand-light:   #e6f0ff   → bg-kezak-light
--kezak-brand-accent:  #3399ff   → bg-kezak-accent
```

## Typographie (Inter)
| Usage | Classes |
|-------|---------|
| Titre page | `text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight` |
| Titre section | `text-xl font-bold text-gray-900` |
| Sous-titre | `text-lg text-gray-500` |
| Corps | `text-base text-gray-600 leading-relaxed` |
| Label formulaire | `text-sm font-medium text-gray-700` |
| Texte secondaire | `text-sm text-gray-500` |
| Caption/meta | `text-xs font-medium text-gray-500` |

## Composants Clés

### Bouton Primaire
```
bg-kezak-primary text-white hover:bg-kezak-dark
h-[52px] px-4 rounded-lg font-semibold
transition-all duration-200
focus:ring-2 focus:ring-offset-2 focus:ring-kezak-primary
```

### Bouton Secondaire
```
bg-white border-2 border-kezak-light text-kezak-dark
hover:bg-kezak-light/50
h-[52px] px-4 rounded-lg font-semibold
```

### Bouton Wizard (CTA rond)
```
bg-kezak-primary text-white px-8 py-3 rounded-full
font-bold text-lg hover:bg-kezak-primary/90
```

### Input
```
w-full h-[52px] bg-white border border-gray-300 rounded-lg
text-gray-900 text-base pl-4 pr-4
placeholder:text-gray-400
hover:border-gray-400
focus:border-kezak-primary focus:ring-2 focus:ring-kezak-primary/20
transition-all duration-200
```

### Textarea
```
min-h-[120px] bg-white border border-gray-300 rounded-lg
text-gray-900 text-base p-4
placeholder:text-gray-400
hover:border-gray-400
focus:border-kezak-primary focus:ring-2 focus:ring-kezak-primary/20
resize-y
```

### Select
```
h-[52px] bg-white border border-gray-300 rounded-lg
focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary
Dropdown: opacity 0→1, y: 5→0, duration: 0.15s
Option: px-3 py-2.5 rounded-md text-sm
Selected: bg-kezak-primary/10 text-kezak-primary font-medium
Hover: hover:bg-gray-50
```

### Carte (Card)
```
bg-white rounded-2xl border border-gray-100
p-5 ou p-6
shadow-sm hover:shadow-md transition-shadow
```

### Tag/Badge compétence
```
text-sm font-medium px-3 py-1.5 rounded-full
bg-blue-50 text-blue-600 border border-blue-100
```

### Tag meta (info)
```
text-xs font-medium text-gray-500
bg-gray-50 px-2.5 py-1.5 rounded-md border border-gray-100
```

## Layout

### Shell Dashboard
```
min-h-screen bg-gray-50
grid: 1 col (mobile) → [80px_1fr] (md) → [280px_1fr_300px] (lg)
gap-6, max-w-[1600px] mx-auto px-4 lg:px-6
```

### Header
```
fixed top-0 h-16 bg-white/80 backdrop-blur-md
border-b border-gray-100 z-50
```

### Sidebar
```
bg-white rounded-2xl border border-gray-100 shadow-sm
sticky top-24 h-[calc(100vh-8rem)]
Nav item actif: bg-kezak-primary/10 text-kezak-primary font-semibold
Nav item inactif: text-gray-500 hover:bg-gray-50 hover:text-gray-900
```

### Wizard
```
bg-white rounded-2xl shadow-sm border border-gray-100
Progress bar: h-1 bg-gray-50, fill: bg-kezak-primary
Contenu: max-w-3xl mx-auto p-6 sm:p-10
Animation: opacity 0→1, x: 10→0, duration: 0.2
```

## Espacement
- Entre champs formulaire : `space-y-4` ou `space-y-6`
- Padding carte : `p-5` ou `p-6`
- Sections page : `space-y-8`
- Grid formulaire : `grid grid-cols-1 sm:grid-cols-2 gap-6`

## Border Radius
- Inputs/Buttons : `rounded-lg`
- Cartes/Modals : `rounded-2xl`
- Avatars/Badges : `rounded-full`
- Options dropdown : `rounded-md`

## Ombres
- Carte par défaut : `shadow-sm`
- Carte hover : `shadow-md`
- Modal : `shadow-2xl`
- Bouton coloré : `shadow-lg shadow-blue-500/20`

## Animations
- Transition standard : `transition-all duration-200`
- Framer Motion dropdown : `{ opacity: 0, y: 5 } → { opacity: 1, y: 0 }` (0.15s)
- Framer Motion modal : `{ opacity: 0, scale: 0.95, y: 20 }` → `{ opacity: 1, scale: 1, y: 0 }` (0.2s)
- Framer Motion wizard : `{ opacity: 0, x: 10 }` → `{ opacity: 1, x: 0 }` (0.2s)

## États
- Focus : `focus:outline-none focus:ring-2 focus:ring-kezak-primary/20 focus:border-kezak-primary`
- Disabled : `disabled:opacity-60 disabled:cursor-not-allowed`
- Erreur : `border-red-500` + `text-sm text-red-600 mt-1`
- Loading : `animate-spin border-t-2 border-b-2 border-kezak-primary`

## Template Nouvelle Page
```tsx
export default function NewPage() {
  return (
    <DashboardShell>
      <div className="max-w-2xl mx-auto space-y-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Titre</h1>
          <p className="mt-2 text-lg text-gray-600">Description</p>
        </header>
        {/* Contenu */}
      </div>
    </DashboardShell>
  );
}
```

## Template Nouvelle Carte
```tsx
<div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
  <h3 className="text-lg font-bold text-gray-900 mb-3">Titre</h3>
  <p className="text-gray-600 leading-relaxed">Contenu</p>
</div>
```

## Template Section Formulaire
```tsx
<div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-100 shadow-sm">
  <h2 className="text-xl font-bold text-gray-900 mb-6">Titre</h2>
  <form className="space-y-6">
    <Input label="Champ" placeholder="Saisir..." />
    <Button fullWidth>Valider</Button>
  </form>
</div>
```

## Z-Index
```
z-50 → Header, modals, drawers
z-20 → Headers internes
z-10 → Overlays, privacy wall
```
