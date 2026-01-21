# Cursor Commands - iamthelaw

Commandes Cursor pour gérer les règles de développement avec iamthelaw.

## 📋 Commandes disponibles

### 🆕 `iamthelaw-setup-ruleset`
**Créer un nouveau ruleset**

Utilise cette commande pour créer un nouveau ruleset de règles (ex: security, performance, api-design).

**Quand l'utiliser** :
- Tu veux créer un nouveau type de règles
- Tu veux regrouper des best practices spécifiques
- Tu veux standardiser une nouvelle pratique de dev

**Ce que ça fait** :
1. Te guide dans la définition des règles
2. Crée le fichier `ruleset.yaml` avec la bonne structure
3. Active le ruleset dans la configuration
4. Régénère `ENTRY.md`

---

### ✏️ `iamthelaw-update-ruleset`
**Modifier un ruleset existant**

Utilise cette commande pour ajouter, modifier ou supprimer des règles dans un ruleset existant.

**Quand l'utiliser** :
- Tu veux ajouter une nouvelle règle à un ruleset
- Tu veux changer le niveau d'une règle (MUST → SHOULD, etc.)
- Tu veux clarifier ou améliorer une règle existante
- Tu veux supprimer une règle obsolète

**Ce que ça fait** :
1. Liste les rulesets disponibles
2. T'aide à modifier le fichier `ruleset.yaml`
3. Régénère `ENTRY.md` avec les changements

---

### 💾 `iamthelaw-commit`
**Créer des commits structurés**

Utilise cette commande pour créer des commits bien formatés selon les conventions du projet.

**Quand l'utiliser** :
- Tu as fait des changements et tu veux commiter
- Tu veux des commits clairs et bien organisés
- Tu ne sais pas comment structurer ton message de commit

**Ce que ça fait** :
1. Analyse les changements (git status, git diff)
2. Regarde les derniers commits pour suivre le style
3. Propose des messages de commit adaptés
4. Suggère de splitter en plusieurs commits si nécessaire
5. Exécute les commits avec les bonnes commandes

**Format des commits** :
```
<type>(<scope>): <description>

[body optionnel avec détails]
```

Types : `feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `style`, `perf`

Scopes courants : `infra`, `rules`, `features`, `ci`, `deps`, `config`

---

## 🎯 Workflow typique

### Créer un nouveau ruleset

```bash
1. Cursor > Commands > "iamthelaw-setup-ruleset"
2. Suivre les instructions
3. Vérifier ENTRY.md
4. Cursor > Commands > "iamthelaw-commit"
```

### Modifier une règle existante

```bash
1. Cursor > Commands > "iamthelaw-update-ruleset"
2. Sélectionner le ruleset
3. Faire les modifications
4. Vérifier ENTRY.md
5. Cursor > Commands > "iamthelaw-commit"
```

## 📁 Structure des rulesets

```
.iamthelaw/
├── config/
│   └── iamthelaw.yaml          # Configuration (rulesets activés)
├── core/
│   └── rulesets/
│       ├── architecture/       # Architecture patterns
│       ├── ci-cd/             # CI/CD practices
│       ├── clean-code/        # Clean Code principles
│       ├── development/       # Development workflow
│       ├── hexagonal/         # Hexagonal architecture
│       ├── testing/           # Testing practices
│       └── typescript-2026/   # TypeScript best practices
└── ENTRY.md                    # Point d'entrée (généré auto)
```

## 📝 Format d'un ruleset

```yaml
name: nom-du-ruleset
version: "1.0.0"
description: Description courte
tags: [tag1, tag2]

rules:
  - id: rule-id-kebab-case
    title: Title of the Rule
    level: MUST  # MUST | SHOULD | MAY
    content: |
      - Description de la règle
      - Points clés
      - Exemples si nécessaire
```

## 🎨 Niveaux de règles

| Emoji | Niveau | Signification | Usage |
|-------|--------|---------------|-------|
| 🔴 | **MUST** | Non négociable | Sécurité, architecture critique |
| 🟡 | **SHOULD** | Recommandé | Best practices, conventions |
| 🟢 | **MAY** | Optionnel | Suggestions, cas particuliers |

## 💡 Tips

- **Une règle = un comportement** : Évite les règles trop larges
- **Exemples concrets** : Ajoute des exemples pour les règles complexes
- **Justification** : Explique le "pourquoi" pas juste le "quoi"
- **Cohérence** : Suis le style des rulesets existants
- **Versioning** : Incrémente la version sur changements majeurs

## 🔗 Liens utiles

- [.iamthelaw/README.md](../../.iamthelaw/README.md) - Documentation complète iamthelaw
- [.iamthelaw/core/rulesets/README.md](../../.iamthelaw/core/rulesets/README.md) - Format des rulesets
- [.iamthelaw/ENTRY.md](../../.iamthelaw/ENTRY.md) - Règles actives

---

**Note** : Ces commandes suivent le même pattern que les commandes lifefindsaway (brainstorm, create-epic, etc.).
