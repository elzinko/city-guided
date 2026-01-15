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

    // Deploy CloudFormation stack
    execSilent(
      `aws cloudformation deploy ` +
      `--template-file infra/provisioning/aws/lib/staging-stack.ts ` +
      `--stack-name ${awsConfig.STACK_NAME} ` +
      `--parameter-overrides Environment=${environment} ` +
      `--capabilities CAPABILITY_NAMED_IAM ` +
      `--region eu-west-3`
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

      // Delete CloudFormation stack
      execSilent(
        `aws cloudformation delete-stack ` +
        `--stack-name ${awsConfig.STACK_NAME} ` +
        `--region eu-west-3`
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
      '# Install Docker',
      'amazon-linux-extras install docker -y',
      'systemctl start docker',
      'systemctl enable docker',
      'usermod -a -G docker ec2-user',
      '# Install Docker Compose plugins',
      'mkdir -p /usr/local/lib/docker/cli-plugins',
      'curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 -o /usr/local/lib/docker/cli-plugins/docker-compose',
      'chmod +x /usr/local/lib/docker/cli-plugins/docker-compose',
      'BUILDX_URL=$(curl -s https://api.github.com/repos/docker/buildx/releases/latest | grep browser_download_url | grep linux-amd64 | head -1 | cut -d\\" -f4)',
      'curl -SL $BUILDX_URL -o /usr/local/lib/docker/cli-plugins/docker-buildx',
      'chmod +x /usr/local/lib/docker/cli-plugins/docker-buildx',
      '# Setup for ec2-user',
      'mkdir -p /home/ec2-user/.docker/cli-plugins',
      'cp /usr/local/lib/docker/cli-plugins/docker-compose /home/ec2-user/.docker/cli-plugins/',
      'cp /usr/local/lib/docker/cli-plugins/docker-buildx /home/ec2-user/.docker/cli-plugins/',
      'chown -R ec2-user:ec2-user /home/ec2-user/.docker',
      '# Install Git',
      'yum install -y git',
      '# Create deployment directory',
      'mkdir -p /home/ec2-user/app',
      'chown ec2-user:ec2-user /home/ec2-user/app',
      '# Setup complete',
      'touch /home/ec2-user/init-complete'
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

    console.log(chalk.green(`✓ EC2 dependencies setup initiated`));
  }

  getResourceNames(environment: string) {
    const awsConfig = getEnvironmentConfig(environment as any);
    return {
      stackName: awsConfig.STACK_NAME
    };
  }
}