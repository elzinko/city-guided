# Feature – Phase A (Exploration)

## Identifiant
notation-avis-lieux

## Résumé
Afficher la notation (étoiles) et le nombre d'avis des lieux dans les cartes résultats et fiches POI pour aider les utilisateurs à choisir.

## Problème adressé
Les utilisateurs n'ont aucune indication de la qualité/popularité d'un POI. Difficile de choisir entre plusieurs POIs similaires sans avis.

## Hypothèse de valeur
En affichant des notations, les utilisateurs font des choix plus éclairés et ont plus confiance dans l'app.

⚠️ Hypothèse non validée

## Utilisateurs concernés
- Tous les utilisateurs qui consultent des POIs
- Particulièrement les touristes qui ne connaissent pas les lieux

## Scénarios d'usage pressentis
1. Utilisateur cherche "Musées", voit les notes, choisit celui avec 4.5⭐
2. Utilisateur hésite entre 2 restaurants, choisit celui avec le plus d'avis
3. Utilisateur consulte les avis textuels pour plus de détails

## Idées de solution (non exclusives)
- **Option A** : Notation simple (étoiles + nombre d'avis)
- **Option B** : Avis textuels avec notation
- **Option C** : Critères multiples (qualité audio, infos, accessibilité)

## Critères d'acceptation (brouillon)
- [ ] Affichage étoiles dans cartes résultats
- [ ] Affichage étoiles + nombre d'avis dans fiche POI
- [ ] Possibilité de laisser un avis (note + texte)
- [ ] Calcul de la moyenne des notes
- [ ] Affichage des avis textuels

## Questions ouvertes
- Source des données : base interne ou API externe (Google Places ?)
- Modération des avis ?
- Avis anonymes ou avec compte ?

## Notes libres
Voir détails dans [epic.md](../epic.md)
