---
description: 'Workflow orchestré pour le développement de features en Haute Qualité (TDD + Review)'
---

# Code Feature Flow (TDD & Qualité)

Ce workflow orchestre la séquence "Elite" pour garantir un code testé et approuvé.

## Phase 1 : Design & Tests
1. **Découpage**
   - Lancez : `/create-epics-and-stories`
   - *Objectif* : Transformer le besoin en Tickets et Stories claires.

2. **TDD (Test Driven Development)**
   - Lancez : `/testarch-atdd`
   - *Objectif* : Générer les tests d'acceptation *avant* de coder. Ils doivent échouer (RED).

## Phase 2 : Implémentation
3. **Développement**
   - Lancez : `/dev-story`
   - *Objectif* : Coder la feature pour faire passer les tests (GREEN).

## Phase 3 : Validation
4. **Traçabilité**
   - Lancez : `/testarch-trace`
   - *Objectif* : Vérifier que chaque exigence a son test.

5. **Revue de Code**
   - Lancez : `/code-review`
   - *Objectif* : Validation finale par l'IA "Adversarial".
   - *Condition* : Si des retours sont faits, retournez à l'étape 3.
