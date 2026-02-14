# MojiraX - Plateforme de Co-Founding & Matching

## 1. Vision du Projet

**MojiraX** est une plateforme de mise en relation entre **fondateurs de startups** et **talents/co-fondateurs** ciblant principalement le marché camerounais et africain. L'objectif est de résoudre un problème critique dans l'écosystème entrepreneurial : **comment trouver le bon co-fondateur ou le bon talent pour concrétiser une idée ?**

La plateforme fonctionne sur un modèle de **matching intelligent alimenté par l'IA**, permettant aux fondateurs de publier leurs projets et aux candidats de proposer leurs compétences, le tout avec un système de découverte, de filtrage et de mise en relation automatisé.

---

## 2. Le Problème Résolu

- Les fondateurs ont des idées mais peinent à trouver des profils complémentaires (technique, business, design, etc.)
- Les talents recherchent des projets ambitieux mais n'ont pas de plateforme dédiée pour les découvrir
- Le matching traditionnel (réseau personnel, LinkedIn) est limité et peu efficace
- Il n'existe pas de solution locale adaptée au contexte africain (paiements locaux, monnaie XAF, etc.)

---

## 3. Les Utilisateurs Cibles

### Fondateur (Founder)
- Porteur de projet ou startup en phase de démarrage
- Cherche un co-fondateur, un CTO, un designer, un business developer...
- Publie un "Project Deck" décrivant sa vision, ses besoins, les conditions

### Candidat (Candidate)
- Talent technique, business ou créatif
- Cherche un projet aligné avec ses compétences et aspirations
- Crée un profil détaillé avec ses compétences, expérience, conditions souhaitées

---

## 4. Fonctionnalités Principales

### 4.1 Authentification & Inscription
- Inscription par email/mot de passe ou via Google OAuth
- Choix du rôle (Fondateur ou Candidat) à l'inscription
- Synchronisation Firebase (auth client) avec PostgreSQL (données métier)

### 4.2 Onboarding Multi-Étapes
- **Candidats** : Parcours en 5 étapes guidées
  1. **Pitch** - Présentation personnelle et résumé
  2. **Vision** - Objectifs, secteurs d'intérêt, type de startup visé
  3. **Expertise** - Compétences techniques et soft skills
  4. **Conditions** - Salaire souhaité, localisation, remote, equity
  5. **Disponibilité** - Date de disponibilité, relocalisation possible
- **Fondateurs** : Création de "Project Deck" (pitch, vision, besoins, conditions)
- Sauvegarde automatique de la progression (mode brouillon)

### 4.3 Feed de Découverte
- Flux infini de projets/candidats à parcourir
- Cartes visuelles avec gradient, badge de stage, compétences, equity
- Filtrage par secteur, compétences, localisation, stade du projet
- Publicités natives intégrées (toutes les 5 publications)
- Compteur de vues sur chaque publication

### 4.4 Project Deck (Fiche Projet)
- Vue détaillée d'un projet avec plusieurs sections :
  - **Vision** - Pitch et description du projet
  - **Expertise** - Compétences recherchées
  - **Conditions** - Budget, equity, taille d'équipe, financement
  - **Mur de confidentialité** - Coordonnées masquées par défaut

### 4.5 Matching Intelligent (IA)
- **Embeddings vectoriels** (1536 dimensions) pour les profils et projets
- Utilisation de `text-embedding-3-small` (OpenAI) pour vectoriser les bios, compétences et descriptions
- **Recherche sémantique** via pgvector (extension PostgreSQL)
- **Score de matching** calculé sur plusieurs critères :
  - Correspondance des compétences (skillsMatch)
  - Correspondance d'expérience (experienceMatch)
  - Correspondance géographique (locationMatch)
  - Adéquation culturelle (culturalFit)
  - Score global (overallScore)
  - Explication IA (aiReason) et niveau de confiance (aiConfidence)

