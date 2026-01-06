# AWS Staging Deployment Configuration

## GitHub Secrets Required

The following secrets must be configured in GitHub Settings > Secrets and variables > Actions:

### AWS Credentials
- `AWS_ACCESS_KEY_ID` - AWS access key for deployment user
- `AWS_SECRET_ACCESS_KEY` - AWS secret key for deployment user
- `AWS_REGION` - AWS region (e.g., `eu-west-3`)

### EC2 Instance
- `EC2_INSTANCE_ID` - EC2 instance ID (e.g., `i-0123456789abcdef0`)
- `EC2_PUBLIC_IP` - EC2 instance public IP address
- `EC2_SSH_KEY` - SSH private key for EC2 access (PEM format)

### DuckDNS Configuration
- `DUCKDNS_DOMAIN` - DuckDNS subdomain (without .duckdns.org)
- `DUCKDNS_TOKEN` - DuckDNS API token

## Infrastructure Provisioning

The AWS infrastructure must be provisioned before the first deployment:

```bash
# From project root
pnpm run provision:infra
```

This will create:
- VPC with public subnet
- Security group allowing HTTP/HTTPS/SSH
- EC2 instance (t3.micro) with Docker installed
- Elastic IP for static addressing

## Deployment Process

The deployment workflow (`aws-deploy.yml`) triggers on:
- Push to `main` branch (automatic staging deployment)
- Manual workflow dispatch

### Deployment Steps

1. **Build & Test** - Runs tests and builds the application
2. **Build Docker Images** - Creates frontend and API images
3. **Start EC2** - Starts instance if stopped (cost optimization)
4. **Update DuckDNS** - Updates DNS to point to EC2 IP
5. **Deploy** - Transfers images and starts services via docker-compose
6. **Health Check** - Verifies services are running

### Manual Deployment

You can trigger a deployment manually from GitHub Actions UI:
1. Go to Actions tab
2. Select "Deploy to AWS Staging" workflow
3. Click "Run workflow"
4. Select branch and confirm

## Environment Configuration

The staging environment uses `/infra/docker/.env.staging` for configuration.

## Accessing the Deployment

- **Frontend**: https://city-guided-staging.duckdns.org
- **API**: https://city-guided-staging.duckdns.org/api

## Troubleshooting

### Instance Not Starting
Check EC2 console to verify instance state and security group rules.

### SSH Connection Failed
Verify EC2_SSH_KEY secret is correctly formatted (PEM format with proper newlines).

### DuckDNS Not Updating
Check DUCKDNS_TOKEN is valid and domain is registered.

### Services Not Starting
SSH into EC2 and check logs:
```bash
ssh -i <key.pem> ec2-user@<EC2_PUBLIC_IP>
cd /home/ec2-user/app
docker compose logs
```
