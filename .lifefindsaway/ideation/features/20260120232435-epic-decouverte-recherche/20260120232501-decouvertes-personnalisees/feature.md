# Feature – Phase A (Exploration)

## Identifiant
decouvertes-personnalisees

## Résumé
Afficher une sélection de POIs suggérés dès l'ouverture de l'application pour aider l'utilisateur à démarrer sa découverte sans avoir à chercher.

## Problème adressé
Quand un utilisateur ouvre l'app, il voit une carte vide ou une liste de POIs brute. Il n'a pas de point d'entrée clair pour commencer sa découverte. Les nouveaux utilisateurs en particulier ne savent pas par où commencer.

## Hypothèse de valeur
En proposant des POIs suggérés dès l'ouverture :
- Les utilisateurs découvrent plus rapidement le potentiel de l'app
- Le taux d'engagement initial augmente (moins d'abandons)
- Les utilisateurs découvrent des POIs qu'ils n'auraient pas cherchés

⚠️ Hypothèse non validée

## Utilisateurs concernés
- **Nouveaux utilisateurs** : découvrent l'app pour la première fois
- **Utilisateurs occasionnels** : reviennent après une longue période
- **Utilisateurs explorateurs** : aiment découvrir sans objectif précis

## Scénarios d'usage pressentis
1. **Nouvel utilisateur** : Ouvre l'app, voit 3-5 POIs suggérés avec photos attractives, clique sur l'un d'eux, découvre l'audio-guide
2. **Utilisateur en ville inconnue** : Ouvre l'app dans une nouvelle ville, voit des suggestions locales, commence son exploration
3. **Utilisateur régulier** : Ouvre l'app chez lui, voit des suggestions de POIs qu'il n'a pas encore visités à proximité

## Idées de solution (non exclusives)

### Option A : Suggestions basiques "Autour de moi"
- Afficher les X POIs les plus proches (rayon 1-2km)
- Tri par distance uniquement
- Affichage : cartes horizontales scrollables

**Pros** : Simple, rapide à implémenter  
**Cons** : Pas de personnalisation, peut afficher des POIs peu intéressants

### Option B : Suggestions par catégorie
- Sélectionner des POIs dans différentes catégories (1-2 par catégorie)
- Ex : 1 musée, 1 restaurant, 1 monument, 1 parc
- Affichage : grille ou carousel

**Pros** : Diversité des suggestions  
**Cons** : Peut afficher des POIs trop éloignés

### Option C : Suggestions intelligentes (à explorer)
- Mix proximité + popularité + catégorie + non-visité
- Algo simple : score = (proximité × 0.5) + (popularité × 0.3) + (non-visité × 0.2)
- Affichage : carousel avec photos attractives

**Pros** : Meilleure pertinence  
**Cons** : Plus complexe, nécessite données de popularité

### Option D : Suggestions contextuelles
- Basées sur l'heure (matin = musées, midi = restaurants, soir = bars)
- Basées sur la météo (beau temps = parcs, pluie = musées)
- Basées sur l'historique utilisateur

**Pros** : Très personnalisé  
**Cons** : Complexité élevée, nécessite données météo et contexte

## Critères d'acceptation (brouillon)
- [ ] Des POIs sont suggérés automatiquement à l'ouverture de l'app
- [ ] Les suggestions sont visibles sur la carte (marqueurs mis en avant)
- [ ] Les suggestions sont affichées dans une interface dédiée (carousel, cartes, etc.)
- [ ] Cliquer sur une suggestion ouvre la fiche du POI
- [ ] Les suggestions se mettent à jour selon la position de l'utilisateur
- [ ] Les suggestions prennent en compte les POIs déjà visités (ne pas les re-suggérer)

## Contraintes connues
- Besoin de données de qualité pour les POIs (photos attractives, descriptions)
- Performance : calcul des suggestions doit être rapide (<500ms)
- Pas de backend pour l'instant (calcul côté client)

## Hypothèses explicites
- Les utilisateurs préfèrent des suggestions à une carte vide
- 3-5 suggestions suffisent (trop = paralysie du choix)
- Les POIs proches sont plus pertinents que les POIs populaires éloignés
- Les utilisateurs acceptent que les suggestions ne soient pas parfaites

## Dépendances pressenties
- Données POI de qualité (photos, descriptions, catégories)
- Géolocalisation utilisateur
- Possiblement : tracking des POIs déjà visités (pour ne pas les re-suggérer)

## Questions ouvertes
- Combien de suggestions afficher ? (3, 5, 10 ?)
- Rayon de recherche pour les suggestions ? (1km, 2km, 5km ?)
- Quelle option privilégier pour le MVP ? (A, B, ou C ?)
- Faut-il permettre de "rafraîchir" les suggestions ?
- Comment gérer le cas où il n'y a pas assez de POIs à proximité ?
- Faut-il afficher les suggestions uniquement à l'ouverture ou aussi pendant la navigation ?

## Risques pressentis
- **Qualité des données** : Si les POIs suggérés sont peu intéressants, effet contre-productif
- **Performance** : Calcul des suggestions peut ralentir l'ouverture de l'app
- **Privacy** : Tracking des POIs visités (besoin de consentement ?)
- **UX** : Suggestions non pertinentes peuvent frustrer l'utilisateur

## Indicateurs de succès (indicatifs)
- % d'utilisateurs qui cliquent sur une suggestion
- Nombre moyen de suggestions consultées par session
- Taux de conversion suggestion → écoute audio-guide
- Temps avant la première interaction (doit diminuer)

## Notes libres
- Commencer simple (Option A ou B) et itérer
- Besoin de A/B testing pour valider l'hypothèse
- Possibilité de combiner avec la feature "Vue Découvrir organisée" pour une expérience cohérente
