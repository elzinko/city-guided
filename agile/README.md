# Agile Documentation System – Méthode & Conventions

## Objectif du répertoire `agile/`

Ce répertoire contient **la méthode, les règles et les artefacts agiles du projet**, indépendamment :
- des outils (Jira, GitHub, Plane, etc.)
- des agents IA
- des workflows d’implémentation

Il sert de **référence unique** pour :
- l’idéation produit
- la conception fonctionnelle
- la priorisation
- la préparation à une phase de cristallisation (ex. BMAD)

Tout LLM intervenant sur ce projet **doit lire et respecter ce README.md avant de générer ou modifier des fichiers** dans ce répertoire.

---

## Philosophie générale

La méthode est organisée en **deux phases cognitives distinctes** :

### Phase A – Exploration / Idéation
- Objectif : explorer, tester, combler les trous, faire émerger les inconnues
- Documents imparfaits, incomplets, évolutifs
- Hypothèses autorisées et explicitement marquées
- Templates légers
- Discussions libres avec un LLM

### Phase B – Cristallisation (hors périmètre initial)
- Objectif : figer des décisions, tracer les engagements
- Utilisation possible de formats plus stricts (ex. BMAD)
- Les documents issus de la Phase A servent d’input
- Cette phase n’est engagée que lorsque le périmètre est jugé mûr

**Ce répertoire couvre principalement la Phase A**, tout en préparant proprement la transition vers la Phase B.

---

## Structure des répertoires

```
agile/
├── README.md                # Ce document (autorité méthodologique)
├── planning.md              # Vue globale : statuts des Features uniquement
├── templates/
│   ├── epic.md              # Template d'idéation d'Epic
│   ├── feature.md           # Template d'idéation de Feature
│   ├── planning.md          # Template d'initialisation du planning
│   └── task.md              # (optionnel) Template de Task
└── features/
    ├── 20260117100000-epic-mon-epic/           # Epic = répertoire parent
    │   ├── epic.md                              # Description de l'Epic
    │   ├── 20260117100100-feature-a/           # Feature enfant
    │   │   └── feature.md
    │   └── 20260117100200-feature-b/
    │       └── feature.md
    ├── 20260116143012-feature-standalone/      # Feature sans Epic
    │   ├── feature.md
    │   └── notes.md
    └── ...
```

---

## Conventions de nommage des répertoires Feature

Chaque Feature dispose de son propre répertoire.

### Format obligatoire

```
YYYYMMDDHHMMSS-feature-slug/
```

Exemple :
```
20260116143012-automatic-invoice-ingestion/
```

### Règles
- Le préfixe temporel garantit un **tri chronologique stable**
- Le `slug` est court, descriptif, en minuscules, séparé par des tirets
- Le nom du répertoire **ne change jamais**, même si le statut évolue

👉 **Le statut n'est jamais encodé dans le nom du répertoire.**

---

## Epics vs Features

### Epic
- Périmètre large, **contient** plusieurs Features
- Répertoire préfixé : `YYYYMMDDHHMMSS-epic-slug/`
- Fichier principal : `epic.md` (basé sur `templates/epic.md`)
- **Statut dérivé** : une Feature démarrée = Epic démarrée, toutes terminées = Epic terminée
- **Non listé dans `planning.md`** : seules les Features sont trackées

### Feature
- Unité fonctionnelle livrable
- Répertoire préfixé : `YYYYMMDDHHMMSS-feature-slug/`
- Fichier principal : `feature.md` (basé sur `templates/feature.md`)
- Peut être **enfant d'une Epic** (dans son répertoire) ou **standalone**
- **Seul élément tracké** dans `planning.md`

### Structure hiérarchique

```
features/
├── 20260117100000-epic-poi-data-pipeline/     # Epic contenant 2 Features
│   ├── epic.md
│   ├── 20260117100100-poi-admin-import/
│   │   └── feature.md
│   └── 20260117100200-audio-guide-generation/
│       └── feature.md
├── 20260115100000-ecs-fargate-migration/      # Feature standalone
│   └── feature.md
└── 20260116100000-ecs-scale-to-zero/          # Feature standalone
    └── feature.md
```

