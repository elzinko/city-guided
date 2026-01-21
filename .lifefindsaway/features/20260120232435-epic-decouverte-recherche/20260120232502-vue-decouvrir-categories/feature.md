# Feature – Phase A (Exploration)

## Identifiant
vue-decouvrir-categories

## Résumé
Réorganiser la vue "Découvrir" avec des carousels thématiques par catégorie ("Autour de moi", "Musées", etc.) au lieu d'une liste plate. Chaque POI occupe ~80% de la largeur en mobile pour une navigation immersive.

## Problème adressé
La vue "Découvrir" affiche actuellement une liste simple de tous les POIs autour de l'utilisateur. Cette présentation :
- Est peu engageante visuellement
- Ne permet pas de filtrer par intérêt
- Noie l'utilisateur dans trop d'informations
- Ne met pas en valeur les POIs avec de belles photos

## Hypothèse de valeur
En organisant les POIs par catégories thématiques avec des carousels :
- L'utilisateur trouve plus facilement des POIs qui l'intéressent
- L'expérience est plus immersive et attrayante
- Le nombre de POIs consultés par session augmente
- L'utilisateur passe plus de temps dans l'app

⚠️ Hypothèse non validée

## Utilisateurs concernés
- Tous les utilisateurs de la vue "Découvrir"
- Particulièrement les utilisateurs qui aiment "flâner" sans objectif précis
- Utilisateurs visuels qui sont attirés par les photos

## Scénarios d'usage pressentis
1. **Utilisateur explorateur** : Ouvre la vue "Découvrir", scroll vers le bas, voit la catégorie "Musées", swipe dans le carousel pour voir 3-4 musées, clique sur l'un d'eux
2. **Utilisateur gourmand** : Cherche un restaurant, voit la catégorie "Restaurants", browse le carousel, compare visuellement les options
3. **Utilisateur pressé** : Veut un POI proche, regarde directement la catégorie "Autour de moi" qui affiche les plus proches

## Idées de solution (non exclusives)

### Option A : Carousels verticaux avec catégories fixes
```
[Autour de moi]
[→ POI 1] [POI 2] [POI 3] →

[Musées]
[→ POI 1] [POI 2] [POI 3] →

[Restaurants]
[→ POI 1] [POI 2] [POI 3] →
```

**Catégories fixes** : Autour de moi, Musées, Restaurants, Monuments, Parcs, etc.

**Pros** : Simple, prévisible  
**Cons** : Certaines catégories peuvent être vides selon la zone

### Option B : Carousels avec catégories dynamiques
Afficher uniquement les catégories qui ont des POIs dans le rayon actuel.

**Pros** : Pas de catégories vides  
**Cons** : Incohérence d'une zone à l'autre

### Option C : Catégories personnalisées par utilisateur
Permettre à l'utilisateur de choisir ses catégories préférées.

**Pros** : Très personnalisé  
**Cons** : Complexité, nécessite un système de préférences

### Option D : Mix catégories + liste complète
- Carousels thématiques en haut
- Bouton "Voir tous les POIs" pour revenir à la liste complète

**Pros** : Flexibilité, garde l'ancienne vue  
**Cons** : Peut créer de la confusion

## Design pressenti

**Format des cartes POI dans le carousel** :
- Largeur : ~80% de la largeur de l'écran (mobile)
- Hauteur : ~200-250px
- Contenu :
  - Grande image en background
  - Titre du POI (superposé sur l'image)
  - Catégorie / Distance
  - Possiblement : note/avis (si disponible)

**Comportement** :
- Swipe horizontal pour naviguer dans un carousel
- Scroll vertical pour changer de catégorie
- Tap sur une carte pour ouvrir la fiche complète du POI

## Critères d'acceptation (brouillon)
- [ ] La vue "Découvrir" affiche des carousels par catégorie
- [ ] Chaque carousel affiche des POIs dans cette catégorie uniquement
- [ ] Les cartes POI occupent ~80% de la largeur de l'écran en mobile
- [ ] On peut swiper horizontalement dans un carousel
- [ ] On peut scroller verticalement entre les catégories
- [ ] Cliquer sur une carte POI ouvre sa fiche complète
- [ ] Les catégories vides ne sont pas affichées (ou affichent un message)
- [ ] Les POIs sont filtrés selon le rayon de recherche actuel

## Contraintes connues
- **Performance** : Afficher plusieurs carousels avec images peut impacter la performance
  - Solution : lazy loading des images, virtualisation des carousels
- **Design** : Besoin de composants réutilisables (composition)
- **Données** : Nécessite une catégorisation claire des POIs (provenance : OpenTripMap, Wikidata)

## Hypothèses explicites
- Les utilisateurs préfèrent une navigation par catégories vs. une liste complète
- Le format carousel (80% largeur) est plus engageant qu'une grille
- Les grandes images attirent plus l'attention que du texte
- Les utilisateurs sont prêts à swiper pour découvrir plus de POIs
- 3-5 POIs par carousel suffisent pour ne pas submerger

## Dépendances pressenties
- Composants UI à créer :
  - `CategoryCarousel` (conteneur de carousel)
  - `PoiCard` (carte POI 80% largeur)
  - `DiscoverView` (vue principale)
- Système de catégorisation des POIs (taxonomie à définir)
- Images de qualité pour chaque POI

## Questions ouvertes
- Quelles catégories prioriser ? (Musées, Restaurants, Monuments, Parcs, Architecture, Histoire, Nature, etc.)
- Combien de POIs afficher par carousel ? (3-5, tous ?)
- Faut-il un bouton "Voir plus" dans chaque carousel ?
- Comment gérer les POIs qui appartiennent à plusieurs catégories ? (afficher dans plusieurs carousels ou choisir la catégorie principale ?)
- Faut-il garder la possibilité de voir la liste complète ? (Option D)
- Ordre d'affichage des catégories : fixe ou dynamique (selon le nombre de POIs) ?

## Risques pressentis
- **Performance** : Carousels multiples + images lourdes = risque de lag
- **UX** : Trop de catégories peut noyer l'utilisateur
- **Données** : Catégorisation incomplète ou incorrecte des POIs
- **Adoption** : Les utilisateurs préfèrent peut-être la liste simple (besoin d'A/B testing)
- **Accessibilité** : Navigation au clavier difficile avec des carousels

## Indicateurs de succès (indicatifs)
- % d'utilisateurs qui swipent dans un carousel
- Nombre moyen de carousels consultés par session
- Taux de clic sur les cartes POI (vs. ancienne liste)
- Temps passé dans la vue "Découvrir"

## Notes libres
- Inspiration : Airbnb (carousels de locations), Netflix (catégories de films)
- Possibilité de démarrer avec 2-3 catégories seulement pour le MVP
- Besoin de mockups/prototypes avant implémentation
- Attention à la performance mobile (tests sur devices bas de gamme)
- Réutiliser les composants pour d'autres vues si possible (composition)
