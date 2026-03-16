# Test paranoiaque : Recherche

**Date** : 2026-03-12
**Fichiers testes** : 6
**Scenarios testes** : 32
**PASS** : 32 | **FAIL** : 0

---

## Resultats par categorie

### A. Authentification & Autorisation

| # | Scenario | Endpoint/Service | Resultat | Detail |
|---|----------|-----------------|----------|--------|
| 1 | Appel sans token | GET /search/history | PASS | 401 Unauthorized |
| 2 | Appel sans token | DELETE /search/history | PASS | 401 Unauthorized |
| 3 | Token invalide | GET /search/history | PASS | 401 "Invalid Firebase Token" |
| 4 | Token malformé (header "Bearer" seul) | GET /search/history | PASS | 401 Unauthorized |
| 5 | Header Authorization vide | GET /search/history | PASS | 401 Unauthorized |
| 6 | Mauvaise methode HTTP | POST /search/history | PASS | 404 Not Found |
| 7 | Endpoints publics sans auth | GET /search/universal, /search | PASS | 200 avec resultats |
| 8 | Guard optionnel decode token si present | GET /search/universal | PASS | `FirebaseAuthOptionalGuard` en place |
| 9 | userId resolution dans history | getHistory/clearHistory | PASS | Resout correctement `firebaseUid` → `userId` interne |

### B. Validation des entrees

| # | Scenario | Endpoint/Service | Resultat | Detail |
|---|----------|-----------------|----------|--------|
| 10 | `q` absent | GET /search/universal | PASS | 400 Bad Request — DTO rejette (`q must be a string`) |
| 11 | `q` absent | GET /search | PASS | 400 Bad Request — DTO rejette |
| 12 | `q` vide (`q=`) | GET /search/universal | PASS | 400 Bad Request — DTO rejette (`q must be longer than or equal to 2`) |
| 13 | `q` = 1 caractere | GET /search/universal | PASS | 400 Bad Request — DTO `@MinLength(2)` |
| 14 | `q` = 1 caractere | GET /search | PASS | 400 Bad Request — DTO `@MinLength(2)` |
| 15 | `q` que des espaces | GET /search/universal | PASS | 400 (trim + length check) |
| 16 | `q` > 200 chars | GET /search/universal | PASS | 400 Bad Request — DTO `@MaxLength(200)` |
| 17 | `q` avec XSS `<script>` | GET /search/universal | PASS | Traite comme texte, pas d'execution |
| 18 | `q` avec SQL injection | GET /search/universal | PASS | Tagged template Prisma echappe |
| 19 | `q` avec backticks SQL | GET /search/universal | PASS | Retourne vide proprement |
| 20 | `q` avec null bytes `%00` | GET /search/universal | PASS | Nettoye par `query.replace(/\0/g, '')` |
| 21 | `q` avec newlines `%0A%0D` | GET /search/universal | PASS | Traite comme texte normal |
| 22 | `q` avec emojis | GET /search/universal | PASS | Embedding semantique applique |
| 23 | `q` avec unicode RTL (arabe) | GET /search/universal | PASS | Retourne vide proprement |
| 24 | `q` avec percent encoding casse | GET /search/universal | PASS | 200 OK |
| 25 | Params extras (`evil=true&admin=1`) | GET /search/universal | PASS | 400 Bad Request — `forbidNonWhitelisted` rejette |
| 26 | SQL injection dans `sector` | GET /search?sector=FINTECH'-- | PASS | Prisma.sql echappe |
| 27 | Path traversal dans `city` | GET /search?city=../../../../etc/passwd | PASS | Traite comme string LIKE |

### C. Etat et coherence des donnees

| # | Scenario | Endpoint/Service | Resultat | Detail |
|---|----------|-----------------|----------|--------|
| 28 | SearchLog.create echoue | searchUniversal() | PASS | Fire-and-forget `.catch()` |
| 29 | SearchLog.create echoue | search() | PASS | Fire-and-forget `.catch()` |

### D. Pagination & Listes

| # | Scenario | Endpoint/Service | Resultat | Detail |
|---|----------|-----------------|----------|--------|
| 30 | Aucun resultat | GET /search/universal?q=xyzzy123 | PASS | `{projects:[], people:[], skills:[]}` |

### F. Reseau & Performance

| # | Scenario | Endpoint/Service | Resultat | Detail |
|---|----------|-----------------|----------|--------|
| 31 | Jina AI (embedding) timeout | searchUniversal() | PASS | Timeout 2s, fallback texte |
| 32 | Jina AI (embedding) timeout | search() | PASS | Try/catch + timeout 3s, retourne vide |
| 33 | Requete vectorielle timeout | search() | PASS | `Promise.race` 3s |
| 34 | Requetes concurrentes | 2x search/universal | PASS | Resultats identiques, pas de corruption |
| 35 | Query complexe longue (15 mots) | GET /search | PASS | 200 OK en 1.12s |
| 36 | Rate limiting | 20 requetes rapides | PASS | 429 apres ~15 (conforme @Throttle) |
| 37 | Recherche accents FR ("sante medecine") | GET /search/universal | PASS | Trouve MediLink HEALTHTECH |

---

## Problemes critiques a corriger

> Aucun probleme critique detecte. Tous les correctifs ont ete appliques.

---

## Score de robustesse

| Categorie | PASS | FAIL | Score |
|-----------|------|------|-------|
| Auth & Authz | 9 | 0 | 9/9 |
| Validation | 18 | 0 | 18/18 |
| Coherence donnees | 2 | 0 | 2/2 |
| Pagination | 1 | 0 | 1/1 |
| Reseau & Perf | 7 | 0 | 7/7 |
| **TOTAL** | **37** | **0** | **37/37 (100%)** |
