# Feature – Phase A (Exploration)

## Identifiant
enregistres-lieux-favoris

## Résumé
Permettre aux utilisateurs de sauvegarder leurs lieux favoris ("Enregistrés") dans la barre Ambiance locale pour y accéder rapidement et créer des collections personnalisées.

## Problème adressé
Les utilisateurs ne peuvent pas sauvegarder leurs POIs préférés. Ils doivent re-chercher ou re-naviguer pour retrouver des lieux qu'ils veulent revisiter, ce qui est frustrant et fait perdre du temps.

## Hypothèse de valeur
En permettant de sauvegarder des favoris, les utilisateurs reviendront plus souvent sur l'app et auront une raison de créer un "lien" avec les lieux découverts.

⚠️ Hypothèse non validée

## Utilisateurs concernés
- Utilisateurs réguliers
- Touristes en séjour de plusieurs jours
- Utilisateurs planifiant une visite future

## Scénarios d'usage pressentis
1. Utilisateur découvre un musée, clique sur "Enregistrer", le retrouve dans "Mes favoris"
2. Utilisateur crée une liste "À visiter ce week-end" avec 5 POIs
3. Utilisateur partage sa liste de favoris avec un ami (futur)

## Idées de solution (non exclusives)
- **Option A** : Stockage local uniquement (localStorage)
- **Option B** : Synchro cloud avec compte utilisateur
- **Option C** : Mix local + sync optionnelle

## Critères d'acceptation (brouillon)
- [ ] Bouton "Enregistrer" sur chaque fiche POI
- [ ] Section "Enregistrés" dans la barre Ambiance locale
- [ ] Affichage de la liste des POIs enregistrés
- [ ] Possibilité de supprimer un favori
- [ ] Persistance des favoris (localStorage ou cloud)

## Questions ouvertes
- Stockage local ou cloud ?
- Authentification nécessaire ?
- Collections/dossiers ou liste unique ?

## Notes libres
Voir détails dans [epic.md](../epic.md)
