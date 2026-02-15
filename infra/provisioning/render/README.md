# Déploiement Render (free tier)

Déploiement **tout-en-un** sur Render : 1 Postgres + 3 Web Services (API, web-frontend, admin). Aucune modification de l’ECS ni des docker-compose existants.

## Prérequis

- Compte [Render](https://render.com)
- Repo GitHub connecté à Render
- Branche à déployer (ex. `main` ou ta branche feature)

## Méthodo projet

Les commandes de build/start reprennent celles du monorepo :

- **Build** : depuis la racine du repo, `pnpm install --frozen-lockfile` puis `pnpm run build --filter <package>` (comme en local / turbo).
- **Start** : `pnpm --filter <package> start` (API : `services-api`, Web : `apps-web-frontend`, Admin : `apps-admin`).
- **Migrations** : `preDeployCommand` sur l’API exécute `pnpm --filter @city-guided/database db:push` (pas de dossier `migrations` dans le projet, schéma synchronisé avec `db:push`).

Node 22 est utilisé (fichier `.node-version` à la racine).

## Déploiement avec le Blueprint

1. **Connecter le repo**  
   Dashboard Render → New → Blueprint → connecter le repo contenant ce dossier.

2. **Pointer le Blueprint**  
   Lors de la création du Blueprint, indiquer le chemin du fichier : **`infra/provisioning/render/render.yaml`** (relatif à la racine du repo).

3. **Variables à renseigner (sync: false)**  
   Après création des services, dans le Dashboard pour chaque service :
   - **city-guided-api** : `ADMIN_TOKEN`, `SECRET_OPENTRIPMAP_API_KEY`.
   - **city-guided-web** : `NEXT_PUBLIC_API_URL` = `https://city-guided-api.onrender.com` (adapter si le nom du service ou l’URL Render diffère).
   - **city-guided-admin** : `NEXT_PUBLIC_API_URL` (même URL que l’API), `NEXT_PUBLIC_ADMIN_TOKEN` (même valeur que `ADMIN_TOKEN` de l’API).

4. **Premier déploiement**  
   Le premier déploiement de l’API exécute `db:push` au démarrage (preDeployCommand non supporté en free tier) et crée les tables. Vérifier les logs en cas d’erreur.

5. **URLs**  
   Chaque service a une URL `https://<service-name>.onrender.com`. Free tier : les services s’arrêtent après inactivité ; le premier accès peut être lent (cold start).

## Fichier .env.render

- **Template** : `infra/config/.env.render.example` — liste des variables à définir dans le Dashboard (sync: false). Les .env sont centralisés dans `infra/config/`.
- **Copie locale** (optionnelle) : `cp infra/config/.env.render.example infra/config/.env.render`, remplis les valeurs, puis reporte-les dans le Dashboard. Le fichier `.env.render` n’est pas versionné.

## Workflow de déploiement

- **Première fois (créer la stack)**  
  1. `pnpm run infra:provision:render` pour valider le Blueprint et afficher les étapes.  
  2. Dans le Dashboard Render : New → Blueprint, connecter le repo, chemin `infra/provisioning/render/render.yaml`.  
  3. Renseigner les variables (sync: false) pour chaque service.  
  → Les 3 services + la base sont créés, premier déploiement automatique.

- **Ensuite (déployer la recette)**  
  **Tu n’as rien à lancer en local.** Tu **push** ta branche (ex. `feature/staging` ou `staging`) sur GitHub. Render détecte le push et lance build + déploiement sur les services liés à cette branche. Si l’auto-deploy est désactivé, tu peux lancer un déploiement manuel depuis le Dashboard (Manual Deploy).  
  Le script `infra:provision:render` ne sert plus après la création de la stack (il ne pousse pas le code ni ne déclenche un deploy).

## Scripts npm (racine du repo)

- `pnpm run render:docs` : rappel du chemin de cette doc.
- `pnpm run infra:provision:render` : valide le Blueprint (si Render CLI installé) et affiche les instructions pour **créer** la stack (à faire une seule fois).

## Dépannage

### "Can't reach database server" (API)

Si la base est en **Oregon** et l'API en **Frankfurt**, la connexion interne échoue. **Solution** : supprimer la base `city-guided-db` dans le Dashboard, puis **Sync** le Blueprint. Une nouvelle base sera créée en Frankfurt.

### "Could not find a production build" (Web/Admin)

**Cause** : Turbo utilise un cache hit et restaure des outputs. Si `turbo.json` ne liste que `dist/**` pour les outputs du build, le dossier `.next` (produit par Next.js) n'est pas inclus dans le cache. Au runtime, `next start` ne trouve pas le build.

**Solution** : Vérifier que `turbo.json` inclut `.next/**` dans les outputs du build :

```json
"build": {"dependsOn": ["^build"], "outputs": ["dist/**", ".next/**"]}
```

Le `startCommand` utilise `cd apps/<app> && pnpm start` pour s'exécuter depuis le bon répertoire. Vérifier que le build a réussi (pas de cache hit Turbo sans outputs restaurés).

## Limites free tier

- 750 h/mois d’instance au total pour le workspace.
- Services web : arrêt après ~15 min sans trafic, cold start au réveil.
- Postgres free : 90 jours, 1 Go (voir [Render Free](https://render.com/docs/free)).

## ECS / docker-compose

Aucun fichier dans `infra/provisioning/aws` (ECS) ni dans `infra/deployment/compose/` (docker-compose existants) n’est modifié par ce déploiement. Tu peux continuer à utiliser `pnpm run infra:*` et `pnpm run docker:*` comme avant.
