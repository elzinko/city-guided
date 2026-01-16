/**
 * EC2 Infrastructure Deployer
 * Handles EC2-specific deployment, setup and destruction
 */

import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import chalk from 'chalk';
import { Deployer, InfraOutputs, DeploymentConfig } from './deployer.js';
import { getEnvironmentConfig } from '../constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');
const projectRoot = join(__dirname, '..', '..', '..', '..');

function execSilent(command: string): string {
  try {
    return execSync(command, {
      encoding: 'utf8',
      stdio: 'pipe',
      cwd: projectRoot
    }).trim();
  } catch (error: any) {
    throw new Error(`Command failed: ${command}\n${error.message}`);
  }
}

export class EC2Deployer implements Deployer {
  async deploy(config: DeploymentConfig): Promise<InfraOutputs> {
    const { environment } = config;
    const awsConfig = getEnvironmentConfig(environment as any);

    console.log(chalk.blue(`\n🏗️  Deploying EC2 infrastructure for ${environment}...`));

    // Deploy CloudFormation stack using CDK
    execSilent(
      `cd infra/provisioning/aws && npx cdk deploy ${awsConfig.STACK_NAME} --require-approval never`
    );

    // Get outputs
    const outputs = execSilent(
      `aws cloudformation describe-stacks ` +
      `--stack-name ${awsConfig.STACK_NAME} ` +
      `--region eu-west-3 ` +
      `--query 'Stacks[0].Outputs'`
    );

    const parsedOutputs = JSON.parse(outputs);
    const instanceId = parsedOutputs.find((o: any) => o.OutputKey === 'InstanceId')?.OutputValue;
    const publicIp = parsedOutputs.find((o: any) => o.OutputKey === 'PublicIP')?.OutputValue;

    console.log(chalk.green(`✓ EC2 infrastructure deployed`));
    console.log(chalk.gray(`   Instance: ${instanceId}`));
    console.log(chalk.gray(`   IP: ${publicIp}`));

    return { instanceId, publicIp };
  }

  async destroy(environment: string): Promise<void> {
    console.log(chalk.blue(`\n💥 Destroying EC2 infrastructure for ${environment}...`));

    try {
      const awsConfig = getEnvironmentConfig(environment as any);

      // Delete CloudFormation stack using CDK
      execSilent(
        `cd infra/provisioning/aws && npx cdk destroy ${awsConfig.STACK_NAME} --force`
      );

      console.log(chalk.green(`✓ EC2 stack deletion initiated: ${awsConfig.STACK_NAME}`));

    } catch (error: any) {
      console.error(chalk.red(`   ❌ EC2 destruction failed: ${error.message}`));
      throw error;
    }
  }

  async setupDependencies(outputs: InfraOutputs): Promise<void> {
    if (!outputs.instanceId) {
      throw new Error('Instance ID required for EC2 dependency setup');
    }

    console.log(chalk.blue(`\n🔧 Setting up EC2 dependencies...`));

    const commands = [
      'set -e',
      '# Update system',
      'yum update -y',
      '# Install Docker (idempotent)',
      'amazon-linux-extras install docker -y || true',
      'systemctl start docker || true',
      'systemctl enable docker || true',
      '# Add ec2-user to docker group (idempotent - -a flag adds only if not already present)',
      'usermod -a -G docker ec2-user || true',
      '# Ensure docker socket has correct permissions',
      'chmod 666 /var/run/docker.sock 2>/dev/null || true',
      '# Install Docker Compose plugins (idempotent)',
      'mkdir -p /usr/local/lib/docker/cli-plugins',
      'if [ ! -f /usr/local/lib/docker/cli-plugins/docker-compose ]; then',
      '  curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 -o /usr/local/lib/docker/cli-plugins/docker-compose',
      '  chmod +x /usr/local/lib/docker/cli-plugins/docker-compose',
      'fi',
      'if [ ! -f /usr/local/lib/docker/cli-plugins/docker-buildx ]; then',
      '  BUILDX_URL=$(curl -s https://api.github.com/repos/docker/buildx/releases/latest | grep browser_download_url | grep linux-amd64 | head -1 | cut -d\\" -f4)',
      '  curl -SL $BUILDX_URL -o /usr/local/lib/docker/cli-plugins/docker-buildx',
      '  chmod +x /usr/local/lib/docker/cli-plugins/docker-buildx',
      'fi',
      '# Setup for ec2-user (idempotent)',
      'mkdir -p /home/ec2-user/.docker/cli-plugins',
      'cp -u /usr/local/lib/docker/cli-plugins/docker-compose /home/ec2-user/.docker/cli-plugins/ 2>/dev/null || true',
      'cp -u /usr/local/lib/docker/cli-plugins/docker-buildx /home/ec2-user/.docker/cli-plugins/ 2>/dev/null || true',
      'chown -R ec2-user:ec2-user /home/ec2-user/.docker',
      '# Install Git (idempotent)',
      'yum install -y git || true',
      '# Create deployment directory (idempotent)',
      'mkdir -p /home/ec2-user/app',
      'chown ec2-user:ec2-user /home/ec2-user/app',
      '# Create helper script to activate docker group in current session',
      'cat > /home/ec2-user/.docker-activate.sh <<\'EOFSCRIPT\'',
      '#!/bin/bash',
      '# Helper script to activate docker group in current session',
      'if ! groups | grep -q docker; then',
      '  echo "Activating docker group... (you may need to reconnect)"',
      '  exec sg docker -c "$SHELL"',
      'fi',
      'EOFSCRIPT',
      'chmod +x /home/ec2-user/.docker-activate.sh',
      'chown ec2-user:ec2-user /home/ec2-user/.docker-activate.sh',
      '# Setup complete',
      'touch /home/ec2-user/init-complete',
      '# Clone repository if not already present',
      'if [ ! -d /home/ec2-user/city-guided/.git ]; then',
      '  echo "📥 Cloning repository..."',
      '  cd /home/ec2-user',
      '  git clone https://github.com/elzinko/city-guided.git || true',
      'fi',
      '# Initial deployment with latest images',
      'if [ -d /home/ec2-user/city-guided ]; then',
      '  echo "🚀 Starting initial deployment..."',
      '  cd /home/ec2-user/city-guided/infra/docker',
      '  chmod +x scripts/deploy.sh || true',
      '  IMAGE_TAG=latest ./scripts/deploy.sh staging || echo "⚠️  Initial deployment failed - will be done by GitHub Actions"',
      'fi'
    ];

    const commandJson = JSON.stringify(commands);

    execSilent(
      `aws ssm send-command ` +
      `--instance-ids "${outputs.instanceId}" ` +
      `--document-name "AWS-RunShellScript" ` +
      `--parameters '{"commands":${commandJson}}' ` +
      `--region eu-west-3 ` +
      `--query 'Command.CommandId' ` +
      `--output text`
    );

    console.log(chalk.green(`✓ EC2 dependencies setup and initial deployment initiated`));
    console.log(chalk.gray(`   Note: Services will start with 'latest' images. GitHub Actions will deploy specific tags.`));
  }

  getResourceNames(environment: string) {
    const awsConfig = getEnvironmentConfig(environment as any);
    return {
      stackName: awsConfig.STACK_NAME
    };
  }
}