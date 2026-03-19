# Prompt : Audit & Correction — Soumission de Projet MojiraX

> Copie-colle ce prompt dans Claude Code pour lancer l'orchestration complète.

---

## CONTEXTE

Tu es le **Chef d'orchestre QA** de MojiraX, une plateforme de matching fondateur ↔ co-fondateur.
Le flux de soumission de projet est un formulaire multi-étapes :
`identity → problem → solution → market → traction → method-choice → cofounder → details → document-upload → ai-review`

**Stack** : Next.js 16 (`web/`) + NestJS 11 (`api/`) + Prisma + PostgreSQL + Firebase Auth
**Seule source de vérité** : LE CODE. Tu ne devines rien, tu ne triches pas, tu lis et traces le code.

### Fichiers clés à auditer

| Couche | Fichiers |
|--------|----------|
| Schema DB | `api/prisma/schema.prisma` |
| DTO | `api/src/projects/dto/create-project.dto.ts`, `update-project.dto.ts` |
| Controller | `api/src/projects/projects.controller.ts` |
| Service | `api/src/projects/projects.service.ts` |
| Modération | `api/src/moderation/moderation.service.ts` |
| Upload | `api/src/upload/upload.service.ts` |
| Main (pipes) | `api/src/main.ts` |
| Page form | `web/src/app/create/project/page.tsx` |
| Steps form | `web/src/app/create/project/steps/*.tsx` (identity, problem, solution, market, traction, method-choice, cofounder, details, document-upload, ai-review) |
| Détail projet | `web/src/app/(dashboard)/projects/*/page.tsx` ou similaire |
| Feed card | `web/src/components/feed/project-card.tsx` |
| Project deck | `web/src/components/project-deck/project-deck.tsx` |
| Conventions | `CLAUDE.md`, `UI-STYLE-GUIDE.md` |

---

## PHASE 1 — AUDIT (8 agents testeurs en parallèle)

Lance **exactement 8 agents en parallèle** avec `subagent_type: general-purpose`. Chaque agent reçoit le prompt ci-dessous correspondant à son numéro. Chaque agent DOIT lire les fichiers réels du projet avant de conclure quoi que ce soit. **Aucun agent ne triche : pas de problème inventé, chaque 🔴 DOIT citer un fichier:ligne réel lu par l'agent.**

---

### Agent T1 — Intégrité des données (Formulaire → API → DB)

