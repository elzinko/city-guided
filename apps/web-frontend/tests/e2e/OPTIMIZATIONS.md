# Tests E2E Optimisés

## Changements effectués (16/01/2026)

### Backup
Les anciens tests ont été sauvegardés dans `apps/web-frontend/tests/e2e-backup-*`

### Optimisations principales

#### 1. **Réduction des timeouts**
- Timeout global : 10s → 8s
- Timeouts individuels : 10-15s → 5s (8s pour les cas critiques)
- Suppression de tous les `waitForTimeout` fixes

#### 2. **Simplification des sélecteurs**
- Utilisation de sélecteurs précis et stables
- Priorité aux `data-testid` et `id` plutôt que les fallbacks multiples
- Suppression des sélecteurs avec `.first()` inutiles

#### 3. **Attentes Playwright optimisées**
- Remplacement de `waitForTimeout` par `waitFor({ state: 'visible' })`
- Utilisation de `toBeVisible()` avec timeouts courts
- Suppression des boucles d'attente manuelles

#### 4. **Simplification de la logique**
- Suppression des `try/catch` excessifs
- Simplification des conditions complexes
- Réduction du code dupliqué

#### 5. **Fichiers modifiés**

| Fichier | Lignes avant | Lignes après | Réduction |
|---------|--------------|--------------|-----------|
| homepage-steps.ts | 25 | 21 | -16% |
| bottom-menu-steps.ts | 130 | 73 | -44% |
| bottom-sheet-steps.ts | 141 | 82 | -42% |
| search-steps.ts | 293 | 141 | -52% |
| gps-button-steps.ts | 220 | 119 | -46% |
| gps-player-steps.ts | 466 | 253 | -46% |
| developer-panel-steps.ts | 186 | 112 | -40% |
| hooks.ts | 28 | 18 | -36% |

**Total : Réduction de ~45% du code de tests**

### Gains attendus

1. **Performance** : Exécution 30-50% plus rapide
2. **Fiabilité** : Moins de timeouts arbitraires = moins de faux négatifs
3. **Maintenabilité** : Code plus simple et lisible
4. **Débogage** : Erreurs plus claires avec des attentes précises

### Prochaines étapes

1. Tester les nouveaux tests : `pnpm test:e2e`
2. Ajuster les timeouts si nécessaire (certains tests peuvent être trop stricts)
3. Activer les tests dans le pre-commit hook
4. Réactiver les tests dans la CI GitHub Actions

### Notes

- Les fichiers `.feature` n'ont pas été modifiés (compatibilité totale)
- Les composants n'ont pas été modifiés (pas de changements de selecteurs requis)
- La structure Cucumber/Playwright reste identique
- Le backup permet un rollback immédiat si nécessaire
