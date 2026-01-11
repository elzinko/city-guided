# Règles d’architecture (à joindre à un prompt d’architecte)

## Comment lire ces règles

- **DOIT** : contrainte non négociable (sauf décision explicite documentée).
- **DEVRAIT** : recommandé ; écart possible si justifié.
- **PEUT** : optionnel ; à activer uniquement si ça sert le MVP ou réduit le risque.

## Intention produit (MVP d’abord)

- Le design **DOIT** viser un **MVP le plus simple possible** (time-to-first-feature) tout en **préservant l’évolutivité**.
- Le design **NE DOIT PAS** sur-optimiser pour des contraintes non prouvées (charge, haute dispo, microservices, cache distribué, etc.).
- Si une contrainte technique peut être **abstraite / reportée** sans mettre en danger la trajectoire produit, elle **DOIT** être reportée (accélérer le dev).

## Organisation du repo (structure “conceptuelle”)

- Le codebase **DOIT** séparer conceptuellement :
  - **applications** (entrypoints / livraison),
  - **services runtime** (API/worker),
  - **librairies partagées** (réutilisables, pures),
  - **infra** (exécution/déploiement).
- Si la stack est **JS/TS monorepo** (workspaces), la structure **DEVRAIT** être :
  - `apps/` (UI, backoffice, CLI, etc.)
  - `services/` (API, workers)
  - `packages/` (domain, libs partagées)
  - `infra/` (docker, provisioning IaC, scripts)
- Si la stack n’est **pas** JS/TS monorepo, l’arborescence **PEUT** différer, mais elle **DOIT** conserver ces **4 concepts** (même si les noms changent).

## Architecture applicative (hexagonale / ports & adapters)

- Le **domaine** (entités, règles métier, use-cases) **DOIT** être :
  - indépendant des frameworks,
  - testable sans I/O,
  - stable face aux changements d’adapters.
- Les dépendances externes (persistence, HTTP, providers, systèmes tiers) **DOIVENT** être inversées via des **ports** (interfaces) définis côté domaine/application.
- Les adapters (HTTP/controllers, DB repositories, clients externes) **DOIVENT** vivre côté **infrastructure**.
- Le wiring (assemblage ports/adapters, injection, lecture de config) **DOIT** se faire au **bord** (entrypoint du service/app), pas dans le domaine.
- Les librairies partagées (`packages/*` ou équivalent) **NE DOIVENT PAS** lire des variables d’environnement directement ; la configuration **DOIT** venir des apps/services.

## Données & persistance (MVP)

- Le MVP **PEUT** démarrer avec une persistance simple (en mémoire, fichier, mock), mais :
  - l’accès aux données **DOIT** passer par un **port** (repository interface),
  - l’implémentation concrète (in-memory, fichier, DB) **DOIT** être un adapter remplaçable.
- Le design **NE DOIT PAS** imposer une “vraie DB” ou un cache dès le départ si le produit n’en a pas besoin.
- La transition vers une DB plus tard **DEVRAIT** être une substitution d’adapter, pas une réécriture du domaine.

## Configuration, secrets, et 12-factor

- La configuration runtime **DOIT** être fournie via variables d’environnement (ou mécanisme équivalent au runtime).
- Les secrets **NE DOIVENT PAS** être committés ; un template de configuration **DOIT** exister (sans secrets).
- Les secrets **DEVRAIENT** être distingués (ex: préfixe `SECRET_`), afin de faciliter :
  - stockage chiffré (secret manager / parameter store),
  - audit et rotation.
- Les logs **DOIVENT** sortir sur stdout/stderr, et être exploitables en local/CI/prod (format lisible ou structuré).

## Conteneurisation & exécution locale

- Le template **DOIT** permettre un démarrage reproductible en local (idéalement “one-command”).
- Si Docker est utilisé :
  - la configuration par environnement **DEVRAIT** être basée sur des fichiers `.env.<env>` (ou équivalent) avec un `.env.template` versionné,
  - les services critiques **DEVRAIENT** exposer des endpoints de healthcheck utilisés par Compose/CI.
- Un fichier d’override dédié au build (ex: `docker-compose.build.yml`) **PEUT** exister, mais **N’EST PAS obligatoire** :
  - si un seul `docker-compose.yml` peut couvrir “pull & run” et “build & run” via commandes/variables, c’est acceptable,
  - sinon, un override reste une solution simple et lisible.
- Un reverse-proxy/ingress unique en entrée **PEUT** être utilisé (TLS, un seul point d’accès, routing), mais **N’EST PAS une contrainte** : choisir l’option la plus adaptée (reverse-proxy, API gateway, exposition directe).

## Scripts d’exploitation (DX & runbooks)

- Le template **DEVRAIT** fournir des scripts d’exploitation (bash ou équivalent) pour gérer le cycle de vie :
  - `setup`, `start`, `stop`, `logs`, `wait`, `deploy`, `clean` (noms adaptables).
- Ces scripts **DOIVENT** être appelés par les scripts du gestionnaire de projet (ex: scripts npm/pnpm) et constituer l’interface standard d’exécution.
- Les scripts **DEVRAIENT** accepter un paramètre d’environnement (`local|ci|staging|prod`) et appliquer la config correspondante (`.env.<env>` ou store de config).

## CI/CD (sans présumer du fournisseur)

- La CI **DOIT** couvrir au minimum : lint + build + tests unitaires + type-check (si typage).
- La CI **DEVRAIT** exécuter un **smoke test de démarrage** (preuve que “ça boot”) :
  - démarrer l’application (docker ou mode dev),
  - attendre la disponibilité (healthchecks),
  - vérifier quelques endpoints essentiels.
- Les E2E **PEUVENT** être exécutés :
  - dans le même job après build + démarrage, **ou**
  - dans un job séparé (si durée/coût plus élevés).
- Si des images sont construites, la stratégie **DEVRAIT** supporter :
  - tag immuable (commit SHA),
  - éventuellement un tag “latest” (ou équivalent),
  - et un chemin de déploiement qui **réutilise** ces artefacts (pas de rebuild côté cible, sauf choix explicite).

## Provisioning / déploiement (générique, sans supposer EC2/K8S)

- Un environnement de staging **DEVRAIT** être provisionné via IaC (outil au choix) pour éviter le drift.
- La config et les secrets **DEVRAIENT** être centralisés (secret manager / parameter store), avec une convention de nommage stable (ex: `/<project>/<env>/*`).
- Le déploiement **DEVRAIT** éviter le SSH “à la main” :
  - privilégier un mécanisme d’exécution distante authentifié (agent, session manager, runner, etc.),
  - et des scripts idempotents.

## Définition de “starter template prêt” (DoD)

- Démarrage local reproductible (1 commande) + healthchecks.
- Domaine isolé et testable ; adapters substituables.
- Gestion de config/secrets non committée + template versionné.
- CI minimale opérationnelle + smoke test de boot.
- Documentation courte : comment run, comment tester, comment déployer (staging).

