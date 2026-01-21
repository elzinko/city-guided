# Bottom Sheet

Ce dossier contient le composant BottomSheet et ses dépendances.

## Structure

```
bottom-sheet/
├── hooks/              # Logique métier isolée
│   ├── useBottomSheetDrag.ts      # Gestion du drag
│   ├── useBottomSheetHeight.ts    # Calculs de hauteur
│   └── __tests__/                 # Tests unitaires
└── content/            # Composants de contenu (futur)
```

## Hooks

### useBottomSheetDrag

Hook personnalisé qui gère toute la logique de drag du bottom sheet.

**Responsabilités:**
- Détection des événements pointer/touch
- Calcul de la vélocité
- Snap vers le niveau le plus proche
- Gestion des refs

**Usage:**
```tsx
const { sheetRef, handlePointerDown } = useBottomSheetDrag({
  level,
  setLevel,
  menuVisible,
  devBlockHeight,
  selectedPoi,
  getLevelHeight,
  onHeightChange,
})
```

### useBottomSheetHeight

Hook qui calcule les hauteurs et positions du bottom sheet.

**Responsabilités:**
- Calcul des hauteurs par niveau
- Limitation de hauteur maximale
- Position bottom selon le contexte

**Usage:**
```tsx
const { height, bottom, getLevelHeight } = useBottomSheetHeight({
  level,
  menuVisible,
  devBlockHeight,
  isDesktop,
})
```

## Tests

Les hooks critiques sont testés unitairement.

**Stratégie:**
- ✅ Tests sur la logique complexe (drag, snap, vélocité)
- ❌ Pas de tests sur le rendu (testé manuellement)

**Lancer les tests:**
```bash
npm test -- useBottomSheetDrag
```

## Principes

- **Séparation des responsabilités**: Logique métier dans les hooks
- **Testabilité**: Hooks isolés et testables
- **Performance**: Refs pour éviter les re-renders
- **Maintenabilité**: Code documenté et structuré
