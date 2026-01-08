# TODO / Futures features

- [x] Voice search (dictée vocale) intégrée à la barre de recherche.
- [x] Panneau bas type Google Maps avec onglets/boutons : Découvrir / Enregistrés / Contribuer (slide up/down au-dessus de la carte).
- [] Météo et qualité de l'air : icône + température dans l'UI; au clic, panneau demi-hauteur avec prévision 7 jours et AQI.
- [] Recherche avancée : champ plein écran, suggestions enregistrées (horizontales), bouton « plus… » pour en afficher davantage, liste des recherches récentes et lien « Autres adresses récentes » vers une vue dédiée (scroll infini par jour).
- [x] Enrichir l'expérience taxi : ambiance locale dans le panneau bas (sons, anecdotes), UX mobile optimisée.
- [?] Compléter la recherche plein écran : liste horizontale « adresses enregistrées » avec bouton « plus » après 5 suggestions; section « Autres adresses récentes » menant à la vue dédiée.
- [en cours] Audio-guide enrichi : textes de ~30s puis micro-textes de 15s en rafale (jusqu’à 3 min) par POI; éviter les répétitions, avancer automatiquement tant qu’on reste dans la zone; prompt “passer au lieu suivant ?” quand on entre dans une nouvelle zone, avec bouton « piste suivante ».
- [] Mode GPS avancé : vue carte inclinée type Google Maps, point bleu au centre, lieu courant clignotant, zoom auto pour voir la destination en cours.
- [x] Parcours taxi simulés : ajouter gestion des simulations gps (Fontainebleau) sélectionnables dans le module admin (chargement sans démarrage automatique). Vitesses réalistes.
- [] gestion (crud) des trajets virtuels pour admins
- [] Bouton feedback beta → création d’issue GitHub : popup plein écran avec titre, description, type (bug/feature/other), contexte auto (historique d’actions utilisateur) attaché en PJ ou dans le body; utilisation d’un token GitHub fourni.
- [] review des composants et mise à plat pour standardisation avec composants pour chaque bloc (utiliser la composition aussi) et tailwind pour le css
- [x] Mode navigation audio (post-recherche) : interface type GPS avec POI suivant/temps-distance, zone texte/contrôles (lecture/pause/suivant), sortie du mode nav, et affichage superposé à la carte pendant la navigation.
- [] Implémenter « Enregistrés » (gestion des lieux favoris) dans la barre Ambiance locale.
- [] Implémenter « Contribuer » (notation/signalement de lieux) dans la barre Ambiance locale.
- [] Ajouter la notation/avis des lieux (étoiles + nombre d’avis) dans les cartes résultats.
- [] Proposer par défaut une sélection de découvertes personnalisées sur la carte (POI suggérés) avant recherche.
