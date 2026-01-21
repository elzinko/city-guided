# Bugs Documentation

Ce répertoire contient les rapports de bugs documentés en Phase A (exploration).

## Philosophie

- Les bugs sont **documentés** mais **non trackés dans `planning.md`**
- Ils servent de **base de connaissance** pour comprendre les problèmes rencontrés
- La résolution peut être planifiée séparément via une Feature dédiée

## Structure d'un bug

Chaque bug dispose de son propre répertoire avec le format :

```
YYYYMMDDHHMMSS-bug-<slug>/
├── bug.md          # Rapport principal (obligatoire)
└── notes.md        # Notes complémentaires (optionnel)
```

## Créer un bug

### Méthode 1 : Via la commande Cursor

1. Ouvrir la palette de commandes dans Cursor (`Cmd+Shift+P` ou `Ctrl+Shift+P`)
2. Chercher "Report Bug"
3. Suivre les instructions de l'agent

### Méthode 2 : Manuellement

1. Créer un répertoire avec le format `YYYYMMDDHHMMSS-bug-<slug>/`
2. Copier le template depuis `../templates/bug.md`
3. Remplir les sections avec les informations du bug

## Template

Le template de bug contient les sections suivantes :

- **Identifiant** : Nom court du bug
- **Résumé** : Description courte et claire
- **Environnement** : Version, navigateur, OS, contexte
- **Comportement observé** : Ce qui se passe actuellement
- **Comportement attendu** : Ce qui devrait se passer
- **Étapes de reproduction** : Comment reproduire le bug
- **Impact** : Criticité et utilisateurs affectés
- **Pistes de diagnostic** : Hypothèses sur la cause
- **Composants concernés** : Fichiers/modules impliqués
- **Screenshots/Logs** : Preuves visuelles (optionnel)
- **Workaround** : Solution temporaire (optionnel)
- **Notes** : Informations supplémentaires

## Cycle de vie

1. **Documentation** : Création du rapport dans `bugs/`
2. **Référencement** : (optionnel) Lien dans une Feature/Epic concernée
3. **Planification** : (optionnel) Création d'une Feature dédiée au fix
4. **Résolution** : Implémentation du fix
5. **Archive** : Le bug reste documenté pour historique

## Criticité

- **Bloquant** : Empêche l'utilisation de l'application
- **Majeur** : Fonctionnalité importante cassée
- **Mineur** : Gêne dans l'utilisation
- **Cosmétique** : Problème visuel sans impact fonctionnel

## Exemples

```
bugs/
├── 20260121190427-bottomsheet-close-discover/
│   └── bug.md
├── 20260122100000-search-filter-crash/
│   ├── bug.md
│   ├── notes.md
│   └── screenshot.png
└── 20260123150000-map-markers-overlap/
    └── bug.md
```

## Conventions

- Préfixer toujours avec `bug-` dans le slug
- Utiliser des slugs descriptifs et courts
- Le nom du répertoire ne change jamais
- Un bug = un répertoire
