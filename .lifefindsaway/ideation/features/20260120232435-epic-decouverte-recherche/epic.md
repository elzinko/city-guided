# Epic – Phase A (Exploration)

## Identifiant
epic-decouverte-recherche

## Contexte
L'application permet actuellement de rechercher des POIs et d'afficher une liste simple dans la vue "Découvrir". Cependant, l'expérience utilisateur manque de personnalisation et d'organisation. Les utilisateurs ont besoin de retrouver facilement leurs recherches passées, leurs lieux favoris, et de découvrir des POIs de manière plus intuitive et organisée.

## Problème / Opportunité
**Problème actuel** :
- La recherche ne conserve pas l'historique des recherches
- Pas d'accès rapide aux POIs enregistrés depuis la recherche
- La vue "Découvrir" affiche une liste plate sans organisation thématique
- Difficile de retrouver des lieux déjà consultés

**Opportunité** :
- Améliorer l'engagement utilisateur avec une découverte personnalisée
- Faciliter la navigation et la re-découverte de lieux
- Offrir une expérience type Google Maps tout en gardant la spécificité "audio-guide"

## Hypothèse de valeur
En organisant mieux la recherche et la découverte de POIs, les utilisateurs :
- Passeront plus de temps dans l'application
- Reviendront plus facilement sur des lieux déjà consultés
- Découvriront plus de POIs grâce à l'organisation thématique

⚠️ Hypothèse non validée : besoin de tester avec des utilisateurs réels pour valider que l'organisation par catégories améliore effectivement la découverte.

## Objectifs (non contractuels)
- Faciliter la re-découverte de lieux consultés (historique de recherche)
- Améliorer l'accès aux POIs enregistrés depuis la recherche
- Organiser la vue "Découvrir" par thématiques pour une navigation plus intuitive
- Augmenter le nombre de POIs consultés par session

## Utilisateurs / Parties prenantes
- **Utilisateurs finaux** : touristes, visiteurs locaux cherchant à découvrir des lieux
- **Utilisateurs réguliers** : personnes qui reviennent souvent sur l'app et ont besoin de retrouver leurs lieux
- **Nouveaux utilisateurs** : ont besoin d'une découverte guidée pour comprendre le potentiel de l'app

## Périmètre pressenti
### Inclus
- Interface de recherche avancée avec historique
- Organisation de la vue "Découvrir" par catégories thématiques
- Suggestions de découvertes personnalisées à l'ouverture
- Carousels de POIs par thématique
- Accès rapide aux POIs enregistrés

### Exclus
- Algorithme de recommandation IA sophistiqué (suggestions simples basées sur la proximité et la catégorie)
- Personnalisation avancée basée sur l'historique utilisateur
- Recherche vocale avancée (déjà implémentée ailleurs)

## Features candidates
1. **Recherche avancée Google Maps-style** : POIs enregistrés en haut, historique récent limité, panneau "Autres adresses" avec groupes par date (Aujourd'hui, Hier, Cette semaine)
2. **Sélection de découvertes personnalisées** : Afficher des POI suggérés dès l'ouverture de l'app
3. **Vue Découvrir organisée par catégories** : Carousels thématiques ("Autour de moi", "Musées", etc.) avec POIs en format carte occupant ~80% de la largeur en mobile

## Hypothèses explicites
- Les utilisateurs retrouvent plus facilement des lieux avec un historique de recherche organisé par date
- L'organisation par catégories thématiques améliore la découverte vs. une liste plate
- Le format carousel (80% largeur) en mobile offre une meilleure expérience qu'une grille
- Les utilisateurs reviennent régulièrement sur l'app et ont besoin d'un historique

⚠️ Ces hypothèses nécessitent validation utilisateur

## Questions ouvertes
- Combien de recherches récentes afficher avant le lien "Autres adresses récentes" ?
- Quelles catégories thématiques prioriser ? (Musées, Restaurants, Nature, Architecture, etc.)
- Faut-il garder un mode "liste complète" en plus des carousels ?
- Comment gérer les POIs qui appartiennent à plusieurs catégories ?
- Faut-il un système de filtres en plus des catégories ?

## Risques pressentis
- **Risque UX** : Trop de catégories peut rendre l'interface confuse
- **Risque technique** : Performance des carousels avec beaucoup de POIs
- **Risque métier** : Catégorisation des POIs nécessite une taxonomie claire (provenance des données : OpenTripMap, Wikidata)
- **Risque adoption** : Les utilisateurs préfèrent peut-être une liste simple vs. des carousels

## Notes libres
- Inspiration UX : Google Maps pour l'historique, Airbnb pour les carousels de découverte
- À explorer : comment intégrer l'audio-guide dans cette nouvelle organisation (preview audio dans les cartes POI ?)
- Besoin d'explorer le comportement utilisateur réel avant de finaliser le design
