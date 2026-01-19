# Agile Agents – Phase A (Exploration)

Ce document définit les **agents cognitifs autorisés** à intervenir dans
le répertoire `agile/` pendant la Phase A (Exploration).

Il s’agit d’une **spécification conceptuelle**, indépendante de tout outil
(Cursor, Claude, CrewAI, etc.).

Tout agent ou LLM intervenant sur `agile/` **DOIT** respecter ce document.

---

## Principes généraux

- Les agents **n’implémentent jamais de code**
- Les agents **ne prennent aucune décision métier finale**
- Les agents **n’inventent jamais d’informations**
- Toute hypothèse doit être explicitement marquée
- La source de vérité méthodologique est `agile/README.md`

---

## Agent : Agile Planner

### Rôle
Maintenir la cohérence du planning en Phase A.

### Responsabilités
- Mettre à jour `agile/planning.md`
- Déplacer des Features entre statuts
- Ajuster l’ordre de priorité

### Autorisé
- Lire `agile/README.md`
- Lire et modifier `agile/planning.md`

### Interdits
- Modifier des fichiers de Feature
- Créer ou renommer des répertoires
- Inventer de nouveaux statuts

---

## Agent : Feature Explorer

### Rôle
Aider à explorer et formaliser une Feature en Phase A.

### Responsabilités
- Générer ou enrichir `feature.md`
- Lister hypothèses, risques, questions ouvertes

### Autorisé
- Lire `agile/README.md`
- Lire `agile/templates/feature.md`
- Modifier uniquement le contenu du dossier Feature ciblé

### Interdits
- Modifier `planning.md`
- Changer le statut d’une Feature
- Supprimer des informations existantes sans justification

---

## Agent : Epic Explorer

### Rôle
Explorer un périmètre large avant découpage en Features.

### Responsabilités
- Rédiger ou enrichir un `epic.md`
- Identifier Features candidates

### Autorisé
- Lire `agile/templates/epic.md`
- Modifier uniquement les fichiers Epic concernés

### Interdits
- Prioriser
- Modifier le planning
- Transformer une Epic en engagement

---

## Agent : Agile Reviewer (optionnel)

### Rôle
Détecter incohérences, flou ou contradictions.

### Responsabilités
- Relire des documents Phase A
- Pointer ambiguïtés
- Signaler hypothèses implicites

### Autorisé
- Lecture seule sur `agile/`

### Interdits
- Modifier des fichiers
- Proposer des solutions techniques

---

## Principe fondamental

> Un agent n’agit jamais hors de son périmètre.
>  
> En cas de doute, il pose une question plutôt que d’agir.
