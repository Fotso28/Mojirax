# Hero Section — Images de fond animées en fondu

## Résumé

Ajouter un diaporama d'images de fond plein écran à la hero section de la landing page. Les images montrent des fondateurs/équipes africains au travail et se succèdent avec une animation en fondu (crossfade) toutes les 5 secondes.

## Comportement

- **3-4 images Unsplash** (fondateurs africains : coworking, coding, réunion, brainstorming)
- **Transition crossfade** toutes les ~5 secondes
- Animation CSS : `opacity` 0→1 / 1→0 avec `transition-opacity duration-1000 ease-in-out`
- **Overlay noir semi-transparent** (`bg-black/50` ou `bg-black/60`) par-dessus les images pour lisibilité du texte
- **Texte en blanc** : titre, sous-titre, badge, boutons adaptés au fond sombre
- Les blobs animés actuels sont supprimés (invisibles derrière les photos)
- Le gradient `from-kezak-light/40` est remplacé par l'overlay sombre

## Architecture technique

### Gestion des images
- Images empilées en `absolute inset-0` avec `object-cover` via `next/image` (`fill` prop)
- `priority` sur la première image pour optimiser le LCP (Largest Contentful Paint)
- `useEffect` + `setInterval` pour cycler l'index actif toutes les 5 secondes
- L'image active reçoit `opacity-100`, les autres `opacity-0`

### Composant
- Tout reste dans `hero-section.tsx` — pas de nouveau composant nécessaire
- Ajout d'un tableau d'URLs d'images en haut du fichier
- Ajout d'un `useState` pour l'index courant + `useEffect` pour le timer

### Impact visuel
- Les cards preview gardent leur fond blanc (contraste naturel avec le fond sombre)
- Le bouton primaire garde son style actuel (bleu kezak sur fond sombre = visible)
- Le bouton secondaire passe en variante claire (border blanc, texte blanc)

## Images source

URLs Unsplash haute qualité, thème "fondateurs/équipes africains au travail" :
- Équipe en réunion/brainstorming
- Développeur au travail
- Espace de coworking
- Fondateurs en discussion

## Hors scope

- Pas de contrôle utilisateur (pause/play, navigation manuelle)
- Pas de lazy loading des images suivantes (elles sont légères via Unsplash params)
- Pas de prefers-reduced-motion (pourra être ajouté plus tard si besoin)
