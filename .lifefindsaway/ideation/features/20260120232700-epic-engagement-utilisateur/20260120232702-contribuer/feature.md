# Feature – Phase A (Exploration)

## Identifiant
contribuer-notation-signalement

## Résumé
Permettre aux utilisateurs de contribuer en notant les lieux et en signalant des erreurs ou suggestions dans la barre Ambiance locale.

## Problème adressé
Les utilisateurs n'ont aucun moyen de partager leur expérience, signaler des erreurs (POI fermé, infos incorrectes) ou suggérer des améliorations. L'app manque de feedback utilisateur qualitatif.

## Hypothèse de valeur
En permettant la contribution, la qualité du contenu s'améliore via le crowdsourcing et les utilisateurs se sentent plus engagés.

⚠️ Hypothèse non validée

## Utilisateurs concernés
- Utilisateurs locaux (connaissent bien les lieux)
- Utilisateurs qui rencontrent des erreurs
- Utilisateurs qui veulent suggérer des POIs

## Scénarios d'usage pressentis
1. Utilisateur visite un musée fermé, signale "POI fermé"
2. Utilisateur trouve une erreur dans la description, la signale
3. Utilisateur suggère un nouveau POI à ajouter

## Idées de solution (non exclusives)
- **Option A** : Formulaire simple (type de problème + description)
- **Option B** : Formulaire avec upload photo
- **Option C** : Intégration avec issues GitHub (comme feedback beta)

## Critères d'acceptation (brouillon)
- [ ] Bouton "Contribuer" dans la fiche POI
- [ ] Formulaire avec types : Signaler erreur, Suggérer POI, Autre
- [ ] Soumission des contributions
- [ ] Stockage backend des contributions
- [ ] Notification équipe produit

## Questions ouvertes
- Backend nécessaire (Firebase, Supabase ?)
- Modération manuelle ou auto ?
- Récompenses pour contributeurs ?

## Notes libres
Voir détails dans [epic.md](../epic.md)
