Déployer sur Render

✅ Résumé rapide
- Ce dépôt est un monorepo pnpm. J'ai préparé un `render.yaml` pour déclarer 2 services : le frontend (Next.js) et l'API (Fastify).
- J'ai adapté le script `start` de `apps-web-frontend` pour utiliser `$PORT` et `--hostname 0.0.0.0`.

Étapes recommandées (console Render)
1. Pousse tes derniers commits sur GitHub (branche `main` ou celle de ton choix).
2. Connecte ton repo GitHub dans Render (Create -> Web Service -> Connect repo).
3. Choisis la branche (ex: `main`). Render détectera `render.yaml` et proposera les services.

Paramètres importants (frontend)
- Runtime: Node 20 LTS
- Build Command (déjà configurée dans `render.yaml`):
  corepack enable pnpm && pnpm install --frozen-lockfile && pnpm run build --filter apps-web-frontend...
- Start Command:
  pnpm --filter apps-web-frontend start -- --hostname 0.0.0.0 --port $PORT
- Active Auto-Deploy: Yes (recommandé)
- Variables d'environnement à définir dans l'onglet Environment:
  - NEXT_PUBLIC_API_URL (ex: https://ton-api.onrender.com)
  - NEXT_PUBLIC_OSRM_URL (si nécessaire)

Paramètres importants (API)
- Path/root: `services/api` (déclaré dans `render.yaml`)
- Build Command:
  corepack enable pnpm && pnpm install --frozen-lockfile && pnpm run build --filter services-api...
- Start Command:
  pnpm --filter services-api start
- Variables à définir (ne pas commit) : clés privées, `PORT` si tu veux forcer (Render fournit automatiquement `PORT`).

Conseils & vérifications
- Tester localement : `corepack enable && pnpm install --frozen-lockfile && pnpm run build --filter apps-web-frontend...`
- Si le build échoue sur Render à cause de pnpm, ajoute le `corepack enable` comme préfixe (déjà fait).
- Pour une préprod, tu peux ajouter un service lié à une autre branche ou activer "Pull Request Previews".

Si tu veux, je peux :
- créer une pull request avec `render.yaml` + la correction du script `start` (déjà appliquée ici),
- ou préparer l'ajout automatique des variables d'environnement dans un script (mais les secrets doivent rester dans l'UI Render).

Déploiement manuel via GitHub Actions
- J'ai ajouté un workflow `/.github/workflows/render-deploy.yml` qui peut être déclenché manuellement (workflow_dispatch) pour déployer le frontend sur Render.
- Avantages : tu déclenches le déploiement uniquement quand tu veux ("push sur Render seulement au lancement du job").

Ce que tu dois configurer dans GitHub (Repository → Settings → Secrets):
- `RENDER_API_KEY` : une API key Render (Account Settings → API Keys)
- `RENDER_FRONTEND_SERVICE_ID` : l'ID du service Render du frontend (tu peux le trouver dans l'URL de la page du service ou via l'API `GET /v1/services`)
- (optionnel) `NEXT_PUBLIC_GITHUB_REPO` : `owner/repo` pour afficher un lien vers le commit déployé dans la page Admin.

Comportement du workflow
1. Build localement le frontend (utilise la même commande que Render).  
2. Met ou met à jour la variable d'environnement `NEXT_PUBLIC_RENDER_DEPLOYED_COMMIT` sur le service Render pour le SHA du commit déployé.  
3. Déclenche un deploy sur Render pour le commit demandé et attend la fin du deploy (succès / échec).

Affichage dans l'admin
- La page `pages/admin.tsx` affiche maintenant le commit actuellement enregistré dans `NEXT_PUBLIC_RENDER_DEPLOYED_COMMIT` (affiché sous forme de short SHA et lien vers GitHub si `NEXT_PUBLIC_GITHUB_REPO` est défini).

Notes de sécurité
- Ne pas committer de clés API : mets `RENDER_API_KEY` et autres secrets dans les GitHub Secrets uniquement.

Souhaites-tu que je :
- push ces modifications sur la branche `ci/render-deploy` et mette à jour la PR existante (déjà fait pour d'autres changements) ? ✅
- lancer le job manuellement pour tester un déploiement (il faudra ajouter `RENDER_API_KEY` et `RENDER_FRONTEND_SERVICE_ID` aux secrets) ?
- ajouter un job de confirmation (ex: notifier Slack, créer un Tag Git ou mettre à jour un fichier `DEPLOYED.txt`) après deploy réussi ?


