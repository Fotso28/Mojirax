# Landing Page MojiraX — Design Spec

> Date : 2026-03-13
> Statut : VALIDÉ

---

## 1. Vue d'ensemble

Créer une landing page moderne pour les visiteurs non connectés, remplaçant la redirection actuelle vers `/login`. Les utilisateurs connectés continuent de voir le dashboard (feed).

**Sources :**
- Contenu textuel : mojirax.com (landing actuelle)
- Style visuel : template `landingpage.html` (Plus Jakarta Sans, glass effects, blob shapes, animations float)
- Design system : `UI-STYLE-GUIDE.md` (palette kezak, Inter, composants existants)

**Adaptation du style :** Le template utilise `Plus Jakarta Sans` et une palette purple/blue. La landing MojiraX utilise `Inter` (font du projet) et la palette `kezak-primary` (#0066ff) / `kezak-dark` (#001f4d) / `kezak-accent` (#3399ff). Les motifs visuels du template (glass cards, blob shapes, floating animations, gradients, rounded corners) sont repris et adaptés.

---

## 2. Architecture

### Approche : Client Component avec rendu conditionnel

La page `/` reste un `'use client'` component (comme actuellement) car elle utilise `useAuth()` (contexte Firebase client-side) pour determiner l'etat de connexion.

- Si l'utilisateur est connecte : afficher `DashboardShell + FeedStream` (comportement actuel)
- Si l'utilisateur n'est pas connecte : afficher `<LandingPage />`
- Le composant `LandingPage` est un client component qui fetch les donnees dynamiques via `useEffect` + `fetch` au montage
- Le contenu statique (hero, pour qui, comment ca marche, pourquoi MojiraX, CTA final) est en dur dans le composant
- Le contenu dynamique (pricing, FAQ, temoignages) est fetche cote client via 3 endpoints API publics

### Routing (`web/src/app/page.tsx`)

```tsx
'use client';
export default function Home() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (!user) return <LandingPage />;
  return <DashboardShell><FeedStream /></DashboardShell>;
}
```

**Note :** Le SEO de la landing page sera assure via les metadata statiques dans `layout.tsx` (`generateMetadata`). Les sections dynamiques (pricing, FAQ, temoignages) ne sont pas critiques pour le SEO.

### Nouveaux endpoints API (publics, sans auth)

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `GET /landing/plans` | GET | Plans tarifaires actifs, triés par `order` |
| `GET /landing/faq` | GET | Questions FAQ actives, triées par `order` |
| `GET /landing/testimonials` | GET | Témoignages actifs, triés par `order` |

Tous les endpoints utilisent `select` explicite (pas de leak de donnees). Un `take: 20` est applique en dur dans le service comme filet de securite, meme sans pagination exposee (donnees bornees par nature — max ~10 items chacun).

### Nouveaux modules API

Un seul module `LandingModule` avec `LandingController` + `LandingService` qui expose les 3 endpoints publics. Pas de guard auth.

### Admin CRUD

Étendre le module admin existant avec 3 nouveaux sous-menus :
- Gestion des plans tarifaires
- Gestion de la FAQ
- Gestion des témoignages

Tous les endpoints admin sont protégés par `FirebaseAuthGuard` + `AdminGuard`.

---

## 3. Schéma base de données

### Table `PricingPlan` (`@@map("pricing_plans")`)

| Champ | Type | Contraintes | Description |
|-------|------|-------------|-------------|
| `id` | String (cuid) | PK | |
| `name` | String | @MaxLength(100) | Nom du plan (ex: "Gratuit", "Pro") |
| `price` | Int | @Min(0) | Prix en FCFA (0 pour gratuit) |
| `period` | String | @MaxLength(20) | Periode (ex: "mois", "an") |
| `features` | String[] | @MaxLength(200) chaque | Liste des fonctionnalites incluses |
| `isPopular` | Boolean | default false, @map("is_popular") | Met en avant la card |
| `isActive` | Boolean | default true, @map("is_active") | Affiche ou non |
| `order` | Int | @Min(0) | Ordre d'affichage |
| `ctaLabel` | String | @MaxLength(50), @map("cta_label") | Texte du bouton CTA |
| `createdAt` | DateTime | @map("created_at") | |
| `updatedAt` | DateTime | @map("updated_at") | |

Index : `@@index([isActive, order])`

### Table `Faq` (`@@map("faqs")`)

| Champ | Type | Contraintes | Description |
|-------|------|-------------|-------------|
| `id` | String (cuid) | PK | |
| `question` | String | @MaxLength(500) | Question |
| `answer` | String | @MaxLength(2000) | Reponse |
| `isActive` | Boolean | default true, @map("is_active") | Affichee ou non |
| `order` | Int | @Min(0) | Ordre d'affichage |
| `createdAt` | DateTime | @map("created_at") | |
| `updatedAt` | DateTime | @map("updated_at") | |

Index : `@@index([isActive, order])`

### Table `Testimonial` (`@@map("testimonials")`)

| Champ | Type | Contraintes | Description |
|-------|------|-------------|-------------|
| `id` | String (cuid) | PK | |
| `name` | String | @MaxLength(100) | Nom de la personne |
| `role` | String | @MaxLength(100) | Role (ex: "Porteuse de projet") |
| `location` | String | @MaxLength(100) | Localisation (ex: "Senegal") |
| `quote` | String | @MaxLength(1000) | Citation/temoignage |
| `imageUrl` | String | @MaxLength(500), @map("image_url") | URL de la photo (domaines autorises : images.unsplash.com, R2/MinIO interne) |
| `isActive` | Boolean | default true, @map("is_active") | Affiche ou non |
| `order` | Int | @Min(0) | Ordre d'affichage |
| `createdAt` | DateTime | @map("created_at") | |
| `updatedAt` | DateTime | @map("updated_at") | |

Index : `@@index([isActive, order])`

**Validation `imageUrl` :** Le DTO admin valide que l'URL appartient a une allowlist de domaines (images.unsplash.com, le domaine R2/MinIO du projet). Cela previent les risques SSRF (CLAUDE.md A10).

### Seed SQL

Insérer les données initiales :

**PricingPlan :**
1. Gratuit — 0 FCFA : Profil complet, Explorer et matching, Favoris, Acces au Plan 30 jours
2. Pro — 5 000 FCFA/mois : Tout du plan Gratuit, Messages illimites, Mise en avant du profil, Badge de verification, Outils de collaboration

**Faq :**
1. C'est quoi MojiraX ? — MojiraX est la plateforme de reference pour connecter les porteurs de projet avec les cofondateurs et talents en Afrique francophone et dans la diaspora.
2. L'inscription est-elle gratuite ? — Oui, la creation de profil et l'exploration des profils sont entierement gratuites. Le plan Pro offre des fonctionnalites supplementaires.
3. Comment fonctionne le matching ? — Notre algorithme analyse vos competences, objectifs et disponibilite pour vous proposer des profils compatibles.
4. Quels pays sont couverts ? — MojiraX couvre l'Afrique francophone (Cameroun, Senegal, Cote d'Ivoire, Mali, Benin...) ainsi que la diaspora (France, Canada, Belgique...).
5. Comment fonctionne le Plan 30 jours ? — Une fois connectes, vous et votre cofondateur recevez une roadmap structuree pour les 30 premiers jours de collaboration.

