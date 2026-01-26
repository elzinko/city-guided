# Feature – Phase A (Exploration)

## Identifiant
routes-gpx-default-import

## Résumé
Convertir le trajet "Boucle Fontainebleau" hardcodé en fichier GPX et l'importer automatiquement au démarrage.

## Problème adressé
- Le trajet par défaut est actuellement hardcodé dans `DEFAULT_DRIVE_PATH` (index.tsx, lignes 26-42)
- Ce trajet "système" ne peut pas être édité ni dupliqué proprement
- Incohérence entre les trajets système et les trajets custom (sources de données différentes)

## Hypothèse de valeur
En convertissant le trajet par défaut en fichier GPX importé automatiquement :
- Uniformisation du format de données (tout en GPX/JSON)
- Possibilité d'éditer et d'enrichir le trajet par défaut
- Facilité d'ajout de nouveaux trajets "système" (juste ajouter un fichier GPX)

⚠️ Hypothèse non validée

## Utilisateurs concernés
- Développeurs : gestion simplifiée des trajets de test
- Content creators : possibilité de modifier les trajets par défaut

## Scénarios d'usage pressentis
1. Au démarrage, l'app charge automatiquement les fichiers GPX du dossier `assets/routes/`
2. Ces trajets apparaissent dans la liste avec le badge "SYSTÈME"
3. L'utilisateur peut les dupliquer pour créer ses propres versions

## Idées de solution (non exclusives)
**Option A : Fichier GPX statique**
- Créer `/public/routes/fontainebleau-loop.gpx` avec les points existants
- Au montage, charger ce fichier et l'ajouter aux routes par défaut
- Parsing GPX avec `gpxparser.js`

**Option B : Fichier JSON statique**
- Créer `/public/routes/defaults.json` avec les trajets par défaut
- Format identique à `SavedRoute` mais avec `isDefault: true`
- Plus simple à parser, moins standard que GPX

**Option C : Assets dans le bundle**
- Importer les fichiers directement via webpack/Next.js
- Pas de requête HTTP supplémentaire
- Moins flexible pour les mises à jour

## Critères d'acceptation (brouillon)

- [ ] Le trajet "Boucle Fontainebleau" est stocké dans un fichier externe (GPX ou JSON)
- [ ] Le fichier est chargé automatiquement au démarrage
- [ ] Le trajet apparaît avec le badge "SYSTÈME" (non modifiable directement)
- [ ] Le trajet peut être dupliqué pour édition
- [ ] Le code `DEFAULT_DRIVE_PATH` est supprimé de `index.tsx`

## Contraintes connues
- **Performance** : Le chargement au démarrage ne doit pas ralentir l'affichage
- **Offline** : Les fichiers doivent fonctionner en mode offline (service worker / cache)

## Hypothèses explicites
- Le format GPX est préféré pour interopérabilité avec gpx.studio
- Un seul trajet par défaut suffit pour la v1
- Les vitesses peuvent être encodées dans les metadata GPX

## Dépendances pressenties
- Import GPX déjà fonctionnel (RouteImporter)
- Stockage localStorage pour les routes custom

## Questions ouvertes
- Faut-il supporter plusieurs trajets par défaut ?
- Comment encoder les vitesses (speedKmh) dans le format GPX ?
- Les trajets par défaut doivent-ils être versionnés (migrations) ?

## Risques pressentis
- **Technique** : Format GPX ne supporte pas nativement les vitesses personnalisées
- **Migration** : Comment gérer les utilisateurs qui ont déjà des données en localStorage ?

## Indicateurs de succès (indicatifs)
- Code `DEFAULT_DRIVE_PATH` supprimé
- Fichier GPX créé et fonctionnel
- Tests de non-régression OK

## Notes libres
Le format GPX pour les points de base :
```xml
<gpx version="1.1">
  <trk>
    <name>Boucle Fontainebleau</name>
    <trkseg>
      <trkpt lat="48.402" lon="2.6998">
        <name>Départ Château</name>
        <extensions>
          <speed>8.33</speed> <!-- 30 km/h en m/s -->
        </extensions>
      </trkpt>
      ...
    </trkseg>
  </trk>
</gpx>
```
