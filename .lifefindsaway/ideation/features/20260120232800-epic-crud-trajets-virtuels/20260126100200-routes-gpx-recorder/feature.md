# Feature – Phase A (Exploration)

## Identifiant
routes-gpx-recorder

## Résumé
Ajouter un enregistreur de parcours GPS permettant de créer des trajets virtuels à partir de ses déplacements réels, avec export en GPX.

## Problème adressé
- Actuellement, créer un trajet virtuel nécessite de cliquer manuellement chaque point sur la carte
- Pour tester l'app sur un trajet réel, il faut soit importer un GPX externe, soit placer manuellement des dizaines de points
- Aucun moyen de "capturer" un parcours réel pour le rejouer ensuite

## Hypothèse de valeur
En permettant l'enregistrement de parcours réels :
- Les développeurs peuvent capturer leurs déplacements pour créer des trajets de test
- Les content creators peuvent enregistrer les parcours sur lesquels ils créent des audio-guides
- Le testing devient plus réaliste (vrais trajets avec vraies vitesses)

⚠️ Hypothèse non validée

## Utilisateurs concernés
- Développeurs : création rapide de trajets de test
- Content creators : capturer des parcours pour les audio-guides
- QA/Testeurs : reproduire des parcours utilisateur réels

## Scénarios d'usage pressentis
1. L'utilisateur ouvre l'onglet "Enregistrer" dans la page trajets virtuels
2. Il nomme son parcours et clique "Démarrer l'enregistrement"
3. Il se déplace physiquement (ou simule un trajet)
4. L'app enregistre les positions GPS en temps réel
5. Il arrête l'enregistrement
6. Le parcours est sauvegardé et peut être :
   - Visualisé sur la carte (tracé sans les points individuels)
   - Renommé / supprimé
   - Téléchargé en GPX pour édition externe (gpx.studio)

## Idées de solution (non exclusives)
**Option A : Enregistrement GPS natif**
- Utiliser l'API Geolocation avec `watchPosition`
- Stocker les points avec timestamp
- Export en GPX avec horodatage complet

**Option B : Enregistrement simplifié**
- Capturer uniquement les positions toutes les N secondes
- Moins de points mais fichier plus léger
- Calcul des vitesses a posteriori si besoin

**Option C : Intégration avec trajet virtuel**
- Enregistrer pendant qu'un trajet virtuel est actif
- Permet de capturer la simulation pour vérification

## Critères d'acceptation (brouillon)

- [ ] Nouvel onglet "Enregistrer" dans `/admin/routes`
- [ ] Bouton "Démarrer l'enregistrement" avec nom du parcours
- [ ] Indicateur visuel d'enregistrement en cours (point rouge clignotant)
- [ ] Bouton "Arrêter" pour terminer l'enregistrement
- [ ] Liste des parcours enregistrés avec actions :
  - [ ] Renommer
  - [ ] Supprimer
  - [ ] Visualiser (tracé sur carte, sans les points individuels)
  - [ ] Télécharger en GPX
- [ ] Stockage en localStorage (comme les routes custom)
- [ ] Format GPX valide avec timestamps

## Contraintes connues
- **Permission GPS** : Nécessite l'autorisation de géolocalisation
- **Batterie** : L'enregistrement GPS continu consomme de la batterie
- **Précision** : La précision GPS peut varier (intérieur, tunnel, etc.)
- **Mobile only** : Principalement utile sur mobile (déplacements réels)

## Hypothèses explicites
- L'utilisateur acceptera de donner les permissions GPS
- Les parcours sont relativement courts (< 1h, < 1000 points)
- Le fichier GPX sera retravaillé avec gpx.studio si besoin (minification)

## Dépendances pressenties
- API Geolocation du navigateur
- Export GPX (à implémenter ou utiliser lib existante)
- RouteMap pour visualisation (mode read-only)

## Questions ouvertes
- Fréquence d'échantillonnage ? (1 point/seconde, 1 point/5 secondes, adaptative ?)
- Faut-il filtrer les points aberrants (GPS drift) ?
- Limite de points avant avertissement ?
- Faut-il permettre de "continuer" un enregistrement interrompu ?

## Risques pressentis
- **Technique** : GPS imprécis en intérieur ou zone dense
- **UX** : L'utilisateur oublie d'arrêter l'enregistrement → fichier énorme
- **Stockage** : localStorage limité (~5MB), un long parcours peut saturer

## Indicateurs de succès (indicatifs)
- Un parcours de 10 minutes peut être enregistré et relu
- Le fichier GPX est valide et ouvrable dans gpx.studio
- Le trajet enregistré est utilisable comme trajet virtuel

## Notes libres
Structure de l'interface envisagée :

```
┌─────────────────────────────────────┐
│ Trajets virtuels                    │
├─────────────────────────────────────┤
│ [Liste] [Enregistrer] [Importer]    │  ← Onglets
├─────────────────────────────────────┤
│ Onglet "Enregistrer" :              │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Nom: [Mon parcours__________]   │ │
│ │                                 │ │
│ │ [🔴 Démarrer l'enregistrement]  │ │
│ │                                 │ │
│ │ Parcours enregistrés :          │ │
│ │ ┌─────────────────────────────┐ │ │
│ │ │ 🗺️ Trajet centre-ville     │ │ │
│ │ │ 15 min • 342 pts • 2.3 km  │ │ │
│ │ │ [👁️] [✏️] [🗑️] [⬇️ GPX]     │ │ │
│ │ └─────────────────────────────┘ │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

Pour l'export GPX, format standard :
```xml
<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="CityGuided">
  <metadata>
    <name>Mon parcours</name>
    <time>2026-01-26T10:30:00Z</time>
  </metadata>
  <trk>
    <name>Mon parcours</name>
    <trkseg>
      <trkpt lat="48.8566" lon="2.3522">
        <time>2026-01-26T10:30:00Z</time>
      </trkpt>
      <trkpt lat="48.8567" lon="2.3523">
        <time>2026-01-26T10:30:05Z</time>
      </trkpt>
      ...
    </trkseg>
  </trk>
</gpx>
```
