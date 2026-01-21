# Epic – Phase A (Exploration)

## Identifiant
epic-engagement-utilisateur

## Contexte
L'application propose actuellement une expérience de découverte de POIs avec audio-guide. Cependant, il manque des fonctionnalités pour fidéliser les utilisateurs et créer une communauté engagée. Les utilisateurs ne peuvent pas sauvegarder leurs lieux préférés, contribuer à l'amélioration du contenu, ou donner leur avis sur les lieux.

## Problème / Opportunité
**Problème actuel** :
- Pas de moyen de sauvegarder ses POIs favoris pour y revenir facilement
- Pas de système de notation/avis (difficile d'évaluer la qualité d'un POI)
- Pas de moyen pour les utilisateurs de contribuer (signaler erreurs, suggérer améliorations)
- Expérience passive : l'utilisateur consomme mais ne participe pas

**Opportunité** :
- Créer une communauté d'utilisateurs contributeurs
- Améliorer la qualité du contenu via le crowdsourcing
- Augmenter la rétention utilisateur (favoris = raison de revenir)
- Différenciation vs. Google Maps (aspect communautaire audio-guide)

## Hypothèse de valeur
En permettant aux utilisateurs de sauvegarder, noter et contribuer :
- Ils reviennent plus souvent (favoris = ancrage)
- La qualité du contenu s'améliore (signalements, suggestions)
- La confiance augmente (avis autres utilisateurs)
- L'engagement et le bouche-à-oreille augmentent

⚠️ Hypothèse non validée : besoin de mesurer l'impact réel sur la rétention et l'engagement

## Objectifs (non contractuels)
- Permettre aux utilisateurs de créer des collections de lieux favoris
- Offrir un système de notation/avis simple et fiable
- Permettre la contribution utilisateur (signaler erreurs, suggérer contenus)
- Augmenter le taux de rétention à 30 jours de 10%
- Obtenir 100 avis utilisateur par mois

## Utilisateurs / Parties prenantes
- **Utilisateurs réguliers** : veulent sauvegarder leurs lieux favoris
- **Touristes** : veulent se fier aux avis d'autres visiteurs
- **Utilisateurs locaux** : peuvent contribuer en signalant des erreurs ou en suggérant des POIs
- **Équipe produit** : bénéficie du feedback utilisateur pour améliorer le contenu

## Périmètre pressenti
### Inclus
- Système de favoris/enregistrés (sauvegarde locale)
- Notation simple des lieux (étoiles)
- Avis textuels (facultatif)
- Signalement d'erreurs (POI fermé, infos incorrectes)
- Suggestion de nouveaux POIs

### Exclus
- Système de profil utilisateur complexe
- Gamification (badges, points, etc.) → à explorer plus tard
- Modération avancée des avis (modération basique uniquement)
- Photos utilisateur (trop complexe pour MVP)
- Intégration réseaux sociaux (partage Facebook/Twitter)

## Features candidates
1. **Implémenter "Enregistrés"** : Gestion des lieux favoris dans la barre Ambiance locale (sauvegarde locale, affichage liste, accès rapide)
2. **Implémenter "Contribuer"** : Notation et signalement de lieux dans la barre Ambiance locale (note, signaler erreur, suggérer POI)
3. **Notation/avis des lieux** : Afficher étoiles + nombre d'avis dans les cartes résultats et fiches POI

## Hypothèses explicites
- Les utilisateurs sont prêts à créer un compte ou accepter le stockage local pour les favoris
- Les utilisateurs font confiance aux avis d'autres utilisateurs (même sans modération forte)
- La notation simple (étoiles) suffit pour MVP (pas besoin de critères multiples)
- Les utilisateurs sont motivés à contribuer sans récompense immédiate

⚠️ Ces hypothèses nécessitent validation

## Questions ouvertes
- **Stockage des favoris** : Local uniquement (localStorage) ou synchro cloud (nécessite backend + auth) ?
- **Système de notation** : Étoiles uniquement ou critères multiples (qualité audio, précision infos, etc.) ?
- **Modération des avis** : Automatique (filtres) ou manuelle ou hybride ?
- **Authentification** : Anonyme (local) ou compte utilisateur (email, Google, etc.) ?
- **Backend** : Où stocker les avis et contributions ? (Firebase, Supabase, API custom ?)

## Risques pressentis
- **Spam/abuse** : Risque de faux avis, spam (besoin modération)
- **Qualité** : Avis peu utiles ou malveillants peuvent nuire à l'expérience
- **Technique** : Backend + auth nécessaire pour les contributions (complexité)
- **Engagement** : Si peu d'utilisateurs contribuent, peu de valeur ajoutée
- **Privacy** : Stockage des données utilisateur (RGPD)

## Notes libres
- S'inspirer de TripAdvisor, Google Maps pour les avis
- Démarrer simple : favoris en local, puis itérer vers synchro cloud
- Pour les contributions, considérer un backend simple (Firebase/Supabase) pour MVP
- Possibilité de démarrer avec "Enregistrés" uniquement (quick win) avant notation/contribution