```
RÔLE : Testeur QA — Intégrité des données
OBJECTIF : Vérifier que CHAQUE champ du modèle Project en DB est correctement couvert de bout en bout.

ÉTAPES :
1. Lis `api/prisma/schema.prisma` — liste TOUS les champs du modèle Project
2. Lis `api/src/projects/dto/create-project.dto.ts` — liste les champs du DTO
3. Lis chaque étape du formulaire dans `web/src/app/create/project/steps/*.tsx`
4. Lis `web/src/app/create/project/page.tsx` — comment les données sont agrégées et envoyées
5. Lis `api/src/projects/projects.service.ts` — comment les données sont persistées (prisma.project.create)
6. Lis `api/src/projects/projects.controller.ts` — le endpoint qui reçoit la requête

POUR CHAQUE CHAMP DU SCHEMA PRISMA, VÉRIFIE :
- [ ] Présent dans le formulaire frontend (quel step ?)
- [ ] Envoyé dans le payload API
- [ ] Accepté par le DTO backend
- [ ] Persisté dans le prisma.project.create/update
- [ ] Affiché correctement après soumission (page détail projet)

ATTENTION SPÉCIALE :
- country / city : présents dans le form ET persistés ?
- sector / category : cohérence nommage front ↔ back ↔ DB ?
- Champs optionnels : le form les marque comme optionnels ?
- Valeurs par défaut schema vs valeurs envoyées ?
- Enums : les valeurs du select frontend matchent les enums Prisma ?

FORMAT DE SORTIE — Pour chaque problème :
🔴 PROBLÈME: [description précise]
📍 FICHIER(S): [chemin:ligne]
🔧 CORRECTION: [action concrète à faire]
⚡ SÉVÉRITÉ: critique | majeur | mineur

SCORE /10 pour "Intégrité données formulaire → DB"
```

---

### Agent T2 — Upload & Affichage des médias

```
RÔLE : Testeur QA — Médias
OBJECTIF : Vérifier que les images/fichiers uploadés lors de la création de projet sont correctement traités et affichés.

ÉTAPES :
1. Lis `api/prisma/schema.prisma` — champs image/fichier du modèle Project (logoUrl, coverUrl, pitchDeckUrl, etc.)
2. Lis `web/src/app/create/project/steps/identity.tsx` et `document-upload.tsx` — composants d'upload
3. Lis `api/src/upload/upload.service.ts` — logique d'upload serveur
4. Lis `web/src/app/create/project/page.tsx` — comment les fichiers sont inclus dans la soumission
5. Trouve la page de détail projet — comment les images sont affichées
6. Lis `web/next.config.*` — domains autorisés pour next/image

VÉRIFIE :
- [ ] Input file présent dans le formulaire pour chaque champ média du schema
- [ ] Validation type MIME côté frontend (accept attribute)
- [ ] Validation type MIME côté backend (CLAUDE.md : jpeg, png, webp, pdf, docx)
- [ ] Validation taille max (5MB images, 10MB docs selon CLAUDE.md)
- [ ] URL retournée par l'upload est persistée dans le bon champ Prisma
- [ ] Affichage post-soumission : next/image avec src correcte
- [ ] Fallback/placeholder si URL null ou broken
- [ ] Domaines configurés dans next.config pour next/image
- [ ] Alt text pour accessibilité
- [ ] Preview de l'image avant soumission dans le formulaire
- [ ] Suppression du fichier si l'utilisateur annule ou change d'image

FORMAT DE SORTIE — Pour chaque problème :
🔴 PROBLÈME: [description précise]
📍 FICHIER(S): [chemin:ligne]
🔧 CORRECTION: [action concrète à faire]
⚡ SÉVÉRITÉ: critique | majeur | mineur

SCORE /10 pour "Upload & Affichage médias"
```

---

### Agent T3 — Modération IA

```
RÔLE : Testeur QA — Flux IA
OBJECTIF : Vérifier que la modération IA des projets fonctionne de bout en bout.

ÉTAPES :
1. Lis `api/prisma/schema.prisma` — champs modération (status, moderationScore, ModerationLog)
2. Lis `api/src/moderation/moderation.service.ts` — logique de modération complète
3. Lis `api/src/projects/projects.service.ts` — où/quand la modération est appelée
4. Lis `web/src/app/create/project/steps/ai-review.tsx` — affichage côté front
5. Cherche les templates email : `api/src/notifications/email/templates/fr/moderation-*.mjml`
6. Cherche si des notifications in-app sont créées après modération

VÉRIFIE :
- [ ] La modération est déclenchée automatiquement à la soumission (pas oubliée)
- [ ] Le provider IA est correctement configuré (clé API via ConfigService, pas en dur)
- [ ] Les critères de modération sont pertinents et documentés dans le code
- [ ] Gestion d'erreur si l'API IA est down (timeout, retry, fallback)
- [ ] Le statut Project est mis à jour après modération (PENDING → PUBLISHED ou REJECTED)
- [ ] Un ModerationLog est créé avec le score et la raison
- [ ] L'utilisateur est notifié (notification in-app et/ou email)
- [ ] Un projet rejeté peut être modifié et re-soumis
- [ ] Le step ai-review affiche correctement le résultat en temps réel ou après refresh
- [ ] Les erreurs IA ne crashent pas le flux (graceful degradation)

FORMAT DE SORTIE — Pour chaque problème :
🔴 PROBLÈME: [description précise]
📍 FICHIER(S): [chemin:ligne]
🔧 CORRECTION: [action concrète à faire]
⚡ SÉVÉRITÉ: critique | majeur | mineur

SCORE /10 pour "Flux modération IA"
```

---

### Agent T4 — UX Post-soumission (l'utilisateur se perd-il ?)

```
RÔLE : Testeur UX — Parcours utilisateur
OBJECTIF : Vérifier que l'utilisateur ne se perd JAMAIS pendant et après la soumission.

ÉTAPES :
1. Lis `web/src/app/create/project/page.tsx` — flux multi-step, navigation, soumission finale
2. Lis chaque step dans `web/src/app/create/project/steps/*.tsx` — navigation entre steps
3. Cherche la page post-soumission (dashboard, my-project, page détail)
4. Cherche les composants de feedback (toast, notification, modal de succès)
5. Lis `UI-STYLE-GUIDE.md` pour vérifier la conformité au design system

VÉRIFIE :
- [ ] Indicateur de progression visible (stepper, barre, numéros d'étape)
- [ ] Boutons Précédent/Suivant cohérents sur chaque step
- [ ] Loading state sur le bouton "Soumettre" (spinner, disabled pendant l'appel API)
- [ ] Protection contre le double-click (pas 2 projets créés)
- [ ] Message de succès clair après soumission (toast, modal, page dédiée)
- [ ] Redirection logique après succès (où atterrit l'utilisateur ?)
- [ ] L'utilisateur comprend le statut de son projet ("En attente de modération", etc.)
- [ ] Gestion erreur serveur : message compréhensible (pas de "500 Internal Server Error")
- [ ] Gestion erreur réseau : feedback si offline
- [ ] Retour arrière possible sans perte de données (les steps conservent les valeurs)
- [ ] Le formulaire est réinitialisé si l'utilisateur revient créer un nouveau projet
- [ ] Les messages d'erreur de validation sont positionnés à côté du champ concerné

FORMAT DE SORTIE — Pour chaque problème :
🔴 PROBLÈME: [description précise]
📍 FICHIER(S): [chemin:ligne]
🔧 CORRECTION: [action concrète à faire]
⚡ SÉVÉRITÉ: critique | majeur | mineur

SCORE /10 pour "UX parcours soumission"
```

---

### Agent T5 — Validations & sécurité (OWASP / CLAUDE.md)

```
RÔLE : Testeur QA — Robustesse & sécurité
OBJECTIF : Vérifier la cohérence des validations front ↔ back et le respect de CLAUDE.md.

ÉTAPES :
1. Lis `api/prisma/schema.prisma` — contraintes du modèle Project
2. Lis `api/src/projects/dto/create-project.dto.ts` — décorateurs class-validator
3. Lis chaque step frontend — validations côté client (required, maxLength, pattern)
4. Lis `api/src/projects/projects.controller.ts` — guards, pipes
5. Lis `api/src/main.ts` — ValidationPipe globale (forbidNonWhitelisted ?)

SCÉNARIOS EDGE CASE :
- [ ] Soumission champs vides obligatoires → erreur claire côté form + rejet DTO
- [ ] Texte ultra-long (nom 500 chars, description 50K) → maxLength cohérent front=back
- [ ] Caractères spéciaux (émojis, HTML, <script>, SQL ' OR 1=1) → sanitisé/rejeté
- [ ] Double soumission rapide → mutex/debounce côté front, idempotence côté back
- [ ] Soumission sans être connecté → redirect login ou 401 propre
- [ ] Token Firebase expiré pendant le remplissage → gestion propre
- [ ] URL invalide dans champs URL → @IsUrl dans DTO
- [ ] Règle "1 projet publié par fondateur" → anciens passent en DRAFT (vérifier le code)

CONFORMITÉ CLAUDE.md :
- [ ] Guard FirebaseAuthGuard présent sur le endpoint POST (A01)
- [ ] Ownership vérifié via req.user.uid (A01)
- [ ] @Body() utilise le DTO typé, JAMAIS `any` (A04)
- [ ] forbidNonWhitelisted: true dans ValidationPipe (A05)
- [ ] Pas de console.log, uniquement Logger NestJS (A09)
- [ ] Pas de secret en dur (A02)
- [ ] Pagination bornée si liste retournée (A04)

FORMAT DE SORTIE — Pour chaque problème :
🔴 PROBLÈME: [description précise]
📍 FICHIER(S): [chemin:ligne]
🔧 CORRECTION: [action concrète à faire]
⚡ SÉVÉRITÉ: critique | majeur | mineur

SCORE /10 pour "Validations & robustesse"
```

---

### Agent T6 — Cohérence UI/UX & Design System

```
RÔLE : Testeur UI — Conformité design system
OBJECTIF : Vérifier que TOUS les composants du formulaire de soumission respectent UI-STYLE-GUIDE.md.

ÉTAPES :
1. Lis `UI-STYLE-GUIDE.md` — le design system complet
2. Lis chaque step dans `web/src/app/create/project/steps/*.tsx`
3. Lis `web/src/app/create/project/page.tsx`
4. Cherche les composants partagés utilisés (Button, Input, Card, Modal, etc.)

VÉRIFIE POUR CHAQUE STEP :
- [ ] Couleurs : utilise kezak-primary (#0066ff), kezak-dark (#001f4d), kezak-light (#e6f0ff) — pas de hex en dur non-standard
- [ ] Boutons : h-[52px] primaire, h-[44px] secondaire — tailles respectées ?
- [ ] Cards : `bg-white rounded-2xl border border-gray-100 p-5 shadow-sm` — pattern respecté ?
- [ ] Typographie : hiérarchie correcte (titres, sous-titres, labels, helper text)
- [ ] Espacement : cohérent entre les steps (padding, gap, margin)
- [ ] Icônes : Lucide React uniquement (pas de heroicons, font-awesome, etc.)
- [ ] Modals : framer-motion + overlay `bg-black/50 backdrop-blur-sm`
- [ ] Inputs : style cohérent (border, focus ring, placeholder, error state)
- [ ] Responsive : flex-col sur mobile, grilles adaptatives
- [ ] Dark mode : géré ou explicitement ignoré ?
- [ ] États vides / loading / erreur : visuellement traités
- [ ] Animations : cohérentes (transitions entre steps, hover states)
- [ ] Confirmation destructive : `ConfirmDialog` stylé (jamais window.confirm)

FORMAT DE SORTIE — Pour chaque problème :
🔴 PROBLÈME: [description précise]
📍 FICHIER(S): [chemin:ligne]
🔧 CORRECTION: [action concrète à faire — inclure le CSS/className exact attendu]
⚡ SÉVÉRITÉ: critique | majeur | mineur

SCORE /10 pour "Conformité design system"
```

---

### Agent T7 — Performance & Optimisation frontend

```
RÔLE : Testeur Performance — Frontend
OBJECTIF : Vérifier que le formulaire multi-step est performant et optimisé.

ÉTAPES :
1. Lis `web/src/app/create/project/page.tsx` — comment les steps sont rendus (lazy ? conditional ?)
2. Lis chaque step — taille des composants, imports inutiles
3. Cherche les hooks personnalisés utilisés
4. Vérifie les appels API pendant le formulaire (combien ? quand ?)

VÉRIFIE :
- [ ] Les steps non-visibles ne sont PAS rendus dans le DOM (conditional rendering, pas display:none)
- [ ] Les composants lourds (éditeur, upload) sont lazy-loaded (dynamic import)
- [ ] Pas de re-render inutile : les states sont au bon niveau (pas tout dans le parent)
- [ ] Les images de preview sont optimisées (URL.createObjectURL, pas de base64 en state)
- [ ] Les appels API sont minimaux pendant le remplissage (pas de fetch à chaque keystroke)
- [ ] Le payload final de soumission est raisonnable en taille
- [ ] Pas de memory leak : les event listeners et subscriptions sont nettoyés
- [ ] useCallback/useMemo utilisés là où c'est pertinent (handlers passés en props)
- [ ] Les validations côté front sont synchrones (pas d'appel API pour valider un champ sauf si nécessaire)
- [ ] La soumission n'envoie PAS les fichiers en base64 dans le JSON (upload séparé)

FORMAT DE SORTIE — Pour chaque problème :
🔴 PROBLÈME: [description précise]
📍 FICHIER(S): [chemin:ligne]
🔧 CORRECTION: [action concrète à faire]
⚡ SÉVÉRITÉ: critique | majeur | mineur

SCORE /10 pour "Performance frontend"
```

---

### Agent T8 — Flux complet end-to-end (parcours utilisateur simulé)

```
RÔLE : Testeur E2E — Simulation utilisateur
OBJECTIF : Simuler mentalement le parcours COMPLET d'un utilisateur qui crée un projet, en traçant le code de bout en bout.

SIMULATION : Tu es Amara, une fondatrice camerounaise qui veut publier son projet "AgriTech Sahel" sur MojiraX.

TRACE LE PARCOURS DANS LE CODE :
1. Amara arrive sur la page de création → Lis `page.tsx`, que voit-elle ?
2. Step Identity : elle entre le nom, sélectionne le secteur, upload le logo → Trace le state
3. Step Problem : elle décrit le problème → Vérifie la validation
4. Step Solution : elle décrit sa solution → Vérifie les limites de caractères
5. Step Market : elle entre les données marché → Quels champs ? Numériques ?
6. Step Traction : elle entre les métriques → Optionnel ou requis ?
7. Step Method Choice : que choisit-elle ? → Comprend-elle les options ?
8. Step Cofounder : elle décrit le co-fondateur recherché → Quels champs ?
9. Step Details : informations complémentaires → Quoi exactement ?
10. Step Document Upload : elle upload son pitch deck → Format accepté ?
11. Step AI Review : le projet est analysé → Que voit-elle pendant l'analyse ?
12. POST API : les données sont envoyées → Quel est le payload exact ?
13. Backend : le controller reçoit → Quelles validations ?
14. Service : persistance + modération → Que se passe-t-il exactement ?
15. Résultat : Amara est redirigée → Où ? Que voit-elle ?
16. Modération terminée : le projet est publié ou rejeté → Comment est-elle informée ?
17. Feed : le projet apparaît-il dans le feed ? → Vérifie la query du feed

À CHAQUE ÉTAPE, NOTE :
- Ce qui fonctionne bien ✅
- Ce qui est cassé ou incohérent 🔴
- Ce qui est confus pour l'utilisateur ⚠️

FORMAT DE SORTIE — Pour chaque problème :
🔴 PROBLÈME: [description précise, avec le contexte utilisateur]
📍 FICHIER(S): [chemin:ligne]
🔧 CORRECTION: [action concrète à faire]
⚡ SÉVÉRITÉ: critique | majeur | mineur

SCORE /10 pour "Expérience end-to-end"
```

---

## PHASE 2 — SCORING & DÉCISION

Une fois les 8 agents terminés, calcule :

```
SCORE GLOBAL = moyenne(T1, T2, T3, T4, T5, T6, T7, T8)
```

Affiche un tableau récapitulatif :

| Agent | Domaine | Score | Critiques | Majeurs | Mineurs |
|-------|---------|-------|-----------|---------|---------|
| T1 | Intégrité données | /10 | | | |
| T2 | Upload & médias | /10 | | | |
| T3 | Modération IA | /10 | | | |
| T4 | UX post-soumission | /10 | | | |
| T5 | Validations & sécurité | /10 | | | |
| T6 | Design system | /10 | | | |
| T7 | Performance frontend | /10 | | | |
| T8 | E2E simulation | /10 | | | |
| **GLOBAL** | | **/10** | | | |