### Référencement dans `planning.md`

Les Features enfants d'une Epic sont référencées avec leur **chemin complet** :

```md
### exploring
- [ ] 20260117100000-epic-poi-data-pipeline/20260117100100-poi-admin-import
- [ ] 20260117100000-epic-poi-data-pipeline/20260117100200-audio-guide-generation
- [ ] 20260115100000-ecs-fargate-migration
```

👉 **Le statut de l'Epic est implicite** : il découle des statuts de ses Features.

---

## Pas de répertoire `context/`

Le contexte métier est contenu dans :
- Les fichiers `epic.md` et `feature.md` (sections dédiées)
- Les fichiers `notes.md` optionnels
- Le code source lui-même (source de vérité pour l'implémentation)

Le contexte "réel" du projet = code implémenté + features trackées.
Un outil de documentation auto-générée (type Swagger, Storybook) est préférable à une doc manuelle.

---

## Fichiers standards d'une Feature

### `feature.md` (obligatoire)
- Basé sur `templates/feature.md`
- Contient la description principale
- Peut être modifié, enrichi, corrigé

### `notes.md` (optionnel)
- Brainstorming
- Notes libres
- Retours de discussion
- Informations non stabilisées

### `history.md` (optionnel)
- Évolutions majeures
- Décisions prises
- Abandons ou pivots

---

## Gestion des statuts

Les **statuts sont centralisés** et **ne doivent pas être dupliqués ailleurs**.

### Source de vérité
👉 `planning.md` est l’unique source de vérité pour :
- le statut
- la priorité
- l’ordre de traitement

### Statuts autorisés (Phase A)

- `idea` : idée brute, non cadrée
- `exploring` : en cours d’exploration
- `candidate` : suffisamment définie pour être priorisée
- `on_hold` : volontairement mise en pause
- `discarded` : abandonnée (conservée pour historique)
- `ready_for_crystallization` : prête à passer en Phase B (ex. BMAD)

Aucun autre statut ne doit être inventé sans modification explicite de ce README.md.

---

## `planning.md` – Règles et structure

Le fichier `planning.md` :
- référence toutes les Epics et Features actives
- définit les priorités relatives
- contient les statuts

### Exemple de structure recommandée

```md
# Planning Agile

## Règles
- Ce fichier est la source de vérité des statuts et priorités
- Les statuts des Features ne doivent pas être dupliqués ailleurs
- L’ordre dans chaque section représente la priorité (haut = plus prioritaire)

---

## Features – Phase A

### exploring
- [ ] 20260116143012-automatic-invoice-ingestion
- [ ] 20260116144503-email-based-document-collection

### candidate
- [ ] 20260115120000-basic-accounting-export

### on_hold
- [ ] 20260110103000-bank-api-integration

### discarded
- [x] 20251231110000-ocr-from-scanned-fax
```

---

## Règles pour les LLM

Tout LLM intervenant dans ce projet doit :

1. Lire ce README.md avant toute action
2. Respecter strictement :
   - la structure des répertoires
   - les statuts autorisés
   - les templates fournis
3. Ne jamais :
   - inventer de nouveaux statuts
   - modifier le nom d’un répertoire existant
   - encoder un statut dans un nom de fichier ou de dossier
4. Marquer explicitement :
   - les hypothèses
   - les propositions non validées
   - les zones d’incertitude

Si une information est inconnue ou ambiguë, le LLM doit :
- la laisser vide
- ou la signaler explicitement comme question ouverte

Il ne doit jamais la deviner.

---

## Transition vers une Phase de Cristallisation (ex. BMAD)

Lorsqu’une Feature atteint le statut :

```
ready_for_crystallization
```

Elle peut :
- être convertie vers un format plus strict
- être copiée ou transformée dans un autre répertoire
- servir d’input à des agents ou workflows spécialisés

Le contenu du répertoire `agile/` reste inchangé et sert d’archive de conception.

---

## Principe fondamental

> Un document bien écrit n’est pas une décision.  
> Une structure claire ne remplace pas la validation.

Ce système vise à **clarifier la pensée avant l’engagement**, pas à accélérer artificiellement l’exécution.
