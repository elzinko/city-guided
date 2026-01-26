# Epic – Phase A (Exploration)

## Identifiant
epic-refonte-technique-frontend

## Contexte
Le frontend a été développé rapidement pour valider le concept de l'application. Cependant, le code s'est accumulé sans architecture claire :
- Composants peu réutilisables
- Pas de convention de nommage uniforme (IDs manquants ou incohérents)
- Mix de styles (CSS inline, fichiers CSS, pas de Tailwind)
- Gestion d'état dispersée et parfois confuse
- Peu de tests unitaires

Cette dette technique ralentit le développement de nouvelles features et augmente le risque de bugs.

## Problème / Opportunité
**Problème actuel** :
- Difficile de maintenir et faire évoluer le code
- Réutilisation des composants limitée (duplication de code)
- Styling inconsistant (design system inexistant)
- Tests unitaires manquants (bugs non détectés)
- Gestion d'état complexe (plusieurs approches coexistent)

**Opportunité** :
- Standardiser l'architecture frontend (composants, styles, état)
- Améliorer la maintenabilité et la vélocité de développement
- Réduire les bugs grâce aux tests
- Faciliter l'onboarding de nouveaux développeurs
- Préparer le terrain pour les futures features UI complexes

## Hypothèse de valeur
En refactorant le frontend :
- La vélocité de développement augmente (moins de dette technique)
- Le nombre de bugs diminue (tests + code plus clair)
- L'onboarding des nouveaux devs est plus rapide (code standardisé)
- Le design devient plus cohérent (Tailwind + composants)

⚠️ Hypothèse non validée : besoin de mesurer l'impact sur la vélocité

## Objectifs (non contractuels)
- Standardiser tous les composants (composition, props claires, IDs)
- Migrer tous les styles vers Tailwind CSS
- Unifier la gestion d'état (choisir et appliquer un outil de la stack)
- Atteindre 80% de couverture de tests unitaires sur les composants
- Réduire de 30% le temps de développement d'une nouvelle feature UI

## Utilisateurs / Parties prenantes
- **Développeurs frontend** : bénéficient d'un code plus maintenable
- **Nouveaux développeurs** : onboarding facilité
- **Équipe produit** : features livrées plus rapidement
- **Utilisateurs finaux** : moins de bugs, design plus cohérent

## Périmètre pressenti
### Inclus
- **Composants** :
  - Review de tous les composants existants
  - Standardisation (composition, props, naming)
  - Ajout d'IDs sur tous les composants (testabilité)
  - Documentation des composants (Storybook ?)
  
- **Styles** :
  - Migration vers Tailwind CSS (abandonner CSS inline/fichiers CSS)
  - Définition d'un design system simple (couleurs, espacements, typographie)
  
- **État** :
  - Audit de la gestion d'état actuelle
  - Choix d'un outil (Zustand déjà dans package.json ?)
  - Migration vers cet outil (uniformisation)
  
- **Tests** :
  - Setup de tests unitaires (Jest + React Testing Library)
  - Tests sur tous les composants principaux
  - CI/CD : tests automatiques sur chaque PR

### Exclus
- Refonte complète de l'UI/UX (design actuel conservé)
- Migration vers un autre framework (Next.js déjà choisi)
- Tests E2E exhaustifs (focus sur tests unitaires pour MVP)
- Performance optimization (sauf si critique)

## Features candidates (tâches techniques)
1. **Standardisation des composants** : Review + refacto de tous les composants (composition, props, IDs, naming)
2. **Migration Tailwind** : Remplacer tous les styles inline/CSS par Tailwind
3. **Unification gestion d'état** : Migrer vers un seul outil (Zustand ?)
4. **Tests unitaires** : Couvrir 80% des composants principaux
5. **Documentation** : Documenter l'architecture et les conventions (possiblement Storybook)

## Hypothèses explicites
- Tailwind CSS est le bon choix pour ce projet (vs. autres solutions)
- Zustand est suffisant pour la gestion d'état (déjà dans package.json)
- Les tests unitaires apportent plus de valeur que les tests E2E pour ce refacto
- La composition de composants améliore la réutilisabilité vs. props complexes
- Les développeurs sont prêts à suivre les nouvelles conventions

⚠️ Ces hypothèses techniques nécessitent validation par l'équipe

## Questions ouvertes
- **Tailwind** : Migration progressive ou big bang ?
- **État** : Zustand pour tout ou garder useState pour le state local ?
- **Tests** : Quel framework ? (Jest + RTL ou Vitest ?)
- **IDs** : Convention de nommage ? (kebab-case, camelCase ?)
- **Composants** : Faut-il un design system complet (Storybook) ou juste des conventions ?
- **Priorité** : Par où commencer ? (composants, styles, tests ?)
- **Scope** : Tout refacto d'un coup ou feature par feature ?

## Risques pressentis
- **Scope creep** : Risque de vouloir tout refacto en même temps (surcharge)
- **Régression** : Refacto peut introduire des bugs si mal testée
- **Timing** : Epic technique peut bloquer les features business
- **Adoption** : Équipe pas alignée sur les conventions (besoin de communication)
- **Over-engineering** : Risque de sur-optimiser (KISS principle)

## Notes libres
- Cette Epic est technique, pas une feature utilisateur visible
- Peut être traitée en parallèle des features business (pair programming ?)
- Besoin d'un champion technique pour porter cette Epic
- Considérer un POC sur 1-2 composants avant de généraliser
- Documenter les conventions dans le README ou un ADR (Architecture Decision Record)
