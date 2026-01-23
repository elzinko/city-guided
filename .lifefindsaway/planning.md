# Planning Agile – Phase A (Exploration)

## Rôle de ce document

Ce fichier est la **source de vérité unique** pour :
- le statut des Features
- leur priorité relative
- l'ordre de traitement en Phase A

**Note** : Seules les Features sont trackées. Le statut d'une Epic est implicite 
(dérivé du statut de ses Features enfants).

---

## Règles générales

- Chaque Feature est référencée par son **chemin complet** (incluant l'Epic parente si applicable)
- Une Feature apparaît **dans une seule section de statut**
- L'ordre dans chaque section représente la priorité (haut = plus prioritaire)
- Les cases à cocher servent uniquement au suivi visuel

---

## Légende des statuts (Phase A)

- `idea` : idée brute, non cadrée
- `exploring` : en cours d'exploration active
- `candidate` : suffisamment définie pour être priorisée
- `on_hold` : volontairement mise en pause
- `discarded` : abandonnée, conservée pour historique
- `ready_for_crystallization` : prête pour Phase B (ex. BMAD)

---

## Bugs

### open
- [ ] 20260123152600-navigation-zoom-locked ⚠️ **Majeur** - Zoom locké + bouton recentrer manquant
- [ ] 20260123152601-navigation-buttons-disappear ⚠️ **Majeur** - Boutons parcours disparaissent au clic
- [ ] 20260123152602-navigation-poi-list-behavior ⚠️ **Majeur** - POI list disparait au clic (lié à Epic Playlist)
- [ ] 20260123152603-navigation-button-icon 🎨 **Cosmétique** - Icône à changer (asset à fournir)

### fixed

---

## Features

### idea
- [ ] 20260123152800-epic-navigation-playlist (Epic, **needs refinement** - UX à designer)
- [ ] 20260123152900-epic-exploration-modes (Epic, **needs refinement** - modes urbex, gastro, etc.)
- [ ] 20260123153000-epic-user-profiling (Epic, **needs refinement** - questionnaire + profils)
- [ ] 20260123153100-epic-user-history-ml (Epic, **needs refinement** - 3 phases: historique → analytics → ML)

### exploring

- [ ] 20260123053501-epic-adaptive-audio-guide/20260123053502-contexte-deplacement
- [ ] 20260123053501-epic-adaptive-audio-guide/20260123053503-fil-pois-predictif
- [ ] 20260123053501-epic-adaptive-audio-guide/20260123053504-modalite-audio-adaptative
- [ ] 20260123152700-transport-mode-selector (piéton/voiture)
- [ ] 20260123152701-dev-speed-divisors (/3, /4, /5 pour dev)
- [ ] 20260123152702-navigation-map-tilt (carte plate/inclinée)
- [ ] 20260120232435-epic-decouverte-recherche/20260120232500-recherche-avancee
- [ ] 20260120232435-epic-decouverte-recherche/20260120232501-decouvertes-personnalisees
- [ ] 20260120232435-epic-decouverte-recherche/20260120232502-vue-decouvrir-categories
- [ ] 20260120232700-epic-engagement-utilisateur/20260120232701-enregistres
- [ ] 20260120232700-epic-engagement-utilisateur/20260120232702-contribuer
- [ ] 20260120232700-epic-engagement-utilisateur/20260120232703-notation-avis

### candidate
- [ ] 20260120232800-epic-crud-trajets-virtuels (Epic, à découper en features)
- [ ] 20260120232900-epic-refonte-technique-frontend (Epic technique, à découper)
- [ ] 20260120232600-bouton-feedback-github

### on_hold

### ready_for_crystallization

- [x] 20260115100000-ecs-fargate-migration
- [x] 20260116100000-ecs-scale-to-zero
- [x] 20260117100000-epic-poi-data-pipeline/20260117100100-poi-admin-import
- [x] 20260117100000-epic-poi-data-pipeline/20260117100200-audio-guide-generation

### discarded
- [ ] 20260120171923-docker-compose-ecs-unification

---

## Notes globales

### Infrastructure (✅ Implémentées)
- **ECS Fargate** : Stack CDK complète déployée en production/staging
- **Scale-to-zero** : Lambdas opérationnelles avec dashboard CloudWatch et webhook Caddy
- **OSRM** : Code conservé mais non déployé. Utile plus tard pour trajets utilisateur

### POI & Audio Guide (✅ Implémentées à ~80%)
- **Admin App** : Interface web complète (`apps/admin/`) avec carte Leaflet
- **Import POIs** : Via Overpass API (OSM) + enrichissement Wikidata + Wikipedia
- **Zones configurées** : Fontainebleau (dev) + Marseille (validation)
- **Audio Guide LLM** : Génération via Ollama avec segments modulaires (express/standard/complet)
- **Stockage** : PostgreSQL avec schéma étendu pour segments et métadonnées

### En exploration active
- **Audio Guide Adaptatif** : Système temps réel (contexte, fil POIs, modalités) - Epic prioritaire
- **Navigation UX** : Bugs zoom/boutons + features carte inclinée, mode transport

### Epics à raffiner (idea)
- **Navigation Playlist** : Fil d'Ariane + POIs futurs avec sélection - UX à designer
- **Exploration Modes** : Urbex, culture, gastro, custom - Tagging POIs nécessaire
- **User Profiling** : Questionnaire onboarding + profils - UX à designer
- **User History + ML** : Historique → Analytics → Recommandations ML

### Documentation technique
- `docs/technical/*.md` : Docs détaillées des features infra
