#!/usr/bin/env tsx
/**
 * Update Caddy Reverse Proxy Configuration
 * 
 * Updates Caddyfile on the reverse proxy instance without recreating the instance.
 * Much faster than CloudFormation (30s vs 3-4min) and zero downtime.
 * 
 * Usage:
 *   pnpm update-caddy staging
 *   pnpm update-caddy staging --dry-run
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { SSMClient, SendCommandCommand, GetParametersByPathCommand } from '@aws-sdk/client-ssm';
import { EC2Client, DescribeInstancesCommand } from '@aws-sdk/client-ec2';
import { CloudFormationClient, DescribeStacksCommand } from '@aws-sdk/client-cloudformation';
import chalk from 'chalk';
import { getEnvironmentConfig, type EnvironmentName, AWS_CONFIG } from '../constants.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const AWS_REGION = 'eu-west-3';
const ssmClient = new SSMClient({ region: AWS_REGION });
const ec2Client = new EC2Client({ region: AWS_REGION });
const cfnClient = new CloudFormationClient({ region: AWS_REGION });

async function main() {
  const args = process.argv.slice(2);
  const env = (args[0] as EnvironmentName) || 'staging';
  const dryRun = args.includes('--dry-run');
  // Mode: 'standby' (default, with auto-wake) or 'off' (no auto-wake)
  const mode = args.includes('--mode=off') ? 'off' : 'standby';

  // Handle Ctrl+C gracefully
  process.on('SIGINT', () => {
    console.log(chalk.yellow('\n\n👋 Cancelled.\n'));
    process.exit(0);
  });

  console.log(chalk.bold.cyan('\n╔════════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.cyan('║      🔄 Update Caddy Reverse Proxy                    ║'));
  console.log(chalk.bold.cyan('╚════════════════════════════════════════════════════════╝\n'));

  console.log(chalk.cyan(`Environment: ${env}`));
  console.log(chalk.cyan(`Region:      ${AWS_REGION}`));
  console.log(chalk.cyan(`Mode:        ${mode === 'off' ? '🔴 OFF' : '🟡 STANDBY'}`));
  console.log(chalk.cyan(`Dry run:     ${dryRun ? 'Yes' : 'No'}\n`));

  // Get config from SSM
  console.log(chalk.blue('📦 Loading configuration from SSM...'));
  const ssmPath = `${AWS_CONFIG.ssmParameterPrefix}/${env}`;
  
  // Get all parameters (handle pagination)
  const ssmConfig: Record<string, string> = {};
  let nextToken: string | undefined;
  
  do {
    const ssmResponse = await ssmClient.send(
      new GetParametersByPathCommand({
        Path: ssmPath,
        Recursive: true,
        WithDecryption: true,
        NextToken: nextToken,
      })
    );

    for (const param of ssmResponse.Parameters || []) {
      const name = param.Name?.split('/').pop();
      if (name && param.Value) {
        ssmConfig[name] = param.Value;
      }
    }

    nextToken = ssmResponse.NextToken;
  } while (nextToken);

  console.log(chalk.green(`✓ Loaded ${Object.keys(ssmConfig).length} parameters from ${ssmPath}`));

  const siteDomain = ssmConfig['SITE_DOMAIN'];
  if (!siteDomain) {
    console.error(chalk.red(`❌ SITE_DOMAIN not found in SSM path: ${ssmPath}`));
    console.error(chalk.yellow('Available parameters:'));
    console.error(chalk.dim(Object.keys(ssmConfig).sort().join(', ')));
    process.exit(1);
  }

  console.log(chalk.green(`✓ Domain: ${siteDomain}\n`));

  // Get config
  const config = getEnvironmentConfig(env);
  
  // Find reverse proxy instance
  console.log(chalk.blue('🔍 Finding reverse proxy instance...'));
  const instancesResponse = await ec2Client.send(
    new DescribeInstancesCommand({
      Filters: [
        {
          Name: 'tag:aws:cloudformation:stack-name',
          Values: ['CityGuidedReverseProxyStack'],
        },
        {
          Name: 'instance-state-name',
          Values: ['running'],
        },
      ],
    })
  );

  const instance = instancesResponse.Reservations?.[0]?.Instances?.[0];
  if (!instance) {
    console.error(chalk.red('❌ No running reverse proxy instance found'));
    process.exit(1);
  }

  const instanceId = instance.InstanceId!;
  const publicIp = instance.PublicIpAddress || 'N/A';
  
  console.log(chalk.green(`✓ Found instance: ${instanceId} (${publicIp})\n`));

  // Get ALB DNS and Lambda URL from CloudFormation stack outputs
  console.log(chalk.blue('🔍 Finding ALB DNS and Lambda URL from CloudFormation...'));
  const stackResponse = await cfnClient.send(
    new DescribeStacksCommand({
      StackName: config.STACK_NAME,
    })
  );

  const stack = stackResponse.Stacks?.[0];
  const albDnsOutput = stack?.Outputs?.find(o => o.OutputKey === 'LoadBalancerDNS');
  const albDns = albDnsOutput?.OutputValue;
  const lambdaUrlOutput = stack?.Outputs?.find(o => o.OutputKey === 'ScaleUpLambdaUrl');
  const lambdaUrl = lambdaUrlOutput?.OutputValue || '';

  if (!albDns) {
    console.error(chalk.red('❌ ALB DNS not found in CloudFormation stack outputs'));
    console.error(chalk.yellow('Available outputs:'));
    console.error(chalk.dim(stack?.Outputs?.map(o => o.OutputKey).join(', ') || 'none'));
    process.exit(1);
  }

  console.log(chalk.green(`✓ ALB: ${albDns}`));
  if (lambdaUrl) {
    console.log(chalk.green(`✓ Lambda URL: ${lambdaUrl}`));
  } else {
    console.log(chalk.yellow('⚠️ Lambda URL not found (will use empty string)'));
  }
  console.log('');

  // Load and generate Caddyfile
  console.log(chalk.blue('📝 Generating Caddyfile...'));
  
  const caddyfileTemplate = readFileSync(
    join(__dirname, '../config/Caddyfile.template'),
    'utf-8'
  );
  
  // Choose the appropriate 503 HTML based on mode
  const htmlFilename = mode === 'off' ? 'error-503-off.html' : 'error-503-standby.html';
  let error503Html = readFileSync(
    join(__dirname, '../config', htmlFilename),
    'utf-8'
  );
  
  // Inject Lambda URL into the HTML (for auto-wake feature)
  error503Html = error503Html.replace(/{{LAMBDA_URL}}/g, lambdaUrl);
  
  console.log(chalk.dim(`   Using: ${htmlFilename}`));

  // We'll upload the HTML as a separate file and use file_server instead of inline HTML
  // This avoids issues with special characters (like CSS braces) being interpreted by Caddy
  const caddyfile = caddyfileTemplate
    .replace(/{{DOMAIN}}/g, siteDomain)
    .replace(/{{ALB_DNS}}/g, albDns)
    .replace(/{{ERROR_HTML}}/g, '`/var/www/caddy/error-503.html`');

  console.log(chalk.green('✓ Caddyfile generated\n'));

  if (dryRun) {
    console.log(chalk.yellow('📄 Caddyfile content (dry-run):\n'));
    console.log(chalk.dim('─'.repeat(80)));
    console.log(caddyfile);
    console.log(chalk.dim('─'.repeat(80)));
    console.log(chalk.yellow('\n✓ Dry-run complete. No changes made.\n'));
    process.exit(0);
  }

  // Upload Caddyfile via SSM
  console.log(chalk.blue('📤 Uploading configuration to instance via SSM...'));

  const uploadCommand = `
# Create directories
sudo mkdir -p /var/www/caddy
sudo mkdir -p /etc/caddy

# Upload error page HTML
cat > /tmp/error-503.html <<'ERROR_HTML_EOF'
${error503Html}
ERROR_HTML_EOF

sudo mv /tmp/error-503.html /var/www/caddy/error-503.html
sudo chown -R caddy:caddy /var/www/caddy
sudo chmod 644 /var/www/caddy/error-503.html

# Upload Caddyfile
cat > /tmp/Caddyfile.new <<'CADDYFILE_EOF'
${caddyfile}
CADDYFILE_EOF

# Backup current Caddyfile
sudo cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.backup

# Validate new Caddyfile
if sudo /usr/local/bin/caddy validate --config /tmp/Caddyfile.new; then
  echo "✓ Caddyfile validation successful"
  
  # Install new Caddyfile
  sudo mv /tmp/Caddyfile.new /etc/caddy/Caddyfile
  sudo chown caddy:caddy /etc/caddy/Caddyfile
  
  # Reload or start Caddy (reload for zero downtime if running, start if not)
  if sudo systemctl is-active --quiet caddy; then
    if sudo systemctl reload caddy; then
      echo "✓ Caddy reloaded successfully"
    else
      echo "✗ Caddy reload failed, restoring backup"
      sudo mv /etc/caddy/Caddyfile.backup /etc/caddy/Caddyfile
      sudo systemctl reload caddy
      exit 1
    fi
  else
    if sudo systemctl start caddy; then
      echo "✓ Caddy started successfully"
    else
      echo "✗ Caddy start failed, restoring backup"
      sudo mv /etc/caddy/Caddyfile.backup /etc/caddy/Caddyfile
      exit 1
    fi
  fi
else
  echo "✗ Caddyfile validation failed"
  cat /tmp/Caddyfile.new
  exit 1
fi
`.trim();

  const commandResponse = await ssmClient.send(
    new SendCommandCommand({
      InstanceIds: [instanceId],
      DocumentName: 'AWS-RunShellScript',
      Parameters: {
        commands: [uploadCommand],
      },
      Comment: `Update Caddyfile for ${env}`,
    })
  );

  const commandId = commandResponse.Command?.CommandId;
  
  console.log(chalk.green(`✓ Command sent: ${commandId}\n`));
  console.log(chalk.blue('⏳ Waiting for command execution...\n'));

  // Wait a bit for command to complete
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log(chalk.green.bold('✅ Caddy configuration updated successfully!\n'));
  console.log(chalk.white('Next steps:'));
  console.log(chalk.white(`  • Test: https://${siteDomain}/`));
  console.log(chalk.white('  • View logs: aws ssm start-session --target ' + instanceId));
  console.log(chalk.white('              sudo journalctl -u caddy -f\n'));
}

main().catch((error) => {
  if (error.name !== 'AbortError') {
    console.error(chalk.red(`\n❌ Error: ${error.message}\n`));
    if (error.stack) {
      console.error(chalk.dim(error.stack));
    }
  }
  process.exit(error.name === 'AbortError' ? 0 : 1);
});
