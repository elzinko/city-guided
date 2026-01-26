# Epic – Personalized Experience

## Identifiant
epic-personalized-experience

## Contexte
CityGuided vise à offrir une expérience audio-guide personnalisée. Pour y parvenir, il faut connaître l'utilisateur : ses préférences déclarées, son comportement observé, et adapter le contenu en conséquence.

Cette Epic parente regroupe les initiatives liées à la personnalisation de l'expérience utilisateur.

## Problème / Opportunité
**Problème** : L'application traite tous les utilisateurs de la même façon, sans tenir compte de :
- Leurs centres d'intérêt (culture, urbex, gastro...)
- Leur style d'exploration (flâneur vs ciblé)
- Leur historique de visites

**Opportunité** : Une expérience personnalisée permet :
- Meilleur engagement et rétention
- Recommandations plus pertinentes
- Différenciation concurrentielle
- Données pour améliorer le produit

## Hypothèse de valeur
La personnalisation augmente significativement la satisfaction et l'engagement des utilisateurs.

⚠️ Hypothèses à valider :
- Les utilisateurs acceptent de partager leurs préférences
- Les préférences déclarées correspondent aux comportements réels
- Le volume de données sera suffisant pour du ML

## Objectifs (non contractuels)
- Collecter les préférences utilisateur (onboarding)
- Proposer des modes d'exploration adaptés
- Enregistrer et analyser l'historique d'usage
- À terme : recommandations ML personnalisées

## Utilisateurs / Parties prenantes
- Tous les utilisateurs (bénéficiaires)
- Product team (insights data-driven)
- Data/ML team (future)

## Périmètre pressenti

### Inclus
- Questionnaire de préférences (onboarding)
- Modes d'exploration thématiques
- Historique des trajets et POIs
- Interface "Mon profil" / "Mon historique"
- Analytics et patterns d'usage
- ML pour recommandations (phase 3)

### Exclus
- Features sociales (partage de parcours) - future epic
- Gamification (badges, achievements) - future epic
- Authentification complète (optionnel pour MVP)

## Sous-Epics

### Phase 1 : User Profiling (MVP)
**Fichier :** `20260123153000-user-profiling/epic.md`
- Questionnaire onboarding (5-7 questions)
- Stockage préférences (localStorage)
- Interface de modification
- Profils types (urbex lover, culture vulture, etc.)

### Phase 2 : Exploration Modes
**Fichier :** `20260123152900-exploration-modes/epic.md`
- Modes thématiques (urbex, culture, gastro, nature...)
- Filtrage POIs par mode
- Adaptation des récits
- Génération de parcours sur mesure

### Phase 3 : User History & ML
**Fichier :** `20260123153100-user-history-ml/epic.md`
- Enregistrement trajets et POIs
- Analytics et heatmaps
- Clustering utilisateurs
- Recommandations ML

## Dépendances entre sous-epics

```
User Profiling ──────────────────────────┐
       │                                 │
       ▼                                 ▼
Exploration Modes ◄─────────── User History ML
       │                                 │
       └──────────► Audio Guide Adaptatif ◄──┘
```

## Hypothèses explicites
- ⚠️ Les utilisateurs acceptent le tracking (opt-in)
- ⚠️ Un questionnaire court est acceptable
- ⚠️ 3-5 modes d'exploration suffisent au démarrage
- ⚠️ Le volume de données sera suffisant pour du ML

## Questions ouvertes
- **Privacy** : Opt-in explicite ou opt-out ?
- **Stockage** : Local-first ou backend-first ?
- **Auth** : Compte utilisateur nécessaire ?
- **ML** : Quel modèle ? Quand lancer ?

## Risques pressentis
- **Risque UX** : Onboarding perçu comme intrusif
- **Risque privacy** : RGPD, perception négative du tracking
- **Risque data** : Cold start ML, pas assez de données
- **Risque scope** : Feature creep

## Métriques de succès (indicatives)
- Taux de complétion du questionnaire onboarding > 70%
- Utilisation des modes d'exploration > 30%
- Rétention améliorée vs version non personnalisée
- Qualité des recommandations ML (à définir)

## Notes libres

### Ordre d'implémentation recommandé
1. **User Profiling** - Quick win, pas de backend nécessaire
2. **Exploration Modes** - Valorise immédiatement les préférences
3. **User History ML** - Long terme, nécessite volume de données

### Relation avec Audio Guide Adaptatif
L'Epic "Audio Guide Adaptatif" consomme les données de personnalisation :
- Préférences → choix du ton et de la modalité
- Historique → éviter les répétitions, suggérer nouveautés
- Mode → adapter le contenu au contexte

### Privacy by design
- Données stockées localement par défaut
- Opt-in explicite pour sync backend
- Export et suppression faciles (RGPD)
- Pas de partage avec tiers
