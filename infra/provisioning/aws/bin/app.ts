#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { CityGuidedStagingStack } from '../lib/staging-stack.js';
import { CityGuidedEcsStack } from '../lib/ecs-stack.js';
import { AWS_CONFIG } from '../constants.js';

const app = new cdk.App();

// EC2 Spot-based stack (original)
new CityGuidedStagingStack(app, AWS_CONFIG.stackName, {
  env: {
    account: AWS_CONFIG.account || process.env.CDK_DEFAULT_ACCOUNT,
    region: AWS_CONFIG.region || process.env.CDK_DEFAULT_REGION,
  },
  description: 'City-Guided Staging Environment on AWS EC2 Spot',
  tags: {
    Project: 'CityGuided',
    Environment: 'Staging',
    ManagedBy: 'CDK',
  },
});

// ECS Fargate-based stack (new)
new CityGuidedEcsStack(app, 'CityGuidedEcsStack', {
  env: {
    account: AWS_CONFIG.account || process.env.CDK_DEFAULT_ACCOUNT,
    region: AWS_CONFIG.region || process.env.CDK_DEFAULT_REGION,
  },
  description: 'City-Guided ECS Fargate Environment',
  tags: {
    Project: 'CityGuided',
    Environment: 'Staging',
    ManagedBy: 'CDK',
    InfraMode: 'ECS',
  },
});

app.synth();
