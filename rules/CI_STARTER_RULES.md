# CI Rules

Règles pour la gestion de la CI/CD et le débogage des builds qui échouent.

## 1) Investigation des builds qui cassent

- **DOIT** : Quand un build CI échoue, **DOIT** utiliser le MCP GitHub pour examiner les logs et détails de l'échec.
- **DOIT** : En priorité, essayer de reproduire le problème **en local** avec les commandes npm/pnpm disponibles dans les fichiers `package.json` (à la racine et dans les sous-dossiers).
- **DOIT** : Utiliser les mêmes commandes que celles exécutées en CI pour garantir la reproductibilité.
- **NE DOIT PAS** : Relancer un build CI sans avoir tenté de reproduire le problème localement, sauf si le problème est clairement lié à l'environnement CI uniquement.
- **DEVRAIT** : Documenter les différences entre l'environnement local et CI si le problème ne peut pas être reproduit localement.

## 2) Commandes de reproduction locale

- **DOIT** : Consulter le fichier `package.json` à la racine pour identifier les scripts disponibles.
- **DOIT** : Consulter les `package.json` des sous-dossiers (apps, services, packages) pour les commandes spécifiques.
- **DOIT** : Utiliser les scripts npm/pnpm définis dans ces fichiers plutôt que d'exécuter directement les commandes sous-jacentes.
- **DEVRAIT** : Vérifier le workflow CI (`.github/workflows/*.yml`) pour comprendre exactement quelles commandes sont exécutées.

## 3) Workflow de correction

1. **Investigation** : Utiliser MCP GitHub pour examiner les logs d'échec
2. **Reproduction locale** : Tenter de reproduire avec les scripts npm/pnpm du projet
3. **Correction** : Appliquer le correctif
4. **Validation locale** : Vérifier que le problème est résolu localement
5. **Push** : Pousser les changements et vérifier que la CI passe
