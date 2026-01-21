# I AM THE LAW ⚖️

> *"I am the law!"* — Judge Dredd

Point d'entrée unique pour tous les LLM/agents conversationnels.

## How to Read

- **🔴 MUST / DOIT** : Non-negotiable requirement
- **🟡 SHOULD / DEVRAIT** : Recommended, exceptions must be justified
- **🟢 MAY / PEUT** : Optional, use when beneficial

## Instructions pour les LLM

Les modules listés ci-dessous contiennent les règles à appliquer. Vous **DEVEZ** :

1. Lire le fichier `ruleset.yaml` de chaque module activé au démarrage
2. Appliquer les règles selon leur niveau (MUST/SHOULD/MAY)
3. Ne pas réinventer des règles qui existent déjà dans les modules

## Modules activés

### clean-code (v1.0.0) [core]

Clean Code principles by Robert C. Martin

- **Règles** : 5 règles
- **Fichier** : [clean-code/ruleset.yaml](core/rulesets/clean-code/ruleset.yaml)

### hexagonal (v1.0.0) [core]

Hexagonal Architecture (Ports & Adapters) principles

- **Règles** : 5 règles
- **Fichier** : [hexagonal/ruleset.yaml](core/rulesets/hexagonal/ruleset.yaml)

### typescript-2026 (v1.0.0) [core]

TypeScript best practices for modern projects (2026)

- **Règles** : 6 règles
- **Fichier** : [typescript-2026/ruleset.yaml](core/rulesets/typescript-2026/ruleset.yaml)

### architecture (v1.0.0) [core]

Architecture principles for scalable and maintainable applications

- **Règles** : 9 règles
- **Fichier** : [architecture/ruleset.yaml](core/rulesets/architecture/ruleset.yaml)

### development (v1.0.0) [core]

Development workflow rules for rapid feedback and quality

- **Règles** : 7 règles
- **Fichier** : [development/ruleset.yaml](core/rulesets/development/ruleset.yaml)

### ci-cd (v1.0.0) [core]

CI/CD workflow and debugging rules

- **Règles** : 6 règles
- **Fichier** : [ci-cd/ruleset.yaml](core/rulesets/ci-cd/ruleset.yaml)

### testing (v1.0.0) [core]

Testing rules for web applications with browser automation

- **Règles** : 4 règles
- **Fichier** : [testing/ruleset.yaml](core/rulesets/testing/ruleset.yaml)

### Personal Preferences (v1.0.0) [custom]

Personal development preferences and workflow rules

- **Règles** : 1 règle
- **Fichier** : [personal-preferences/ruleset.yaml](modules/custom/personal-preferences/ruleset.yaml)