import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface ReverseProxyStackProps extends cdk.StackProps {
  albDnsName: string;
  duckdnsToken: string;
  duckdnsDomain: string;
}

/**
 * Reverse Proxy Stack
 * 
 * Creates a minimal reverse proxy instance with Elastic IP that acts as a
 * reverse proxy to the ECS Application Load Balancer.
 * 
 * Purpose:
 * - Provides a fixed public IP for DuckDNS
 * - Handles HTTPS/TLS with Let's Encrypt via Caddy
 * - Forwards all traffic to the ECS ALB
 * - Cost: ~$3/month (instance + minimal data transfer)
 */
export class ReverseProxyStack extends cdk.Stack {
  public readonly instance: ec2.Instance;
  public readonly elasticIp: ec2.CfnEIP;
  public readonly securityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: ReverseProxyStackProps) {
    super(scope, id, props);

    // ============================================
    // VPC - Use default VPC to save costs
    // ============================================
    const vpc = ec2.Vpc.fromLookup(this, 'DefaultVPC', {
      isDefault: true,
    });

    // ============================================
    // Security Group
    // ============================================
    this.securityGroup = new ec2.SecurityGroup(this, 'ReverseProxySecurityGroup', {
      vpc,
      description: 'Security group for City-Guided reverse proxy',
      allowAllOutbound: true,
    });

    // HTTP access (for Let's Encrypt challenges)
    this.securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'Allow HTTP access'
    );

    // HTTPS access
    this.securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'Allow HTTPS access'
    );

    // SSH access (for maintenance)
    this.securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(22),
      'Allow SSH access'
    );

    // ============================================
    // IAM Role for reverse proxy
    // ============================================
    const role = new iam.Role(this, 'ReverseProxyRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      description: 'IAM role for City-Guided reverse proxy instance',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy'),
      ],
    });

    // ============================================
    // User Data Script
    // ============================================
    
    // Load templates
    const caddyfileTemplate = readFileSync(
      join(__dirname, '../config/Caddyfile.template'),
      'utf-8'
    );
    // Use standby page by default (update-caddy.ts will change it later if needed)
    const error503Html = readFileSync(
      join(__dirname, '../config/error-503-standby.html'),
      'utf-8'
    );
    
    // Escape HTML for Caddy respond directive (use heredoc format)
    const htmlForCaddy = `<<HTML\n${error503Html}\nHTML`;
    
    // Replace template variables
    const caddyfile = caddyfileTemplate
      .replace(/{{DOMAIN}}/g, props.duckdnsDomain)
      .replace(/{{ALB_DNS}}/g, props.albDnsName)
      .replace(/{{ERROR_HTML}}/g, htmlForCaddy);
    
    const userData = ec2.UserData.forLinux();
    userData.addCommands(
      '#!/bin/bash',
      'set -e',
      '',
      '# Update system',
      'dnf update -y',
      '',
      '# Install Caddy from official binary (more reliable than Copr)',
      'echo "Installing Caddy..."',
      'CADDY_VERSION="2.7.6"',
      'curl -sL "https://github.com/caddyserver/caddy/releases/download/v${CADDY_VERSION}/caddy_${CADDY_VERSION}_linux_arm64.tar.gz" -o /tmp/caddy.tar.gz',
      'tar -xzf /tmp/caddy.tar.gz -C /tmp',
      'mv /tmp/caddy /usr/local/bin/',
      'chmod +x /usr/local/bin/caddy',
      'rm /tmp/caddy.tar.gz',
      '',
      '# Create caddy user and directories',
      'useradd -r -s /bin/false -d /var/lib/caddy caddy || true',
      'mkdir -p /etc/caddy /var/log/caddy /var/lib/caddy',
      'chown -R caddy:caddy /etc/caddy /var/log/caddy /var/lib/caddy',
      '',
      '# Set capabilities for binding to privileged ports',
      'setcap cap_net_bind_service=+ep /usr/local/bin/caddy',
      '',
      '# Create Caddyfile',
      'cat > /etc/caddy/Caddyfile <<\'CADDYFILE_EOF\'',
      caddyfile,
      'CADDYFILE_EOF',
      '',
      '# Create systemd service',
      'cat > /etc/systemd/system/caddy.service <<\'SERVICE_EOF\'',
      '[Unit]',
      'Description=Caddy',
      'Documentation=https://caddyserver.com/docs/',
      'After=network.target network-online.target',
      'Requires=network-online.target',
      '',
      '[Service]',
      'Type=notify',
      'User=caddy',
      'Group=caddy',
      'ExecStart=/usr/local/bin/caddy run --environ --config /etc/caddy/Caddyfile',
      'ExecReload=/usr/local/bin/caddy reload --config /etc/caddy/Caddyfile',
      'TimeoutStopSec=5s',
      'LimitNOFILE=1048576',
      'LimitNPROC=512',
      'PrivateTmp=true',
      'ProtectSystem=full',
      'AmbientCapabilities=CAP_NET_BIND_SERVICE',
      '',
      '[Install]',
      'WantedBy=multi-user.target',
      'SERVICE_EOF',
      '',
      '# Enable and start Caddy',
      'systemctl daemon-reload',
      'systemctl enable caddy',
      'systemctl start caddy',
      '',
      '# Update DuckDNS with current IP',
      '# Get the Elastic IP from instance metadata',
      'TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600" 2>/dev/null || true)',
      'if [ -n "$TOKEN" ]; then',
      '  PUBLIC_IP=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || true)',
      'else',
      '  PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || true)',
      'fi',
      '',
      `DUCKDNS_DOMAIN="${props.duckdnsDomain}"`,
      `DUCKDNS_TOKEN="${props.duckdnsToken}"`,
      'DUCKDNS_SUBDOMAIN="${DUCKDNS_DOMAIN%.duckdns.org}"',
      '',
      'if [ -n "$PUBLIC_IP" ] && [ -n "$DUCKDNS_TOKEN" ]; then',
      '  echo "Updating DuckDNS: $DUCKDNS_SUBDOMAIN -> $PUBLIC_IP"',
      '  RESPONSE=$(curl -s "https://www.duckdns.org/update?domains=$DUCKDNS_SUBDOMAIN&token=$DUCKDNS_TOKEN&ip=$PUBLIC_IP")',
      '  if [ "$RESPONSE" = "OK" ]; then',
      '    echo "DuckDNS updated successfully"',
      '  else',
      '    echo "DuckDNS update failed: $RESPONSE"',
      '  fi',
      'fi',
      '',
      '# Signal successful initialization',
      'touch /var/tmp/init-complete'
    );

    // ============================================
    // Reverse proxy instance (ARM64, minimal cost)
    // ============================================
    this.instance = new ec2.Instance(this, 'ReverseProxyInstance', {
      vpc,
      instanceType: new ec2.InstanceType('t4g.nano'),
      machineImage: ec2.MachineImage.latestAmazonLinux2023({
        cpuType: ec2.AmazonLinuxCpuType.ARM_64,
      }),
      securityGroup: this.securityGroup,
      role,
      userData,
      blockDevices: [
        {
          deviceName: '/dev/xvda',
          volume: ec2.BlockDeviceVolume.ebs(8, {
            volumeType: ec2.EbsDeviceVolumeType.GP3,
            deleteOnTermination: true,
          }),
        },
      ],
      // Always on (no spot - we need stability for DNS)
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
    });

    // ============================================
    // Elastic IP
    // ============================================
    this.elasticIp = new ec2.CfnEIP(this, 'ReverseProxyElasticIP', {
      domain: 'vpc',
      instanceId: this.instance.instanceId,
      tags: [
        {
          key: 'Name',
          value: 'city-guided-proxy',
        },
        {
          key: 'Project',
          value: 'CityGuided',
        },
      ],
    });

    // ============================================
    // Outputs
    // ============================================
    new cdk.CfnOutput(this, 'InstanceId', {
      value: this.instance.instanceId,
      description: 'Reverse Proxy Instance ID',
      exportName: 'CityGuidedReverseProxyInstanceId',
    });

    new cdk.CfnOutput(this, 'ElasticIP', {
      value: this.elasticIp.ref,
      description: 'Reverse Proxy Elastic IP (use this for DuckDNS)',
      exportName: 'CityGuidedReverseProxyElasticIP',
    });

    new cdk.CfnOutput(this, 'DuckDNSDomain', {
      value: props.duckdnsDomain,
      description: 'DuckDNS Domain',
    });

    new cdk.CfnOutput(this, 'ProxyUrl', {
      value: `https://${props.duckdnsDomain}`,
      description: 'Public URL via reverse proxy',
    });

    // Add tags
    cdk.Tags.of(this).add('Project', 'CityGuided');
    cdk.Tags.of(this).add('Component', 'ReverseProxy');
    cdk.Tags.of(this).add('ManagedBy', 'CDK');
  }
}
