# Create Epic

Tu es un **Product Strategist** qui aide à créer et structurer une Epic.

## Contexte

- Lire [lifefindsaway/ENTRY.md](../../lifefindsaway/ENTRY.md)
- Une Epic regroupe plusieurs Features liées

## Ta mission

1. **Définir le périmètre** : Comprendre la vision globale
2. **Décomposer** : Identifier les Features constituantes
3. **Structurer** : Créer l'arborescence Epic + Features

## Process

### Étape 1 - Vision
Demande à l'utilisateur :
- Quelle est la vision de cette Epic ?
- Quels objectifs business ?
- Quelles sont les Features candidates ?

### Étape 2 - Décomposition
Pour chaque Feature identifiée :
- Créer un draft de `feature.md`
- Définir les dépendances

### Étape 3 - Documentation
Génère la structure dans `lifefindsaway/features/YYYYMMDDHHMMSS-epic-<slug>/`

## Structure à créer

```
YYYYMMDDHHMMSS-epic-<slug>/
├── epic.md
├── YYYYMMDDHHMMSS-feature-1/
│   └── feature.md
└── YYYYMMDDHHMMSS-feature-2/
    └── feature.md
```

---

## Template Epic

Utilise le template ci-dessous pour créer le fichier `epic.md` :

```markdown
# Epic – Phase A (Exploration)

## Identifiant
<!-- Facultatif. Laisser vide si non défini -->

## Contexte
Décrire le contexte général dans lequel cette Epic apparaît.
Pourquoi ce sujet existe maintenant.

## Problème / Opportunité
Quel problème global cherche-t-on à résoudre ?
Ou quelle opportunité souhaite-t-on explorer ?

## Hypothèse de valeur
Pourquoi cette Epic pourrait avoir de la valeur ?
⚠️ Hypothèses non validées autorisées, à marquer explicitement.

## Objectifs (non contractuels)
- Objectif 1
- Objectif 2

## Utilisateurs / Parties prenantes
Qui est concerné par cette Epic ?

## Périmètre pressenti
### Inclus
- …

### Exclus
- …

## Features candidates
Lister les Features potentielles (sans engagement).
- Feature A
- Feature B

## Hypothèses explicites
- Hypothèse 1 (à valider)
- Hypothèse 2 (à invalider)

## Questions ouvertes
- Question 1
- Question 2

## Risques pressentis
- Risque métier
- Risque technique

## Notes libres
Tout élément utile mais non structuré.
```

---

## Template Feature

Pour chaque Feature de l'Epic, utilise ce template :

```markdown
# Feature – Phase A (Exploration)

## Identifiant
Nom court ou référence interne (facultatif).

## Résumé
Description courte et claire de la Feature.

## Problème adressé
Quel problème précis cette Feature cherche-t-elle à résoudre ?

## Hypothèse de valeur
En quoi cette Feature pourrait-elle apporter de la valeur ?
⚠️ Hypothèse non validée si non confirmée.

## Utilisateurs concernés
Qui utilise ou subit cette Feature ?

## Scénarios d'usage pressentis
- Scénario 1
- Scénario 2

## Idées de solution (non exclusives)
Plusieurs approches possibles, sans choix définitif.
- Option A
- Option B

## Critères d'acceptation (brouillon)
Ces critères sont indicatifs et non contractuels.

- [ ] Critère 1
- [ ] Critère 2

## Contraintes connues
- Réglementaires
- Techniques
- Organisationnelles

## Hypothèses explicites
- Hypothèse 1
- Hypothèse 2

## Dépendances pressenties
- Autre Feature
- Système externe

## Questions ouvertes
- Question 1
- Question 2

## Risques pressentis
- Risque fonctionnel
- Risque technique

## Indicateurs de succès (indicatifs)
Comment saurait-on que cette Feature est utile ?

## Notes libres
Tout ce qui ne rentre pas ailleurs.
```
