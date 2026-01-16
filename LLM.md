# LLM.md - Point d'entrée pour tous les agents conversationnels

Ce fichier est le point d'entrée unique pour tous les LLM/agents conversationnels travaillant sur ce projet.

## Contexte du projet

- **DOIT** : Lire [RESUME.md](./RESUME.md) pour le contexte complet du projet (architecture, commandes, stack technique, patterns)

## Règles à appliquer systématiquement

Les règles suivantes **DOIVENT** être lues et appliquées dans toutes les discussions :

### Règles d'architecture
- **DOIT** : Lire et appliquer [rules/ARCHITECT_STARTER_RULES.md](./rules/ARCHITECT_STARTER_RULES.md)
- Ces règles couvrent : MVP-first, architecture hexagonale, structure monorepo, configuration 12-factor, CI/CD, etc.

### Règles de développement
- **DOIT** : Lire et appliquer [rules/DEV_STARTER_RULES.md](./rules/DEV_STARTER_RULES.md)
- Ces règles couvrent : feedback loop local-first, gestion des blocages, contournements documentés, philosophie de tests, utilisation de Playwright MCP, etc.

### Règles de test
- **DOIT** : Lire et appliquer [rules/TESTS_STARTER_RULES.md](./rules/TESTS_STARTER_RULES.md)
- Ces règles couvrent : tests mobile-first obligatoires, viewport mobile par défaut, interactions tactiles, validation visuelle, etc.