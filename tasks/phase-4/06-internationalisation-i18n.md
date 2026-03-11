# 06 — Internationalisation (i18n)

## Résumé

Ajouter le support multilingue (français et anglais) pour élargir l'audience au-delà de l'Afrique francophone.

## Contexte

- UI actuelle : 100% français (hardcoded)
- Cible initiale : Cameroun (français + anglais)
- Cible future : Afrique francophone + anglophone (Nigéria, Ghana, Kenya)

## Spécification

### A. Framework i18n

**Package :** `next-intl` (recommandé pour Next.js App Router)

**Langues :**
- `fr` — Français (défaut)
- `en` — Anglais

### B. Structure des traductions

```
web/messages/
├── fr.json
└── en.json
```

**Catégories :**
```json
{
  "common": { "save": "Enregistrer", "cancel": "Annuler", ... },
  "auth": { "login": "Se connecter", "signup": "Créer un compte", ... },
  "feed": { "discover": "Découvrir les projets", "noResults": "Aucun résultat", ... },
  "project": { "apply": "Postuler", "sector": "Secteur", ... },
  "profile": { "skills": "Compétences", "experience": "Expérience", ... },
  "notifications": { "newApplication": "Nouvelle candidature", ... }
}
```

### C. Détection de langue

1. URL prefix : `/fr/feed`, `/en/feed`
2. Fallback : préférence navigateur → cookie → français par défaut
3. Sélecteur de langue dans le header/footer

### D. Contenu dynamique

- Les données utilisateur (bio, pitch, nom de projet) restent dans la langue de l'auteur
- Seule l'interface est traduite
- Les notifications générées par le système sont dans la langue de l'utilisateur

### E. API

- Ajouter un champ `locale` sur le modèle `User` (défaut : `fr`)
- Les notifications créées par `notify()` utilisent la locale du destinataire

## Fichiers à créer / modifier

| Fichier | Action |
|---------|--------|
| `web/messages/fr.json` | **Créer** |
| `web/messages/en.json` | **Créer** |
| `web/src/i18n.ts` | **Créer** (config next-intl) |
| `web/src/middleware.ts` | Ajouter détection de locale |
| `web/src/app/[locale]/layout.tsx` | **Créer** (layout par locale) |
| Tous les composants | Remplacer les textes hardcoded par `t('key')` |

## Tests et validation

- [ ] `/en/feed` affiche l'interface en anglais
- [ ] `/fr/feed` affiche l'interface en français
- [ ] Le sélecteur de langue change la langue et persiste
- [ ] Les notifications sont dans la langue de l'utilisateur
- [ ] Les textes hardcoded sont tous remplacés par des clés i18n
