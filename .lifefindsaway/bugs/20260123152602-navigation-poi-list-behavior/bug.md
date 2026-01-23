# Bug Report – Phase A (Exploration)

## Identifiant
navigation-poi-list-behavior

## Résumé
Le composant `navigation-poi-list` a un comportement suspect : les éléments disparaissent quand on clique dessus.

## Environnement
- **Version** : Actuelle
- **Navigateur/OS** : Tous
- **Autre contexte** : Mode navigation

## Comportement observé
Quand on clique sur un élément de `navigation-poi-list`, il disparaît. Il n'est pas clair ce qui est censé être affiché dans cette liste.

## Comportement attendu
La liste devrait afficher clairement :
- Le POI **en cours** (actuellement lu/affiché)
- Le POI **précédent** (juste lu)
- Idéalement, un aperçu des POIs à venir

Le clic sur un élément devrait :
- Soit afficher plus de détails
- Soit permettre de relancer la lecture
- Mais PAS faire disparaître l'élément

## Étapes de reproduction
1. Lancer une navigation
2. Observer `navigation-poi-list`
3. Cliquer sur un POI de la liste
4. L'élément disparaît

## Impact
- **Criticité** : Majeur
- **Utilisateurs affectés** : Tous les utilisateurs en navigation

## Pistes de diagnostic
- Le clic déclenche peut-être une suppression de la liste au lieu d'une sélection
- Confusion entre "marquer comme lu" et "afficher/masquer"
- State management à vérifier

## Composants concernés
- `navigation-poi-list` (nom supposé, à confirmer dans le code)
- Composants de navigation frontend

## Relation avec Feature
Ce bug est lié à la feature/epic **Navigation Playlist** qui définira le comportement complet :
- Fil d'Ariane (POIs passés)
- POI en cours
- Playlist (POIs futurs avec sélection possible)

## Notes
Investigation nécessaire pour comprendre :
1. Le design initial de ce composant
2. Ce qui déclenche la disparition
3. Comment ça s'intègre avec la future feature de playlist
