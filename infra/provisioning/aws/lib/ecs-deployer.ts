/**
 * ECS Infrastructure Deployer
 * Handles ECS Fargate-specific deployment, setup and destruction
 */

import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import chalk from 'chalk';
import { Deployer, InfraOutputs, DeploymentConfig } from './deployer.js';

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

export class ECSDeployer implements Deployer {
  async deploy(config: DeploymentConfig): Promise<InfraOutputs> {
    const { environment } = config;

    console.log(chalk.blue(`\n🏗️  Deploying ECS infrastructure for ${environment}...`));

    // Deploy CDK stack
    execSilent(
      `cd infra/provisioning/aws && npx cdk deploy CityGuidedEcsStack --require-approval never`
    );

    // Get cluster and service info
    const clusterName = `city-guided-${environment}`;
    const serviceName = `city-guided-${environment}-service`;

    console.log(chalk.green(`✓ ECS infrastructure deployed`));
    console.log(chalk.gray(`   Cluster: ${clusterName}`));
    console.log(chalk.gray(`   Service: ${serviceName}`));

    return {
      clusterName,
      serviceName
    };
  }

  async destroy(environment: string): Promise<void> {
    console.log(chalk.blue(`\n💥 Destroying ECS infrastructure for ${environment}...`));

    try {
      // Destroy CDK stack
      execSilent(
        `cd infra/provisioning/aws && npx cdk destroy CityGuidedEcsStack --force`
      );

      console.log(chalk.green(`✓ ECS infrastructure destroyed`));

    } catch (error: any) {
      console.error(chalk.red(`   ❌ ECS destruction failed: ${error.message}`));
      throw error;
    }
  }

  async setupDependencies(outputs: InfraOutputs): Promise<void> {
    // ECS doesn't need additional setup - CDK handles everything
    console.log(chalk.blue(`\n🔧 ECS setup complete (handled by CDK)`));
  }

  getResourceNames(environment: string) {
    return {
      clusterName: `city-guided-${environment}`,
      serviceName: `city-guided-${environment}-service`
    };
  }
}