# Bug Report – Phase A (Exploration)

## Identifiant
navigation-zoom-locked

## Résumé
En mode navigation, le zoom est verrouillé et il n'y a pas de bouton "recentrer" pour revenir à sa position après avoir manipulé la carte.

## Environnement
- **Version** : Actuelle
- **Navigateur/OS** : Tous
- **Autre contexte** : Mode navigation uniquement

## Comportement observé
1. Le zoom est bloqué en mode navigation
2. Impossible de déplacer la carte librement
3. Pas de bouton "recentrer" comme sur les GPS classiques
4. Le bouton `map-control-buttons-gps-button` existe en mode carte/recherche mais son comportement n'est pas adapté au mode navigation

## Comportement attendu
1. Pouvoir zoomer/dézoomer librement en mode navigation
2. Pouvoir déplacer la carte pour voir autour
3. Avoir un bouton "recentrer" qui :
   - Replace la carte sur la position actuelle
   - Remet le zoom au niveau approprié pour la navigation
   - Utilise la même logique que le lancement de navigation

## Étapes de reproduction
1. Lancer l'application
2. Démarrer une navigation
3. Essayer de zoomer/déplacer la carte
4. Constater que c'est verrouillé
5. Chercher un bouton "recentrer" → inexistant

## Impact
- **Criticité** : Majeur
- **Utilisateurs affectés** : Tous les utilisateurs en navigation

## Pistes de diagnostic
- Le mode navigation override probablement les contrôles de carte
- La fonction de centrage au lancement existe, il faut l'exposer via un bouton

## Composants concernés
- `apps/web-frontend/` - Composants de carte navigation
- `map-control-buttons-gps-button` - À adapter ou dupliquer pour navigation

## Solution proposée
**Option A (simple)** : Réutiliser `map-control-buttons-gps-button` en mode navigation
**Option B (recommandée)** : Créer un bouton "recentrer" spécifique au mode navigation
- Ergonomie différente du mode exploration prévu à terme
- Bouton visible uniquement en mode navigation
- Appelle la même fonction que le démarrage de navigation (centrage + zoom)

## Notes
Le mode navigation est destiné à avoir une ergonomie distincte du mode exploration/recherche. Un bouton dédié facilite cette séparation future.
