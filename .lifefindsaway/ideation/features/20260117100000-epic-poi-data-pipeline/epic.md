# Epic – POI Data Pipeline

## Identifiant
EPIC-POI-001

## Contexte
City-Guided est un audio guide touristique. Actuellement, les POIs sont gérés 
manuellement via un fichier mock. Pour scaler à l'international, nous devons 
automatiser l'import de POIs depuis des sources ouvertes de qualité.

## Problème / Opportunité
- Import manuel des POIs = non scalable
- Absence de descriptions riches pour l'audio guide
- Pas de couverture mondiale possible sans automatisation

## Hypothèse de valeur
L'utilisation d'OpenTripMap + Wikidata permettrait d'obtenir automatiquement :
- Des milliers de POIs touristiques de qualité
- Des descriptions encyclopédiques parfaites pour la narration audio
- Une couverture mondiale progressive

⚠️ Hypothèse : la qualité des données OSM/Wikidata est suffisante pour la France

## Objectifs (non contractuels)
- Automatiser l'import de POIs depuis OpenTripMap
- Enrichir avec Wikidata (descriptions, images, métadonnées)
- Permettre l'administration des POIs via un backoffice dédié
- Générer automatiquement le contenu audio guide via LLM

## Utilisateurs / Parties prenantes
- Admin/Content Manager : gère les imports et valide les contenus
- Utilisateur final : bénéficie d'un catalogue POI enrichi
- Système LLM : consomme les données pour générer les audio guides

## Périmètre pressenti

### Inclus
- Application admin desktop (web) pour import POI
- Import depuis OpenTripMap + enrichissement Wikidata
- Visualisation carte + liste des POIs importés
- Page détail par POI
- Génération contenu audio guide via LLM
- Stockage segments audio guide en base
- 2 zones initiales : Marseille, Fontainebleau

### Exclus
- Import automatique planifié (cron) - future feature
- Application mobile admin
- Génération d'images
- Système de feedback utilisateur (epic séparée)
- Multi-langue (FR uniquement pour MVP)

## Features candidates
1. **POI Admin Import** - Application admin avec import manuel par zone
2. **Audio Guide Generation** - Génération LLM des segments narratifs

## Hypothèses explicites
- ⚠️ OpenTripMap couvre suffisamment Marseille et Fontainebleau
- ⚠️ Wikidata fournit des descriptions FR de qualité
- ⚠️ 5000 req/jour OpenTripMap suffisent pour l'import initial
- ⚠️ Gateway LiteLLM existante est opérationnelle

## Questions ouvertes
- Quel modèle LLM utiliser pour la génération ? (coût vs qualité)
- Format exact des segments (durée, structure) ?
- Faut-il un workflow de validation humaine ?
- Comment gérer les POIs sans description Wikidata ?

## Risques pressentis
- Qualité variable des données selon les régions
- Rate limiting OpenTripMap si import trop agressif
- Coût LLM si génération massive
- Descriptions générées parfois inexactes (hallucinations)

## Notes libres
- OSRM reste dans le code mais n'est plus déployé pour le moment
- Les vitesses de trajet restent gérées manuellement pour l'instant
- Future feature : feedback "j'aime/j'aime pas" sur les segments