Puis affiche la **liste consolidée de TOUS les problèmes**, dédupliquée et triée par sévérité (critiques d'abord).

---

## PHASE 3 — CORRECTION (si score < 9.9/10)

Si le score global est **< 9.9**, lance **jusqu'à 10 agents correcteurs en parallèle** (`subagent_type: general-purpose`).

### Stratégie d'allocation des correcteurs :

Regroupe les problèmes par **fichier/zone** (pas par agent testeur) pour éviter les conflits d'écriture :

| Correcteur | Zone |
|------------|------|
| C1 | `api/prisma/schema.prisma` + migrations si nécessaire |
| C2 | `api/src/projects/dto/*.ts` (DTOs) |
| C3 | `api/src/projects/projects.controller.ts` |
| C4 | `api/src/projects/projects.service.ts` |
| C5 | `api/src/moderation/moderation.service.ts` + upload |
| C6 | `web/src/app/create/project/page.tsx` (orchestrateur form) |
| C7 | `web/src/app/create/project/steps/identity.tsx` + `problem.tsx` + `solution.tsx` |
| C8 | `web/src/app/create/project/steps/market.tsx` + `traction.tsx` + `details.tsx` |
| C9 | `web/src/app/create/project/steps/cofounder.tsx` + `method-choice.tsx` + `document-upload.tsx` + `ai-review.tsx` |
| C10 | Pages d'affichage (détail projet, feed card, project deck) |

**Si un correcteur n'a aucun problème dans sa zone, ne le lance pas.** Lance uniquement ceux qui ont du travail.

### Prompt pour chaque agent correcteur :

```
RÔLE : Correcteur — Zone [NOM DE LA ZONE]
FICHIERS QUE TU PEUX MODIFIER : [LISTE EXACTE DES FICHIERS DE TA ZONE]
TU NE TOUCHES À AUCUN AUTRE FICHIER.

PROBLÈMES À CORRIGER :
[COLLER ICI LA LISTE DES 🔴 PROBLÈMES QUI CONCERNENT TA ZONE]

RÈGLES ABSOLUES :
1. Lis le fichier ENTIER avant de le modifier
2. Respecte CLAUDE.md (pas de console.log, guards obligatoires, DTOs typés, select explicite, etc.)
3. Respecte UI-STYLE-GUIDE.md pour tout changement frontend
4. Corrections minimales et chirurgicales — ne touche que ce qui est cassé
5. Ne rajoute PAS de fonctionnalités non demandées
6. Ne refactore PAS le code existant qui fonctionne
7. Vérifie que ta correction ne casse pas les imports/exports existants
8. Teste mentalement : ta correction résout-elle le problème sans en créer d'autres ?

SORTIE OBLIGATOIRE — Pour chaque correction appliquée :
✅ CORRIGÉ: [description]
📍 FICHIER: [chemin:ligne]
📝 CHANGEMENT: [résumé du diff]

❌ NON CORRIGÉ (si applicable): [description + raison]
```

---

## PHASE 4 — RE-TEST (boucle jusqu'à 9.9/10)

Après les corrections, relance la **Phase 1** complète (8 agents testeurs) avec les mêmes prompts.

Recalcule le score global. Affiche le tableau comparatif :

| Agent | Itération 1 | Itération 2 | Delta |
|-------|-------------|-------------|-------|
| T1 | X/10 | Y/10 | +Z |
| ... | | | |
| **GLOBAL** | **X/10** | **Y/10** | **+Z** |

Si le score est **< 9.9/10**, relance la Phase 3 avec les problèmes restants.

**Boucle maximale : 3 itérations.** Si après 3 itérations le score est toujours < 9.9, affiche :

```
⚠️ RAPPORT FINAL — Score atteint : X.X/10 après 3 itérations

PROBLÈMES RESTANTS :
1. [problème] — Raison : [pourquoi non corrigé]
2. ...

RECOMMANDATIONS POUR L'UTILISATEUR :
- [action manuelle requise]
- [décision architecturale à prendre]
```

---

## RÈGLES D'OR

1. **Seule source de vérité = le code.** Jamais d'hypothèse, jamais de triche.
2. **Les agents ne s'inventent pas de problèmes.** Chaque 🔴 doit citer un fichier:ligne réel lu par l'agent.
3. **Les correcteurs ne touchent que ce qui est cassé.** Pas de refactoring gratuit.
4. **Pas de conflits d'écriture.** Chaque correcteur a sa zone exclusive de fichiers.
5. **Respecter CLAUDE.md et UI-STYLE-GUIDE.md** à la lettre.
6. **Communiquer en français** avec l'utilisateur.
7. **Ne JAMAIS exécuter `taskkill //F //IM node.exe`.**
8. **Déduplication obligatoire.** Si 2 agents testeurs trouvent le même problème, ne le compter qu'une fois.
9. **Pas d'over-engineering.** La correction la plus simple qui résout le problème est la meilleure.
10. **Transparence totale.** Afficher chaque score, chaque problème, chaque correction. L'utilisateur voit tout.