### 4.6 Modération IA
- Pipeline automatique : Nouveau profil/projet -> Statut `PENDING_AI`
- Analyse IA du contenu (qualité, pertinence, respect des règles)
- États possibles : `DRAFT` -> `PENDING_AI` -> `PUBLISHED` ou `REJECTED`
- Journal d'audit complet (score IA, raison, payload)
- Possibilité d'override manuel par les administrateurs

### 4.7 Mur de Confidentialité (Privacy Wall)
- Les coordonnées de contact (email, téléphone) sont **masquées par défaut**
- L'utilisateur doit **payer pour débloquer** l'accès aux informations de contact
- Pattern Backend-for-Frontend : l'API filtre les champs sensibles avant envoi
- Table `unlocks` pour suivre qui a débloqué quel profil/projet

### 4.8 Système de Candidature
- Un candidat peut postuler à un projet
- Statuts : `PENDING` -> `ACCEPTED` / `REJECTED` / `IGNORED`
- Notifications en temps réel au fondateur

### 4.9 Notifications
- Notifications in-app pour les événements clés :
  - `APPLICATION_RECEIVED` - Nouvelle candidature reçue
  - `APPLICATION_ACCEPTED` - Candidature acceptée
  - `APPLICATION_REJECTED` - Candidature refusée
  - `MODERATION_ALERT` - Alerte de modération
  - `SYSTEM` - Notifications système

---

## 5. Modèle de Monétisation

### Modèle Freemium "Pay-to-Contact"
- **Gratuit** : Parcourir les projets et profils, voir les informations publiques
- **Payant** : Débloquer les coordonnées de contact d'un profil ou projet
- **Paiement** : Via Lygos Pay (solution locale, monnaie XAF - Franc CFA)

### Flux Financier
1. L'utilisateur découvre un profil/projet intéressant
2. Les coordonnées sont masquées ("Information Masquée")
3. L'utilisateur paie via Lygos Pay pour débloquer
4. La transaction est enregistrée et auditée
5. Les coordonnées deviennent visibles de manière permanente

### Suivi & Audit
- Table `transactions` pour toutes les opérations financières
- Table `payment_audit_logs` pour les webhooks de paiement
- Table `unlocks` pour le suivi des déblocages

---

## 6. Architecture Technique

### Stack Technologique
| Couche | Technologie |
|--------|------------|
| Frontend | Next.js 16, React 19, Tailwind CSS 4, TypeScript 5 |
| Backend | NestJS 11, Prisma 6.2, Firebase Admin SDK |
| Base de données | PostgreSQL 15 + pgvector |
| Cache/Files d'attente | Redis 7 (BullMQ) |
| Authentification | Firebase Authentication |
| Paiements | Lygos Pay |
| IA/Embeddings | OpenAI text-embedding-3-small |
| Orchestration | Turborepo (monorepo) |
| Conteneurisation | Docker Compose |

### Architecture Monorepo
```
co-founder/
├── apps/
│   ├── web/         → Frontend Next.js (port 3000)
│   └── api/         → Backend NestJS (port 3001)
├── packages/
│   ├── types/       → DTOs partagés frontend/backend
│   └── tsconfig/    → Config TypeScript partagée
└── docker-compose.yml → PostgreSQL + Redis
```

### Base de Données (13 tables)
- **Authentification** : users, accounts, sessions, verification_tokens
- **Profils** : candidate_profiles, projects
- **IA & Recherche** : match_scores, search_logs
- **Modération** : moderation_logs, admin_logs
- **Monétisation** : transactions, payment_audit_logs, unlocks
- **Workflow** : applications, notifications

---

## 7. Design & UX

### Identité Visuelle
- Palette de couleurs personnalisée ("kezak") : bleu primaire, accent, dark, light
- Design **glassmorphique** avec transparence et effets de flou
- Animations fluides et transitions soignées
- **Mobile-first** : design responsive avec drawers pour la navigation mobile

### Layout Dashboard
- **Header** supérieur avec navigation principale
- **Sidebar gauche** : navigation (masquée sur mobile)
- **Sidebar droite** : widgets et informations contextuelles (masquée sur tablette)
- **Drawers mobiles** : navigation et widgets accessibles via gestes

