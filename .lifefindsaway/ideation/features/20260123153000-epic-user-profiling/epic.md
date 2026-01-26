# Epic – Phase A (Exploration)

## Identifiant
user-profiling

## Contexte
Pour offrir une expérience personnalisée, l'application a besoin de connaître les préférences de l'utilisateur : ce qu'il aime, ce qu'il n'aime pas, son style d'exploration.

## Problème / Opportunité
**Problème** : L'application traite tous les utilisateurs de la même façon, sans tenir compte de leurs préférences.

**Opportunité** : Collecter et utiliser les préférences pour :
- Personnaliser les recommandations de POIs
- Adapter le ton et le style des récits
- Proposer des modes d'exploration adaptés
- Améliorer l'engagement et la rétention

## Hypothèse de valeur
Un questionnaire initial + profiling permet d'offrir une expérience plus pertinente dès la première utilisation.

⚠️ Hypothèse : Les utilisateurs acceptent de répondre à quelques questions au démarrage

## Objectifs (non contractuels)
- Collecter les préférences utilisateur au premier lancement
- Stocker ces préférences (local ou backend)
- Utiliser ces données pour personnaliser l'expérience
- Permettre de modifier ses préférences plus tard

## Utilisateurs / Parties prenantes
- Tous les utilisateurs (onboarding)
- Système de recommandation (consommateur des données)

## Périmètre pressenti
### Inclus
- Questionnaire de préférences au premier lancement
- Stockage des réponses (localStorage + potentiellement backend)
- Interface de modification des préférences
- API/Service pour accéder aux préférences depuis d'autres features

### Exclus
- Authentification utilisateur (optionnel pour MVP)
- Sync multi-device (v2)
- Profiling comportemental automatique (cf. Epic User History)

## Features candidates
**À créer/détailler :**
- **onboarding-questionnaire** : Questionnaire au premier lancement
- **preferences-storage** : Stockage et accès aux préférences
- **preferences-editor** : Interface de modification
- **profile-types** : Définition des profils types (urbex lover, culture vulture, etc.)

## Hypothèses explicites
- ⚠️ Un questionnaire de 5-7 questions max est acceptable
- ⚠️ Les utilisateurs répondent honnêtement
- ⚠️ Les préférences changent peu dans le temps

## Questions ouvertes
- Quelles questions poser ? (catégories, style, rythme, etc.)
- Format : cases à cocher, échelles, swipe type Tinder ?
- Obligatoire ou skippable ?
- Stocker localement ou nécessité d'un compte ?
- Comment gérer l'évolution des préférences dans le temps ?

## Risques pressentis
- **Risque UX** : Questionnaire perçu comme intrusif → abandon
- **Risque data** : Réponses peu fiables ou incomplètes
- **Risque technique** : Sync des préférences si multi-device

## Dépendances
- Aucune dépendance bloquante
- Alimentera : Epic Exploration Modes, Epic Audio Guide Adaptatif

## Notes libres
### Questions envisagées
1. **Centres d'intérêt** (multi-select) : Musées, Monuments, Street Art, Urbex, Gastronomie, Nature, Nightlife...
2. **Style d'exploration** : Flâneur (lent, tout voir) vs Ciblé (highlights only)
3. **Durée typique** : 30min, 1h, 2h, demi-journée
4. **Mode de transport habituel** : À pied, Vélo, Voiture
5. **Ton préféré** : Académique, Anecdotique, Immersif
6. **Groupe** : Seul, En couple, Famille, Amis

### Format UX inspirations
- Duolingo onboarding (simple, engageant)
- Spotify "choose your artists"
- Tinder swipe (pour réduire friction)

### Stockage
MVP : `localStorage` avec structure JSON
```json
{
  "interests": ["museums", "monuments", "urbex"],
  "style": "explorer",
  "duration": "1h",
  "transport": "pedestrian",
  "tone": "anecdotal",
  "group": "solo"
}
```

### Évolution future
- Sync avec compte utilisateur
- Profiling automatique basé sur l'historique (cf. Epic User History ML)
- Ajustement dynamique des préférences selon comportement
