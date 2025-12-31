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

Si tu souhaites que j'aille plus loin, dis-moi ce que tu veux que je fasse en priorité (créer PR, déployer l'API aussi, configurer un domaine personnalisé…).
