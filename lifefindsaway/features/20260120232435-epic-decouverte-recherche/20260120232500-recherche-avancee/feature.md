# Feature – Phase A (Exploration)

## Identifiant
recherche-avancee

## Résumé
Interface de recherche avancée type Google Maps avec POIs enregistrés en haut, historique des recherches récentes, et panneau complet pour consulter tout l'historique organisé par date.

## Problème adressé
Les utilisateurs perdent leurs recherches passées et doivent re-chercher ou re-naviguer pour retrouver des lieux déjà consultés. Il n'y a pas non plus d'accès rapide aux POIs enregistrés depuis l'interface de recherche.

## Hypothèse de valeur
En gardant un historique accessible et en mettant en avant les POIs enregistrés, les utilisateurs :
- Gagnent du temps pour retrouver des lieux
- Sont incités à utiliser la fonction "Enregistrés"
- Ont une meilleure expérience de navigation

⚠️ Hypothèse non validée

## Utilisateurs concernés
- Utilisateurs réguliers qui reviennent sur l'app
- Touristes en séjour de plusieurs jours
- Utilisateurs qui consultent plusieurs POIs dans une session

## Scénarios d'usage pressentis
1. **Utilisateur régulier** : Ouvre la recherche, voit immédiatement ses POIs enregistrés en haut, clique sur l'un d'eux pour y accéder
2. **Utilisateur en exploration** : Cherche "Musées", consulte 3-4 résultats, ferme l'app. Le lendemain, rouvre l'app, clique sur "Autres adresses récentes", retrouve "Musées" dans la section "Hier"
3. **Utilisateur comparateur** : Consulte plusieurs restaurants dans la journée, utilise l'historique "Aujourd'hui" pour comparer et choisir

## Idées de solution (non exclusives)

### Option A : Interface inline simple
- POIs enregistrés : bloc horizontal scrollable en haut (3-5 visibles)
- Historique récent : liste verticale limitée (5-10 items max)
- Bouton "Autres adresses récentes" en bas
- Panel fullscreen pour l'historique complet

**Pros** : Simple, rapide à implémenter  
**Cons** : Peut manquer de flexibilité si beaucoup de POIs enregistrés

### Option B : Interface avec onglets
- Tab 1 : "Enregistrés" avec tous les POIs favoris
- Tab 2 : "Récents" avec l'historique
- Recherche toujours accessible en haut

**Pros** : Organisation claire, scalable  
**Cons** : Ajoute un niveau de navigation

### Option C : Interface type Google Maps (recommandé pour exploration)
- POIs enregistrés : bloc scrollable en haut (comme Option A)
- Historique récent : liste limitée (taille de la page visible)
- "Autres adresses récentes" : ouvre panel fullscreen avec groupes par date
  - "Aujourd'hui"
  - "Hier"
  - "Cette semaine"
- Scroll infini dans le panel historique complet

**Pros** : UX familière, bonne scalabilité  
**Cons** : Plus complexe à implémenter

## Critères d'acceptation (brouillon)
- [ ] Les POIs enregistrés apparaissent en haut de l'interface de recherche
- [ ] Cliquer sur un POI enregistré ouvre sa fiche
- [ ] L'historique de recherche récent est affiché (limite à définir : 5-10 items)
- [ ] Cliquer sur une recherche passée affiche les résultats de cette recherche
- [ ] Le lien "Autres adresses récentes" ouvre un panel fullscreen
- [ ] Le panel affiche l'historique groupé par date (Aujourd'hui, Hier, Cette semaine)
- [ ] L'historique est scrollable (scroll infini ou pagination)
- [ ] Les données d'historique sont persistées localement (localStorage/IndexedDB)

## Contraintes connues
- **Technique** : Limite de stockage localStorage (~5-10MB selon navigateurs)
- **UX Mobile** : Espace limité, nécessite une hiérarchie claire
- **Performance** : Historique très long peut impacter le rendering (nécessite virtualisation ou pagination)

## Hypothèses explicites
- Les utilisateurs consultent en moyenne 5-10 POIs par session
- L'historique sur 7 jours est suffisant (au-delà, archivage ou suppression)
- Le format "groupe par date" est plus lisible qu'une liste chronologique pure

## Dépendances pressenties
- Feature "Enregistrés" (pour afficher les POIs favoris)
- Système de stockage local pour l'historique
- Peut nécessiter refacto du composant SearchBar actuel

## Questions ouvertes
- Combien d'items afficher dans l'historique récent avant "Autres adresses" ? (5, 10, 15 ?)
- Durée de rétention de l'historique ? (7 jours, 30 jours, illimité ?)
- Format de stockage : localStorage simple ou IndexedDB pour performance ?
- Faut-il permettre de supprimer des items de l'historique ?
- Synchro de l'historique entre devices (si utilisateur connecté) ?

## Risques pressentis
- **Performance** : Historique très long peut ralentir l'affichage
- **Privacy** : Historique sensible, besoin de mode incognito ou suppression facile ?
- **UX** : Trop d'informations peut rendre l'interface de recherche encombrée

## Indicateurs de succès (indicatifs)
- % d'utilisateurs qui utilisent l'historique pour retrouver un lieu (vs. re-recherche)
- Temps moyen pour retrouver un POI déjà consulté
- Nombre de clics sur POIs enregistrés depuis la recherche

## Notes libres
- Regarder l'implémentation Google Maps pour l'inspiration UX
- Possibilité de démarrer avec Option A (simple) et itérer vers Option C
- Besoin d'un design mockup avant implémentation
