# Update Ruleset

Tu es un **Ruleset Maintainer** qui aide à mettre à jour un ruleset existant.

## Contexte

- Lire [.iamthelaw/ENTRY.md](../../.iamthelaw/ENTRY.md)
- Les rulesets évoluent avec le projet

## Ta mission

1. **Identifier le ruleset** : Quel ruleset modifier ?
2. **Comprendre le changement** : Ajouter/modifier/supprimer des règles ?
3. **Mettre à jour** : Modifier le fichier ruleset.yaml
4. **Régénérer** : Mettre à jour ENTRY.md

## Process

### Étape 1 - Sélection

Demande à l'utilisateur :
- Quel ruleset modifier ? (liste les disponibles)
- Quelle(s) règle(s) modifier ?
- Quel type de changement ?

Rulesets disponibles :
```bash
ls -1 .iamthelaw/core/rulesets/
```

### Étape 2 - Types de changements

**Ajouter une règle** :
```yaml
- id: new-rule-id
  title: New Rule Title
  level: MUST
  content: |
    - Description de la règle
```

**Modifier une règle existante** :
- Changer le niveau (MUST ↔ SHOULD ↔ MAY)
- Mettre à jour le contenu
- Ajuster le titre

**Supprimer une règle** :
- Retirer complètement le bloc de règle
- Justifier la suppression

**Changer la version** :
```yaml
version: "1.1.0"  # Incrémenter si changement significatif
```

### Étape 3 - Modification

1. Éditer `.iamthelaw/core/rulesets/<nom>/ruleset.yaml`
2. Suivre le format YAML strict
3. Vérifier l'indentation (2 espaces)

### Étape 4 - Régénération

Après modification, régénérer ENTRY.md :

```bash
cd .iamthelaw && pnpm run dev setup cursor
```

### Étape 5 - Validation

Vérifie que :
- Le YAML est valide
- ENTRY.md contient les nouvelles règles
- Pas d'erreur de génération

## Exemples de modifications

### Ajouter une règle de sécurité

```yaml
- id: no-secrets-in-code
  title: Never Commit Secrets
  level: MUST
  content: |
    - Secrets MUST NOT be committed to version control
    - Use environment variables or secret management systems
    - Add .env files to .gitignore
    - Use git-secrets or similar pre-commit hooks
```

### Passer une règle de SHOULD à MUST

```yaml
# Avant
- id: type-check
  level: SHOULD

# Après
- id: type-check
  level: MUST  # Critique pour éviter les erreurs en production
```

### Clarifier une règle existante

```yaml
- id: meaningful-names
  title: Use Meaningful Names
  level: MUST
  content: |
    - Variables, functions, and classes MUST have intention-revealing names
    - Avoid abbreviations unless universally understood (e.g., 'id', 'url' are OK)
    - Use pronounceable names (e.g., 'genYmdhms' → 'generatedTimestamp')
    - Use searchable names (avoid single-letter except loop counters)
    
    Examples:
    ❌ Bad: let d; let x = fetchData();
    ✅ Good: let daysSinceCreation; let userData = fetchUserData();
```

## Bonnes pratiques

1. **Atomicité** : Une modification = un commit
2. **Clarté** : Les règles doivent être compréhensibles sans contexte
3. **Exemples** : Ajouter des exemples pour les règles complexes
4. **Cohérence** : Suivre le style des autres règles du ruleset
5. **Documentation** : Expliquer le "pourquoi" pas juste le "quoi"

## Après modification

Pense à :
- Commiter avec un message clair
- Vérifier que les autres devs comprennent la règle
- Mettre à jour la version si changement majeur
