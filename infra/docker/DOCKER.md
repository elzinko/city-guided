# Docker Deployment Guide

Complete guide for deploying City-Guided using Docker across all environments.

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Environment Configuration](#environment-configuration)
- [NPM Scripts](#npm-scripts)
- [Manual Commands](#manual-commands)
- [Troubleshooting](#troubleshooting)

## 🚀 Quick Start

### First Time Setup

```bash
# 1. Setup Docker infrastructure (networks, volumes)
npm run docker:setup

# 2. Start local development environment
npm run docker:local:start

# 3. Access services
# - Frontend: http://localhost:3080
# - API: http://localhost:3001
# - OSRM: http://localhost:5000
```

### Daily Development

```bash
# Start services
npm run docker:local:start

# View logs
npm run docker:local:logs

# Stop services
npm run docker:local:stop
```

## 🏗 Architecture

The infrastructure is split into three independent components:

### 1. Application (`docker-compose.yml`)
- **Frontend**: Next.js web application
- **API**: Backend service
- **Nginx**: Reverse proxy (staging/prod only)

### 2. OSRM Service (`docker-compose.osrm.yml`)
- Routing engine with independent lifecycle
- Can run without application restart
- Reads data from persistent volume

### 3. OSRM Data Loader (`docker-compose.osrm-data.yml`)
- Downloads geographic data from Geofabrik
- Processes data for OSRM (extract/partition/customize)
- Runs once, data persists in volume

## ⚙️ Environment Configuration

Configuration is managed through `.env` files:

```
.env.example    → Template (committed to git)
.env.local      → Local development (gitignored)
.env.staging    → AWS staging environment (gitignored)
.env.prod       → Production environment (gitignored)
```

### Key Variables

| Variable | Local | Staging | Production |
|----------|-------|---------|------------|
| `SERVER_NAME` | localhost | city-guided-staging.duckdns.org | cityguided.com |
| `OSRM_REGION` | europe/monaco | europe/france/ile-de-france | europe/france |
| `NODE_ENV` | development | production | production |
| `RESTART_POLICY` | no | unless-stopped | unless-stopped |

### Creating Environment Files

```bash
# Local
cp .env.example .env.local
# Edit if needed (defaults are good for local dev)

# Staging (on EC2 instance)
cp .env.example .env.staging
# Configure SERVER_NAME, OSRM_REGION, etc.
```

## 📦 NPM Scripts

All scripts are available from the project root:

### Setup & Maintenance

```bash
npm run docker:setup    # First-time setup (networks, volumes)
npm run docker:clean    # Remove all Docker resources (WARNING: destructive)
```

### Local Development

```bash
npm run docker:local:start    # Start all services
npm run docker:local:stop     # Stop all services
npm run docker:local:logs     # View logs (all services)
```

### Staging (AWS EC2)

```bash
npm run docker:staging:start  # Start staging with nginx
npm run docker:staging:stop   # Stop staging
npm run docker:staging:logs   # View staging logs
```

## 🔧 Manual Commands

### Working Directory

All manual commands should be run from `infra/docker/`:

```bash
cd infra/docker
```

### Local Environment

```bash
# Load OSRM data (first time or region change)
docker-compose --env-file .env.local -f docker-compose.osrm-data.yml up

# Start OSRM service
docker-compose --env-file .env.local -f docker-compose.osrm.yml up -d

# Start application
docker-compose --env-file .env.local up -d

# View logs
docker-compose --env-file .env.local logs -f [service]

# Stop everything
docker-compose --env-file .env.local down
docker-compose --env-file .env.local -f docker-compose.osrm.yml down
```

### Staging Environment

```bash
# Load OSRM data (first time)
docker-compose --env-file .env.staging -f docker-compose.osrm-data.yml up

# Start OSRM service
docker-compose --env-file .env.staging -f docker-compose.osrm.yml up -d

# Start application with nginx
docker-compose --env-file .env.staging --profile nginx up -d

# View logs
docker-compose --env-file .env.staging --profile nginx logs -f

# Stop everything
docker-compose --env-file .env.staging --profile nginx down
docker-compose --env-file .env.staging -f docker-compose.osrm.yml down
```

### OSRM Region Management

```bash
# Use different region temporarily (override)
OSRM_REGION=europe/andorra docker-compose --env-file .env.local -f docker-compose.osrm-data.yml up

# Check current OSRM data
docker run --rm -v osrm-data:/data alpine ls -lh /data

# Migrate to new region (zero-downtime)
# 1. Create new volume
docker volume create osrm-data-new

# 2. Load new data (modify docker-compose.osrm-data.yml to use osrm-data-new)
OSRM_REGION=europe/france docker-compose -f docker-compose.osrm-data.yml up

# 3. Stop OSRM
docker-compose --env-file .env.local -f docker-compose.osrm.yml down

# 4. Update docker-compose.osrm.yml to use osrm-data-new

# 5. Restart OSRM
docker-compose --env-file .env.local -f docker-compose.osrm.yml up -d
```

## 🗺️ OSRM Regions

Available regions from [Geofabrik](https://download.geofabrik.de/):

### Recommended for Development

| Region | Size | Processing Time | Use Case |
|--------|------|----------------|----------|
| Monaco | ~5 MB | 1-2 min | Local dev, CI/CD |
| Andorra | ~10 MB | 2-3 min | Alternative for tests |

### Production Regions

| Region | Size | Processing Time | Use Case |
|--------|------|----------------|----------|
| Île-de-France | ~500 MB | 10-15 min | Staging (Paris area) |
| France | ~3.5 GB | 45-60 min | Production |
| Europe | ~25 GB | 3-4 hours | Full coverage |

## 🔍 Troubleshooting

### OSRM not starting

```bash
# Check if data is loaded
docker run --rm -v osrm-data:/data alpine ls -lh /data

# If empty, load data:
cd infra/docker
docker-compose --env-file .env.local -f docker-compose.osrm-data.yml up

# Check OSRM logs
docker-compose --env-file .env.local -f docker-compose.osrm.yml logs
```

### Network errors

```bash
# Recreate network
docker network rm osrm-network
docker network create osrm-network
```

### Port already in use

```bash
# Check what's using the port
lsof -i :3000

# Stop conflicting service or change port in .env.local
```

### Clean slate

```bash
# Remove everything and start fresh
npm run docker:clean
npm run docker:setup
npm run docker:local:start
```

### View resource usage

```bash
# Disk usage
docker system df

# Running containers
docker ps

# Volume contents
docker run --rm -v osrm-data:/data alpine du -sh /data/*
```

## 🔐 Security Notes

### Local Development
- Services accessible on localhost only
- No SSL/TLS
- Debug logging enabled

### Staging/Production
- Nginx reverse proxy with SSL/TLS
- Security headers enabled
- Rate limiting active (production)
- OSRM not publicly exposed (production)
- Proper CORS configuration required

## 📝 Additional Resources

- [Main README](../../README.md) - Project overview
- [OSRM Documentation](https://github.com/Project-OSRM/osrm-backend/wiki)
- [Geofabrik Downloads](https://download.geofabrik.de/) - Map data source
- [Docker Compose Reference](https://docs.docker.com/compose/)

## 🆘 Getting Help

If you encounter issues:

1. Check logs: `npm run docker:local:logs`
2. Review this troubleshooting section
3. Clean and restart: `npm run docker:clean && npm run docker:setup`
4. Create an issue with logs and environment details
