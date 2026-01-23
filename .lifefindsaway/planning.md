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

## Features

### idea

### exploring

- [ ] 20260123053501-epic-adaptive-audio-guide/20260123053502-contexte-deplacement
- [ ] 20260123053501-epic-adaptive-audio-guide/20260123053503-fil-pois-predictif
- [ ] 20260123053501-epic-adaptive-audio-guide/20260123053504-modalite-audio-adaptative
- [ ] 20260120171923-docker-compose-ecs-unification
- [ ] 20260117100000-epic-poi-data-pipeline/20260117100100-poi-admin-import
- [ ] 20260117100000-epic-poi-data-pipeline/20260117100200-audio-guide-generation
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
- [ ] 20260115100000-ecs-fargate-migration
- [x] 20260116100000-ecs-scale-to-zero

### on_hold

### ready_for_crystallization

### discarded

---

## Notes globales

### Infrastructure
- **OSRM** : code conservé mais non déployé. Utile plus tard pour trajets utilisateur.
- **ECS Fargate** : stack CDK opérationnelle, en test staging
- **Scale-to-zero** : implémenté via Lambda + EventBridge

### POI & Audio Guide (Epic en cours)
- **Zones initiales** : Fontainebleau (dev) + Marseille (validation)
- **LLM Gateway** : LiteLLM, URL à configurer par environnement
- **Sources POI** : OpenTripMap (5000 req/jour) + Wikidata

### Documentation technique
- `docs/technical/*.md` : docs détaillées des features infra
