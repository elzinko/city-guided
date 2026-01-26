# Epic – Phase A (Exploration)

## Identifiant
user-history-ml

## Contexte
Pour améliorer les recommandations et comprendre comment les utilisateurs explorent, il faut :
1. Enregistrer l'historique des trajets et interactions
2. Analyser ces données pour en extraire des patterns
3. Utiliser du ML pour personnaliser l'expérience

## Problème / Opportunité
**Problème** : Actuellement, aucune donnée d'usage n'est collectée. Impossible de :
- Savoir quels POIs sont populaires
- Comprendre les parcours types
- Améliorer les recommandations

**Opportunité** : L'historique utilisateur est une mine d'or pour :
- Recommandations personnalisées
- Amélioration du produit (data-driven)
- Features sociales futures ("parcours populaires")

## Hypothèse de valeur
L'analyse des comportements passés permet de prédire et recommander du contenu plus pertinent.

⚠️ Hypothèse : Les utilisateurs acceptent le tracking si c'est pour améliorer leur expérience

## Objectifs (non contractuels)
- Enregistrer les trajets et POIs visités
- Stocker l'historique de façon exploitable
- Analyser les patterns (heatmaps, parcours types)
- À terme : ML pour recommandations

## Utilisateurs / Parties prenantes
- Utilisateur (bénéficiaire des recommandations)
- Product team (insights data-driven)
- Data/ML team (future)

## Périmètre pressenti
### Inclus - Phase 1 (Historique)
- Enregistrement des trajets GPS
- Log des POIs écoutés/consultés
- Stockage local + sync backend
- Interface "Mon historique"
- Export des données (RGPD)

### Inclus - Phase 2 (Analytics)
- Dashboard d'analyse (interne)
- Heatmaps des zones populaires
- Identification des parcours types

### Inclus - Phase 3 (ML)
- Modèle de recommandation basé sur l'historique
- Clustering des profils utilisateurs
- Prédiction des POIs d'intérêt

### Exclus
- Features sociales (partage de parcours) - v2
- Gamification (badges, achievements) - autre epic

## Features candidates
**Phase 1 - Historique :**
- **history-tracker** : Enregistrement des trajets et POIs
- **history-storage** : Stockage et sync des données
- **history-viewer** : Interface "Mon historique"
- **history-export** : Export RGPD

**Phase 2 - Analytics :**
- **analytics-dashboard** : Dashboard interne
- **analytics-heatmaps** : Visualisation zones populaires
- **analytics-patterns** : Détection parcours types

**Phase 3 - ML :**
- **ml-recommender** : Système de recommandation
- **ml-profiling** : Clustering utilisateurs
- **ml-prediction** : Prédiction POIs

## Hypothèses explicites
- ⚠️ L'utilisateur consent au tracking (opt-in ou opt-out ?)
- ⚠️ Le volume de données sera suffisant pour du ML
- ⚠️ Le stockage backend est disponible (ou à créer)

## Questions ouvertes
- **Privacy** : Opt-in explicite ou opt-out ? Anonymisation ?
- **Stockage** : Local-first + sync ou backend-first ?
- **Granularité** : Enregistrer chaque position ou juste les POIs ?
- **Rétention** : Combien de temps garder les données ?
- **ML** : Quel modèle ? Collaborative filtering ? Content-based ?

## Risques pressentis
- **Risque légal** : RGPD, consentement, droit à l'oubli
- **Risque privacy** : Perception négative du tracking
- **Risque technique** : Volume de données GPS important
- **Risque ML** : Cold start, pas assez de données au début

## Dépendances
- Backend avec stockage (PostgreSQL existant ?)
- Système d'authentification (optionnel mais utile)
- Epic User Profiling (données complémentaires)

## Notes libres
### Architecture data suggérée

```
User History
├── Sessions (démarrage/fin navigation)
├── Tracks (trace GPS simplifiée)
├── POI Events
│   ├── approached (arrivée zone POI)
│   ├── started (début audio)
│   ├── completed (fin audio)
│   ├── skipped (ignoré)
│   └── replayed (réécoute)
└── Interactions
    ├── search queries
    ├── mode changes
    └── settings changes
```

### Privacy by design
- Anonymisation des traces GPS (pas de stockage position exacte du domicile)
- Opt-in explicite avec explication claire des bénéfices
- Export et suppression faciles (RGPD)
- Pas de partage avec tiers sans consentement

### ML - Approches possibles
1. **Collaborative filtering** : "Les utilisateurs comme vous ont aimé..."
2. **Content-based** : Basé sur les tags des POIs visités
3. **Hybrid** : Combinaison des deux
4. **Sequence modeling** : Prédire le prochain POI basé sur le parcours

### Relation avec autres Epics
- **User Profiling** : Préférences déclarées + comportement observé = profil complet
- **Exploration Modes** : Historique aide à suggérer le bon mode
- **Audio Guide Adaptatif** : Historique peut influencer le choix de modalité

### Priorité
1. Phase 1 (Historique) - MVP
2. Phase 2 (Analytics) - Data-driven product
3. Phase 3 (ML) - Différenciation long terme
