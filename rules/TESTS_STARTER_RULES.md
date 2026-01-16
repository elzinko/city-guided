# Règles de test

Règles pour les tests, notamment avec les navigateurs et les outils de test automatisés.

## 1) Mobile-first (obligatoire)

- **DOIT** : Tous les tests réalisés avec un navigateur **DOIVENT** être effectués en mode mobile-first.
- **DOIT** : Utiliser une vue mobile (viewport mobile) par défaut lors des tests avec navigateur.
- **DOIT** : Tester d'abord sur mobile (viewport 375×812 ou équivalent) avant de tester sur desktop si nécessaire.
- **DEVRAIT** : Prioriser les tests mobile, car l'application est conçue mobile-first.
- **NE DOIT PAS** : Tester uniquement en desktop sans avoir testé en mobile d'abord.

### Viewport recommandé pour les tests

- **Mobile (prioritaire)** : 375×812 (iPhone 12/13/14 Pro)
- **Desktop (secondaire)** : 1280×800 (pour vérifier la compatibilité navigateur)

### Exemple avec Playwright MCP

```javascript
// ✅ CORRECT : Commencer par mobile
1. browser_navigate({ url: "http://localhost:3080" })
2. browser_resize({ width: 375, height: 812 })  // Mobile FIRST
3. browser_take_screenshot({ filename: "feature-mobile.png" })
4. browser_resize({ width: 1280, height: 800 })  // Desktop ensuite si nécessaire
5. browser_take_screenshot({ filename: "feature-desktop.png" })
```

## 2) Tests d'interaction mobile

- **DOIT** : Tester les interactions tactiles (clicks, swipes, drags) en priorité.
- **DOIT** : Vérifier que les éléments sont accessibles et utilisables sur mobile.
- **DEVRAIT** : Tester le menu du bas (bottom menu) et les bottom sheets qui sont critiques pour l'UX mobile.

## 3) Validation visuelle

- **DOIT** : Prendre des captures d'écran en mode mobile en priorité.
- **DEVRAIT** : Documenter les tests avec des screenshots mobile.
- **PEUT** : Ajouter des screenshots desktop pour référence, mais après les tests mobile.