**Testimonial :**
1. Amara Diallo — Porteuse de projet, Senegal — "J'ai trouve mon CTO en 2 semaines. Notre projet decolle enfin ! MojiraX a change la donne pour ma startup."
2. Kwame Mensah — Entrepreneur, Ghana — "MojiraX m'a permis de rejoindre un projet passionnant qui a du sens. La qualite des profils est impressionnante."
3. Zainab Hassan — Cofondatrice, Kenya — "Enfin une plateforme pour connecter avec des projets africains serieux. J'ai rencontre mon cofondateur ici."

---

## 4. Design des sections

### 4.0 Header (LandingHeader)

Header fixe, glassmorphisme (`bg-white/80 backdrop-blur-md border-b border-gray-100`), hauteur `h-16`, `z-50`.

- **Gauche** : Logo MojiraX (icone SVG + texte "MojiraX" en bold)
- **Droite** : "Connexion" (bouton secondaire outline) + "Creer mon profil" (bouton primaire `bg-kezak-primary`)

Composant separe `LandingHeader` (distinct du header dashboard).
Mobile first : les 2 boutons restent visibles, texte compact.

### 4.1 Hero

Layout split responsive :
- **Mobile** : colonne unique — texte en haut, visuel masque (`hidden lg:block`)
- **Desktop (lg+)** : `grid-cols-2 gap-16 items-center`

