# Epic – Phase A (Exploration)

## Identifiant
epic-crud-trajets-virtuels

## Contexte
L'application permet déjà de simuler des parcours GPS pour tester l'expérience audio-guide sans se déplacer réellement. Cependant, la gestion de ces trajets virtuels est actuellement limitée :
- Pas d'interface admin pour importer/gérer les trajets
- Pas de support pour les fichiers GPX
- Pas de visualisation/édition des trajets
- Difficile d'ajouter de nouveaux parcours de test

## Problème / Opportunité
**Problème actuel** :
- Les développeurs doivent manuellement coder les trajets de test
- Impossible d'importer des trajets réels (GPX)
- Pas de réutilisation de trajets existants (Google Maps, Strava, etc.)
- Testing limité à des trajets statiques

**Opportunité** :
- Permettre l'import facile de trajets réels via GPX
- Créer une bibliothèque de trajets de test réutilisables
- Tester l'expérience audio-guide sur des parcours variés
- Faciliter le travail des content creators (audio-guides)

## Hypothèse de valeur
En offrant un système CRUD complet pour les trajets virtuels :
- Les développeurs gagnent du temps (pas de code manuel)
- La qualité du testing s'améliore (trajets réels, variés)
- Les content creators peuvent tester leurs audio-guides facilement
- Possibilité d'offrir des "tours guidés" pré-définis aux utilisateurs (futur)

⚠️ Hypothèse non validée

## Objectifs (non contractuels)
- Permettre l'import de fichiers GPX (horodatés ou non)
- Offrir une interface admin pour gérer les trajets (CRUD)
- Supporter la simulation réaliste (vitesses, timestamps)
- Réduire de 80% le temps nécessaire pour créer un trajet de test
- Constituer une bibliothèque de 10+ trajets de test

## Utilisateurs / Parties prenantes
- **Développeurs** : besoin de trajets de test variés
- **Content creators** : créent des audio-guides, besoin de tester sur des trajets spécifiques
- **QA/Testeurs** : besoin de reproduire des scénarios utilisateur
- **Product managers** : besoin de démos réalistes

## Périmètre pressenti
### Inclus
- Import de fichiers GPX (horodatés et non horodatés)
- Interface admin CRUD (Create, Read, Update, Delete)
- Simulation réaliste avec vitesses réelles (si GPX horodaté)
- Calcul de vitesses via OSRM (si GPX non horodaté)
- Réduction du nombre de points (simplification si trop de points)
- Visualisation des trajets sur une carte
- Sélection du trajet actif pour la simulation

### Exclus
- Enregistrement de trajets en temps réel (GPS tracking live) → à explorer plus tard
- Partage de trajets entre utilisateurs (communauté) → futur
- Édition graphique avancée des trajets (drag-and-drop points) → MVP = import uniquement
- Export de trajets modifiés

## Features découpées

### Implémentées (partiellement)
- ✅ **Interface admin CRUD** - `/admin/routes` existant mais avec bugs
- ✅ **Import GPX basique** - RouteImporter fonctionnel
- ✅ **Visualisation carte** - RouteMap fonctionnel mais bugs d'affichage

### En cours / À faire
1. **20260126100300-routes-gpx-export** - Export GPX (remplacer export JSON actuel)
2. **20260126100100-routes-gpx-default-import** - Import auto de Boucle Fontainebleau au démarrage
3. **20260126100200-routes-gpx-recorder** - Enregistreur de parcours GPS

### Bugs bloquants associés
- 🐛 20260126100000-routes-admin-back-button - Dev-control-block disparaît au retour
- 🐛 20260126100001-routes-admin-map-cutoff - Carte coupée en mode édition
- 🐛 20260126100002-routes-admin-style-mismatch - Rendu incohérent

### Reportées
- ⏸️ **Calcul vitesses via OSRM** - OSRM pas déployé, à revoir plus tard
- ⏸️ **Simplification de trajets** - gpx.studio suffit pour l'instant

## Hypothèses explicites
- Les fichiers GPX sont le format standard le plus utilisé (vs. KML, GeoJSON)
- Les trajets horodatés sont meilleurs pour les tests (vitesses réelles)
- OSRM peut fournir des vitesses réalistes pour les trajets non horodatés
- Un outil externe (gpx.studio) peut suffire pour simplifier les trajets (vs. développer un éditeur)
- Les admins sont OK pour utiliser des outils externes si besoin

⚠️ Ces hypothèses nécessitent validation technique

## Questions ouvertes
- **Import GPX** : Format exact attendu ? (track, route, waypoints ?)
- **Simplification** : Algorithme de réduction de points ? (Douglas-Peucker, Ramer-Douglas-Peucker ?)
- **OSRM** : Est-il déjà déployé et accessible ? (actuellement non utilisé selon TODO)
- **Stockage** : Où stocker les trajets ? (localStorage, backend, fichiers JSON ?)
- **Éditeur** : Faut-il développer un éditeur intégré ou utiliser gpx.studio + import ?
- **Enregistreur** : Priorité haute ou basse pour l'enregistrement live de trajets ?
- **Vitesses** : Comment gérer les zones piétonnes vs. routes (OSRM donne vitesses voiture) ?

## Risques pressentis
- **Technique - OSRM** : OSRM pas encore déployé/configuré (besoin infra)
- **Technique - Performance** : GPX avec milliers de points peut ralentir l'app
- **Technique - Parsing** : Formats GPX variés, parsing robuste nécessaire
- **UX** : Interface admin peut devenir complexe (nombreuses fonctionnalités)
- **Scope creep** : Risque de vouloir trop de features (éditeur graphique, etc.)

## Notes libres
- Regarder les libs existantes : gpxparser.js, turf.js (simplification)
- gpx.studio : https://gpx.studio/fr/app (peut être utilisé en externe)
- OSRM : Besoin de vérifier le statut du déploiement (mentionné dans TODO comme "non utilisé")
- Commencer simple : import + visualisation, puis itérer vers édition/simplification
- Priorité TRÈS HAUTE selon user → focus sur MVP rapide
