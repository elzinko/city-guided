# Lifefindsaway - Ideation Configuration

Configuration et données d'idéation pour ce projet.

## Contexte

- Lire [RESUME.md](../RESUME.md) pour le contexte projet
- Consulter [ideation/planning.md](./ideation/planning.md) pour les statuts

## Principes d'idéation

- Les documents peuvent être incomplets, imparfaits, évolutifs
- L'objectif est d'explorer et surfacer les inconnues
- Pas de validation formelle requise en phase exploration

## Règles pour les agents

### Principes généraux

- Les agents **n'implémentent jamais de code**
- Les agents **ne prennent aucune décision métier finale**
- Les agents **n'inventent jamais d'informations**
- Toute hypothèse doit être explicitement marquée
- En cas de doute, poser une question plutôt qu'agir

### Planner

Maintenir la cohérence du planning.

- Lire et modifier `ideation/planning.md`
- Déplacer des Features entre statuts
- Ajuster l'ordre de priorité
- **Interdit** : Modifier des fichiers de Feature/Bug

### Feature Explorer

Explorer et formaliser une Feature.

- Générer ou enrichir `ideation/features/*/feature.md`
- Lister hypothèses, risques, questions ouvertes
- Explorer au moins 2 approches alternatives avant de valider
- **Interdit** : Modifier le planning

### Epic Explorer

Explorer un périmètre large avant découpage.

- Rédiger ou enrichir `ideation/features/*/epic.md`
- Identifier Features candidates
- **Interdit** : Prioriser ou transformer en engagement

### Bug Reporter

Documenter les bugs de manière structurée.

- Créer et enrichir `ideation/bugs/*/bug.md`
- **Interdit** : Implémenter des corrections

## Conventions

### Nommage avec timestamp

Format : `YYYYMMDDHHMMSS-slug`
Exemple : `20260117143012-user-authentication`

### Source de vérité

`ideation/planning.md` est la source unique pour :
- Statut des features
- Priorité relative
- Ordre de traitement

Ne jamais dupliquer ces informations dans les fichiers feature.
