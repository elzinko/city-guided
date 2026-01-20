import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface ReverseProxyStackProps extends cdk.StackProps {
  albDnsName: string;
  duckdnsToken: string;
  duckdnsDomain: string;
}

/**
 * Reverse Proxy Stack
 * 
 * Creates a minimal EC2 t4g.nano instance with Elastic IP that acts as a
 * reverse proxy to the ECS Application Load Balancer.
 * 
 * Purpose:
 * - Provides a fixed public IP for DuckDNS
 * - Handles HTTPS/TLS with Let's Encrypt via Caddy
 * - Forwards all traffic to the ECS ALB
 * - Cost: ~$3/month (t4g.nano + minimal data transfer)
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
    // IAM Role for EC2
    // ============================================
    const role = new iam.Role(this, 'ReverseProxyRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      description: 'IAM role for City-Guided reverse proxy EC2 instance',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy'),
      ],
    });

    // ============================================
    // User Data Script
    // ============================================
    const userData = ec2.UserData.forLinux();
    userData.addCommands(
      '#!/bin/bash',
      'set -e',
      '',
      '# Update system',
      'dnf update -y',
      '',
      '# Install Caddy',
      'dnf install -y yum-utils',
      'dnf copr enable @caddy/caddy -y',
      'dnf install -y caddy',
      '',
      '# Create Caddyfile',
      'cat > /etc/caddy/Caddyfile <<EOF',
      `${props.duckdnsDomain} {`,
      `  reverse_proxy http://${props.albDnsName}`,
      '  ',
      '  # Let\'s Encrypt automatic HTTPS',
      '  tls {',
      `    dns duckdns ${props.duckdnsToken}`,
      '  }',
      '  ',
      '  # Health check endpoint',
      '  handle /health {',
      '    respond "OK" 200',
      '  }',
      '  ',
      '  # Logging',
      '  log {',
      '    output file /var/log/caddy/access.log',
      '    format json',
      '  }',
      '}',
      'EOF',
      '',
      '# Create log directory',
      'mkdir -p /var/log/caddy',
      'chown caddy:caddy /var/log/caddy',
      '',
      '# Enable and start Caddy',
      'systemctl enable caddy',
      'systemctl start caddy',
      '',
      '# Signal successful initialization',
      'touch /var/tmp/init-complete'
    );

    // ============================================
    // EC2 Instance (t4g.nano - ARM64, minimal cost)
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
      description: 'Reverse Proxy EC2 Instance ID',
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
