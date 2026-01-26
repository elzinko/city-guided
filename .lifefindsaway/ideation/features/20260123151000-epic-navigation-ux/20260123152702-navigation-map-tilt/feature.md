# Feature – Phase A (Exploration)

## Identifiant
navigation-map-tilt

## Résumé
Ajouter un bouton pour basculer entre carte plate et carte inclinée (vue 3D/perspective) en mode navigation, comme sur les GPS classiques.

## Problème adressé
En mode navigation, une vue inclinée (perspective) peut offrir une meilleure visibilité de la route à venir, comme sur les applications GPS type Waze ou Google Maps.

## Hypothèse de valeur
La vue inclinée améliore l'orientation et l'anticipation en navigation, surtout en voiture.

## Utilisateurs concernés
- Utilisateurs en navigation (surtout en voiture)

## Scénarios d'usage pressentis
- **Scénario 1** : Navigation voiture → vue inclinée par défaut pour mieux voir la route
- **Scénario 2** : Navigation piéton → vue plate préférée pour voir les alentours
- **Scénario 3** : Bouton toggle pour passer de l'un à l'autre

## Idées de solution (non exclusives)

### Option A : Bouton toggle simple
Un bouton (icône 2D/3D) pour basculer entre les modes.

### Option B : Geste de pitch
Swipe vertical pour incliner la carte (comme Google Maps).

### Option C : Mode automatique selon transport
Voiture → incliné par défaut, Piéton → plat par défaut.

**Recommandé : Option A + C** (toggle + défaut intelligent)

## Critères d'acceptation (brouillon)

- [ ] Bouton visible en mode navigation uniquement
- [ ] Bascule entre vue plate (0°) et vue inclinée (~45-60°)
- [ ] Le zoom peut être légèrement ajusté en mode incliné
- [ ] Icône claire (ex: cube 2D/3D)
- [ ] Animation de transition fluide

## Contraintes connues
- Dépend des capacités de Leaflet ou de la librairie de carte utilisée
- Performance sur mobile à vérifier

## Dépendances pressenties
- Librairie de carte (Leaflet, Mapbox, etc.)
- Mode navigation existant

## Questions ouvertes
- Leaflet supporte-t-il le tilt nativement ? (sinon Mapbox GL)
- Quel angle d'inclinaison par défaut ?
- Persister le choix de l'utilisateur ?

## Notes libres
Si Leaflet ne supporte pas le tilt, cette feature pourrait nécessiter une migration vers Mapbox GL JS ou deck.gl. À évaluer.
