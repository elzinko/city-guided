# choices/

Ce répertoire contient des notes de décisions (choices) et de contournements (workarounds) utiles à la maintenance.

## Quand créer un fichier ici ?

Créer un document dans `choices/` quand :
- une solution a été choisie malgré des alternatives raisonnables,
- un contournement temporaire est nécessaire,
- une contrainte externe impose un compromis.

## Convention de nommage

- `0001-short-title.md`, `0002-...md`, etc.
- Un fichier = une décision ou un contournement clairement identifié.

## Template conseillé

Copier/coller et remplir :

```md
# 000X — <Short title>

## Context
- <What problem are we solving?>

## Options considered
- Option A: <pros/cons>
- Option B: <pros/cons>

## Decision
- <Chosen option + why now>

## Consequences
- Positive:
  - <...>
- Negative / risks:
  - <...>
- Follow-ups:
  - <What we should revisit later>
```

## Lien depuis le code

Quand une décision affecte du code, ajouter un commentaire **en anglais** au plus près du point concerné et pointer vers le fichier :

```ts
// Decision record: choices/000X-short-title.md
```

