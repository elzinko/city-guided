# Feature – Phase A (Exploration)

## Identifiant
dev-speed-divisors

## Résumé
Ajouter des diviseurs de vitesse (/3, /4, /5) dans `dev-speed-select` pour ralentir la vitesse des trajets virtuels en développement.

## Problème adressé
Les multiplicateurs existants permettent d'accélérer, mais pas de ralentir suffisamment pour tester des scénarios au ralenti (debug, vérification des timings audio, etc.).

## Hypothèse de valeur
Pouvoir ralentir la simulation permet de mieux observer et debugger les comportements liés au timing (audio guides, transitions, etc.).

## Utilisateurs concernés
- Développeurs
- QA testeurs

## Scénarios d'usage pressentis
- **Scénario 1** : Dev veut observer le comportement d'un POI → /3 pour avoir plus de temps
- **Scénario 2** : Debug d'un problème de timing audio → /5 pour observer en détail

## Idées de solution (non exclusives)

### Option A : Ajouter les diviseurs au sélecteur existant
Dans `dev-speed-select`, ajouter : /5, /4, /3, /2, x1, x2, x3, x5, x10

### Option B : Slider continu
Un slider qui va de 0.2x à 10x avec des presets.

**Recommandé : Option A** (simple, cohérent avec l'existant)

## Critères d'acceptation (brouillon)

- [ ] Diviseurs /3, /4, /5 disponibles dans `dev-speed-select`
- [ ] La vitesse est bien divisée (pas multipliée)
- [ ] Fonctionne avec tous les modes de transport

## Contraintes connues
- Feature dev-only, ne pas exposer aux utilisateurs finaux

## Composants concernés
- `dev-speed-select` (composant existant)

## Notes libres
Feature technique simple, rapide à implémenter.
