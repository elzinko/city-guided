# Epic – Phase A (Exploration)

## Identifiant
exploration-modes

## Contexte
L'application propose actuellement une exploration générique des POIs. Il serait intéressant de proposer des **modes d'exploration thématiques** ou des **expériences guidées** pour différents profils d'utilisateurs.

## Problème / Opportunité
**Problème** : L'expérience est uniforme pour tous les utilisateurs, quel que soit leur intérêt.

**Opportunité** : Créer des expériences différenciées qui correspondent aux envies spécifiques :
- Urbex / Exploration insolite
- Parcours gastronomique (avec restos, réservations)
- Parcours culturel (musées, monuments)
- Génération sur mesure basée sur les préférences

## Hypothèse de valeur
Des modes d'exploration ciblés augmentent l'engagement et la satisfaction des utilisateurs qui trouvent du contenu adapté à leurs intérêts.

⚠️ Hypothèse : Les utilisateurs ont des profils d'exploration distincts

## Objectifs (non contractuels)
- Proposer différents "modes" ou "expériences" d'exploration
- Adapter le contenu (POIs, récits) au mode choisi
- Permettre la génération d'expériences personnalisées

## Utilisateurs / Parties prenantes
- Touristes (différents profils)
- Locaux curieux
- Groupes organisés

## Périmètre pressenti
### Inclus
- Définition de plusieurs modes d'exploration (urbex, culture, gastro, etc.)
- Filtrage des POIs selon le mode
- Adaptation des récits selon le mode (ton, focus)
- Interface de sélection du mode
- Possibilité de mixer les modes

### Exclus
- Intégration réservation restaurant (v2, complexe)
- Création de modes par l'utilisateur (v2)
- Monétisation des modes premium (v2)

## Features candidates
**À créer/détailler :**
- **mode-selector** : Interface de choix du mode d'exploration
- **mode-urbex** : Configuration du mode urbex/insolite
- **mode-cultural** : Configuration du mode culturel
- **mode-gastro** : Configuration du mode gastronomique
- **mode-custom-generator** : Génération de mode sur mesure

## Hypothèses explicites
- ⚠️ Les POIs peuvent être taggés par "mode" compatible
- ⚠️ Les récits peuvent être adaptés/filtrés par mode
- ⚠️ 3-5 modes de base suffisent pour commencer

## Questions ouvertes
- Quels modes proposer au lancement ?
- Comment tagger les POIs existants par mode ?
- Faut-il des récits différents par mode ou juste un filtrage ?
- L'utilisateur peut-il mixer plusieurs modes ?
- Comment générer un mode "sur mesure" ? (IA ? questionnaire ?)

## Risques pressentis
- **Risque contenu** : Pas assez de POIs pour certains modes
- **Risque UX** : Trop de choix → paralysie
- **Risque technique** : Génération sur mesure complexe

## Dépendances
- Epic "User Profiling" pour connaître les préférences
- Système de tags sur les POIs
- Possiblement le système de génération LLM pour adapter les récits

## Notes libres
### Modes envisagés
| Mode | Description | POIs types |
|------|-------------|------------|
| Urbex | Lieux abandonnés, insolites | Friches, street art, curiosités |
| Culture | Musées, monuments, histoire | Monuments, musées, sites historiques |
| Gastro | Parcours culinaire | Restos, marchés, spécialités locales |
| Nature | Parcs, jardins, points de vue | Parcs, jardins, panoramas |
| Nightlife | Vie nocturne | Bars, clubs, spots |
| Family | Adapté aux familles | Parcs, activités kids-friendly |

### Génération sur mesure
Utiliser l'historique (Epic User History) + préférences (Epic User Profiling) pour générer automatiquement un parcours adapté. Potentiellement via LLM.

### Relation avec intégrations externes
Le mode "Gastro" pourrait à terme s'intégrer avec :
- TheFork/OpenTable pour réservations
- Google Places pour avis
- Attention : complexité +++
