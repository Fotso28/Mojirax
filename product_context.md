# CO-MATCH - DOCUMENT DE SPÉCIFICATIONS FONCTIONNELLES

## 1. VISION & OBJECTIFS
**Projet :** CoMatch
**Type :** Application Web (Next.js) + PWA
**Version :** 1.1
**Architecture :** Next.js (Front) + NestJS (Back) + PostgreSQL
**Hébergement :** VPS Local (Cameroun)

**Vision :** Créer une plateforme web responsive facilitant la rencontre entre Porteurs de Projets et Candidats Co-founders au Cameroun.

**Approche :**
- **Web App** accessible sur mobile et desktop (PWA).
- **Modèle Freemium :** Consultation gratuite avec infos masquées -> Paiement pour débloquer le contact.
- **Sécurité :** Hébergement local et validation des contenus par IA.

## 2. ARCHITECTURE TECHNIQUE
- **Frontend :** Next.js (React) avec Tailwind CSS.
- **Backend API :** NestJS (Node.js).
- **Base de Données :** PostgreSQL (Relationnel).
- **Stockage Fichiers :** MinIO (Compatible S3, hébergé sur VPS).
- **Infrastructure :** VPS + Docker.

## 3. FONCTIONNALITÉS DÉTAILLÉES

### MODULE A : GESTION UTILISATEURS (Auth & Identité)
#### A.1 Inscription / Connexion
- **Mécanisme :** Authentification via NextAuth (Email/Pass, Google, LinkedIn).
- **Rôles :**
    - **Porteur de Projet :** "J'ai une idée, je cherche une équipe."
    - **Candidat :** "J'ai des compétences, je cherche un projet."
- **Session :** Tokens sécurisés (JWT) stockés en HttpOnly Cookies.

#### A.2 Profil & Enrichissement
- **Candidat :** Formulaires web pour Bio, Tech Stack, Soft Skills, Expérience.
- **Porteur :** Formulaires pour Pitch, Description, Stade (Idée/MVP), Besoins.
- **Médias :** Upload de photos via le navigateur -> API -> MinIO (Traitement image côté serveur).

### MODULE B : VALIDATION & MODÉRATION (IA)
#### B.1 Workflow de Validation
- **Statut Initial :** Tout profil créé/modifié passe en `PENDING_AI`.
- **Processus Backend :** Tâche de fond envoie le texte à l'IA avec "System Prompt".
- **Décision :**
    - **OK :** Statut -> `PUBLISHED`. Visible.
    - **NOK :** Statut -> `REJECTED`. Bandeau d'alerte avec raison.

### MODULE C : DÉCOUVERTE & SÉCURITÉ (Le Feed)
#### C.1 Moteur de Recherche
- **Interface :** Page `/feed` avec grille de cartes.
- **Filtres :** Ville, Compétence, Secteur.

#### C.2 Masquage Dynamique (Privacy Wall)
- **Principe :** Le navigateur ne reçoit JAMAIS les données sensibles des utilisateurs gratuits.
- **Mécanisme :**
    - API vérifie si demandeur est PREMIUM.
    - Si NON, API supprime les champs cachés (Email, Tel, Links) du JSON.
    - Rendu : "Information Masquée".

### MODULE D : PAIEMENT & MONÉTISATION
#### D.1 Action "Débloquer le Contact"
- **Gratuit :** Modale de paiement ("Accès illimité pour X FCFA").
- **Premium :** Affichage direct via pop-up.

#### D.2 Flux de Paiement Web
- **Intégration :** Redirection vers agrégateur (Lygos pay ou autre).
- **Processus :**
    - Clic "Payer" -> Redirection.
    - Validation utilisateur.
    - Webhook -> active `is_premium = true`.
    - Retour -> `/payment/success`.

### MODULE E : ADMINISTRATION (Back-Office)
#### E.1 Dashboard de Pilotage
- Route `/admin` protégée.
- KPIs : Nouveaux inscrits, Revenus, Taux de conversion.

#### E.2 Configuration Business
- **Gestion Champs Cachés :** Checkbox pour masquer/démasquer champs pour gratuits.
- **Gestion IA :** Éditeur pour prompt de modération.

#### E.3 Gestion Financière
- Tableau des transactions.
- Activation/Désactivation manuelle du Premium.

## 4. PLANNING DE RÉALISATION
**Stratégie :** Dev intensif 8 semaines + 1 mois Qualité.

### PHASE 1 : DÉVELOPPEMENT CORE (Mois 1)
1. **Semaine 1 (Fondations) :** Setup VPS, Docker, MinIO, Next.js, NestJS, Auth, DB.
2. **Semaine 2 (Profils) :** Formulaires, Upload MinIO, Dashboard.
3. **Semaine 3 (IA) :** Intégration IA, Workflow Validation, Admin V1.
4. **Semaine 4 (Recherche) :** Privacy Interceptor, Feed, Admin V2.

### PHASE 2 : MONÉTISATION & EXPÉRIENCE (Mois 2)
5. **Semaine 5 (Backend Paiement) :** Lygos pay, Webhooks.
6. **Semaine 6 (Frontend Paiement) :** UI Paywall, Succès/Échec.
7. **Semaine 7 (Admin & Finance) :** Dashboard final, Bannissement, Support.
8. **Semaine 8 (Mobile First & PWA) :** Optimisation Responsive, PWA, CODE FREEZE.

### PHASE 3 : QUALITÉ & STABILISATION (Mois 3)
9. **Semaine 9 (Tests) :** Tests fonctionnels, Sécurité, Load Testing.
10. **Semaine 10 (Calibration) :** Calibration IA, Beta Restreinte.
11. **Semaine 11 (Corrections) :** Bug fixing, Optimisation perf/SEO.
12. **Semaine 12 (Lancement) :** Nettoyage DB, Déploiement Prod, Ouverture.
