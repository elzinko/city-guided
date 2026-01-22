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

      console.log(chalk.green(`✓ CDK stacks destroyed`));

      // Clean up orphaned resources that might remain after stack deletion
      // This can happen if stacks were in UPDATE_ROLLBACK_COMPLETE state
      await this.cleanupOrphanedResources();

      console.log(chalk.green(`✓ ECS infrastructure destroyed`));

    } catch (error: any) {
      console.error(chalk.red(`   ❌ ECS destruction failed: ${error.message}`));
      throw error;
    }
  }

  /**
   * Clean up orphaned resources that might remain after CloudFormation stack deletion.
   * This handles edge cases where stacks were in rollback state or partially deleted.
   */
  private async cleanupOrphanedResources(): Promise<void> {
    console.log(chalk.blue(`\n🧹 Checking for orphaned resources...`));

    // Check for orphaned ALB
    try {
      const albResult = execSilent(
        `aws elbv2 describe-load-balancers --names city-guided-alb --region eu-west-3 --output json 2>/dev/null || echo '{"LoadBalancers":[]}'`
      );
      const albs = JSON.parse(albResult);
      
      if (albs.LoadBalancers && albs.LoadBalancers.length > 0) {
        const albArn = albs.LoadBalancers[0].LoadBalancerArn;
        console.log(chalk.yellow(`   ⚠️  Found orphaned ALB: city-guided-alb`));
        
        // Delete ALB
        execSilent(`aws elbv2 delete-load-balancer --load-balancer-arn "${albArn}" --region eu-west-3`);
        console.log(chalk.green(`   ✓ Deleted orphaned ALB`));
        
        // Wait for ALB deletion to propagate
        console.log(chalk.dim(`   Waiting for ALB deletion to complete...`));
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    } catch {
      // ALB doesn't exist or already deleted - this is fine
    }

    // Check for orphaned Target Groups
    try {
      const tgResult = execSilent(
        `aws elbv2 describe-target-groups --region eu-west-3 --output json`
      );
      const targetGroups = JSON.parse(tgResult);
      
      for (const tg of targetGroups.TargetGroups || []) {
        if (tg.TargetGroupName.startsWith('CityGu-')) {
          console.log(chalk.yellow(`   ⚠️  Found orphaned Target Group: ${tg.TargetGroupName}`));
          execSilent(`aws elbv2 delete-target-group --target-group-arn "${tg.TargetGroupArn}" --region eu-west-3`);
          console.log(chalk.green(`   ✓ Deleted orphaned Target Group`));
        }
      }
    } catch {
      // No target groups or error - continue
    }

    // Check for orphaned Security Groups (except default)
    try {
      const sgResult = execSilent(
        `aws ec2 describe-security-groups --filters "Name=group-name,Values=CityGuided*" --region eu-west-3 --output json`
      );
      const securityGroups = JSON.parse(sgResult);
      
      for (const sg of securityGroups.SecurityGroups || []) {
        console.log(chalk.yellow(`   ⚠️  Found orphaned Security Group: ${sg.GroupName}`));
        try {
          execSilent(`aws ec2 delete-security-group --group-id "${sg.GroupId}" --region eu-west-3`);
          console.log(chalk.green(`   ✓ Deleted orphaned Security Group`));
        } catch {
          console.log(chalk.dim(`   (Security Group in use, will be cleaned up later)`));
        }
      }
    } catch {
      // No security groups or error - continue
    }

    // Check for orphaned Elastic IPs without tags (likely ALB-related)
    try {
      const eipResult = execSilent(
        `aws ec2 describe-addresses --region eu-west-3 --output json`
      );
      const addresses = JSON.parse(eipResult);
      
      for (const eip of addresses.Addresses || []) {
        // Only clean up untagged EIPs that are associated with ALB (ServiceManaged: alb)
        if (eip.ServiceManaged === 'alb' && (!eip.Tags || eip.Tags.length === 0)) {
          console.log(chalk.yellow(`   ⚠️  Found orphaned EIP: ${eip.PublicIp}`));
          try {
            if (eip.AssociationId) {
              execSilent(`aws ec2 disassociate-address --association-id "${eip.AssociationId}" --region eu-west-3`);
            }
            execSilent(`aws ec2 release-address --allocation-id "${eip.AllocationId}" --region eu-west-3`);
            console.log(chalk.green(`   ✓ Released orphaned EIP`));
          } catch {
            console.log(chalk.dim(`   (EIP managed by service, will be released when service is deleted)`));
          }
        }
      }
    } catch {
      // No EIPs or error - continue
    }

    // Clean up Log Groups (have RETAIN policy or created outside stack)
    const logGroups = ['/ecs/city-guided-api', '/ecs/city-guided-web'];
    for (const logGroup of logGroups) {
      try {
        execSilent(`aws logs delete-log-group --log-group-name "${logGroup}" --region eu-west-3 2>/dev/null || true`);
        console.log(chalk.green(`   ✓ Deleted Log Group: ${logGroup}`));
      } catch {
        // Log group doesn't exist - fine
      }
    }

    // Clean up ECR Repositories (have RETAIN policy to preserve images during updates)
    // On destroy, we explicitly delete them
    const ecrRepos = ['city-guided-api', 'city-guided-web'];
    for (const repo of ecrRepos) {
      try {
        // First delete all images (required before repo deletion)
        execSilent(`aws ecr batch-delete-image --repository-name "${repo}" --image-ids "$(aws ecr list-images --repository-name "${repo}" --region eu-west-3 --query 'imageIds[*]' --output json 2>/dev/null || echo '[]')" --region eu-west-3 2>/dev/null || true`);
        // Then delete the repository
        execSilent(`aws ecr delete-repository --repository-name "${repo}" --region eu-west-3 --force 2>/dev/null || true`);
        console.log(chalk.green(`   ✓ Deleted ECR Repository: ${repo}`));
      } catch {
        // Repository doesn't exist - fine
      }
    }

    // Clean up CloudWatch Dashboards
    const dashboards = ['CityGuided-ECS-ScaleToZero'];
    for (const dashboard of dashboards) {
      try {
        execSilent(`aws cloudwatch delete-dashboards --dashboard-names "${dashboard}" --region eu-west-3 2>/dev/null || true`);
        console.log(chalk.green(`   ✓ Deleted CloudWatch Dashboard: ${dashboard}`));
      } catch {
        // Dashboard doesn't exist - fine
      }
    }

    // Clean up EventBridge Rules (for Lambda triggers)
    const eventRules = ['CityGuidedEcsStack-ScaleToZeroRule', 'CityGuidedEcsStack-ScaleUpRule'];
    for (const rule of eventRules) {
      try {
        // First remove targets, then delete rule
        execSilent(`aws events remove-targets --rule "${rule}" --ids "Target0" --region eu-west-3 2>/dev/null || true`);
        execSilent(`aws events delete-rule --name "${rule}" --region eu-west-3 2>/dev/null || true`);
        console.log(chalk.green(`   ✓ Deleted EventBridge Rule: ${rule}`));
      } catch {
        // Rule doesn't exist - fine
      }
    }

    // Clean up Lambda Functions
    const lambdas = [
      'CityGuidedEcsStack-ScaleUpLambda',
      'CityGuidedEcsStack-ScaleToZeroLambda', 
      'CityGuidedEcsStack-Error503Lambda'
    ];
    for (const lambda of lambdas) {
      try {
        execSilent(`aws lambda delete-function --function-name "${lambda}" --region eu-west-3 2>/dev/null || true`);
        console.log(chalk.green(`   ✓ Deleted Lambda Function: ${lambda}`));
      } catch {
        // Lambda doesn't exist - fine
      }
    }

    console.log(chalk.green(`✓ Orphan cleanup complete`));
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