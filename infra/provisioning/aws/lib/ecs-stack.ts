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
  public readonly loadBalancerDnsName: string;

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
    // Limité à 2 AZs pour réduire les coûts (minimum requis)
    // ============================================
    const publicSubnets = vpc.selectSubnets({
      subnetType: ec2.SubnetType.PUBLIC,
      availabilityZones: ['eu-west-3a', 'eu-west-3b'], // Seulement 2 AZs
    });

    const alb = new elbv2.ApplicationLoadBalancer(this, 'ALB', {
      vpc,
      internetFacing: true,
      loadBalancerName: 'city-guided-alb',
      vpcSubnets: publicSubnets, // Limite à 2 AZs
    });

    // Store ALB DNS name for reverse proxy stack
    this.loadBalancerDnsName = alb.loadBalancerDnsName;

    // ============================================
    // Lambda pour page 503 (économique: ~$0/mois)
    // ============================================
    const error503Lambda = new lambda.Function(this, 'Error503Lambda', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
const html = \`<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Service en cours de réveil - CityGuided</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,Cantarell,sans-serif;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;color:#fff}
.container{max-width:600px;background:rgba(255,255,255,0.1);backdrop-filter:blur(10px);border-radius:20px;padding:40px;text-align:center;box-shadow:0 8px 32px 0 rgba(31,38,135,0.37);border:1px solid rgba(255,255,255,0.18)}
.icon{width:100px;height:100px;margin:0 auto 30px;background:rgba(255,255,255,0.2);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:50px;animation:pulse 2s ease-in-out infinite}
@keyframes pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.05);opacity:0.8}}
h1{font-size:28px;font-weight:700;margin-bottom:20px}
p{font-size:16px;line-height:1.6;margin-bottom:15px;color:rgba(255,255,255,0.9)}
.info-box{background:rgba(255,255,255,0.15);border-radius:12px;padding:20px;margin:25px 0;border-left:4px solid rgba(255,255,255,0.5)}
.info-box p{font-size:14px;margin-bottom:0}
.spinner{margin:30px auto;width:50px;height:50px;border:4px solid rgba(255,255,255,0.3);border-top:4px solid #fff;border-radius:50%;animation:spin 1s linear infinite}
@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
.progress-text{font-size:14px;color:rgba(255,255,255,0.8);margin-top:20px}
.footer{margin-top:30px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.2);font-size:12px;color:rgba(255,255,255,0.7)}
</style>
</head>
<body>
<div class="container">
<div class="icon">🌙</div>
<h1>Service en cours de réveil</h1>
<p>Pour économiser les ressources, notre service se met en veille après <strong>5 minutes d'inactivité</strong>.</p>
<div class="info-box">
<p><strong>⏱️ Temps de démarrage : 30-60 secondes</strong></p>
<p>Le service redémarre automatiquement suite à votre demande.</p>
</div>
<div class="spinner"></div>
<p class="progress-text" id="statusText">Initialisation en cours...</p>
<div class="footer">CityGuided - Infrastructure éco-responsable 🌱</div>
</div>
<script>
let attempts=0;const maxAttempts=24;
const statusMessages=["Initialisation en cours...","Démarrage des conteneurs...","Configuration du réseau...","Chargement de l'application...","Presque prêt...","Finalisation..."];
function updateStatus(){
attempts++;
const messageIndex=Math.min(Math.floor(attempts/4),statusMessages.length-1);
document.getElementById('statusText').textContent=statusMessages[messageIndex];
if(attempts<maxAttempts){
setTimeout(()=>{window.location.reload()},5000);
}else{
document.getElementById('statusText').textContent="Le démarrage prend plus de temps que prévu. Veuillez réessayer dans quelques instants.";
}
}
setTimeout(updateStatus,5000);
</script>
</body>
</html>\`;

exports.handler = async (event) => {
  return {
    statusCode: 503,
    statusDescription: '503 Service Unavailable',
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
    body: html
  };
};
      `),
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
    });

    // Add Function URL for direct access (no ALB needed, saves cost)
    const error503Url = error503Lambda.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
    });

    new cdk.CfnOutput(this, 'Error503PageUrl', {
      value: error503Url.url,
      description: 'URL de la page 503 (à utiliser dans Caddy ou comme fallback)',
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
    // Note: Container listens on PORT env var (default 3080 in Dockerfile)
    const webContainer = taskDefinition.addContainer('web', {
      image: ecs.ContainerImage.fromRegistry('nginx:latest'), // Placeholder
      containerName: 'web',
      environment: {
        NODE_ENV: 'production',
        PORT: '3080',  // Must match Dockerfile default
        // Use ALB URL for API calls (ALB routes /api/* to API container)
        NEXT_PUBLIC_API_URL: `http://${alb.loadBalancerDnsName}/api`,
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
      containerPort: 3080,  // Must match PORT env var
      protocol: ecs.Protocol.TCP,
    });

    // Grant ECR pull permissions to the task execution role
    // This is required because the deploy script updates task definition to use ECR images
    // Note: Must be done after containers are added (execution role is created by AwsLogDriver)
    apiRepository.grantPull(taskDefinition.executionRole!);
    webRepository.grantPull(taskDefinition.executionRole!);

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

    // API Target Group (for /api/* routes)
    listener.addTargets('ApiTargets', {
      port: 4000,  // API container port
      protocol: elbv2.ApplicationProtocol.HTTP,
      priority: 1,  // Higher priority (checked first)
      conditions: [
        elbv2.ListenerCondition.pathPatterns(['/api/*']),
      ],
      targets: [service.loadBalancerTarget({
        containerName: 'api',
        containerPort: 4000,
      })],
      healthCheck: {
        path: '/api/health',
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
      },
    });

    // Web Target Group (default, for all other routes)
    const webTargetGroup = listener.addTargets('WebTargets', {
      port: 3080,  // Must match web container port
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [service.loadBalancerTarget({
        containerName: 'web',
        containerPort: 3080,  // Must match web container port
      })],
      healthCheck: {
        path: '/',
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,  // More tolerant for Next.js startup
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
      targetGroup: webTargetGroup,  // Use web target group for scaling decisions
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
      code: lambda.Code.fromAsset('lambdas/scale-to-zero', {
        bundling: {
          image: lambda.Runtime.NODEJS_20_X.bundlingImage,
          command: [
            'bash', '-c', [
              'npm install',
              'npm run build',
              'cp -r node_modules /asset-output/',
              'cp package.json /asset-output/',
              'cp dist/index.js /asset-output/index.js',
            ].join(' && ')
          ],
          user: 'root',
        },
      }),
      timeout: cdk.Duration.minutes(1),
      memorySize: 256,
      environment: {
        CLUSTER_NAME: cluster.clusterName,
        SERVICE_NAME: service.serviceName,
        TARGET_GROUP_NAME: webTargetGroup.targetGroupFullName,
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
      code: lambda.Code.fromAsset('lambdas/scale-up', {
        bundling: {
          image: lambda.Runtime.NODEJS_20_X.bundlingImage,
          command: [
            'bash', '-c', [
              'npm install',
              'npm run build',
              'cp -r node_modules /asset-output/',
              'cp package.json /asset-output/',
              'cp dist/index.js /asset-output/index.js',
            ].join(' && ')
          ],
          user: 'root',
        },
      }),
      timeout: cdk.Duration.minutes(1),
      memorySize: 256,
      environment: {
        CLUSTER_NAME: cluster.clusterName,
        SERVICE_NAME: service.serviceName,
        ALB_FULL_NAME: alb.loadBalancerFullName,
      },
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
      label: 'Total Requests',
    });

    // Widget 3b: Erreurs 5XX ALB (Target)
    const alb5xxMetric = new cloudwatch.Metric({
      namespace: 'AWS/ApplicationELB',
      metricName: 'HTTPCode_Target_5XX_Count',
      dimensionsMap: {
        LoadBalancer: alb.loadBalancerFullName,
      },
      statistic: 'Sum',
      period: cdk.Duration.minutes(1),
      label: '5XX Errors (Target)',
    });

    // Widget 3c: Erreurs 5XX ALB (ELB)
    const albELB5xxMetric = new cloudwatch.Metric({
      namespace: 'AWS/ApplicationELB',
      metricName: 'HTTPCode_ELB_5XX_Count',
      dimensionsMap: {
        LoadBalancer: alb.loadBalancerFullName,
      },
      statistic: 'Sum',
      period: cdk.Duration.minutes(1),
      label: '5XX Errors (ELB)',
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
        title: 'Requêtes ALB & Erreurs 5XX',
        left: [albRequestMetric],
        right: [alb5xxMetric, albELB5xxMetric],
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

    new cdk.CfnOutput(this, 'ScaleToZeroLambdaArn', {
      value: scaleToZeroLambda.functionArn,
      description: 'Scale-To-Zero Lambda ARN (monitors inactivity and scales down to zero)',
    });
  }
}
