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
    const { environment, envVars } = config;

    console.log(chalk.blue(`\n🏗️  Deploying ECS infrastructure for ${environment}...`));

    // Prepare environment variables for CDK
    // Pass DuckDNS credentials if available (for reverse proxy stack)
    const cdkEnv: Record<string, string> = {};
    
    // Copy existing environment variables
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined) {
        cdkEnv[key] = value;
      }
    }

    // Pass DuckDNS token and domain to CDK
    if (envVars?.SECRET_DUCKDNS_TOKEN) {
      cdkEnv.SECRET_DUCKDNS_TOKEN = envVars.SECRET_DUCKDNS_TOKEN;
    }

    if (envVars?.SITE_DOMAIN) {
      cdkEnv.SITE_DOMAIN = envVars.SITE_DOMAIN;
    }

    // Deploy all CDK stacks (ECS + ReverseProxy for staging)
    // Pass environment via context to enable conditional stack creation
    execSync(
      `cd infra/provisioning/aws && npx cdk deploy --all --require-approval never --context environment=${environment}`,
      {
        encoding: 'utf8',
        stdio: 'inherit',
        cwd: projectRoot,
        env: cdkEnv
      }
    );

    // Get cluster and service info
    const clusterName = `city-guided-cluster`;
    const serviceName = `city-guided-service`;

    console.log(chalk.green(`✓ ECS infrastructure deployed`));
    console.log(chalk.gray(`   Cluster: ${clusterName}`));
    console.log(chalk.gray(`   Service: ${serviceName}`));

    // Get Elastic IP from ReverseProxyStack if it was deployed (staging only)
    let elasticIp: string | undefined;
    if (environment === 'staging') {
      try {
        const outputs = execSilent(
          `aws cloudformation describe-stacks --stack-name CityGuidedReverseProxyStack --query 'Stacks[0].Outputs' --output json`
        );
        const parsedOutputs = JSON.parse(outputs);
        elasticIp = parsedOutputs.find((o: any) => o.OutputKey === 'ElasticIP')?.OutputValue;
        
        if (elasticIp) {
          console.log(chalk.green(`✓ Reverse Proxy Elastic IP: ${elasticIp}`));
        }
      } catch {
        // ReverseProxyStack might not be deployed yet (first run) or doesn't exist
        console.log(chalk.dim('   No Reverse Proxy Elastic IP found (this is normal on first deployment)'));
      }
    }

    return {
      clusterName,
      serviceName,
      publicIp: elasticIp, // Only set for staging with reverse proxy
    };
  }

  async destroy(environment: string): Promise<void> {
    console.log(chalk.blue(`\n💥 Destroying ECS infrastructure for ${environment}...`));

    try {
      // Destroy all CDK stacks (ECS + ReverseProxy if present)
      // Pass environment via context for proper stack selection
      execSync(
        `cd infra/provisioning/aws && npx cdk destroy --all --force --context environment=${environment}`,
        {
          encoding: 'utf8',
          stdio: 'inherit',
          cwd: projectRoot
        }
      );

      console.log(chalk.green(`✓ ECS infrastructure destroyed`));

    } catch (error: any) {
      console.error(chalk.red(`   ❌ ECS destruction failed: ${error.message}`));
      throw error;
    }
  }

  async setupDependencies(_outputs: InfraOutputs): Promise<void> {
    // ECS doesn't need additional setup - CDK handles everything
    // _outputs parameter kept for interface compatibility
    void _outputs; // Mark as intentionally unused
    console.log(chalk.blue(`\n🔧 ECS setup complete (handled by CDK)`));
  }

  getResourceNames(environment: string) {
    return {
      clusterName: `city-guided-${environment}`,
      serviceName: `city-guided-${environment}-service`
    };
  }
}