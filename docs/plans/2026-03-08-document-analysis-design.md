# Design : Analyse de document projet avec synthese IA

> Date : 2026-03-08
> Statut : Approuve

## Flux

1. Fondateur upload doc (PDF/Word, max 10MB)
2. Projet cree en statut `ANALYZING`, document stocke, reponse immediate
3. Background : DeepSeek analyse le document, extrait 6 blocs + champs structures
4. Notification "Analyse terminee" → fondateur review/modifie chaque bloc
5. Publication → visiteur voit : synthese + PDF viewer + bouton telecharger

## Modele de donnees

Nouveaux champs sur Project :
- `documentUrl String?` — URL du document stocke
- `documentName String?` — nom original du fichier
- `documentMimeType String?` — type MIME
- `aiSummary Json?` — 6 blocs { problem, solution, market, traction, team, cofounder }

Nouveau statut : `ANALYZING` dans ModerationStatus

## Stockage documents

DocumentStorageService avec 2 strategies :
- Dev : fichier local `api/uploads/documents/{projectId}.ext`
- Prod : MinIO bucket `documents/`

Selection via NODE_ENV.

## Traitement IA asynchrone

DocumentAnalysisService.analyze(projectId) :
1. Lit le document (PDF natif ou Word→texte via mammoth)
2. Appelle DeepSeek (prompt 6 blocs + champs structures)
3. Sauvegarde aiSummary en base
4. Statut → PENDING_REVIEW + notification fondateur
5. Echec → ANALYSIS_FAILED + notification erreur

## Ecran review fondateur

Page `/my-project/[slug]/review` :
- 6 cartes editables (textarea pre-rempli)
- Bouton "Regenerer" par bloc
- Bouton "Publier" → PUBLISHED
- Apercu temps reel

## Page visiteur

- Zone haute : hero + 6 sections synthese (aiSummary)
- Zone basse : PDF viewer integre + bouton telecharger

## DeepSeek

- Endpoint : https://api.deepseek.com (OpenAI-compatible)
- Modele : deepseek-chat
- Fallback : Claude → GPT-4o
- Cle : DEEPSEEK_API_KEY dans .env

## Notifications

- DOCUMENT_ANALYZED → "Verifiez et publiez votre projet"
- DOCUMENT_ANALYSIS_FAILED → "L'analyse a echoue. Reessayez."