---

## 8. Roadmap & État d'Avancement

### État des Pages par URL

#### `http://localhost:3000/` — Page d'accueil / Dashboard
| Fonctionnalité | État | Détail |
|----------------|------|--------|
| Authentification & redirection | ✅ Fonctionnel | Redirige vers `/login` si non connecté |
| Layout responsive 3 colonnes | ✅ Fonctionnel | Header, sidebar gauche, contenu, sidebar droite, drawers mobile |
| Feed de projets | ⚠️ Données mock | 15 projets générés en dur (pas de requête API) |
| Carte projet (ProjectCard) | ⚠️ UI seule | Affichage OK, mais boutons "Voir le projet" et "Sauvegarder" sans action |
| Compteur de vues | ✅ Fonctionnel | Affiché sur chaque carte |
| Publicités natives | ⚠️ Placeholder | Composant NativeAd "Lygos Pay" statique, injecté toutes les 5 publications |
| Sidebar gauche (navigation) | ⚠️ Partiel | Navigation dynamique selon le rôle, mais routes `/messages` et `/settings` inexistantes |
| Sidebar droite (widgets) | ⚠️ Données mock | Widget "À suivre" avec 3 utilisateurs en dur, promo Lygos Pay statique |
| Logout | ✅ Fonctionnel | Déconnexion Firebase + nettoyage localStorage |

#### `http://localhost:3000/create/project` — Création de Projet (Wizard 7 étapes)
| Étape | Champs | État |
|-------|--------|------|
| 1. Identité du projet | nom, pitch, pays, ville | ✅ Fonctionnel (validation OK) |
| 2. Détails du projet | portée, secteur, stade | ✅ Fonctionnel (sélecteurs LOCAL/DIASPORA/HYBRID, FINTECH/AGRITECH/etc.) |
| 3. Le Problème | description du problème, cible, solutions actuelles | ✅ Fonctionnel (textarea 600 chars max) |
| 4. Votre Solution | description solution, UVP, anti-scope | ✅ Fonctionnel |
| 5. Marché & Business | type marché, modèle de revenu, concurrents | ✅ Fonctionnel (B2C/B2B/B2G, SUBSCRIPTION/COMMISSION/etc.) |
| 6. Validation & Équipe | rôle fondateur, disponibilité, traction | ✅ Fonctionnel |
| 7. Cofondateur & Vision | profil recherché, type collaboration, vision | ⚠️ Partiel — **soumission finale = TODO** (`console.log` seulement) |

| Fonctionnalité transversale | État | Détail |
|-----------------------------|------|--------|
| Wizard multi-étapes | ✅ Fonctionnel | Navigation avant/arrière, barre de progression animée (Framer Motion) |
| Validation des champs | ✅ Fonctionnel | Chaque étape vérifie les champs requis avant de passer à la suivante |
| Sauvegarde auto localStorage | ✅ Fonctionnel | Persistance immédiate côté client |
| Sauvegarde auto serveur | ✅ Fonctionnel | Sync debounced (1.5s) via `PATCH /users/creating-projet` |
| Chargement du brouillon | ✅ Fonctionnel | Récupération au montage via `GET /users/creating-projet`, fallback localStorage |
| Soumission finale du projet | ❌ Non implémenté | Étape 7 : `// TODO: Call actual API`, simule avec un `setTimeout` |

#### Autres pages existantes
| URL | État | Détail |
|-----|------|--------|
| `/login` | ✅ Fonctionnel | Connexion email/mot de passe + Google OAuth |
| `/onboarding/candidate` | ✅ UI Fonctionnelle | Wizard 5 étapes (pitch, vision, expertise, conditions, disponibilité) |
| `/(dashboard)/profile` | ⚠️ Partiel | Affichage profil OK, formulaire de modification a un bug (mauvais port API) |
| `/(dashboard)/feed` | ⚠️ Données mock | 3 projets en dur (AgriTech, Fintech, HealthConnect) |
| `/(dashboard)/projects/[id]` | ⚠️ Données mock | ProjectDeck avec données hardcodées, bouton "Vérifier le Match" sans action |

