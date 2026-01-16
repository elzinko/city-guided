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
    // ECS Task Definition (Fargate)
    // ============================================
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDef', {
      cpu: 1024,  // 1 vCPU
      memoryLimitMiB: 2048,  // 2 GB
    });

    // API Container
    const apiContainer = taskDefinition.addContainer('api', {
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
    apiContainer.addPortMappings({
      containerPort: 4000,
      protocol: ecs.Protocol.TCP,
    });

    // Web Container (main entry point via ALB)
    const webContainer = taskDefinition.addContainer('web', {
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
    webContainer.addPortMappings({
      containerPort: 80,
      protocol: ecs.Protocol.TCP,
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

    // ============================================
    // ALB Listener with Target Group
    // (Create listener first, then attach service)
    // ============================================
    const listener = alb.addListener('Listener', {
      port: 80,
      open: true,
    });

    // Add ECS service as target (this creates the target group automatically)
    listener.addTargets('EcsTargets', {
      port: 80,
      targets: [service.loadBalancerTarget({
        containerName: 'web',
        containerPort: 80,
      })],
      healthCheck: {
        path: '/',  // Simple health check for nginx placeholder
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 2,
      },
    });

    // ============================================
    // Auto-scaling (basic demo)
    // ============================================
    const scaling = service.autoScaleTaskCount({
      minCapacity: 0,  // Scale-to-zero
      maxCapacity: 5,
    });

    // Scale based on CPU utilization (simpler than request-based)
    scaling.scaleOnCpuUtilization('ScaleOnCpu', {
      targetUtilizationPercent: 50,
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(30),
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
