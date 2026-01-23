# Feature – Phase A (Exploration)

## Identifiant
modalite-audio-adaptative

## Résumé
Choisir automatiquement la modalité audio (S/M/L et potentiellement type de récit) en fonction du contexte de déplacement et du fil de POIs prédit.

## Problème adressé
Un audio trop long fait rater le POI suivant. Un audio trop court est frustrant. La durée idéale dépend du temps disponible avant le prochain point d'intérêt, qui lui-même dépend de la vitesse et de la densité de POIs.

## Hypothèse de valeur
Un choix automatique et adaptatif de la modalité audio offre la meilleure expérience sans que l'utilisateur n'ait à micro-gérer ses préférences.

⚠️ Hypothèse : les utilisateurs accepteront que la longueur de l'audio varie selon le contexte.

## Utilisateurs concernés
Tous les utilisateurs écoutant l'audio guide en déplacement.

## Scénarios d'usage pressentis
- **Scénario 1 - Paris voiture** : 30km/h, POIs tous les 200m, densité haute → **Taille S** (15s)
- **Scénario 2 - Paris piéton** : 4km/h, POIs tous les 100m → **Taille M** (45s, on flâne)
- **Scénario 3 - Route rapide** : 90km/h, prochain POI à 5km → **Taille L** (2min, POI rare = important)
- **Scénario 4 - Village** : 50km/h, densité moyenne → **Taille M** (équilibré)
- **Scénario 5 - Changement en cours** : L'utilisateur se gare → bascule progressive vers mode piéton

## Idées de solution (non exclusives)

### Option A : Algorithme "Time Budget"
Choisir la taille basée sur le temps disponible avant le prochain POI :

```typescript
const AUDIO_DURATIONS = {
  S: 15,   // secondes
  M: 45,
  L: 120,
};

function chooseModalite(
  fil: Fil,
  context: ContextState,
  currentPoi: Poi
): AudioModalite {
  // Temps jusqu'au prochain POI du fil
  const timeToNext = fil.entries[0]?.estimatedTimeSeconds ?? Infinity;
  
  // Facteur d'importance : POI majeur mérite plus de temps
  const importanceFactor = 0.5 + (currentPoi.importance / 10) * 0.5;
  
  // Facteur de densité : haute densité = audio courts
  const densityFactor = Math.max(0.3, 1 - (context.localDensity / 50));
  
  // Facteur de préférence utilisateur
  const userFactor = getUserPreferenceFactor(); // 0.8 = préfère court, 1.2 = préfère long
  
  // Temps "budget" ajusté (on garde 30% de marge)
  const timeBudget = timeToNext * 0.7 * importanceFactor * densityFactor * userFactor;
  
  // Choix de taille
  if (timeBudget < AUDIO_DURATIONS.S * 1.5) return 'S';
  if (timeBudget < AUDIO_DURATIONS.M * 1.5) return 'M';
  return 'L';
}
```

**Pros** : Logique claire, paramétrable, prédictible
**Cons** : Ne gère pas les transitions en cours de lecture

### Option B : Système de fils narratifs avec points de jonction
Préparer plusieurs versions du récit qui se rejoignent à des points prédéfinis :

```
Fil S:  [Intro]----[Point A]----[Outro]
Fil M:  [Intro]----[Détail 1]----[Point A]----[Détail 2]----[Outro]
Fil L:  [Intro]----[Contexte]----[Détail 1]----[Point A]----[Anecdote]----[Détail 2]----[Outro]
                                      ↑
                              Point de jonction
```

Si le contexte change en cours de lecture, on peut "sauter" au prochain point de jonction du fil approprié.

**Pros** : Transitions fluides possibles, expérience cohérente
**Cons** : Complexité de génération des contenus, plus de données

### Option C : Modalités composites (Taille × Type)
Au-delà de S/M/L, ajouter des "types de récit" :
- **Factuel** : Dates, chiffres, faits
- **Anecdotique** : Histoires, légendes
- **Immersif** : Ambiance, description sensorielle

La modalité devient un tuple : `(S, Anecdotique)` ou `(L, Factuel)`