---

### Phase 1 : MVP (En cours)

**Infrastructure & Auth**
- [x] Schéma de base de données complet (13 tables, embeddings IA, pgvector)
- [x] Docker Compose (PostgreSQL 15, Redis 7)
- [x] Authentification Firebase + sync PostgreSQL (`POST /auth/sync`)
- [x] Contexte auth frontend (token, cache localStorage, gestion 401)
- [x] Instance Axios configurée (intercepteurs token + erreurs)

**Onboarding & Profils**
- [x] Sélection de rôle (Fondateur/Candidat)
- [x] Onboarding candidat — UI wizard 5 étapes
- [x] Création projet — UI wizard 7 étapes avec validation
- [x] Auto-save brouillon (localStorage + API debounced)
- [ ] Soumission finale du projet vers l'API (étape 7 = TODO)
- [ ] API complète pour profils candidats
- [ ] Correction du bug port API sur le formulaire profil

**Feed & Découverte**
- [x] Layout dashboard responsive (3 colonnes + drawers mobile)
- [x] Feed de découverte — UI et composants (ProjectCard, NativeAd)
- [x] Compteur de vues
- [ ] Connexion du feed à l'API (actuellement 15 projets mock en dur)
- [ ] Handlers sur les boutons "Voir le projet" et "Sauvegarder"
- [ ] Routes manquantes : `/messages`, `/settings`

**Projet & Matching**
- [x] Vue détaillée projet (ProjectDeck) — UI avec onglets Vision/Expertise/Conditions
- [x] Composant Privacy Wall (mur de confidentialité)
- [ ] Connexion ProjectDeck à l'API (actuellement données mock)
- [ ] Bouton "Vérifier le Match" sans fonctionnalité
- [ ] Pipeline de modération IA
- [ ] Logique de masquage backend (privacy wall)
- [ ] Workflow de candidature complet
- [ ] Recherche sémantique vectorielle (pgvector)
- [ ] Widgets sidebar droite (actuellement placeholders)

### Phase 2 : Monétisation
- [ ] Intégration Lygos Pay
- [ ] Gestion des webhooks de paiement
- [ ] Suivi des transactions et déblocages
- [ ] Dashboard administrateur (KPIs, modération, config IA)
- [ ] Gating des fonctionnalités premium

### Phase 3 : Stabilisation & Lancement
- [ ] Tests end-to-end
- [ ] Audit de sécurité
- [ ] Optimisation des performances
- [ ] Optimisation PWA
- [ ] Lancement beta

---

## 9. Points Différenciants

1. **IA au coeur** : Matching sémantique par embeddings vectoriels, pas juste des filtres basiques
2. **Adapté au marché africain** : Paiements en XAF via Lygos Pay, contexte local
3. **Privacy-first** : Modèle de confidentialité où les données sensibles sont protégées par défaut
4. **Modération automatique** : Pipeline IA pour garantir la qualité des profils et projets
5. **Double perspective** : La plateforme sert autant les fondateurs que les candidats avec des parcours dédiés
6. **Stack moderne** : Technologies de pointe (Next.js 16, React 19, NestJS 11, pgvector)

---

## 10. Résumé Exécutif

**MojiraX** est une plateforme de co-founding qui connecte les porteurs de projets aux talents complémentaires grâce à l'intelligence artificielle. Construite sur une architecture moderne (monorepo Turborepo, Next.js + NestJS), elle se distingue par son système de matching sémantique basé sur des embeddings vectoriels, son modèle de monétisation "pay-to-contact" adapté au marché africain (paiements XAF via Lygos Pay), et sa modération automatique par IA. Le projet est actuellement en phase MVP avec l'authentification, l'onboarding et le feed de découverte fonctionnels, et progresse vers l'intégration complète du matching IA et du système de paiement.
