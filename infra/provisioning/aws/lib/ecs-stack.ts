import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export class CityGuidedEcsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ============================================
    // VPC - Use default VPC for simplicity
    // ============================================
    const vpc = ec2.Vpc.fromLookup(this, 'DefaultVPC', {
      isDefault: true,
    });

    // ============================================
    // ECS Cluster
    // ============================================
    const cluster = new ecs.Cluster(this, 'Cluster', {
      vpc,
      clusterName: 'city-guided-cluster'
    });

    // ============================================
    // Application Load Balancer
    // ============================================
    const alb = new elbv2.ApplicationLoadBalancer(this, 'ALB', {
      vpc,
      internetFacing: true,
      loadBalancerName: 'city-guided-alb'
    });

    // ============================================
    // Target Group
    // ============================================
    const targetGroup = new elbv2.ApplicationTargetGroup(this, 'TargetGroup', {
      vpc,
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targetGroupName: 'city-guided-targets',
      healthCheck: {
        path: '/api/health',
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 2,
      },
    });

    // ============================================
    // ECS Task Definition (Fargate)
    // ============================================
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDef', {
      cpu: 1024,  // 1 vCPU
      memoryLimitMiB: 2048,  // 2 GB
    });

    // API Container
    taskDefinition.addContainer('api', {
      image: ecs.ContainerImage.fromRegistry('nginx:latest'), // Placeholder
      containerName: 'api',
      environment: {
        NODE_ENV: 'production',
        PORT: '4000',
      },
      logging: new ecs.AwsLogDriver({
        streamPrefix: 'api',
        logGroup: new logs.LogGroup(this, 'ApiLogGroup', {
          logGroupName: '/ecs/city-guided-api',
          retention: logs.RetentionDays.ONE_WEEK,
        }),
      }),
    });

    // Web Container
    taskDefinition.addContainer('web', {
      image: ecs.ContainerImage.fromRegistry('nginx:latest'), // Placeholder
      containerName: 'web',
      environment: {
        NODE_ENV: 'production',
        PORT: '3000',
      },
      logging: new ecs.AwsLogDriver({
        streamPrefix: 'web',
        logGroup: new logs.LogGroup(this, 'WebLogGroup', {
          logGroupName: '/ecs/city-guided-web',
          retention: logs.RetentionDays.ONE_WEEK,
        }),
      }),
    });

    // ============================================
    // ECS Service
    // ============================================
    const service = new ecs.FargateService(this, 'Service', {
      cluster,
      taskDefinition,
      serviceName: 'city-guided-service',
      desiredCount: 0,  // Start at zero for scale-to-zero demo
      minHealthyPercent: 0,  // Allow scale-to-zero
      maxHealthyPercent: 200,
      enableExecuteCommand: true,  // For debugging
    });

    // Attach service to target group
    service.attachToApplicationTargetGroup(targetGroup);

    // ============================================
    // Auto-scaling (basic demo)
    // ============================================
    const scaling = service.autoScaleTaskCount({
      minCapacity: 0,  // Scale-to-zero
      maxCapacity: 5,
    });

    // Scale up on requests
    scaling.scaleOnRequestCount('ScaleUp', {
      requestsPerTarget: 1,  // Very sensitive for demo
      targetGroup: targetGroup,
      scaleOutCooldown: cdk.Duration.seconds(30),
    });

    // ============================================
    // ALB Listener
    // ============================================
    new elbv2.ApplicationListener(this, 'Listener', {
      loadBalancer: alb,
      port: 80,
      defaultTargetGroups: [targetGroup],
    });

    // ============================================
    // Outputs
    // ============================================
    new cdk.CfnOutput(this, 'ClusterName', {
      value: cluster.clusterName,
      description: 'ECS Cluster Name',
    });

    new cdk.CfnOutput(this, 'ServiceName', {
      value: service.serviceName,
      description: 'ECS Service Name',
    });

    new cdk.CfnOutput(this, 'LoadBalancerDNS', {
      value: alb.loadBalancerDnsName,
      description: 'ALB DNS Name',
    });
  }
}