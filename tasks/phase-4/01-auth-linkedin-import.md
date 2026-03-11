# 01 — Auth LinkedIn + Import Profil

## Résumé

Ajouter l'authentification LinkedIn et l'import automatique du profil (expérience, éducation, compétences) pour les candidats.

## Contexte

- Auth actuelle : Firebase (Google + Email/Password)
- Le PRD mentionne "Connect with LinkedIn (One-click)"
- Le modèle `CandidateProfile` a déjà `experience` (Json), `education` (Json), `linkedinUrl`

## Spécification

### A. Auth LinkedIn via Firebase

Firebase Auth supporte LinkedIn via un custom provider ou via la méthode `signInWithPopup` avec un `OAuthProvider`.

**Alternative :** Utiliser l'API LinkedIn directement :
1. Frontend : bouton "Se connecter avec LinkedIn" → redirect OAuth 2.0
2. Backend : `GET /auth/linkedin/callback` → échange code → token → profil
3. Créer/lier le compte Firebase + User en base

### B. Import Profil LinkedIn

Après auth LinkedIn, récupérer via l'API LinkedIn :
- Nom, photo, headline
- Expériences professionnelles
- Éducation
- Compétences

Mapper vers `CandidateProfile` :
- `experience` → JSON structuré
- `education` → JSON structuré
- `skills` → tableau de strings
- `linkedinUrl` → URL du profil

### C. UI "Import LinkedIn"

Sur la page de création de profil candidat :
- Bouton "Importer depuis LinkedIn"
- Animation de chargement ("Importing your profile...")
- Pré-remplir les champs du formulaire avec les données importées
- L'utilisateur peut modifier avant de valider

## Fichiers à créer / modifier

| Fichier | Action |
|---------|--------|
| `api/src/auth/linkedin.strategy.ts` | **Créer** |
| `api/src/auth/auth.controller.ts` | Ajouter routes LinkedIn callback |
| `web/src/app/login/page.tsx` | Ajouter bouton LinkedIn |
| `web/src/app/onboarding/candidate/steps/` | Option import LinkedIn |

## Tests et validation

- [ ] Connexion LinkedIn redirige vers le bon OAuth flow
- [ ] Profil LinkedIn importé et mappé vers CandidateProfile
- [ ] L'utilisateur peut modifier les données importées avant validation
- [ ] Un compte existant avec le même email est lié (pas de doublon)
