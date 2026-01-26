# Epic – Navigation UX

## Identifiant
epic-navigation-ux

## Contexte
L'expérience de navigation dans CityGuided nécessite des améliorations UX pour être plus fluide, plus flexible et mieux adaptée aux différents contextes d'utilisation (piéton, voiture, dev).

Cette Epic regroupe les features liées à l'interface de navigation et aux contrôles utilisateur.

## Problème / Opportunité
**Problèmes actuels** :
- Pas de sélection du mode de transport
- Vitesses de simulation limitées pour le dev
- Carte uniquement en vue 2D
- Pas de moyen simple pour les utilisateurs de donner du feedback

**Opportunité** : Améliorer l'UX de navigation pour :
- Adapter l'expérience au mode de déplacement
- Faciliter le développement et les tests
- Offrir une visualisation plus immersive
- Collecter du feedback utilisateur

## Hypothèse de valeur
Une navigation plus flexible et intuitive améliore l'expérience utilisateur et facilite le développement.

## Objectifs (non contractuels)
- Permettre de choisir son mode de transport
- Offrir plus de contrôle sur la vitesse de simulation
- Proposer une vue carte inclinée (style GPS)
- Intégrer un bouton de feedback pour les beta-testeurs

## Utilisateurs / Parties prenantes
- Utilisateurs finaux (navigation améliorée)
- Développeurs (outils de test)
- Beta-testeurs (feedback)
- Product team (insights utilisateurs)

## Périmètre pressenti

### Inclus
- Sélecteur de mode de transport (piéton/voiture)
- Diviseurs de vitesse pour le dev (/3, /4, /5)
- Vue carte inclinée (tilt)
- Bouton feedback pour créer des issues GitHub

### Exclus
- Navigation turn-by-turn (trop complexe pour MVP)
- Mode vélo (peut être ajouté plus tard)
- Intégration complète feedback (Intercom, Zendesk...)

## Features

### Transport Mode Selector
**Fichier :** `20260123152700-transport-mode-selector/feature.md`
- Sélecteur piéton/voiture
- Adaptation des vitesses selon le mode
- Icône dynamique dans l'UI

### Dev Speed Divisors
**Fichier :** `20260123152701-dev-speed-divisors/feature.md`
- Diviseurs de vitesse (/3, /4, /5) pour tests
- Facilite le développement sans attendre

### Navigation Map Tilt
**Fichier :** `20260123152702-navigation-map-tilt/feature.md`
- Vue carte inclinée (style Google Maps navigation)
- Toggle carte plate / inclinée
- Rotation selon direction

### Bouton Feedback GitHub
**Fichier :** `20260120232600-bouton-feedback-github/feature.md`
- Bouton "Feedback Beta" dans l'interface
- Modal pour signaler bug/suggestion
- Création automatique d'issue GitHub
- Capture du contexte technique

## Bugs associés
- `20260123152600-navigation-zoom-locked` - Zoom locké en navigation
- `20260123152601-navigation-buttons-disappear` - Boutons qui disparaissent
- `20260123152602-navigation-poi-list-behavior` - POI list comportement
- `20260123152603-navigation-button-icon` - Icône à changer

## Hypothèses explicites
- ⚠️ La vue inclinée est techniquement faisable avec Leaflet (ou alternative)
- ⚠️ Les utilisateurs préfèrent une vue inclinée pour la navigation
- ⚠️ Les beta-testeurs utiliseront le bouton feedback

## Questions ouvertes
- Leaflet supporte-t-il le tilt ? (Mapbox GL JS sinon)
- Position du bouton feedback ? (header, flottant ?)
- Faut-il d'autres modes de transport ? (vélo, transports...)

## Risques pressentis
- **Risque technique** : Tilt carte peut nécessiter changement de lib
- **Risque UX** : Trop de contrôles peut surcharger l'interface
- **Risque feedback** : Spam potentiel sur les issues GitHub

## Métriques de succès (indicatives)
- Utilisation du mode transport > 20%
- Feedbacks soumis par semaine > 5
- Bugs signalés mènent à des corrections

## Notes libres

### Priorité des features
1. **Bouton Feedback** - Utile immédiatement pour la beta
2. **Transport Mode Selector** - Quick win UX
3. **Dev Speed Divisors** - Facilite le dev quotidien
4. **Navigation Map Tilt** - Nice-to-have, potentiellement complexe

### Relation avec bugs
Les bugs navigation (zoom, boutons, POI list) doivent être corrigés avant ou en parallèle de ces features pour une expérience cohérente.

### Alternatives techniques pour le tilt
- Leaflet : Pas de tilt natif, plugins limités
- Mapbox GL JS : Tilt natif, mais payant au-delà du free tier
- MapLibre GL JS : Fork open-source de Mapbox, tilt natif