**Pros** : Expérience personnalisable, richesse narrative
**Cons** : Multiplication des contenus à générer, UX de configuration

## Critères d'acceptation (brouillon)

- [ ] La taille S/M/L est choisie automatiquement au moment de lancer la lecture
- [ ] Le choix prend en compte : vitesse, distance au prochain POI, densité, importance
- [ ] Les préférences utilisateur influencent le choix (facteur configurable)
- [ ] Un changement de contexte émet un événement (pas forcément traité en v1)
- [ ] L'algorithme est déterministe et explicable (loggable pour debug)

## Contraintes connues
- **Contenu** : Il faut que les 3 versions (S/M/L) existent pour chaque POI
- **UX** : Le choix doit être instantané (pas de latence perceptible)
- **Cohérence** : Si on change de taille en cours de route, l'expérience ne doit pas être jarring

## Hypothèses explicites
- ⚠️ Les durées S=15s, M=45s, L=120s sont appropriées (à calibrer)
- ⚠️ Un facteur de 0.7 sur le time budget laisse assez de marge
- ⚠️ La densité de 50 POIs/km² représente un "centre-ville dense"
- ⚠️ Les utilisateurs préfèrent une adaptation automatique à un choix manuel

## Dépendances pressenties
- **Feature** : 20260123053502-contexte-deplacement (vitesse, mode, densité)
- **Feature** : 20260123053503-fil-pois-predictif (temps jusqu'au prochain POI)
- **Epic** : Génération des contenus audio S/M/L (autre Epic)

## Questions ouvertes
- Faut-il afficher à l'utilisateur quelle taille a été choisie ?
- Peut-on "upgrader" en cours de lecture si le contexte le permet ? (anecdote bonus)
- Comment gérer le cas où aucune version de la taille choisie n'existe ?
- L'utilisateur peut-il forcer une taille ? (override manuel)
- Comment calibrer les seuils initiaux ? (A/B testing beta ?)

## Risques pressentis
- **Risque UX** : Choix perçu comme arbitraire ou incohérent
- **Risque contenu** : Versions S trop pauvres, versions L trop longues
- **Risque technique** : Algorithme trop sensible → changements fréquents

## Indicateurs de succès (indicatifs)
- L'audio se termine généralement avant d'arriver au prochain POI (> 85% du temps)
- Les utilisateurs ne changent pas manuellement la taille (satisfaction avec l'auto)
- Pas de plainte "c'était trop court" ou "c'était trop long" (feedback beta)

## Notes libres

### Tableau de décision simplifié

| Contexte | Time budget | Densité | Choix |
|----------|-------------|---------|-------|
| Voiture Paris | 24s | Haute | S |
| Piéton Paris | 90s | Haute | M |
| Route rapide | 200s | Basse | L |
| Village | 58s | Moyenne | M |
| Arrêt prolongé | ∞ | - | L (ou préf user) |

### Architecture événementielle

```typescript
interface ModaliteChoisieEvent {
  poi: Poi;
  modalite: 'S' | 'M' | 'L';
  raison: {
    timeBudget: number;
    densityFactor: number;
    importanceFactor: number;
    userFactor: number;
  };
  timestamp: Date;
}

interface ContexteChangeEnCoursEvent {
  ancienContexte: ContextState;
  nouveauContexte: ContextState;
  audioEnCours: boolean;
  tempsRestantAudio: number;
  action: 'continue' | 'transition_to_junction' | 'skip_to_end';
}
```

### Évolution future : Modes narratifs

Quand on ajoutera les "types de récit", la configuration pourrait ressembler à :

```typescript
interface UserPreferences {
  defaultSize: 'S' | 'M' | 'L' | 'auto';
  preferredNarrativeType: 'factual' | 'anecdotal' | 'immersive' | 'auto';
  allowMidAudioTransition: boolean;
  sizeByTransportMode: {
    pedestrian: 'L' | 'auto';  // À pied, je préfère les longs
    car: 'S' | 'auto';         // En voiture, les courts
    bicycle: 'M' | 'auto';
  };
}
```

### Feedback beta
Prévoir un bouton "Ce récit était trop long/court/parfait" après chaque audio pour calibrer l'algorithme avec des données réelles.
