# Feature – Audio Guide Generation

## Identifiant
FEAT-POI-002

## Résumé
Système de génération automatique de contenus narratifs pour audio guide, 
à partir des données POI importées, via appel à une gateway LLM (LiteLLM).

## Problème adressé
- Les descriptions Wikidata sont encyclopédiques, pas narratives
- Création manuelle de textes audio guide = non scalable
- Besoin d'un ton engageant adapté à l'écoute en déplacement

## Hypothèse de valeur
Un LLM peut transformer des données factuelles (Wikipedia) en narration 
engageante et structurée, adaptée à des segments audio de ~20 secondes.

⚠️ Hypothèse : la qualité générée est acceptable sans relecture systématique

## Utilisateurs concernés
- Système automatique (batch processing)
- Content Manager (validation, régénération)
- Utilisateur final (écoute les segments)

## Scénarios d'usage pressentis

### Scénario 1 : Génération batch pour une ville
1. L'admin sélectionne Fontainebleau dans l'interface
2. Clique sur "Générer les audio guides"
3. Le système itère sur les POIs sans segments
4. Pour chaque POI, appelle le LLM avec le prompt configuré
5. Stocke les segments générés en base
6. Affiche un résumé : X POIs traités, Y segments générés

### Scénario 2 : Régénération d'un POI
1. L'admin consulte un POI dont les segments sont insatisfaisants
2. Clique sur "Régénérer"
3. Le système rappelle le LLM
4. Les anciens segments sont archivés, les nouveaux affichés

## Idées de solution (non exclusives)

### Option A : Génération synchrone dans l'admin
- Bouton → appel LLM → affichage résultat
- Simple mais lent pour beaucoup de POIs

### Option B : Job queue asynchrone
- Bouton lance un job en background
- Notification quand terminé
- Plus robuste pour gros volumes

**Piste privilégiée : Option A pour MVP**, migration Option B si besoin

## Critères d'acceptation (brouillon)

- [ ] Prompt de génération configurable (fichier ou DB)
- [ ] URL endpoint LiteLLM configurable (env var)
- [ ] Génération de segments ~20 secondes
- [ ] Plusieurs segments par POI si description longue
- [ ] Stockage segments en base avec métadonnées (model, prompt_version)
- [ ] Bouton "Générer" par zone dans l'admin
- [ ] Bouton "Régénérer" par POI
- [ ] Affichage des segments générés dans la fiche POI
- [ ] Gestion erreurs LLM (timeout, rate limit)

## Contraintes connues

### Techniques
- Gateway LiteLLM existante (URL à configurer)
- Pas de streaming nécessaire (batch OK)
- Coût LLM à surveiller

### Organisationnelles  
- Pas de TTS dans ce scope (texte seulement)
- Pas d'images générées

## Hypothèses explicites
- ⚠️ Gateway LiteLLM opérationnelle et accessible
- ⚠️ Un prompt bien conçu donne des résultats acceptables
- ⚠️ ~20 secondes ≈ 50-60 mots par segment
- ⚠️ Pas besoin de fine-tuning pour le MVP

## Dépendances pressenties
- Feature POI Admin Import (POIs en base)
- Gateway LiteLLM (existante)
- Schéma base pour segments audio

## Questions ouvertes
- Quel modèle par défaut ? (gpt-4o-mini, claude-3-haiku ?)
- Combien de segments max par POI ?
- Faut-il varier le ton selon la catégorie de POI ?
- Comment découper une longue description en segments cohérents ?
- Format du prompt optimal ?

## Risques pressentis
- Hallucinations LLM (dates fausses, infos inventées)
- Ton inapproprié (trop académique ou trop familier)
- Coût si génération massive
- Temps de génération long si beaucoup de POIs

## Indicateurs de succès (indicatifs)
- Temps de génération < 5s par segment
- < 10% de segments nécessitant régénération
- Segments lisibles à haute voix naturellement

## Notes libres
- Prévoir versionning des prompts
- Archiver les anciennes versions des segments
- Future feature : feedback utilisateur pour amélioration
- Inspiration prompt : "Tu es un guide touristique passionné..."
