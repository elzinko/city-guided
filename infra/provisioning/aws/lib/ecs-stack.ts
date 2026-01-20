import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import { Construct } from 'constructs';

export class CityGuidedEcsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ============================================
    // ECR Repositories for Docker images
    // ============================================
    const apiRepository = new ecr.Repository(this, 'ApiRepository', {
      repositoryName: 'city-guided-api',
      imageScanOnPush: true,
      imageTagMutability: ecr.TagMutability.MUTABLE,
      lifecycleRules: [
        {
          description: 'Keep last 10 images',
          maxImageCount: 10,
          rulePriority: 1,
        },
      ],
      removalPolicy: cdk.RemovalPolicy.RETAIN, // Don't delete on stack destroy
    });

    const webRepository = new ecr.Repository(this, 'WebRepository', {
      repositoryName: 'city-guided-web',
      imageScanOnPush: true,
      imageTagMutability: ecr.TagMutability.MUTABLE,
      lifecycleRules: [
        {
          description: 'Keep last 10 images',
          maxImageCount: 10,
          rulePriority: 1,
        },
      ],
      removalPolicy: cdk.RemovalPolicy.RETAIN, // Don't delete on stack destroy
    });

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
      clusterName: 'city-guided-cluster',
      // Enable CloudWatch Container Insights for enhanced observability
      // Provides Docker Desktop-like dashboards: cluster → service → task → container
      containerInsights: true,
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
      // IMPORTANT: Fargate tasks need public IP to pull images from ECR
      // (Alternative: NAT Gateway or VPC Endpoints, but those cost more)
      assignPublicIp: true,
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
    const targetGroup = listener.addTargets('EcsTargets', {
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
      maxCapacity: 1,  // Maximum 1 instance comme demandé
    });

    // Scale-up based on ALB request count (works even when service is at 0)
    // This is the KEY metric for scale-to-zero: it detects incoming traffic
    // even when no tasks are running, allowing automatic scale-up from 0 to 1
    scaling.scaleOnRequestCount('ScaleOnRequests', {
      requestsPerTarget: 1,  // Scale-up if there's any request
      targetGroup: targetGroup,
      scaleInCooldown: cdk.Duration.minutes(5),  // Wait 5min before scaling down
      scaleOutCooldown: cdk.Duration.seconds(10),  // Scale-up quickly (10s)
    });

    // Secondary scale based on CPU utilization (when service is already running)
    scaling.scaleOnCpuUtilization('ScaleOnCpu', {
      targetUtilizationPercent: 50,
      scaleInCooldown: cdk.Duration.minutes(5),
      scaleOutCooldown: cdk.Duration.seconds(30),
    });

    // ============================================
    // Scale-to-Zero Lambda Function
    // Surveille l'inactivité et met à l'échelle à 0 après 5 minutes
    // ============================================
    const scaleToZeroLambda = new lambda.Function(this, 'ScaleToZeroLambda', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
const { ECSClient, UpdateServiceCommand, DescribeServicesCommand } = require('@aws-sdk/client-ecs');
const { CloudWatchClient, GetMetricStatisticsCommand, PutMetricDataCommand } = require('@aws-sdk/client-cloudwatch');

const ecsClient = new ECSClient({});
const cloudwatchClient = new CloudWatchClient({});

const CLUSTER_NAME = '${cluster.clusterName}';
const SERVICE_NAME = '${service.serviceName}';
const TARGET_GROUP_NAME = '${targetGroup.targetGroupFullName}';
const IDLE_DURATION_MINUTES = 5;
const STACK_NAME = '${this.stackName}';

exports.handler = async (event) => {
  console.log('Scale-to-zero check triggered', { timestamp: new Date().toISOString() });
  
  try {
    // 1. Vérifier l'état actuel du service
    const describeResponse = await ecsClient.send(new DescribeServicesCommand({
      cluster: CLUSTER_NAME,
      services: [SERVICE_NAME]
    }));
    
    const service = describeResponse.services?.[0];
    if (!service) {
      console.error('Service not found');
      return { statusCode: 404, body: 'Service not found' };
    }
    
    const currentDesiredCount = service.desiredCount || 0;
    const runningCount = service.runningCount || 0;
    
    console.log('Current service state', { 
      desiredCount: currentDesiredCount, 
      runningCount 
    });
    
    // 2. Si le service est déjà à 0, publier métrique et sortir
    if (currentDesiredCount === 0) {
      await publishMetric(0, 'idle');
      return { 
        statusCode: 200, 
        body: JSON.stringify({ 
          action: 'noop', 
          reason: 'Service already at zero',
          desiredCount: 0 
        }) 
      };
    }
    
    // 3. Vérifier les métriques ALB pour les 5 dernières minutes
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - (IDLE_DURATION_MINUTES + 1) * 60 * 1000);
    
    const metricResponse = await cloudwatchClient.send(new GetMetricStatisticsCommand({
      Namespace: 'AWS/ApplicationELB',
      MetricName: 'RequestCount',
      Dimensions: [
        { Name: 'TargetGroup', Value: TARGET_GROUP_NAME }
      ],
      StartTime: startTime,
      EndTime: endTime,
      Period: 60, // 1 minute
      Statistics: ['Sum']
    }));
    
    // 4. Analyser les données de métriques
    const datapoints = metricResponse.Datapoints || [];
    const recentRequests = datapoints
      .filter(dp => {
        const dpTime = new Date(dp.Timestamp);
        const minutesAgo = (endTime - dpTime) / (1000 * 60);
        return minutesAgo <= IDLE_DURATION_MINUTES;
      })
      .reduce((sum, dp) => sum + (dp.Sum || 0), 0);
    
    console.log('Request analysis', {
      totalDatapoints: datapoints.length,
      recentRequests,
      timeWindow: \`Last \${IDLE_DURATION_MINUTES} minutes\`
    });
    
    // 5. Décision : scale-to-zero si aucune requête dans les 5 dernières minutes
    if (recentRequests === 0) {
      console.log('No requests detected, scaling to zero');
      
      await ecsClient.send(new UpdateServiceCommand({
        cluster: CLUSTER_NAME,
        service: SERVICE_NAME,
        desiredCount: 0
      }));
      
      await publishMetric(0, 'scaled_to_zero');
      
      return {
        statusCode: 200,
        body: JSON.stringify({
          action: 'scaled_to_zero',
          previousDesiredCount: currentDesiredCount,
          newDesiredCount: 0,
          reason: 'No requests in last 5 minutes'
        })
      };
    } else {
      // Publier métrique indiquant que le service est actif
      await publishMetric(currentDesiredCount, 'active');
      
      return {
        statusCode: 200,
        body: JSON.stringify({
          action: 'noop',
          desiredCount: currentDesiredCount,
          reason: \`\${recentRequests} requests detected in last 5 minutes\`
        })
      };
    }
    
  } catch (error) {
    console.error('Error in scale-to-zero lambda', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: error.message,
        stack: error.stack 
      })
    };
  }
};

async function publishMetric(desiredCount, status) {
  try {
    await cloudwatchClient.send(new PutMetricDataCommand({
      Namespace: 'CityGuided/ECS',
      MetricData: [
        {
          MetricName: 'ServiceDesiredCount',
          Value: desiredCount,
          Unit: 'Count',
          Timestamp: new Date(),
          Dimensions: [
            { Name: 'Service', Value: SERVICE_NAME },
            { Name: 'Cluster', Value: CLUSTER_NAME },
            { Name: 'Status', Value: status }
          ]
        },
        {
          MetricName: 'ServiceStatus',
          Value: status === 'active' ? 1 : 0,
          Unit: 'None',
          Timestamp: new Date(),
          Dimensions: [
            { Name: 'Service', Value: SERVICE_NAME },
            { Name: 'Cluster', Value: CLUSTER_NAME }
          ]
        }
      ]
    }));
    console.log('Metrics published', { desiredCount, status });
  } catch (error) {
    console.error('Error publishing metrics', error);
  }
}
      `),
      timeout: cdk.Duration.minutes(1),
      memorySize: 256,
      environment: {
        CLUSTER_NAME: cluster.clusterName,
        SERVICE_NAME: service.serviceName,
      },
    });

    // Permissions pour la Lambda
    scaleToZeroLambda.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'ecs:UpdateService',
        'ecs:DescribeServices',
      ],
      resources: [
        service.serviceArn,
        cluster.clusterArn,
      ],
    }));

    scaleToZeroLambda.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'cloudwatch:GetMetricStatistics',
        'cloudwatch:PutMetricData',
      ],
      resources: ['*'],
    }));

    // ============================================
    // EventBridge Rule - Déclencher toutes les minutes
    // ============================================
    const scaleToZeroRule = new events.Rule(this, 'ScaleToZeroRule', {
      schedule: events.Schedule.rate(cdk.Duration.minutes(1)),
      description: 'Check for inactivity and scale ECS service to zero',
    });

    scaleToZeroRule.addTarget(new targets.LambdaFunction(scaleToZeroLambda));

    // ============================================
    // Lambda pour scale-up automatique sur première requête
    // IMPORTANT: L'auto-scaling ECS natif ne peut pas scaler de 0→1
    // car RequestCountPerTarget = undefined quand il n'y a pas de targets
    // Cette Lambda surveille RequestCount global de l'ALB (qui fonctionne même à 0)
    // ============================================
    const scaleUpLambda = new lambda.Function(this, 'ScaleUpLambda', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
const { ECSClient, UpdateServiceCommand, DescribeServicesCommand } = require('@aws-sdk/client-ecs');
const { CloudWatchClient, PutMetricDataCommand, GetMetricStatisticsCommand } = require('@aws-sdk/client-cloudwatch');

const ecsClient = new ECSClient({});
const cloudwatchClient = new CloudWatchClient({});

const CLUSTER_NAME = '${cluster.clusterName}';
const SERVICE_NAME = '${service.serviceName}';
const ALB_FULL_NAME = '${alb.loadBalancerFullName}';

exports.handler = async (event) => {
  console.log('Scale-up check triggered', { timestamp: new Date().toISOString() });
  
  try {
    // 1. Vérifier l'état actuel du service
    const describeResponse = await ecsClient.send(new DescribeServicesCommand({
      cluster: CLUSTER_NAME,
      services: [SERVICE_NAME]
    }));
    
    const service = describeResponse.services?.[0];
    if (!service) {
      console.error('Service not found');
      return { statusCode: 404, body: 'Service not found' };
    }
    
    const currentDesiredCount = service.desiredCount || 0;
    
    // 2. Si déjà à 1 ou plus, ne rien faire
    if (currentDesiredCount >= 1) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          action: 'noop',
          reason: 'Service already scaled up',
          desiredCount: currentDesiredCount
        })
      };
    }
    
    // 3. Vérifier les métriques ALB globales (fonctionne même quand service à 0)
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 2 * 60 * 1000); // 2 dernières minutes
    
    const metricResponse = await cloudwatchClient.send(new GetMetricStatisticsCommand({
      Namespace: 'AWS/ApplicationELB',
      MetricName: 'RequestCount',
      Dimensions: [
        { Name: 'LoadBalancer', Value: ALB_FULL_NAME }
      ],
      StartTime: startTime,
      EndTime: endTime,
      Period: 60,
      Statistics: ['Sum']
    }));
    
    // 4. Analyser les données de métriques
    const datapoints = metricResponse.Datapoints || [];
    const recentRequests = datapoints.reduce((sum, dp) => sum + (dp.Sum || 0), 0);
    
    console.log('Request analysis', {
      totalDatapoints: datapoints.length,
      recentRequests,
      timeWindow: 'Last 2 minutes'
    });
    
    // 5. Si des requêtes sont détectées et le service est à 0, scale-up
    if (recentRequests > 0) {
      console.log('Requests detected while service at zero, scaling up to 1');
      
      await ecsClient.send(new UpdateServiceCommand({
        cluster: CLUSTER_NAME,
        service: SERVICE_NAME,
        desiredCount: 1
      }));
      
      await publishMetric(1, 'scaled_up');
      
      return {
        statusCode: 200,
        body: JSON.stringify({
          action: 'scaled_up',
          previousDesiredCount: currentDesiredCount,
          newDesiredCount: 1,
          reason: \`\${recentRequests} requests detected in last 2 minutes\`
        })
      };
    } else {
      return {
        statusCode: 200,
        body: JSON.stringify({
          action: 'noop',
          desiredCount: currentDesiredCount,
          reason: 'No requests detected, service remains at zero'
        })
      };
    }
    
  } catch (error) {
    console.error('Error in scale-up lambda', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: error.message,
        stack: error.stack 
      })
    };
  }
};

async function publishMetric(desiredCount, status) {
  try {
    await cloudwatchClient.send(new PutMetricDataCommand({
      Namespace: 'CityGuided/ECS',
      MetricData: [
        {
          MetricName: 'ServiceDesiredCount',
          Value: desiredCount,
          Unit: 'Count',
          Timestamp: new Date(),
          Dimensions: [
            { Name: 'Service', Value: SERVICE_NAME },
            { Name: 'Cluster', Value: CLUSTER_NAME },
            { Name: 'Status', Value: status }
          ]
        },
        {
          MetricName: 'ServiceStatus',
          Value: status === 'active' || status === 'scaled_up' ? 1 : 0,
          Unit: 'None',
          Timestamp: new Date(),
          Dimensions: [
            { Name: 'Service', Value: SERVICE_NAME },
            { Name: 'Cluster', Value: CLUSTER_NAME }
          ]
        }
      ]
    }));
    console.log('Metrics published', { desiredCount, status });
  } catch (error) {
    console.error('Error publishing metrics', error);
  }
}
      `),
      timeout: cdk.Duration.minutes(1),
      memorySize: 256,
    });

    scaleUpLambda.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'ecs:UpdateService',
        'ecs:DescribeServices',
      ],
      resources: [
        service.serviceArn,
        cluster.clusterArn,
      ],
    }));

    scaleUpLambda.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'cloudwatch:PutMetricData',
        'cloudwatch:GetMetricStatistics',
      ],
      resources: ['*'],
    }));

    // ============================================
    // EventBridge Rule pour scale-up automatique
    // Déclenche la Lambda scale-up toutes les minutes pour vérifier
    // si des requêtes arrivent alors que le service est à 0
    // ============================================
    const scaleUpRule = new events.Rule(this, 'ScaleUpRule', {
      schedule: events.Schedule.rate(cdk.Duration.minutes(1)),
      description: 'Check for incoming requests and scale up ECS service if needed',
    });

    scaleUpRule.addTarget(new targets.LambdaFunction(scaleUpLambda));

    // ============================================
    // CloudWatch Dashboard
    // ============================================
    const dashboard = new cloudwatch.Dashboard(this, 'ECSScaleToZeroDashboard', {
      dashboardName: 'CityGuided-ECS-ScaleToZero',
    });

    // Widget 1: État du service (actif/inactif)
    const serviceStatusMetric = new cloudwatch.Metric({
      namespace: 'CityGuided/ECS',
      metricName: 'ServiceStatus',
      dimensionsMap: {
        Service: service.serviceName,
        Cluster: cluster.clusterName,
      },
      statistic: 'Maximum',
      period: cdk.Duration.minutes(1),
      label: 'Service Status (1=Active, 0=Idle)',
    });

    // Widget 2: Nombre d'instances désirées
    const desiredCountMetric = new cloudwatch.Metric({
      namespace: 'CityGuided/ECS',
      metricName: 'ServiceDesiredCount',
      dimensionsMap: {
        Service: service.serviceName,
        Cluster: cluster.clusterName,
      },
      statistic: 'Maximum',
      period: cdk.Duration.minutes(1),
      label: 'Desired Count',
    });

    // Widget 3: Nombre de requêtes ALB
    const albRequestMetric = new cloudwatch.Metric({
      namespace: 'AWS/ApplicationELB',
      metricName: 'RequestCount',
      dimensionsMap: {
        LoadBalancer: alb.loadBalancerFullName,
      },
      statistic: 'Sum',
      period: cdk.Duration.minutes(1),
      label: 'ALB Request Count',
    });

    // Widget 4: Nombre de tâches ECS en cours d'exécution
    const runningTasksMetric = new cloudwatch.Metric({
      namespace: 'AWS/ECS',
      metricName: 'RunningTaskCount',
      dimensionsMap: {
        ServiceName: service.serviceName,
        ClusterName: cluster.clusterName,
      },
      statistic: 'Average',
      period: cdk.Duration.minutes(1),
      label: 'Running Tasks',
    });

    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'État du Service (Actif/Inactif)',
        left: [serviceStatusMetric],
        width: 24,
        height: 6,
        leftYAxis: {
          min: 0,
          max: 1,
          label: 'Status',
        },
      }),
      new cloudwatch.GraphWidget({
        title: 'Nombre d\'Instances Désirées',
        left: [desiredCountMetric],
        width: 24,
        height: 6,
        leftYAxis: {
          min: 0,
          max: 1,
          label: 'Instances',
        },
      }),
      new cloudwatch.GraphWidget({
        title: 'Requêtes ALB',
        left: [albRequestMetric],
        width: 24,
        height: 6,
      }),
      new cloudwatch.GraphWidget({
        title: 'Tâches ECS en Cours d\'Exécution',
        left: [runningTasksMetric],
        width: 24,
        height: 6,
      }),
    );

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

    new cdk.CfnOutput(this, 'ApiRepositoryUri', {
      value: apiRepository.repositoryUri,
      description: 'ECR Repository URI for API',
      exportName: 'CityGuidedApiRepositoryUri',
    });

    new cdk.CfnOutput(this, 'WebRepositoryUri', {
      value: webRepository.repositoryUri,
      description: 'ECR Repository URI for Web',
      exportName: 'CityGuidedWebRepositoryUri',
    });

    new cdk.CfnOutput(this, 'DashboardUrl', {
      value: `https://${this.region}.console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=CityGuided-ECS-ScaleToZero`,
      description: 'CloudWatch Dashboard URL',
    });

    new cdk.CfnOutput(this, 'ScaleUpLambdaArn', {
      value: scaleUpLambda.functionArn,
      description: 'Scale-Up Lambda ARN (monitors ALB for requests when service is at zero)',
    });
  }
}
