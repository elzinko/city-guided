# Epic – Phase A (Exploration)

## Identifiant
adaptive-audio-guide

## Contexte
L'audio guide mobile se distingue fondamentalement d'un audio guide de musée : 
- Le trajet n'est pas contrôlé
- Les temps de passage sont imprévisibles
- L'utilisateur peut changer de mode de transport en cours de route
- La destination n'est pas toujours connue

L'application doit s'adapter en temps réel au contexte de l'utilisateur pour offrir une expérience fluide et pertinente.

## Problème / Opportunité
**Problème** : Comment offrir un audio guide pertinent quand on ne contrôle ni le trajet, ni la vitesse, ni le mode de déplacement de l'utilisateur ?

**Opportunité** : Créer une expérience d'audio guide "intelligent" qui s'adapte comme un GPS s'adapte aux changements de direction, mais pour le contenu narratif.

## Hypothèse de valeur
Un audio guide qui s'adapte automatiquement au contexte de déplacement offrira une meilleure expérience que :
- Un audio guide à taille fixe (trop long = on rate le POI suivant, trop court = frustrant)
- Un audio guide qui ignore la direction du déplacement
- Un audio guide qui ne priorise pas selon le temps disponible

⚠️ Hypothèse non validée - à tester avec les utilisateurs beta

## Objectifs (non contractuels)
- Détecter automatiquement le contexte de déplacement (vitesse, mode, environnement)
- Prédire le "fil" des POIs à venir selon la trajectoire
- Choisir la modalité audio adaptée (taille S/M/L, potentiellement type de récit)
- Permettre des transitions fluides si le contexte change en cours de lecture

## Utilisateurs / Parties prenantes
- **Touriste en voiture** : traverse Paris à 30km/h, beaucoup de POIs, peu de temps par POI
- **Promeneur à pied** : flâne en ville, a le temps, veut des récits riches
- **Cycliste** : vitesse intermédiaire, peut s'arrêter facilement
- **Voyageur sur route** : 90km/h, POIs espacés, veut les POIs majeurs en détail

## Périmètre pressenti
### Inclus
- Détection du mode de transport (voiture/vélo/piéton) via analyse de vitesse : ou selection du mode sur l'application comme pour un trajet google maps
- Détection de l'environnement (ville/route/campagne) via densité POI ou données OSM : plutot données de localisation ...
- Calcul de la vitesse adaptée au contexte (lissée voiture, lente piéton)
- Prédiction du fil de POIs selon direction de déplacement
- Algorithme de choix de modalité audio basé sur le "time budget"
- Système d'événements pour recalcul en temps réel
- Recalcul du fil si changement de direction (comportement GPS-like)

### Exclus
- Navigation GPS vers une destination (pas notre métier)
- Génération des différentes versions narratives (autre Epic)
- Trajets utilisateur prédéfinis (feature ultérieure)
- Optimisation ML avancée (v2)

## Features candidates
- **20260123053502-contexte-deplacement** : Détection et caractérisation du contexte de déplacement
- **20260123053503-fil-pois-predictif** : Calcul du fil de POIs futur selon trajectoire
- **20260123053504-modalite-audio-adaptative** : Choix adaptatif de la modalité audio (S/M/L et au-delà)

## Hypothèses explicites
- ⚠️ La vitesse GPS est suffisamment fiable pour détecter le mode de transport.
- ⚠️ Les données OSM (maxspeed, type de voie) sont disponibles et utilisables comme fallback
- ⚠️ Les utilisateurs accepteront un changement de modalité en cours de route si c'est fluide. Je ne sais pas si c'est une bonne idée, mais on peut passer du taxi à la marche à pied ou l'inverse, par exemple.
- ⚠️ La densité de POIs locaux est un bon proxy pour "environnement urbain vs rural"
- ⚠️ Un lissage sur 30s est suffisant pour la vitesse en voiture

## Questions ouvertes
- Comment gérer la transition entre deux modalités de récit si l'utilisateur change de contexte ?
- Faut-il des "points de jonction" narratifs prédéfinis pour les transitions ?
- Comment distinguer "arrêt temporaire" (feu rouge) de "changement de mode" (on se gare) ? le changement de vitesse ? si on suit moins les routes ? ...
- Quelle est la durée minimum avant de considérer un changement de mode stable ? plusieurs modalités qui changent = fiabilité sur le fait qu'on change de mode. Avec en plus un léger délai pour vérifier qu'il n'y a pas d'ocsillation. Aussi on peut afficher uen modale pour demander à l'utilisateur
- Comment l'utilisateur indique-t-il ses préférences de façon simple ? (UX critique) via un panneau de config (pas dev et pas admin, juste configuration standard d'une application). Si on peut poser uen question via une popup ou au lancement de l'application on le fait : vous etes ?: a pied / a vélo / en voiture, vous conduisez? oui/non, ... ou via des boutons de switch discret (masquables selon la place et l'UX / UI)

## Risques pressentis
- **Risque UX** : Changements de mode perçus comme perturbants plutôt que fluides
- **Risque technique** : Consommation batterie si calculs GPS trop fréquents
- **Risque fonctionnel** : Algorithme trop complexe = difficile à débugger et ajuster
- **Risque data** : Manque de données OSM dans certaines régions

## Notes libres
### Inspiration GPS
Le système doit se comporter comme un GPS qui recalcule l'itinéraire : 
- Changement de direction → recalcul du fil de POIs
- Mais sans destination connue → prédiction basée sur trajectoire récente

### Modalités au-delà de S/M/L
L'idée de "type de récit" (anecdotique, historique, technique...) pourrait s'ajouter aux modalités de taille. Le système de fils narratifs avec points de jonction permettrait des transitions cohérentes.

### Feedback beta
Un système de remontée de problèmes sera nécessaire pour calibrer les algorithmes. Les seuils (vitesse piéton max, durée changement de mode...) devront être ajustés empiriquement.
