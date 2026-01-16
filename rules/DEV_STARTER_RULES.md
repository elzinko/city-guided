# Dev Rules

Règles de développement destinées à garder un cycle de feedback rapide, éviter les itérations “à l’aveugle” en CI, et documenter proprement les contournements/décisions.

## 1) Feedback loop (local-first)

- **DOIT** : reproduire et/ou valider **en local** avant de déclencher une pipeline ou de relancer des jobs CI pour “voir si ça passe”.
- **DOIT** : privilégier les vérifications **les plus proches du changement** (tests ciblés) avant de lancer toute la suite.
- **DEVRAIT** : disposer d’un “smoke test de démarrage” local (ex: démarrer les services + vérifier healthchecks) avant push.
- **NE DOIT PAS** : “spam” de relances CI sans changement significatif ni hypothèse testée localement.

## 2) Gestion des blocages (stop & inform)

- **DOIT** : si un problème résiste et qu’on n’arrive pas à le corriger proprement, **suspendre les modifications** et **m’informer** :
  - ce qui est bloquant (symptôme),
  - ce qui a été essayé,
  - ce qui reste incertain.
- **DOIT** : proposer explicitement une suite :
  - **continuer** (avec un timebox), ou
  - **alternative**/contournement (pour livrer/avancer), ou
  - **réduction de scope**.
- **DEVRAIT** : timeboxer les investigations avant d’élargir le périmètre des changements.

## 3) Contournements & décisions (traçabilité)

- **NE DOIT PAS** : introduire un contournement “silencieux” sans explication.
- Quand un contournement est nécessaire (ou une décision non évidente) :
  - **DOIT** : ajouter un commentaire **en anglais** au plus près du code concerné expliquant :
    - le contexte,
    - le compromis,
    - les alternatives envisagées (au moins 1),
    - pourquoi ce choix est acceptable **pour maintenant**.
  - **DEVRAIT** : créer un document dans `choices/` décrivant la décision, et **lier** ce document depuis le commentaire.

Exemple de commentaire attendu (à adapter) :
```ts
// WORKAROUND: <short summary>
// Context: <why this exists>
// Trade-off: <what we accept / what we lose>
// Alternatives: <option A>, <option B>
// Decision record: choices/0001-short-title.md
```

## 4) Tests (philosophie)

- **DOIT** : corriger un bug avec un test qui le capture (quand c’est réaliste et stable).
- **DOIT** : garder une séparation claire :
  - tests unitaires (rapides) pour le domaine,
  - tests d’intégration pour les adapters,
  - E2E pour les parcours critiques.
- **NE DOIT PAS** : désactiver des tests pour “aller plus vite” sans plan de réactivation.
- **DEVRAIT** : maintenir un smoke test “ça démarre” (même minimal) car il évite beaucoup d’allers-retours CI.

## 5) Scripts & exécution (source de vérité)

- **DOIT** : préférer les scripts projet (ex: scripts npm/pnpm) plutôt que des commandes ad-hoc, afin d’avoir un cycle de vie reproductible.
- Si des scripts d’exploitation existent (ex: `infra/docker/scripts/*`) :
  - **DOIVENT** être l’interface standard utilisée par les scripts npm/pnpm,
  - **DEVRAIENT** gérer le cycle de vie par environnement (`local|ci|staging|prod`),
  - **DEVRAIENT** centraliser `setup/start/stop/logs/wait/deploy`.

## 6) Qualité & cohérence (garde-fous)

- **DOIT** : appliquer lint/format/type-check avant push quand le repo les utilise.
- **DEVRAIT** : faire des changements petits et réversibles (PRs/commits focalisés).
- **NE DOIT PAS** : mélanger refactor massif + fix comportemental sans nécessité (difficile à reviewer et à débug).

## 7) Utilisation de Playwright MCP

- **DOIT** : Utiliser Playwright MCP uniquement si nécessaire (coût en tokens élevé).
- **DOIT** : Demander l'approbation de l'utilisateur avant d'utiliser Playwright MCP.
- **DOIT** : L'utiliser de manière minimale (le plus léger possible), sauf si c'est vraiment nécessaire et approuvé par l'utilisateur.

## 8) Règles déjà appliquées dans ce repo (si présentes)

Ces points reflètent des garde-fous/outils typiquement présents dans un projet comme celui-ci :

- **Hook de pre-commit** : exécute une mini CI locale (build/tests/type-check/lint) et bloque le commit en cas d’échec.
- **CI** : exécute build/tests, puis démarre l’environnement Docker et lance des tests end-to-end via un point d’entrée HTTP.
- **Monorepo scripts** : une commande racine orchestre build/test/type-check via l’outil de monorepo (ex: turbo).
- **Scripts Docker** : `pnpm docker:*` appelle des scripts `infra/docker/scripts/*` pour standardiser le cycle de vie (setup/start/stop/logs/wait/deploy).

