# Bug Report – Panneau "Découvrir" reste ouvert après effacement de recherche

## Identifiant
bottomsheet-close-discover

## Résumé
Lorsqu'on effectue une recherche rapide (ex: "Château") puis qu'on clique sur le bouton "Effacer la recherche" (✕) dans la barre de recherche, le panneau bottom-sheet passe du mode "résultats de recherche" au mode "Découvrir" mais reste ouvert, alors qu'on s'attend à ce qu'il soit fermé.

## Environnement
- **Version** : Current (main branch)
- **Navigateur/OS** : Tous navigateurs
- **Autre contexte** : Affecte le composant BottomSheet en mode mobile

## Comportement observé
1. L'utilisateur clique sur une recherche rapide (ex: "Château")
2. Le panneau bottom-sheet s'ouvre avec les résultats de recherche
3. L'utilisateur clique sur le bouton "Effacer la recherche" (✕) dans SearchBar
4. ✅ La recherche est effacée correctement
5. ❌ Le panneau bottom-sheet reste ouvert et affiche le contenu "Découvrir"

## Comportement attendu
1. L'utilisateur clique sur une recherche rapide (ex: "Château")
2. Le panneau bottom-sheet s'ouvre avec les résultats de recherche
3. L'utilisateur clique sur le bouton "Effacer la recherche" (✕) dans SearchBar
4. ✅ La recherche est effacée
5. ✅ Le panneau bottom-sheet se ferme complètement (level: 'hidden')

## Étapes de reproduction
1. Ouvrir l'application web-frontend
2. Cliquer sur une recherche rapide (ex: "Château") dans les chips de suggestion
3. Observer que le bottom-sheet s'ouvre avec des résultats de recherche
4. Cliquer sur le bouton "✕" (aria-label: "Effacer la recherche") dans la SearchBar
5. Observer que le panneau passe en mode "Découvrir" au lieu de se fermer

## Impact
- **Criticité** : Mineur
- **Utilisateurs affectés** : Tous les utilisateurs effectuant une recherche rapide

## Pistes de diagnostic

### Composants concernés
- `apps/web-frontend/src/components/SearchBar.tsx` (ligne 125-146)
- `apps/web-frontend/src/components/SearchOverlay.tsx` (ligne 86-91)
- `apps/web-frontend/src/components/BottomSheet.tsx`
- Probablement le composant parent qui gère la logique d'orchestration

### Hypothèse principale
Le bouton "Effacer la recherche" (dans SearchBar.tsx ligne 125) appelle `onClear` qui est défini dans SearchOverlay comme `clearAll()` (ligne 86-91):

```typescript
const clearAll = () => {
  setQuery('')
  if (setSearchReady) setSearchReady(false)
  if (setSearchActive) setSearchActive(false)
  if (onClear) onClear()
}
```

Cette fonction:
- ✅ Efface la query
- ✅ Désactive searchReady et searchActive
- ❓ Appelle un `onClear` supplémentaire passé en props

**Le problème** : Il n'y a pas de logique pour fermer le BottomSheet (setLevel('hidden')) ou désactiver le mode découverte (setDiscoverMode(false)).

### Différence avec le bouton "Retour"
Le bouton "Retour" (flèche ←) dans SearchBar (ligne 117-129 de SearchOverlay) contient la logique correcte:

```typescript
onBack={() => {
  // ...
  setSearchActive(false)
  setSearchReady(false)
  // S'assurer que le panneau découverte ne s'affiche pas
  if (setDiscoverMode) setDiscoverMode(false)
  if (setSheetLevel) setSheetLevel('hidden')
}}
```

### Solution suggérée
Harmoniser le comportement de `clearAll()` avec celui de `onBack()` en ajoutant:
```typescript
if (setDiscoverMode) setDiscoverMode(false)
if (setSheetLevel) setSheetLevel('hidden')
```

**OU** mieux encore, vérifier dans le composant parent qui utilise SearchOverlay que `onClear` ferme correctement le BottomSheet.

## Composants concernés
- `apps/web-frontend/src/components/SearchBar.tsx`
- `apps/web-frontend/src/components/SearchOverlay.tsx`
- `apps/web-frontend/src/components/BottomSheet.tsx`
- Composant parent orchestrant ces trois composants (probablement `pages/index.tsx` ou similaire)

## Screenshots / Logs
N/A

## Workaround
Utiliser le bouton "Retour" (flèche ←) au lieu du bouton "Effacer" (✕) pour fermer correctement le panneau.

## Notes
- Le bouton "Effacer la recherche" n'a pas d'ID HTML explicite (seulement aria-label)
- Il existe une différence de comportement entre deux actions similaires (retour vs effacer) qui devrait être harmonisée
- Envisager de refactoriser la logique de fermeture pour la centraliser et éviter la duplication
