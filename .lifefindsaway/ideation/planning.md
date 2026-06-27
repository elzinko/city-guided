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

#### Navigation (lié à Epic Navigation UX)
- [ ] 20260123152600-navigation-zoom-locked ⚠️ **Majeur** - Zoom locké + bouton recentrer manquant
- [ ] 20260123152601-navigation-buttons-disappear ⚠️ **Majeur** - Boutons parcours disparaissent au clic
- [ ] 20260123152602-navigation-poi-list-behavior ⚠️ **Majeur** - POI list disparait au clic (lié à Epic Playlist)
- [ ] 20260123152603-navigation-button-icon 🎨 **Cosmétique** - Icône à changer (asset à fournir)

#### Routes Admin (Epic CRUD Trajets Virtuels)
- [ ] 20260126100000-routes-admin-back-button ⚠️ **Majeur** - Dev-control-block disparaît au retour de /admin/routes
- [ ] 20260126100001-routes-admin-map-cutoff ⚠️ **Majeur** - Carte coupée en mode édition (Leaflet invalidateSize)
- [ ] 20260126100002-routes-admin-style-mismatch 🎨 **Mineur** - Rendu différent entre trajets système et custom

#### Recherche & Découverte
- [ ] 20260121190427-bottomsheet-close-discover 🎨 **Mineur** - Panneau "Découvrir" reste ouvert après "Effacer la recherche" (attendu : fermeture complète)

### fixed

---

## Features

### idea

#### Epic Personalized Experience (20260123150000) - **needs refinement**
- [ ] 20260123150000-epic-personalized-experience/20260123153000-epic-user-profiling - Questionnaire + profils
- [ ] 20260123150000-epic-personalized-experience/20260123152900-epic-exploration-modes - Modes urbex, gastro, etc.
- [ ] 20260123150000-epic-personalized-experience/20260123153100-epic-user-history-ml - Historique → Analytics → ML

#### Autres Epics
- [ ] 20260123152800-epic-navigation-playlist (Epic, **needs refinement** - UX à designer)

#### Lifefindsaway (tooling)
- ~~20260123164007-github-issues-sync~~ → Déplacé vers projet lifefindsaway

### exploring

#### Epic Audio Guide Adaptatif
- [ ] 20260123053501-epic-adaptive-audio-guide/20260123053502-contexte-deplacement
- [ ] 20260123053501-epic-adaptive-audio-guide/20260123053503-fil-pois-predictif
- [ ] 20260123053501-epic-adaptive-audio-guide/20260123053504-modalite-audio-adaptative

#### Epic Navigation UX (20260123151000)
- [ ] 20260123151000-epic-navigation-ux/20260123152700-transport-mode-selector - Piéton/voiture
- [ ] 20260123151000-epic-navigation-ux/20260123152701-dev-speed-divisors - /3, /4, /5 pour dev
- [ ] 20260123151000-epic-navigation-ux/20260123152702-navigation-map-tilt - Carte plate/inclinée
- [ ] 20260123151000-epic-navigation-ux/20260120232600-bouton-feedback-github - Feedback beta → GitHub Issues

#### Epic Découverte & Recherche
- [ ] 20260120232435-epic-decouverte-recherche/20260120232500-recherche-avancee
- [ ] 20260120232435-epic-decouverte-recherche/20260120232501-decouvertes-personnalisees
- [ ] 20260120232435-epic-decouverte-recherche/20260120232502-vue-decouvrir-categories

#### Epic Engagement Utilisateur
- [ ] 20260120232700-epic-engagement-utilisateur/20260120232701-enregistres
- [ ] 20260120232700-epic-engagement-utilisateur/20260120232702-contribuer
- [ ] 20260120232700-epic-engagement-utilisateur/20260120232703-notation-avis

### candidate
- [ ] 20260120232900-epic-refonte-technique-frontend (Epic technique, à découper)

### in_progress (implémentation active)

#### Epic CRUD Trajets Virtuels (20260120232800)
- [ ] 20260120232800-epic-crud-trajets-virtuels/20260126100300-routes-gpx-export - Export GPX (priorité haute)
- [ ] 20260120232800-epic-crud-trajets-virtuels/20260126100100-routes-gpx-default-import - Import auto Fontainebleau
- [ ] 20260120232800-epic-crud-trajets-virtuels/20260126100200-routes-gpx-recorder - Enregistreur de parcours (MVP)

### on_hold

### ready_for_crystallization

#### Epic ECS Infrastructure (20260115000000) ✅ TERMINÉ
- [x] 20260115000000-epic-ecs-infrastructure/20260115100000-ecs-fargate-migration
- [x] 20260115000000-epic-ecs-infrastructure/20260116100000-ecs-scale-to-zero
- [x] 20260115000000-epic-ecs-infrastructure/20260119100000-ecs-deployment-improvements

#### Epic POI Data Pipeline (20260117100000)
- [x] 20260117100000-epic-poi-data-pipeline/20260117100100-poi-admin-import
- [x] 20260117100000-epic-poi-data-pipeline/20260117100200-audio-guide-generation

### discarded
- [ ] 20260115000000-epic-ecs-infrastructure/20260120171923-docker-compose-ecs-unification

---

## Notes globales

### Epic ECS Infrastructure (✅ TERMINÉ)
Voir : `20260115000000-epic-ecs-infrastructure/epic.md`
- **ECS Fargate Migration** : Stack CDK complète déployée en staging
- **Scale-to-Zero** : Lambda warmkeeper + CloudWatch alarms + dashboard
- **Deployment Improvements** : Zero-downtime, scripts cohérents, Container Insights
- **OSRM** : Code conservé mais non déployé. Utile plus tard pour trajets utilisateur

### POI & Audio Guide (✅ Implémentées à ~80%)
- **Admin App** : Interface web complète (`apps/admin/`) avec carte Leaflet
- **Import POIs** : Via Overpass API (OSM) + enrichissement Wikidata + Wikipedia
- **Zones configurées** : Fontainebleau (dev) + Marseille (validation)
- **Audio Guide LLM** : Génération via Ollama avec segments modulaires (express/standard/complet)
- **Stockage** : PostgreSQL avec schéma étendu pour segments et métadonnées

### En exploration active
- **Audio Guide Adaptatif** : Système temps réel (contexte, fil POIs, modalités) - Epic prioritaire
- **Navigation UX** : Bugs zoom/boutons + features carte inclinée, mode transport, feedback

### Epics regroupées (organisation)
- **Personalized Experience** : User Profiling + Exploration Modes + User History ML
- **Navigation UX** : Transport mode, speed divisors, map tilt, feedback button
- **ECS Infrastructure** : Migration + Scale-to-zero + Deployments (terminé)

### Documentation technique
- `docs/technical/*.md` : Docs détaillées des features infra
