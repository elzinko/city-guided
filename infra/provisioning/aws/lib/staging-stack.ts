import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { EC2_CONFIG, SECURITY_CONFIG } from '../constants.js';

export class CityGuidedStagingStack extends cdk.Stack {
  public readonly instance: ec2.Instance;
  public readonly elasticIp: ec2.CfnEIP;
  public readonly securityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
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
    this.securityGroup = new ec2.SecurityGroup(this, 'StagingSecurityGroup', {
      vpc,
      description: 'Security group for City-Guided staging server',
      allowAllOutbound: true,
    });

    // SSH access
    this.securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(SECURITY_CONFIG.ports.ssh),
      'Allow SSH access'
    );

    // HTTP access
    this.securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(SECURITY_CONFIG.ports.http),
      'Allow HTTP access'
    );

    // HTTPS access
    this.securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(SECURITY_CONFIG.ports.https),
      'Allow HTTPS access'
    );

    // ============================================
    // IAM Role for EC2
    // ============================================
    const role = new iam.Role(this, 'StagingInstanceRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      description: 'IAM role for City-Guided staging EC2 instance',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy'),
      ],
    });

    // Allow reading from ECR (for Docker images if we use ECR later)
    role.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'ecr:GetDownloadUrlForLayer',
          'ecr:BatchGetImage',
          'ecr:BatchCheckLayerAvailability',
          'ecr:GetAuthorizationToken',
        ],
        resources: ['*'],
      })
    );

    // Allow reading from SSM Parameter Store (for environment configuration)
    role.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'ssm:GetParameter',
          'ssm:GetParameters',
          'ssm:GetParametersByPath',
        ],
        resources: [`arn:aws:ssm:${this.region}:${this.account}:parameter/city-guided/*`],
      })
    );

    // ============================================
    // User Data Script
    // ============================================
    const userData = ec2.UserData.forLinux();
    userData.addCommands(
      '#!/bin/bash',
      'set -e',
      '',
      '# Update system',
      'yum update -y',
      '',
      '# Install Docker',
      'amazon-linux-extras install docker -y',
      'systemctl start docker',
      'systemctl enable docker',
      'usermod -a -G docker ec2-user',
      '',
      '# Install Docker Compose v2 (plugin)',
      'mkdir -p /usr/local/lib/docker/cli-plugins',
      'curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 -o /usr/local/lib/docker/cli-plugins/docker-compose',
      'chmod +x /usr/local/lib/docker/cli-plugins/docker-compose',
      '',
      '# Install Docker Buildx (required by Docker Compose v2 for building images)',
      'BUILDX_URL=$(curl -s https://api.github.com/repos/docker/buildx/releases/latest | grep browser_download_url | grep linux-amd64 | head -1 | cut -d\\" -f4)',
      'curl -SL $BUILDX_URL -o /usr/local/lib/docker/cli-plugins/docker-buildx',
      'chmod +x /usr/local/lib/docker/cli-plugins/docker-buildx',
      '',
      '# Install plugins for ec2-user',
      'mkdir -p /home/ec2-user/.docker/cli-plugins',
      'cp /usr/local/lib/docker/cli-plugins/docker-compose /home/ec2-user/.docker/cli-plugins/',
      'cp /usr/local/lib/docker/cli-plugins/docker-buildx /home/ec2-user/.docker/cli-plugins/',
      'chown -R ec2-user:ec2-user /home/ec2-user/.docker',
      '',
      '# Install Git',
      'yum install -y git',
      '',
      '# Create deployment directory',
      'mkdir -p /home/ec2-user/app',
      'chown ec2-user:ec2-user /home/ec2-user/app',
      '',
      '# Install auto-shutdown script (sleep after 5 minutes inactivity)',
      'cat <<EOF > /home/ec2-user/check-activity.sh',
      '#!/bin/bash',
      '# Check if any containers are running',
      'RUNNING=$(docker ps -q | wc -l)',
      'if [ "$RUNNING" -eq 0 ]; then',
      '  echo "No containers running, nothing to do."',
      '  exit 0',
      'fi',
      '',
      '# Check Caddy access logs (last 5 minutes)',
      'CADDY_LOGS=$(docker logs city-guided-staging-caddy --since 5m 2>&1 | wc -l)',
      'if [ "$CADDY_LOGS" -lt 5 ]; then',
      '  echo "Low activity detected. Server stays up for staging."',
      'fi',
      'EOF',
      '',
      'chmod +x /home/ec2-user/check-activity.sh',
      '',
      '# Add cron job for auto-shutdown (runs every 5 minutes)',
      '(crontab -l 2>/dev/null; echo "*/5 * * * * /home/ec2-user/check-activity.sh") | crontab -',
      '',
      '# Signal successful initialization',
      'touch /home/ec2-user/init-complete'
    );

    // ============================================
    // EC2 Spot Instance
    // ============================================
    this.instance = new ec2.Instance(this, 'StagingInstance', {
      vpc,
      instanceType: new ec2.InstanceType(EC2_CONFIG.instanceType),
      machineImage: ec2.MachineImage.latestAmazonLinux2({
        cpuType: ec2.AmazonLinuxCpuType.X86_64,
      }),
      securityGroup: this.securityGroup,
      role,
      userData,
      blockDevices: [
        {
          deviceName: '/dev/xvda',
          volume: ec2.BlockDeviceVolume.ebs(EC2_CONFIG.volumeSize, {
            volumeType: ec2.EbsDeviceVolumeType.GP3,
            deleteOnTermination: true,
          }),
        },
      ],
      // Request Spot Instance
      spotOptions: {
        maxPrice: Number(EC2_CONFIG.spotPrice),
        requestType: ec2.SpotRequestType.ONE_TIME,
        interruptionBehavior: ec2.SpotInstanceInterruption.STOP,
      },
      keyName: EC2_CONFIG.keyPairName, // Must exist or be created separately
    });

    // ============================================
    // Elastic IP
    // ============================================
    this.elasticIp = new ec2.CfnEIP(this, 'StagingElasticIP', {
      domain: 'vpc',
      instanceId: this.instance.instanceId,
    });

    // ============================================
    // Outputs
    // ============================================
    new cdk.CfnOutput(this, 'InstanceId', {
      value: this.instance.instanceId,
      description: 'EC2 Instance ID',
      exportName: 'CityGuidedStagingInstanceId',
    });

    new cdk.CfnOutput(this, 'PublicIP', {
      value: this.elasticIp.ref,
      description: 'Elastic IP Address',
      exportName: 'CityGuidedStagingPublicIP',
    });

    new cdk.CfnOutput(this, 'SecurityGroupId', {
      value: this.securityGroup.securityGroupId,
      description: 'Security Group ID',
      exportName: 'CityGuidedStagingSecurityGroupId',
    });

    // Add tags
    cdk.Tags.of(this).add('Project', 'CityGuided');
    cdk.Tags.of(this).add('Environment', 'Staging');
    cdk.Tags.of(this).add('ManagedBy', 'CDK');
  }
}
