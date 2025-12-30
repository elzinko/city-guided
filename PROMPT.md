Tu es un développeur fullstack senior, très expérimenté en architecture propre (Clean Architecture), architecture hexagonale et bonnes pratiques (12 factors, Clean Code, séparation claire des responsabilités).

🎯 CONTEXTE PRODUIT

Je veux créer une application appelée **CityGuided**.

Objectif : proposer des **visites guidées géolocalisées** simples, d’abord pour des trajets en voiture/taxi ou à pied. Quand l’utilisateur passe à proximité d’un point d’intérêt, l’application diffuse un contenu (prioritairement audio) qui décrit le lieu. À terme, le cœur du business sera B2B (taxis, bus, tours privés), mais le premier MVP doit fonctionner pour un utilisateur lambda.

À terme il y aura :
- une **appli utilisateur** (web mobile first, PWA) ;
- une **appli d’administration** (backoffice) pour gérer les contenus (textes, photos, vidéos, audio) ;
- un **backend** qui expose des API et intègre plus tard des LLM pour générer des résumés multilingues.

Pour l’instant : priorité à un **MVP simple**, qui fonctionne en local, facilement déployable sur un serveur.

🧱 CONTRAINTES TECHNIQUES & ARCHITECTURE

1. **Langage & stack**
   - Choisis un stack **fullstack moderne, rapide et performant**, adapté à une webapp mobile-first et à un backend API.
   - Par défaut, propose **TypeScript** (backend + frontend) avec un framework courant (par ex. backend Node/TypeScript type NestJS/Fastify/Express structuré proprement, frontend React/Next.js ou équivalent).
   - Explique en quelques lignes ton choix de stack (performances, DX, évolutivité, facilité de déploiement).

2. **Architecture**
   - Utilise une **architecture hexagonale** ou très proche :
     - couche **domaine** (use cases, modèles métiers) ;
     - couche **application** (services, ports) ;
     - couche **infrastructure** (adapters : API HTTP, persistence, géoloc, etc.).
   - Tu peux rester simple : pas besoin d’usine à gaz, mais la séparation doit être nette pour pouvoir remplacer facilement une source de données ou une lib.
   - Respecte les principes **Clean Code** (nommage clair, fonctions courtes, pas de magie cachée).

3. **12 Factors & déploiement**
   - Prépare le projet pour un déploiement propre :
     - configuration via **variables d’environnement** ;
     - logs propres ;
     - pas de dépendance à l’état local du serveur.
   - Fournis :
     - un **Dockerfile** (ou plusieurs si nécessaire) ;
     - un **docker-compose.yml** minimal pour lancer le backend + frontend en local.

4. **Données & mocks**
   - Au début, utilise des **mocks** pour les données (points d’intérêt, contenus) à travers des adapters dans la couche infrastructure, afin de respecter l’architecture hexagonale.
   - La persistance peut être en mémoire ou via un simple fichier JSON au début. Le but est de pouvoir brancher une vraie base plus tard sans casser le domaine.

📍 FONCTIONNALITÉS MVP (VERSION 1)

Concentre-toi sur un MVP minimal mais cohérent, avec une **webapp fullstack** (backend + frontend) qui permet :

1. **Géolocalisation & carte**
   - Sur la webapp utilisateur :
     - récupérer la **position de l’utilisateur** (API de géolocalisation du navigateur) ;
     - afficher une **carte** avec :
       - la position actuelle ;
       - quelques **points d’intérêt mockés** autour (nom, description courte, rayon de déclenchement).
   - Tu peux utiliser une solution de carte simple (librairie JS courante) ou simuler une carte très simple si nécessaire, mais l’intention “affichage sur carte” doit être claire dans le code.

2. **Sélection de thème / demande utilisateur**
   - Sur la page principale, proposer à l’utilisateur :
     - un champ de texte + bouton “**Je veux visiter…**” ;
     - et/ou quelques **filtres simples** (ex : “Monuments”, “Musées”, “Art”, “Insolite”).
   - **Pour le MVP**, la “dictée vocale” peut être :
     - soit intégrée via une API navigateur (Web Speech API) si simple ;
     - soit **simulée par un champ texte** (avec un TODO clair pour l’intégration vocale plus tard).
   - Le backend n’a pas besoin de faire une vraie recherche avancée pour l’instant : tu peux filtrer sur les catégories des points mockés.

