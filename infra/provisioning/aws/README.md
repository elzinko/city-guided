# City-Guided AWS Provisioning (Staging)

This folder contains Infrastructure as Code (AWS CDK) and a unified provisioning script to deploy City-Guided on an AWS EC2 Spot instance, with configuration stored in AWS SSM Parameter Store and deployments performed via GitHub Actions.

Key idea: the source of truth for application configuration is `infra/config/.env.<environment>`. Provisioning pushes those values to SSM, and the deployment script regenerates the `.env.<environment>` on the EC2 host from SSM before starting containers.

## Estimated monthly cost

- **EC2 Spot `t3.medium`**: ~ $9/month (varies by region/availability)
- **Elastic IP**: Free when attached to a running instance
- **DuckDNS**: Free

## Prerequisites

- **Node.js 20+** and **pnpm**
- **AWS CLI v2** installed and configured (`aws configure`) OR be ready to paste credentials when prompted
- AWS permissions for **CloudFormation**, **EC2**, **IAM**, **SSM**
- **GitHub CLI (`gh`)** (optional but recommended) if you want the script to automatically set GitHub Actions environment secrets
- **Session Manager plugin** (optional but recommended) for SSM-based shell access

## Quick start (recommended)

### 1) Create the environment file

From the repo root:

```bash
cp infra/config/.env.template infra/config/.env.staging
```

Edit `infra/config/.env.staging`:

- `ENVIRONMENT=staging`
- `NODE_ENV=production`
- `COMPOSE_PROJECT_NAME=city-guided-staging`
- `SITE_DOMAIN=...` (e.g. `cityguided.duckdns.org`)
- `SECRET_DUCKDNS_TOKEN=...` (required only if using DuckDNS)
- OSRM settings (`OSRM_REGION`, `OSRM_REGION_BASE`, …)

### 2) Install provisioning dependencies

```bash
cd infra/provisioning/aws
pnpm install
```

### 3) Provision everything (infra + SSM + GitHub secrets + instance setup)

```bash
pnpm run provision -- staging
```

What it does:

1. Deploys the CDK stack (EC2 Spot + Elastic IP + Security Group + IAM role for SSM)
2. Stores config in SSM at `/city-guided/staging/*` (secrets are detected by the `SECRET_` prefix and stored as `SecureString`)
3. Optionally provisions **GitHub Actions environment secrets** for the `staging` environment (requires `gh auth login`)
4. Installs EC2 dependencies via SSM (Docker Compose v2 + Buildx)
5. Updates DuckDNS if `SITE_DOMAIN` is a `*.duckdns.org` domain

## What gets provisioned

### AWS (CDK / CloudFormation)

- EC2 Spot instance (default: `t3.medium`)
- Security group allowing `22` (SSH), `80` (HTTP), `443` (HTTPS)
- Elastic IP (stable public IP)
- IAM role with `AmazonSSMManagedInstanceCore` (SSM management) + Parameter Store read access

### AWS SSM Parameter Store

- Stored under: `/city-guided/<env>/*` (e.g. `/city-guided/staging/*`)
- Values come from `infra/config/.env.<env>` plus a few infra outputs (instance ID, public IP, etc.)
- Secrets are keys that start with `SECRET_`

### GitHub Actions environment secrets (minimal)

For the GitHub environment named `staging` (see `.github/workflows/ci.yml`):

- `SECRET_AWS_ACCESS_KEY_ID`
- `SECRET_AWS_SECRET_ACCESS_KEY`
- `SECRET_AWS_REGION`
- `SECRET_EC2_INSTANCE_ID`

## CI/CD deployment flow

The main workflow is `.github/workflows/ci.yml`.

On `main`, it:

1. Lints + builds + runs E2E tests
2. Builds and pushes Docker images to GHCR:
   - `ghcr.io/<owner>/<repo>-api:<tag>`
   - `ghcr.io/<owner>/<repo>-web:<tag>`
3. Deploys to EC2 via **SSM** by running:
   - `infra/docker/scripts/deploy.sh staging`
   - with `IMAGE_TAG=<tag>` (short commit SHA)

## Checking the deployed version (commit / code link)

The app exposes deployment metadata in the admin module:

- Go to `https://<SITE_DOMAIN>/admin`
- The header shows `Deploy: <APP_VERSION>` and links to:
  - the commit on GitHub
  - the repository
  - the code tree

Where it comes from:

- `APP_VERSION` and `APP_REPO_URL` are environment variables passed to the `web` container.
- During staging deployments, `infra/docker/scripts/deploy.sh` automatically sets `APP_VERSION` to the deployed `IMAGE_TAG`.

## Connecting to the EC2 instance

From the repo root:

```bash
pnpm ssh staging
```

This uses AWS SSM Session Manager and reads the instance ID from SSM (`/city-guided/staging/SECRET_EC2_INSTANCE_ID`).

Once connected:

```bash
cd city-guided/infra/docker
docker ps
docker compose logs -n 200
```

## Common operations

### Re-provision SSM after changing `infra/config/.env.staging`

```bash
cd infra/provisioning/aws
pnpm run provision -- staging
```

### Trigger a manual staging deploy (GitHub Actions)

```bash
gh workflow run ci.yml --ref main -f deploy_staging=true
```

### CDK commands

```bash
cd infra/provisioning/aws
pnpm run diff
pnpm run synth
pnpm run deploy
pnpm run destroy
```

## Troubleshooting

### “No parameters found in SSM”

- Ensure you ran provisioning: `pnpm run provision -- staging`
- Check the path exists:
  ```bash
  aws ssm get-parameters-by-path --path "/city-guided/staging" --with-decryption
  ```

### “GitHub secrets were not set”

- The provisioning script only sets GitHub secrets if you are logged in:
  ```bash
  gh auth login
  ```

### “The deployed site doesn’t show my latest changes”

1. Check which commit is deployed on `https://<SITE_DOMAIN>/admin` (Deploy badge).
2. In GitHub Actions, confirm the latest run completed the `Deploy to AWS Staging` job.
3. On the server, confirm images were pulled for the expected tag:
   ```bash
   cd city-guided/infra/docker
   grep -E "^(API_IMAGE|WEB_IMAGE|APP_VERSION)=" .env.staging
   docker images | head
   ```

## Notes / limitations

- The CDK app currently provisions a **staging** stack. A production stack is not fully wired yet.
- There is a cron “activity check” script in the EC2 user-data, but it does **not** stop the instance automatically today (it only logs).
