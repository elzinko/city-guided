# Structure des fichiers .env – Applicatif vs Provider

## Comparaison .env.staging (AWS) vs .env.render.example (Render)

| Catégorie | .env.staging (AWS / Docker) | .env.render.example (Render) |
|-----------|-----------------------------|------------------------------|
| **Environnement** | ENVIRONMENT, NODE_ENV, PROJECT_NAME | (implicite : prod/staging selon branche) |
| **Site / DNS** | SITE_DOMAIN, SERVER_NAME (DuckDNS) | — (URLs *.onrender.com) |
| **Ports** | API_PORT, WEB_PORT, OSRM_PORT, CADDY_*, ADMIN_PORT | — (PORT fourni par Render) |
| **OSRM** | OSRM_* (région, URL, network) | — (non utilisé sur Render pour l’instant) |
| **URLs publiques (app)** | NEXT_PUBLIC_API_URL, NEXT_PUBLIC_OSRM_URL | NEXT_PUBLIC_API_URL (par service), pas d’OSRM |
| **Docker / images** | API_IMAGE, WEB_IMAGE, RESTART_POLICY, *DOCKERFILE | — (build natif Render) |
| **App (partagé)** | LOG_LEVEL, CORS_ORIGIN, SHOW_DEV_OPTIONS, APP_* | SHOW_DEV_OPTIONS (dans render.yaml en dur) |
| **Database** | POSTGRES_*, DATABASE_URL (compose) | DATABASE_URL renseignée dans le Dashboard (ex: Neon) |
| **Admin** | ADMIN_TOKEN, ADMIN_PORT | ADMIN_TOKEN, NEXT_PUBLIC_ADMIN_TOKEN |
| **Secrets externes** | SECRET_OPENTRIPMAP_API_KEY | SECRET_OPENTRIPMAP_API_KEY |
| **Provider** | SECRET_DUCKDNS_TOKEN | — |

En résumé : **.env.staging** décrit l’app + l’infra AWS (Docker, Caddy, OSRM, DuckDNS). **.env.render.example** ne liste que ce qu’on saisit dans le Dashboard Render (surtout des variables applicatives, mais avec une structure “par service” et sans DATABASE_URL ni toute la couche Docker/OSRM/Caddy). Un **même fichier .env pour tous les providers** est difficile à cause de ces différences structurelles (qui lit quoi, ce qui est fourni par la plateforme, etc.).

---

## Proposition : .env par “partie”

### 1. Fichiers applicatifs (indépendants du provider)

- **.env.local**, **.env.staging**, **.env.prod**
- **Contenu** : tout ce dont l’application a besoin pour tourner (API, DB, admin, feature flags, URLs publiques). Même structure pour les trois ; seules les valeurs changent (local vs staging vs prod).
- **Utilisation** : même fichier qu’on utilise en local, en staging ou en prod, que le déploiement soit sur AWS, Render ou autre. L’app ne dépend pas de l’infra.

Variables typiques : `NODE_ENV`, `DATABASE_URL`, `ADMIN_TOKEN`, `SECRET_OPENTRIPMAP_API_KEY`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_OSRM_URL` (si utilisé), `SHOW_DEV_OPTIONS`, `LOG_LEVEL`, `CORS_ORIGIN`, etc. Pas de PORTS si la plateforme les fournit (Render), pas de Docker/OSRM/Caddy.

### 2. Fichiers provider (spécifiques à l’infra)

- **.env.aws.staging**, **.env.aws.prod** (template : .env.aws.example) : ce qui est propre à AWS (DuckDNS, SITE_DOMAIN, Docker, Caddy, OSRM, ports, etc.).
- **.env.render** / **.env.render.example** : ce qu’on renseigne dans le Dashboard Render (souvent un sous-ensemble des vars applicatives + rien côté “réseau/Docker”).
- **Utilisation** : au moment du **provisioning**, on combine applicatif + provider : par exemple `infra:provision:aws staging` charge `.env.staging` (applicatif) + `.env.aws.staging` (provider) et fusionne, et pousse en SSM ou lance le compose ; pour Render, on lit `.env.staging` (ou .env.prod) pour les valeurs et on les reporte dans le Dashboard (ou un script qui lit .env.staging + .env.render et envoie à l’API Render).

### 3. Combinaison lors du provisioning

- **AWS** : `infra:provision:aws staging` → charge `infra/config/.env.staging` (applicatif) + `infra/config/.env.aws.staging` (provider) et fusionne ; déploie (SSM, ECS, Caddy, etc.). Si `.env.aws.staging` n'existe pas, seul l'applicatif est utilisé (rétrocompat).
- **Render** : création du Blueprint puis renseignement des variables ; les valeurs peuvent venir de `.env.staging` (ou .env.prod) + `.env.render` pour ne pas dupliquer les secrets. Un script pourrait lire les deux et pousser vers l’API Render si besoin.

Résultat : **applicatif identique** (même ensemble de vars pour local / staging / prod), **config d’infra séparée** (AWS vs Render), et on garde la possibilité d’utiliser AWS ou Render sans mélanger les deux dans un seul fichier monolithique.
