# Bug Report – Phase A (Exploration)

## Identifiant
navigation-buttons-disappear

## Résumé
Les boutons en haut de l'écran disparaissent quand on clique dessus en mode navigation. Ce ne sont pas des boutons de "parcours" (trajets virtuels), l'utilisateur les appelle "parcours à venir".

## Environnement
- **Version** : Actuelle
- **Navigateur/OS** : Tous
- **Autre contexte** : Mode navigation

## Comportement observé
Les boutons situés en haut de l'écran (probablement liés aux POIs à venir ou options de navigation) disparaissent lorsqu'on clique dessus.

## Comportement attendu
Les boutons devraient :
- Soit effectuer une action visible (afficher un détail, sélectionner un POI, etc.)
- Soit rester visibles après le clic
- Avoir un feedback clair sur leur fonction

## Étapes de reproduction
1. Lancer une navigation
2. Observer les boutons en haut de l'écran
3. Cliquer sur l'un d'eux
4. Constater qu'ils disparaissent

## Impact
- **Criticité** : Majeur
- **Utilisateurs affectés** : Tous les utilisateurs en navigation

## Pistes de diagnostic
- Possible confusion entre état "sélectionné" et "masqué"
- Event handler qui toggle la visibilité au lieu d'effectuer une action
- Problème de state management

## Composants concernés
- À identifier : composants de navigation en haut de l'écran
- Probablement liés à la liste des POIs futurs

## Notes
Nécessite investigation pour identifier précisément :
1. Quels composants sont concernés
2. Quel est le comportement attendu de ces boutons
3. S'il s'agit d'un bug de logique ou d'un problème de design non finalisé
