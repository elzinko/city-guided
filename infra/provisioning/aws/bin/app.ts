#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { CityGuidedEcsStack } from '../lib/ecs-stack.js';
import { ReverseProxyStack } from '../lib/reverse-proxy-stack.js';
import { AWS_CONFIG } from '../constants.js';

const app = new cdk.App();

// ECS Fargate-based stack
const ecsStack = new CityGuidedEcsStack(app, 'CityGuidedEcsStack', {
  env: {
    account: AWS_CONFIG.account || process.env.CDK_DEFAULT_ACCOUNT,
    region: AWS_CONFIG.region || process.env.CDK_DEFAULT_REGION,
  },
  description: 'City-Guided ECS Fargate Environment',
  tags: {
    Project: 'CityGuided',
    Environment: 'Production',
    ManagedBy: 'CDK',
    InfraMode: 'ECS',
  },
});

// Reverse Proxy Stack (optional - uncomment to enable)
// Provides fixed IP for DuckDNS and HTTPS termination
// Cost: ~$3/month (t4g.nano)
//
// To enable:
// 1. Uncomment the code below
// 2. Set environment variables:
//    - DUCKDNS_TOKEN
//    - DUCKDNS_DOMAIN (e.g., cityguided.duckdns.org)
// 3. Deploy: pnpm provision staging
// 4. Update DuckDNS with the Elastic IP from the stack output
/*
const reverseProxyStack = new ReverseProxyStack(app, 'CityGuidedReverseProxyStack', {
  env: {
    account: AWS_CONFIG.account || process.env.CDK_DEFAULT_ACCOUNT,
    region: AWS_CONFIG.region || process.env.CDK_DEFAULT_REGION,
  },
  description: 'City-Guided Reverse Proxy with fixed IP for DuckDNS',
  albDnsName: ecsStack.loadBalancerDnsName,
  duckdnsToken: process.env.DUCKDNS_TOKEN || '',
  duckdnsDomain: process.env.DUCKDNS_DOMAIN || 'cityguided.duckdns.org',
  tags: {
    Project: 'CityGuided',
    Component: 'ReverseProxy',
    ManagedBy: 'CDK',
  },
});

// Ensure reverse proxy is created after ECS stack
reverseProxyStack.addDependency(ecsStack);
*/

app.synth();