3. **Lecture audio & navigation entre points**
   - Pour chaque point d’intérêt, tu dois :
     - avoir une **description textuelle** mockée (dans les données) ;
     - la présenter sur l’UI ;
     - et proposer une **lecture audio** :
       - soit par un simple **lecteur audio HTML** (fichiers audio mockés) ;
       - soit par un **placeholder** (ex : bouton “Lire l’audio” qui indique que ce sera relié à du TTS plus tard).
   - Comportement attendu :
     - quand l’utilisateur se trouve **dans le rayon d’un point d’intérêt**, on déclenche l’affichage/lecture de ce point (ou on propose de démarrer la visite du point) ;
     - quand il **quitte le rayon** d’un point A et se rapproche d’un point B :
       - proposer de **passer au point suivant** (prompt UI) ;
       - si l’utilisateur refuse, on continue la visite en cours (tant qu’on ne sort pas trop de la zone, tu peux garder ça simple avec une tolérance).

4. **Orientation taxi / voiture**
   - Pour le MVP, considère qu’on est surtout dans un **contexte de trajet en voiture/taxi** :
     - les points d’intérêt peuvent être définis le long d’une route ;
     - il n’est pas nécessaire d’implémenter la gestion d’un “trajet complet” au début ;
     - l’objectif est de vérifier que lorsqu’on **se déplace**, le système :
       - détecte les points proches ;
       - gère la transition d’un point à l’autre.

5. **Backoffice (version ultra light)**
   - Propose une ébauche très simple d’interface admin (peut être une route séparée ou une app ultra basique) :
     - lister les points d’intérêt ;
     - créer/éditer/supprimer un point (nom, coordonnées, rayon de déclenchement, catégorie, petite description).
   - La persistance peut rester mockée, mais structure le code de façon à pouvoir brancher une vraie base.

🧠 FUTUR (À GARDER EN TÊTE DANS LE DESIGN, MAIS PAS À CODER ENCORE)

Ne les implémente pas, mais prépare le terrain :
- Intégration de **LLM** dans le backend pour générer :
  - des résumés multilingues ;
  - des variantes de contenu selon la durée / le type de trajet (taxi, bus, marche).
- Gestion d’**abonnements taxi/bus** (B2B) :
  - comptes chauffeurs ;
  - activation d’options premium ;
  - tracking minimal des usages.
- Application mobile native (iOS/Android) basée sur la webapp (PWA ou réutilisation de composants).

🧪 EXIGENCES DE QUALITÉ

- Explique **avant de coder** :
  1. Le stack choisi (backend + frontend).
  2. La structure globale du projet (dossiers, modules, couches).
  3. Les principaux use cases du domaine (en pseudo-code si utile).

- Ensuite :
  - génère le **squelette complet du projet** (structure de dossiers, principaux fichiers) ;
  - fournis le code des **éléments clés** pour que je puisse :
    - lancer le backend en local ;
    - lancer le frontend en local ;
    - tester un scénario simple :
      - je vais sur la webapp ;
      - je vois ma position + quelques points d’intérêt ;
      - je peux sélectionner un thème ou taper “Je veux visiter [ville]” ;
      - quand je simule/émule un déplacement vers un point, la visite de ce point est proposée/démarre.

- Respecte les bonnes pratiques :
  - code clair, commenté uniquement là où c’est utile ;
  - types bien définis ;
  - pas de logique métier dans les contrôleurs/adapters, elle doit vivre dans le domaine.

Commence maintenant par :
1. Choisir et justifier la stack.
2. Décrire l’architecture (couches, principaux modules, flux de données).
3. Proposer la structure de dossiers.
4. Puis générer progressivement le code du MVP (backend, frontend, docker) en expliquant chaque étape.