**Colonne gauche :**
- Badge : "La plateforme des fondateurs africains" (`inline-block px-4 py-1.5 rounded-full bg-kezak-primary/10 text-kezak-primary text-xs font-bold uppercase tracking-wider`)
- Titre : "Trouvez votre cofondateur ideal" (`text-4xl lg:text-6xl font-bold text-gray-900 leading-tight`)
- Sous-titre : "Rejoignez des centaines d'entrepreneurs en Afrique francophone et dans la diaspora. MojiraX connecte les porteurs de projet avec les talents qui feront decoller leur vision." (`text-lg text-gray-600`)
- 2 CTA : "Creer mon profil gratuitement" (primaire) + "Voir les profils" (secondaire outline)

**Colonne droite :**
Card glass (`bg-white/70 backdrop-blur-sm border border-white/40 rounded-[2.5rem] shadow-2xl p-8`) avec mockup de match :
- 2 photos rondes de professionnels africains (Unsplash) avec icone handshake au centre
- Barre de compatibilite ("Compatibilite Vision 98%")
- Animation `animate-float` subtile
- Blob shapes decoratifs en arriere-plan

**Fond :** Blob shapes animes (`bg-kezak-primary/5` et `bg-kezak-accent/5`) en position absolue.

### 4.2 Pour qui

Fond blanc. `py-24`.

- Titre : "POUR QUI" (`text-3xl md:text-4xl font-bold text-gray-900`)
- Sous-titre : "MojiraX s'adresse a tous les entrepreneurs francophones"

3 cards en `grid-cols-1 md:grid-cols-3 gap-8` :
- Style : `rounded-2xl bg-gray-50 p-10` avec hover qui change le bg (`hover:bg-kezak-primary hover:text-white` pour la premiere, `hover:bg-kezak-accent` pour la deuxieme, `hover:bg-gray-900` pour la troisieme)
- Icone Lucide dans cercle + titre + description

Cards :
1. **Porteur de projet** (Lightbulb) — "Vous avez une idee et recherchez les competences pour la realiser"
2. **Entrepreneur / Talent** (TrendingUp) — "Vous avez des competences et recherchez un projet a impact"
3. **Diaspora** (Globe) — "Vous voulez contribuer au developpement de l'Afrique depuis l'etranger"

### 4.3 Comment ca marche

Fond `bg-gray-900 text-white`. `py-24`.

- Titre : "COMMENT CA MARCHE"
- Sous-titre : "4 etapes simples pour trouver votre cofondateur"
- Ligne decorative (barre `bg-kezak-primary` centree sous le titre)

4 cards en `grid-cols-1 lg:grid-cols-4 gap-8` :
- Style : `bg-white/5 border border-white/10 rounded-2xl p-8` avec hover `hover:bg-white/10`
- Numero decoratif geant (`text-8xl font-black text-white/5`) en absolu
- Icone dans carre arrondi colore
- Etapes 2 et 4 decalees (`lg:mt-12`) pour effet escalier

Etapes :
1. **Creez votre profil** (UserPlus, `bg-kezak-primary`) — "Renseignez vos competences, objectifs et disponibilite"
2. **Definissez votre recherche** (Search, `bg-kezak-accent`) — "Precisez le type de cofondateur ou partenaire ideal"
3. **Matchez & echangez** (MessageCircle, `bg-kezak-primary`) — "Decouvrez des profils compatibles et engagez la conversation"
4. **Planifiez 30 jours** (Handshake, `bg-kezak-accent`) — "Structurez votre collaboration avec notre roadmap"

### 4.4 Pourquoi MojiraX

Fond blanc. `py-24`. Layout split inversé.

