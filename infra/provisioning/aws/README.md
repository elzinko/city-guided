# City-Guided AWS Provisioning

This folder contains Infrastructure as Code (AWS CDK) and provisioning scripts to deploy City-Guided on AWS using **ECS Fargate**, with configuration stored in AWS SSM Parameter Store and deployments performed via GitHub Actions.

**Note**: EC2-based deployment has been removed. All environments now use ECS Fargate. See [ec2-removal.md](../../../docs/technical/ec2-removal.md) for migration details.

Key idea: the source of truth for application configuration is `infra/config/.env.<environment>`. Provisioning pushes those values to SSM, and the deployment script updates the ECS task definition with these values.

## Estimated monthly cost

### ECS Fargate (with scale-to-zero)
- **ECS Fargate tasks**: ~$5-10/month (mostly idle with scale-to-zero)
- **Application Load Balancer**: ~$16/month (required, cannot scale to zero)
- **Data Transfer**: ~$0.09/GB (first 100GB free)

### Optional: Reverse Proxy for Fixed IP
- **EC2 t4g.nano**: ~$3/month (for DuckDNS fixed IP + HTTPS)
- **Elastic IP**: Free when attached to running instance
- **Total with proxy**: ~$24-30/month

**Old EC2 setup (deprecated)**: ~$10-20/month

## Prerequisites

- **Node.js 20+** and **pnpm**
- **AWS CLI v2** installed and configured (`aws configure`)
- AWS permissions for **CloudFormation**, **ECS**, **ECR**, **EC2**, **IAM**, **SSM**, **ELB**
- **GitHub CLI (`gh`)** (optional but recommended) for automatic GitHub Actions secrets setup
- **Docker** (for local testing)

## Quick start (recommended)

### 1) Create the environment file

From the repo root:

```bash
cp infra/config/.env.template infra/config/.env.staging
```

Edit `infra/config/.env.staging`:

- `ENVIRONMENT=staging`
- `NODE_ENV=production`
- `PROJECT_NAME=city-guided-staging`
- `SITE_DOMAIN=...` (e.g. `cityguided.duckdns.org`)
- `SECRET_DUCKDNS_TOKEN=...` (required only if using DuckDNS)
- OSRM settings (`OSRM_REGION`, `OSRM_REGION_BASE`, …)

### 2) Install provisioning dependencies

```bash
cd infra/provisioning/aws
pnpm install
```

### 3) Provision infrastructure (ECS cluster + ALB + ECR)

```bash
pnpm run provision -- staging
```

What it does:

1. Deploys the CDK stack (ECS Cluster + Fargate Service + ALB + ECR repositories)
2. Stores config in SSM at `/city-guided/staging/*` (secrets are detected by the `SECRET_` prefix)
3. Sets up scale-to-zero Lambda functions
4. Creates CloudWatch dashboard for monitoring

### 4) Optional: Enable reverse proxy for fixed IP

If you want to use a custom domain with DuckDNS:

1. Get a DuckDNS token from [duckdns.org](https://www.duckdns.org/)
2. Set environment variables:
   ```bash
   export DUCKDNS_TOKEN="your-token"
   export DUCKDNS_DOMAIN="cityguided.duckdns.org"
   ```
3. Uncomment the reverse proxy stack in `bin/app.ts`
4. Re-run provision:
   ```bash
   pnpm run provision -- staging
   ```

See [reverse-proxy-setup.md](../../../docs/technical/reverse-proxy-setup.md) for detailed instructions.

## What gets provisioned

### AWS (CDK / CloudFormation)

#### ECS Stack (CityGuidedEcsStack)
- ECS Cluster (`city-guided-cluster`)
- ECS Fargate Service with 2 containers (API + Web)
- Application Load Balancer (ALB) with HTTP listener
- ECR repositories for Docker images
- Auto-scaling (0-1 instances with scale-to-zero)
- Lambda functions for scale-up/scale-down automation
- CloudWatch dashboard for monitoring
- Security groups for ALB and ECS tasks

#### Optional: Reverse Proxy Stack (CityGuidedReverseProxyStack)
- EC2 t4g.nano instance with Elastic IP
- Caddy reverse proxy with automatic HTTPS
- Security group (ports 22, 80, 443)
- Integration with DuckDNS for fixed domain name

### AWS SSM Parameter Store

- Stored under: `/city-guided/<env>/*` (e.g. `/city-guided/staging/*`)
- Values come from `infra/config/.env.<env>` plus a few infra outputs (instance ID, public IP, etc.)
- Secrets are keys that start with `SECRET_`

### GitHub Actions environment secrets

For the GitHub environment named `staging` (see `.github/workflows/ci.yml`):

- `SECRET_AWS_ACCESS_KEY_ID`
- `SECRET_AWS_SECRET_ACCESS_KEY`
- `DUCKDNS_TOKEN` (optional, for reverse proxy)

Plus GitHub variables:
- `DUCKDNS_ENABLED` (set to `true` to enable automatic DNS updates)

## CI/CD deployment flow

The main workflow is `.github/workflows/ci.yml`.

On `main`, it:

1. Lints + builds + runs E2E tests
2. Builds and pushes Docker images to **AWS ECR**:
   - `<account>.dkr.ecr.eu-west-3.amazonaws.com/city-guided-api:<tag>`
   - `<account>.dkr.ecr.eu-west-3.amazonaws.com/city-guided-web:<tag>`
3. Deploys to ECS by:
   - Updating the ECS task definition with new image tags
   - Forcing a new deployment of the service
   - Optionally updates DuckDNS with reverse proxy IP (if enabled)

The deployment automatically scales up from 0 to 1 instance when traffic is detected.

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
