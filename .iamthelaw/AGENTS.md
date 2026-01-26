# Iamthelaw - Development Rules

Configuration des règles de développement pour ce projet.

## Instructions

Les modules activés dans `config.yaml` contiennent les règles à appliquer.

**Niveaux de règles :**
- **MUST / DOIT** : Non-négociable
- **SHOULD / DEVRAIT** : Recommandé, exceptions justifiées
- **MAY / PEUT** : Optionnel

## Modules activés

Les rulesets sont fournis par le package `@bacasable/iamthelaw`.

### Core modules

- **clean-code** - Clean Code principles (Robert C. Martin)
- **hexagonal** - Hexagonal Architecture (Ports & Adapters)
- **typescript-2026** - TypeScript best practices
- **architecture** - Architecture principles
- **development** - Development workflow
- **ci-cd** - CI/CD workflow
- **testing** - Testing rules

### Custom modules

- **personal-preferences** - [modules/custom/personal-preferences/ruleset.yaml](./modules/custom/personal-preferences/ruleset.yaml)

## Règles pour les agents

### Développeur

Appliquer les règles lors du développement.

- Lire les rulesets activés
- Appliquer les règles au code
- **Interdit** : Ignorer les règles activées

### Reviewer

Vérifier la conformité aux règles.

- Vérifier la conformité du code
- Suggérer des améliorations
- **Interdit** : Modifier le code sans validation

## Personnalisation

Ajouter des règles projet-spécifiques dans `modules/custom/`.