- **Mobile** : colonne unique, texte d'abord puis images
- **Desktop (lg+)** : `grid-cols-2 gap-20 items-center` — images a gauche, texte a droite

**Colonne gauche (images) :**
Grille 2 colonnes d'images Unsplash (professionnels africains, coworking, reunion startup) avec `rounded-3xl shadow-xl` et decalages creatifs. Blob shape decoratif en arriere-plan (`bg-kezak-accent/5`).

**Colonne droite :**
- Titre : "Arretez de chercher. Commencez a matcher."
- Paragraphe intro
- 3 points avec icone check verte :
  - "Correspondance intelligente basee sur vos competences et objectifs"
  - "Profils verifies d'entrepreneurs et talents serieux"
  - "Plan 30 jours pour structurer votre collaboration"
- CTA : "Commencer maintenant" (bouton primaire)

### 4.5 Temoignages (dynamique)

Fond `bg-gray-50`. `py-24`.

- Titre : "TEMOIGNAGES"
- Sous-titre : "Ils ont trouve leur cofondateur sur MojiraX"

Cards en `grid-cols-1 md:grid-cols-3 gap-8` :
- Style : `bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl`
- Photo ronde avec bordure gradient (`bg-gradient-to-br from-kezak-primary to-kezak-accent`)
- Citation italique entre guillemets
- Nom bold + role en `text-kezak-primary` + localisation avec icone MapPin

Donnees fetchees via `GET /landing/testimonials`.
**Etat vide :** Si aucun temoignage actif, la section entiere est masquee.

### 4.6 Pricing (dynamique)

Fond blanc. `py-24`.

- Titre : "TARIFS"
- Sous-titre : "Choisissez le plan qui vous convient"

Cards dynamiques en `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto`.

Card standard : `bg-white rounded-2xl border border-gray-100 p-10`
Card populaire : `border-2 border-kezak-primary shadow-xl scale-105` + badge "POPULAIRE"

Chaque card : nom, prix FCFA + periode, liste features avec check icons, bouton CTA.
CTA primaire pour la card populaire, outline pour les autres.

Donnees fetchees via `GET /landing/plans`.
**Etat vide :** Si aucun plan actif, la section entiere est masquee.

### 4.7 FAQ (dynamique)

Fond `bg-gray-50`. `py-24`.

- Titre : "FAQ"
- Sous-titre : "Questions frequemment posees"

Accordeon centre (`max-w-3xl mx-auto`) :
- Chaque item : `bg-white rounded-xl p-5 mb-3 border border-gray-100`
- Question cliquable en bold avec icone `ChevronDown` qui tourne a 180deg
- Reponse expand/collapse avec transition `max-height` + `overflow-hidden`
- Implementation : `useState` simple par item, pas de librairie externe

Donnees fetchees via `GET /landing/faq`.
**Etat vide :** Si aucune FAQ active, la section entiere est masquee.

**Etats de chargement (sections dynamiques) :** Pendant le fetch, afficher des skeletons (`bg-gray-200 rounded animate-pulse`) a la place des cards. En cas d'erreur API, masquer silencieusement la section (le contenu statique reste visible).

### 4.8 CTA final

Container avec marge (`max-w-6xl mx-auto`). `py-24 px-4`.

Bloc arrondi `rounded-[3rem] bg-gradient-to-br from-kezak-primary to-kezak-accent p-16 md:p-24 text-center text-white shadow-2xl`.

- Titre : "Pret a trouver votre cofondateur ideal ?" (blanc, gros, bold)
- Sous-titre : "Rejoignez des centaines d'entrepreneurs qui ont deja trouve leur partenaire sur MojiraX"
- CTA : "Creer mon profil gratuitement" (`bg-white text-kezak-primary font-bold rounded-2xl hover:scale-105`)

### 4.9 Footer

Fond `bg-gray-900 text-white`. `py-12`.

4 colonnes desktop (`grid-cols-1 md:grid-cols-4 gap-8`), empilees mobile :
1. **Logo + description** : icone + "MojiraX" + "Trouvez votre cofondateur ideal en Afrique francophone et dans la diaspora."
2. **Navigation** : Profils, FAQ, Tarifs
3. **Legal** : Mentions legales, Confidentialite, CGU
4. **Reseaux sociaux** : icones Lucide (Facebook, Twitter, Linkedin, Instagram)

