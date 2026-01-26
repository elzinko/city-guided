# Feature – Phase A (Exploration)

## Identifiant
routes-gpx-export

## Résumé
Permettre l'export des trajets virtuels au format GPX pour pouvoir les éditer avec des outils externes (gpx.studio).

## Problème adressé
- L'export actuel est en JSON, pas interopérable avec les outils cartographiques standards
- Impossible d'utiliser gpx.studio pour minifier/retravailler un trajet
- Pas de format standard pour partager les trajets

## Hypothèse de valeur
En exportant en GPX :
- Les trajets peuvent être retravaillés avec gpx.studio (minification, correction de points)
- Interopérabilité avec d'autres apps GPS (Strava, Google Maps, etc.)
- Format standard compréhensible et documenté

⚠️ Hypothèse non validée

## Utilisateurs concernés
- Développeurs : optimiser les trajets de test
- Content creators : partager/archiver les parcours

## Scénarios d'usage pressentis
1. L'utilisateur crée ou édite un trajet dans `/admin/routes`
2. Il clique sur "Télécharger GPX"
3. Le fichier `.gpx` est téléchargé
4. Il l'ouvre dans gpx.studio pour le retravailler
5. Il peut ensuite réimporter le fichier modifié

## Idées de solution (non exclusives)
**Option A : Génération manuelle du XML**
- Template string avec interpolation des coordonnées
- Simple mais fragile

**Option B : Utiliser une lib (togpx, gpxparser)**
- Plus robuste
- Gestion des edge cases

**Option C : Streaming pour gros fichiers**
- Générer le GPX en streaming si beaucoup de points
- Évite les problèmes mémoire

## Critères d'acceptation (brouillon)

- [ ] Bouton "Télécharger GPX" sur chaque trajet (liste et édition)
- [ ] Le fichier GPX généré est valide (schema GPX 1.1)
- [ ] Le fichier s'ouvre correctement dans gpx.studio
- [ ] Les métadonnées sont incluses (nom, description, date)
- [ ] Les timestamps sont inclus si disponibles

## Contraintes connues
- Les trajets sans timestamp auront un GPX simplifié (trkpt sans time)
- Les vitesses custom (speedKmh) peuvent être perdues ou mises en extension

## Hypothèses explicites
- gpx.studio est l'outil principal de retouche
- Le format GPX 1.1 suffit (pas besoin de GPX 1.0)

## Dépendances pressenties
- RoutePointsList / SavedRoute comme source de données

## Questions ouvertes
- Faut-il encoder les vitesses custom dans des extensions GPX ?
- Format du nom de fichier ? (`{routeName}.gpx` ou `{routeId}-{date}.gpx`)

## Risques pressentis
- **Perte de données** : Les métadonnées spécifiques à CityGuided peuvent être perdues

## Indicateurs de succès (indicatifs)
- Export fonctionnel sur tous les trajets
- Fichier valide et ouvert dans gpx.studio sans erreur

## Notes libres
Actuellement, `handleExport` dans routes.tsx exporte en JSON :
```typescript
const exportData = {
  name: routeName || 'trajet_sans_nom',
  description: routeDescription,
  points: points.map((p) => ({ lat: p.lat, lng: p.lng, name: p.name })),
  exportedAt: new Date().toISOString(),
}
const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
```

À transformer en :
```typescript
const gpxContent = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="CityGuided" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${escapeXml(routeName)}</name>
    <desc>${escapeXml(routeDescription)}</desc>
    <time>${new Date().toISOString()}</time>
  </metadata>
  <trk>
    <name>${escapeXml(routeName)}</name>
    <trkseg>
${points.map(p => `      <trkpt lat="${p.lat}" lon="${p.lng}">${p.name ? `<name>${escapeXml(p.name)}</name>` : ''}</trkpt>`).join('\n')}
    </trkseg>
  </trk>
</gpx>`
const blob = new Blob([gpxContent], { type: 'application/gpx+xml' })
```
