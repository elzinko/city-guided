# Feature – Phase A (Exploration)

## Identifiant
contexte-deplacement

## Résumé
Détecter et caractériser en temps réel le contexte de déplacement de l'utilisateur : mode de transport, type d'environnement, et vitesse adaptée.

## Problème adressé
Pour choisir la bonne modalité audio et le bon fil de POIs, il faut d'abord savoir dans quel contexte l'utilisateur se déplace. Sans cette information, on ne peut pas adapter l'expérience.

## Hypothèse de valeur
Une détection fiable du contexte permet d'adapter automatiquement l'expérience sans intervention manuelle de l'utilisateur, rendant l'app plus simple d'utilisation.

⚠️ Hypothèse : la détection automatique sera suffisamment fiable pour éviter de demander à l'utilisateur.

## Utilisateurs concernés
Tous les utilisateurs de l'audio guide, quel que soit leur mode de déplacement.

## Scénarios d'usage pressentis
- **Scénario 1** : L'utilisateur démarre en voiture à 50km/h → système détecte "voiture" et adapte
- **Scénario 2** : L'utilisateur se gare et marche → après X secondes à 5km/h, bascule en "piéton"
- **Scénario 3** : L'utilisateur est en centre-ville dense → système détecte "urbain" via densité POI
- **Scénario 4** : L'utilisateur roule sur autoroute → système détecte "route rapide" (vitesse + faible densité)

## Idées de solution (non exclusives)

### Option A : Détection par seuils de vitesse
```typescript
type TransportMode = 'pedestrian' | 'bicycle' | 'car';

function detectMode(speedKmh: number, smoothedOver: number = 30): TransportMode {
  if (speedKmh < 8) return 'pedestrian';      // < 8 km/h
  if (speedKmh < 25) return 'bicycle';        // 8-25 km/h
  return 'car';                                // > 25 km/h
}
```

**Pros** : Simple, déterministe, peu de ressources
**Cons** : Faux positifs (embouteillage = piéton?), seuils arbitraires

### Option B : Détection multi-critères avec hystérésis
Combiner plusieurs signaux et ajouter une temporisation pour éviter les oscillations :

```typescript
interface ContextState {
  mode: TransportMode;
  confidence: number;
  stableSince: Date;
  environment: 'urban' | 'suburban' | 'rural' | 'highway';
}

// Changement de mode seulement si :
// 1. Nouveau mode détecté pendant > STABILITY_THRESHOLD (ex: 60s)
// 2. Confidence > MIN_CONFIDENCE (ex: 0.7)
```

**Pros** : Plus robuste, évite les oscillations (feu rouge ≠ piéton)
**Cons** : Plus complexe, latence de détection

### Option C : Enrichissement avec données OSM
Utiliser le type de voie OSM comme indice supplémentaire :
- `highway=motorway` → probablement voiture rapide
- `highway=footway` → probablement piéton
- `maxspeed` → estimation de vitesse si GPS imprécis

**Pros** : Données contextuelles riches
**Cons** : Dépendance externe, couverture variable

## Critères d'acceptation (brouillon)

- [ ] Le mode de transport est détecté automatiquement (piéton/vélo/voiture)
- [ ] Le type d'environnement est caractérisé (urbain/rural/route)
- [ ] Un changement de mode n'est validé qu'après une période de stabilité
- [ ] La vitesse est calculée de façon adaptée au mode (lissée pour voiture, basse pour piéton flâneur)
- [ ] Les données OSM (maxspeed) sont utilisées comme fallback/validation
- [ ] Un événement est émis lors d'un changement de contexte confirmé

## Contraintes connues
- **Technique** : Précision GPS variable (tunnel, canyon urbain)
- **Batterie** : Fréquence GPS à optimiser
- **Données** : OSM pas toujours disponible/complet

## Hypothèses explicites
- ⚠️ Un lissage de 30s suffit pour avoir une vitesse stable en voiture
- ⚠️ Un piéton en visite marche à ~4-5 km/h (pas 6-7 km/h de marche rapide)
- ⚠️ 60 secondes de stabilité suffisent pour confirmer un changement de mode
- ⚠️ La densité de POIs dans un rayon de 500m est un bon proxy pour "urbain"

## Dépendances pressenties
- Service de géolocalisation (GPS)
- Données OSM (optionnel mais recommandé)
- Base de POIs locale (pour calcul densité)

## Questions ouvertes
- Quel rayon pour calculer la densité de POIs ? (500m proposé)
- Comment distinguer "embouteillage" de "piéton" ? (durée + environnement ?)
- Faut-il un mode "inconnu" pendant la phase de détection initiale ?
- Quelle fréquence d'échantillonnage GPS est optimale (batterie vs précision) ?

## Risques pressentis
- **Risque UX** : Détection incorrecte → mauvaise modalité audio → frustration
- **Risque technique** : Drain batterie si GPS trop fréquent
- **Risque fonctionnel** : Oscillations de mode si seuils mal calibrés

## Indicateurs de succès (indicatifs)
- Taux de détection correcte du mode > 90% (à valider avec beta testeurs)
- Pas de changement de mode "parasite" pendant un trajet stable
- Temps de détection initial < 30 secondes

## Notes libres

### Seuils proposés (à calibrer)
| Mode | Vitesse min | Vitesse max | Stabilité requise |
|------|-------------|-------------|-------------------|
| Piéton | 0 km/h | 8 km/h | 45s |
| Vélo | 8 km/h | 25 km/h | 30s |
| Voiture | 25 km/h | ∞ | 30s |

### Calcul de vitesse par mode
- **Piéton** : Vitesse de "flâneur" = 4 km/h (constante ou configurable)
- **Vélo** : Vitesse GPS instantanée lissée sur 15s
- **Voiture** : Vitesse GPS lissée sur 30s, ou maxspeed OSM × 0.8 si GPS indisponible

### Architecture événementielle
```typescript
interface ContextChangeEvent {
  previousContext: ContextState;
  newContext: ContextState;
  timestamp: Date;
  trigger: 'speed_change' | 'stability_reached' | 'manual_override';
}

// Émis sur le bus d'événements pour que :
// - Le fil de POIs se recalcule
// - La modalité audio s'adapte
```
