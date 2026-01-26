# Feature – Phase A (Exploration)

## Identifiant
fil-pois-predictif

## Résumé
Calculer en temps réel la liste ordonnée des POIs à venir ("le fil") en fonction de la position, direction et vitesse de l'utilisateur.

## Problème adressé
Pour adapter la modalité audio, il faut savoir :
1. Quels POIs l'utilisateur va probablement rencontrer
2. Dans quel ordre
3. À quelle distance/temps

Sans cette prédiction, on ne peut pas anticiper le "time budget" disponible pour chaque POI.

## Hypothèse de valeur
Un fil prédictif permet d'anticiper les besoins narratifs et d'offrir une expérience continue sans interruptions ou silences mal placés.

⚠️ Hypothèse : la direction récente est un bon prédicteur de la direction future (en l'absence de destination connue).

## Utilisateurs concernés
Tous les utilisateurs en déplacement actif (pas stationnaires).

## Scénarios d'usage pressentis
- **Scénario 1** : Voiture sur le périphérique → fil basé sur la route, POIs à gauche/droite pondérés par visibilité
- **Scénario 2** : Piéton qui tourne à un coin de rue → recalcul du fil avec la nouvelle direction
- **Scénario 3** : Route de campagne → peu de POIs, le fil s'étend sur plusieurs km
- **Scénario 4** : Centre-ville dense → fil court en distance mais riche en POIs

## Idées de solution (non exclusives)

### Option A : Cône de direction simple
Sélectionner les POIs dans un cône devant l'utilisateur :

```typescript
interface FilConfig {
  coneAngle: number;        // Ex: 60° de chaque côté = 120° total
  maxDistance: number;      // Ex: 2000m
  minImportance: number;    // Filtrer les POIs mineurs
}

function computeFil(
  position: LatLng,
  heading: number,          // Direction en degrés
  config: FilConfig,
  allPois: Poi[]
): Poi[] {
  return allPois
    .filter(poi => isInCone(position, heading, poi, config.coneAngle))
    .filter(poi => distance(position, poi) <= config.maxDistance)
    .filter(poi => poi.importance >= config.minImportance)
    .sort((a, b) => distance(position, a) - distance(position, b));
}
```

**Pros** : Simple, intuitif, performant
**Cons** : Ignore les POIs "juste derrière" qui pourraient intéresser un piéton

### Option B : Pondération angulaire
Plutôt qu'un cône binaire, pondérer les POIs selon leur angle par rapport à la direction :

```typescript
function computePoiScore(
  position: LatLng,
  heading: number,
  poi: Poi,
  context: ContextState
): number {
  const dist = distance(position, poi);
  const angle = angleBetween(heading, bearingTo(position, poi));
  
  // Facteur angulaire : 1.0 devant, décroît sur les côtés
  // Plus strict en voiture, plus permissif à pied
  const angleWeight = context.mode === 'car' 
    ? Math.cos(angle * Math.PI / 180)      // Strict : cos(0°)=1, cos(90°)=0
    : Math.cos(angle * Math.PI / 360);     // Souple : cos(0°)=1, cos(90°)=0.7
  
  // Score final
  return (poi.importance / dist) * Math.max(0, angleWeight);
}
```

**Pros** : Plus nuancé, adapté au mode de transport
**Cons** : Plus de calculs, paramètres à calibrer

### Option C : Suivi de route OSM
Pour les modes motorisés, suivre la route OSM plutôt que la ligne droite :

```
Position → Segment de route actuel → Segments suivants → POIs le long du parcours
```

**Pros** : Très précis pour voiture/vélo sur route
**Cons** : Complexité, dépendance OSM, moins pertinent pour piétons

## Critères d'acceptation (brouillon)

- [ ] Le fil contient les N prochains POIs probables triés par "temps estimé d'arrivée"
- [ ] Les POIs dans la direction de déplacement sont favorisés
- [ ] Le fil se recalcule automatiquement si la direction change significativement (> 45°)
- [ ] Le mode de transport influence la largeur du "cône" de recherche
- [ ] Le fil inclut le temps estimé jusqu'à chaque POI (basé sur vitesse contexte)
- [ ] Un événement est émis quand le fil change significativement

## Contraintes connues
- **Performance** : Recalcul fréquent sur mobile, doit rester < 50ms
- **Précision** : Le heading GPS peut être bruité à basse vitesse
- **Données** : Calcul de distance à vol d'oiseau ≠ distance route réelle

## Hypothèses explicites
- ⚠️ Un cône de 120° (60° de chaque côté) est suffisant pour la voiture
- ⚠️ Un piéton peut être intéressé par des POIs jusqu'à 90° de sa direction
- ⚠️ Le heading GPS est fiable au-dessus de 5 km/h
- ⚠️ Pour piéton lent, utiliser la direction moyenne des 30 dernières secondes

## Dépendances pressenties
- **Feature** : 20260123053502-contexte-deplacement (mode et vitesse)
- **Service** : Base de POIs avec coordonnées et importance
- **Service** : Géolocalisation avec heading

## Questions ouvertes
- Comment gérer le heading quand l'utilisateur est stationnaire ? (garder le dernier ?)
- Faut-il un fil "de secours" si aucun POI dans le cône ? (élargir progressivement ?)
- Quelle longueur de fil maintenir ? (N POIs ou X minutes de trajet ?)
- Comment intégrer une destination future si l'utilisateur l'indique ?

## Risques pressentis
- **Risque UX** : Fil qui "saute" fréquemment → expérience chaotique
- **Risque technique** : Heading bruité → mauvaise prédiction
- **Risque fonctionnel** : POIs importants ratés car "trop sur le côté"

## Indicateurs de succès (indicatifs)
- Le POI effectivement rencontré était dans le top 3 du fil prédit > 80% du temps
- Pas de recalcul "chaotique" (> 5 recalculs/minute = problème)
- Temps de calcul du fil < 50ms sur appareil moyen

## Notes libres

### Structure du fil
```typescript
interface FilEntry {
  poi: Poi;
  distanceMeters: number;
  estimatedTimeSeconds: number;  // Basé sur vitesse contexte
  angleFromHeading: number;       // Pour debug/UI
  score: number;                  // Pour tri
}

interface Fil {
  entries: FilEntry[];
  computedAt: Date;
  basedOnContext: ContextState;
  basedOnPosition: LatLng;
  basedOnHeading: number;
}
```

### Recalcul intelligent
Ne pas recalculer systématiquement mais seulement si :
- Position a changé de > 50m depuis dernier calcul
- Heading a changé de > 30° depuis dernier calcul
- Contexte a changé (mode de transport)
- Un POI du fil a été "passé" (distance augmente après avoir diminué)

### Liste chaînée conceptuelle
Le fil est conceptuellement une liste chaînée :
```
[POI_A (200m, 30s)] → [POI_B (450m, 65s)] → [POI_C (800m, 100s)] → ...
```

Le premier élément du fil détermine le "time budget" pour la modalité audio.
