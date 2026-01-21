#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { CityGuidedEcsStack } from '../lib/ecs-stack.js';
import { ReverseProxyStack } from '../lib/reverse-proxy-stack.js';
import { AWS_CONFIG } from '../constants.js';

const app = new cdk.App();

// Get environment from context (set by provision script)
const targetEnv = app.node.tryGetContext('environment') || 'staging';

// ECS Fargate-based stack
const ecsStack = new CityGuidedEcsStack(app, 'CityGuidedEcsStack', {
  env: {
    account: AWS_CONFIG.account || process.env.CDK_DEFAULT_ACCOUNT,
    region: AWS_CONFIG.region || process.env.CDK_DEFAULT_REGION,
  },
  description: 'City-Guided ECS Fargate Environment',
  tags: {
    Project: 'CityGuided',
    Environment: targetEnv === 'staging' ? 'Staging' : 'Production',
    ManagedBy: 'CDK',
    InfraMode: 'ECS',
  },
});

// Reverse Proxy Stack (enabled for staging only)
// Provides fixed IP for DuckDNS and HTTPS termination
// Cost: ~$3/month (t4g.nano)
//
// Prerequisites:
// 1. Set environment variables in SSM or .env.staging:
//    - SECRET_DUCKDNS_TOKEN: Your DuckDNS token
//    - SITE_DOMAIN: Your DuckDNS domain (e.g., cityguided.duckdns.org)
// 2. Deploy: pnpm infra:provision staging
// 3. Update DuckDNS with the Elastic IP from the stack output
if (targetEnv === 'staging') {
  const duckdnsToken = process.env.SECRET_DUCKDNS_TOKEN || '';
  const duckdnsDomain = process.env.SITE_DOMAIN || 'cityguided.duckdns.org';

  if (!duckdnsToken) {
    console.warn('⚠️  WARNING: SECRET_DUCKDNS_TOKEN not set. Reverse proxy will be created but DuckDNS integration may fail.');
  }

  const reverseProxyStack = new ReverseProxyStack(app, 'CityGuidedReverseProxyStack', {
    env: {
      account: AWS_CONFIG.account || process.env.CDK_DEFAULT_ACCOUNT,
      region: AWS_CONFIG.region || process.env.CDK_DEFAULT_REGION,
    },
    description: 'City-Guided Reverse Proxy with fixed IP for DuckDNS (Staging)',
    albDnsName: ecsStack.loadBalancerDnsName,
    duckdnsToken,
    duckdnsDomain,
    tags: {
      Project: 'CityGuided',
      Component: 'ReverseProxy',
      Environment: 'Staging',
      ManagedBy: 'CDK',
    },
  });

  // Ensure reverse proxy is created after ECS stack
  reverseProxyStack.addDependency(ecsStack);

  console.log(`✅ Reverse Proxy Stack enabled for staging environment`);
  console.log(`   Domain: ${duckdnsDomain}`);
}

app.synth();