Copyright : "© 2026 MojiraX. Tous droits reserves."

---

## 5. Structure des fichiers

### Frontend (`web/src/`)

```
components/landing/
  landing-header.tsx        — Header specifique landing
  hero-section.tsx          — Section hero
  for-who-section.tsx       — Section "Pour qui"
  how-it-works-section.tsx  — Section "Comment ca marche"
  why-mojirax-section.tsx   — Section "Pourquoi MojiraX"
  testimonials-section.tsx  — Section temoignages (dynamique)
  pricing-section.tsx       — Section pricing (dynamique)
  faq-section.tsx           — Section FAQ (dynamique)
  cta-section.tsx           — Section CTA final
  landing-footer.tsx        — Footer
app/
  page.tsx                  — Modifie : landing si non connecte, dashboard si connecte
```

### Backend (`api/src/`)

```
landing/
  landing.module.ts
  landing.controller.ts
  landing.service.ts
  dto/
    pricing-plan.dto.ts
    faq.dto.ts
    testimonial.dto.ts
```

Admin : etendre le module admin existant pour CRUD pricing/faq/testimonials.

### Prisma

- Migration : `add_landing_page_tables` (3 tables)
- Seed : donnees initiales pricing + faq + testimonials

---

## 6. Images Unsplash

Images libres de droits a utiliser (professionnels africains noirs) :

- **Hero profil 1** : homme africain professionnel portrait
- **Hero profil 2** : femme africaine professionnelle portrait
- **Pourquoi MojiraX image 1** : reunion/coworking professionnels africains
- **Pourquoi MojiraX image 2** : equipe startup africaine au travail
- **Temoignages** : 3 portraits (depuis seed, URLs Unsplash)

Toutes les images utilisent le parametre `w=800` pour optimiser le chargement.
Utiliser `next/image` (`<Image>`) pour l'optimisation automatique (lazy loading, format, dimensions).

---

## 7. Securite

- Les 3 endpoints landing sont **publics** (pas de guard auth) — lecture seule
- Les endpoints admin CRUD sont proteges par `FirebaseAuthGuard` + `AdminGuard`
- Les endpoints landing utilisent `select` explicite — pas de leak de champs internes (`createdAt`, `updatedAt` exclus des reponses publiques)
- Les prix sont en lecture seule cote frontend — aucune mutation possible sans auth admin
- Validation `class-validator` sur tous les DTOs admin (creation/modification)
- Rate limiting sur les endpoints publics (throttler existant)

---

## 8. SEO

Metadata statiques dans `layout.tsx` via `generateMetadata` :
- Title : "MojiraX | Trouvez votre cofondateur ideal en Afrique"
- Description : "Rejoignez la plateforme de reference pour connecter porteurs de projet et cofondateurs en Afrique francophone et dans la diaspora."
- Open Graph : titre, description, image (URL hero ou logo)

---

## 9. Deviations intentionnelles du design system

La landing page utilise des styles plus expressifs que le dashboard pour creer un impact visuel :
- **Titres hero** : `text-4xl lg:text-6xl` au lieu de `text-3xl sm:text-4xl` (standard dashboard)
- **Coins arrondis** : `rounded-[2.5rem]`, `rounded-[3rem]` pour les cards hero et CTA (vs `rounded-lg` standard)
- **Glass cards** : `bg-white/70 backdrop-blur-sm border border-white/40` (nouveau pattern, specifique landing)
- **Blob shapes** : formes decoratives animees (nouveau pattern, specifique landing)

Ces deviations sont limitees a la landing page et ne modifient pas le design system du dashboard.

---

## 10. Hors scope

- Selecteur de langue (i18n)
- Formulaire de recherche dans le hero
- Pages `/faq`, `/legal`, `/explorer` separees (liens footer en `#` placeholder)
- Animations scroll (intersection observer) — ajout possible en v2
- Admin CRUD detaille (UI admin) — spec separee, les endpoints admin sont implementes mais l'interface admin sera dans une spec dediee
