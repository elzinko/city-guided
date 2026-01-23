# Epic – Phase A (Exploration)

## Identifiant
navigation-playlist

## Contexte
En mode navigation, l'utilisateur a besoin de savoir :
- Quel POI est en cours de lecture
- Quel POI vient d'être lu (pour revenir dessus si besoin)
- Quels POIs arrivent (pour anticiper ou choisir)

Actuellement, le composant `navigation-poi-list` a un comportement bugué et le concept de "playlist" n'est pas clairement défini.

## Problème / Opportunité
**Problème** : L'utilisateur manque de visibilité sur le fil des POIs en navigation. Il ne peut pas :
- Voir ce qui vient d'être lu
- Choisir parmi les prochains POIs disponibles
- Comprendre la progression dans son exploration

**Opportunité** : Créer une expérience de "playlist" claire qui donne du contrôle et de la visibilité sur le parcours audio.

## Hypothèse de valeur
Une playlist claire et interactive améliore l'engagement et le sentiment de contrôle de l'utilisateur sur son expérience audio guide.

⚠️ Hypothèse : Les utilisateurs veulent pouvoir choisir parmi plusieurs POIs à venir (pas juste subir l'ordre)

## Objectifs (non contractuels)
- Afficher clairement le POI en cours de lecture
- Montrer le fil d'Ariane (POIs passés)
- Proposer les POIs futurs avec possibilité de sélection
- Interface fluide qui ne gêne pas la navigation

## Utilisateurs / Parties prenantes
- Utilisateur en navigation (principal)
- Content manager (feedback sur l'usage)

## Périmètre pressenti
### Inclus
- Composant "POI en cours" bien visible
- Composant "POI précédent" (possibilité de relecture ?)
- Composant "POIs à venir" avec sélection (2-3 options)
- Gestion de la playlist (ajout/retrait)
- Feedback visuel lors des transitions

### Exclus
- Algorithme de suggestion des POIs (cf. Epic Audio Guide Adaptatif)
- Sauvegarde de l'historique (cf. Epic User History)
- Création de playlists personnalisées (v2)

## Features candidates
**À créer/détailler :**
- **playlist-current-poi** : Affichage du POI en cours
- **playlist-breadcrumb** : Fil d'Ariane des POIs passés
- **playlist-upcoming** : Sélection parmi les POIs à venir
- **playlist-state-management** : Gestion du state de la playlist

## Hypothèses explicites
- ⚠️ Le concept de "playlist" unifie passé et futur (vs "fil d'Ariane" + "playlist" séparés)
- ⚠️ 2-3 POIs à venir suffisent pour le choix
- ⚠️ L'utilisateur veut pouvoir réécouter le POI précédent

## Questions ouvertes
- **Terminologie** : "Playlist" pour tout, ou "Fil d'Ariane" (passé) + "Playlist" (futur) ?
- **UX** : Où positionner ces composants ? (bottom sheet, sidebar, overlay ?)
- **Interaction** : Comment choisir un POI futur ? (tap, swipe, drag ?)
- **Relecture** : Peut-on réécouter un POI passé ? Comment ?
- **Persistance** : La playlist se reconstruit-elle automatiquement ou est-elle manuelle ?

## Risques pressentis
- **Risque UX** : Trop d'éléments à l'écran → confusion
- **Risque technique** : Synchronisation état playlist / position GPS / audio
- **Risque fonctionnel** : Choix trop large → decision fatigue

## Dépendances
- Bug `navigation-poi-list-behavior` à fixer d'abord
- Epic "Audio Guide Adaptatif" pour l'algorithme de suggestion

## Notes libres
### Inspiration
- Spotify : Queue avec "En cours" bien visible
- Waze : POIs à venir sur la route
- Podcast apps : Up Next avec réorganisation

### UX à designer
Cette epic nécessite probablement une phase de design UX avant implémentation :
- Wireframes des différents composants
- User flows pour les interactions
- Tests utilisateurs sur prototypes

### Relation avec autres Epics
- **Audio Guide Adaptatif** : Fournit l'algo de sélection des POIs futurs
- **User History** : Peut alimenter les recommandations de relecture
