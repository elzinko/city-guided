# Feature – POI Admin Import

## Identifiant
FEAT-POI-001

## Résumé
Application web admin (desktop) permettant d'importer manuellement des POIs 
touristiques depuis OpenTripMap + Wikidata pour des zones géographiques définies.

## Problème adressé
- Pas d'outil pour alimenter la base POI automatiquement
- Import manuel fastidieux et non scalable
- Besoin de visualiser et valider les données importées

## Hypothèse de valeur
Un outil admin dédié permettrait aux content managers d'alimenter rapidement 
la base POI avec des données de qualité, tout en gardant le contrôle sur 
ce qui est importé.

⚠️ Hypothèse non validée : l'import par zone (ville) est la bonne granularité

## Utilisateurs concernés
- Content Manager / Admin
- Développeur (debug/test)

## Scénarios d'usage pressentis

### Scénario 1 : Import initial d'une ville
1. L'admin ouvre l'application admin
2. Sélectionne "Fontainebleau" dans la liste des zones
3. Clique sur "Importer les POIs"
4. Le système appelle OpenTripMap, enrichit via Wikidata
5. Les POIs apparaissent sur la carte et dans la liste
6. L'admin peut consulter le détail de chaque POI

### Scénario 2 : Vérification des données
1. L'admin consulte la liste des POIs de Marseille
2. Clique sur "Basilique Notre-Dame de la Garde"
3. Voit la fiche détaillée : description, coordonnées, image
4. Vérifie que les données sont correctes

## Idées de solution (non exclusives)

### Option A : App Next.js séparée
- Nouvelle app dans `apps/admin/`
- Réutilise le design system existant
- API dédiée ou extension de l'API actuelle

### Option B : Extension de l'admin existant
- Ajouter des pages dans `/admin/` du frontend actuel
- Moins de setup, mais mélange admin POI et admin trajets

**Piste privilégiée : Option A** (séparation des concerns)

## Critères d'acceptation (brouillon)

- [ ] Interface web accessible en desktop
- [ ] Liste des zones disponibles : Marseille, Fontainebleau
- [ ] Bouton "Importer" par zone
- [ ] Appel OpenTripMap avec rayon configurable
- [ ] Enrichissement Wikidata automatique
- [ ] Stockage en base PostgreSQL
- [ ] Affichage carte Leaflet des POIs importés
- [ ] Liste des POIs avec recherche/filtre
- [ ] Page détail POI avec toutes les métadonnées
- [ ] Gestion des erreurs (rate limit, timeout)

## Contraintes connues

### Techniques
- Limite 5000 req/jour OpenTripMap
- Pas de rate limit dur sur Wikidata (usage raisonnable)
- Base PostgreSQL existante à étendre

### Organisationnelles
- Pas de designer dédié → UI fonctionnelle suffit

## Hypothèses explicites
- ⚠️ Le schéma POI actuel peut être étendu pour les données Wikidata
- ⚠️ L'import d'une ville tient dans les 5000 req/jour
- ⚠️ Pas besoin d'authentification pour le MVP admin

## Dépendances pressenties
- API OpenTripMap (externe)
- API Wikidata SPARQL (externe)
- Base PostgreSQL (existante)

## Questions ouvertes
- Rayon d'import par défaut ? (5km, 10km ?)
- Catégories de POI à filtrer ? (tout tourisme ou sélection)
- Faut-il un mode "preview" avant import définitif ?
- Comment gérer les doublons (POI déjà importé) ?

## Risques pressentis
- Trop de POIs retournés → filtrage nécessaire
- Qualité inégale selon les villes
- Descriptions Wikidata manquantes pour certains POIs

## Indicateurs de succès (indicatifs)
- Temps d'import d'une ville < 2 minutes
- > 80% des POIs ont une description Wikidata
- Admin peut naviguer facilement dans les données

## Notes libres
- Inspiration UI : admin panel minimaliste type Retool/AdminJS
- Leaflet déjà utilisé dans le frontend principal
- Prévoir extension future : import automatique planifié
