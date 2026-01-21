#!/bin/bash
# Script de test pour les Lambdas scale-to-zero

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🧪 Test des Lambdas Scale-to-Zero"
echo "=================================="
echo ""

# Fonction pour afficher en couleur
print_success() {
    echo -e "\033[0;32m✅ $1\033[0m"
}

print_error() {
    echo -e "\033[0;31m❌ $1\033[0m"
}

print_info() {
    echo -e "\033[0;34mℹ️  $1\033[0m"
}

# 1. Vérifier que les Lambdas existent
echo "1️⃣  Vérification de l'existence des Lambdas..."
LAMBDAS=$(aws lambda list-functions --query 'Functions[?starts_with(FunctionName, `CityGuidedEcsStack-Scale`)].FunctionName' --output text)

if [ -z "$LAMBDAS" ]; then
    print_error "Aucune Lambda trouvée. Avez-vous déployé la stack ?"
    exit 1
fi

echo "Lambdas trouvées :"
for lambda in $LAMBDAS; do
    echo "  - $lambda"
done
print_success "Lambdas trouvées"
echo ""

# 2. Récupérer les ARNs
echo "2️⃣  Récupération des ARNs..."
SCALE_TO_ZERO_ARN=$(aws lambda list-functions --query 'Functions[?starts_with(FunctionName, `CityGuidedEcsStack-ScaleToZeroLambda`)].FunctionArn' --output text | head -1)
SCALE_UP_ARN=$(aws lambda list-functions --query 'Functions[?starts_with(FunctionName, `CityGuidedEcsStack-ScaleUpLambda`)].FunctionArn' --output text | head -1)

if [ -z "$SCALE_TO_ZERO_ARN" ]; then
    print_error "Lambda Scale-to-Zero non trouvée"
    exit 1
fi

if [ -z "$SCALE_UP_ARN" ]; then
    print_error "Lambda Scale-Up non trouvée"
    exit 1
fi

print_success "ARNs récupérés"
echo "  Scale-to-Zero: $SCALE_TO_ZERO_ARN"
echo "  Scale-Up: $SCALE_UP_ARN"
echo ""

# 3. Test Scale-to-Zero Lambda
echo "3️⃣  Test de la Lambda Scale-to-Zero..."
print_info "Invocation..."
aws lambda invoke \
    --function-name "$SCALE_TO_ZERO_ARN" \
    --payload '{}' \
    /tmp/scale-to-zero-response.json \
    --log-type Tail \
    --query 'LogResult' \
    --output text | base64 -d || true

echo ""
print_info "Réponse :"
cat /tmp/scale-to-zero-response.json | jq '.' || cat /tmp/scale-to-zero-response.json
echo ""

# Vérifier le status code
STATUS=$(cat /tmp/scale-to-zero-response.json | jq -r '.statusCode' 2>/dev/null || echo "unknown")
if [ "$STATUS" = "200" ]; then
    print_success "Lambda Scale-to-Zero : OK"
else
    print_error "Lambda Scale-to-Zero : Erreur (status: $STATUS)"
fi
echo ""

# 4. Test Scale-Up Lambda
echo "4️⃣  Test de la Lambda Scale-Up..."
print_info "Invocation..."
aws lambda invoke \
    --function-name "$SCALE_UP_ARN" \
    --payload '{}' \
    /tmp/scale-up-response.json \
    --log-type Tail \
    --query 'LogResult' \
    --output text | base64 -d || true

echo ""
print_info "Réponse :"
cat /tmp/scale-up-response.json | jq '.' || cat /tmp/scale-up-response.json
echo ""

# Vérifier le status code
STATUS=$(cat /tmp/scale-up-response.json | jq -r '.statusCode' 2>/dev/null || echo "unknown")
if [ "$STATUS" = "200" ]; then
    print_success "Lambda Scale-Up : OK"
else
    print_error "Lambda Scale-Up : Erreur (status: $STATUS)"
fi
echo ""

# 5. Vérifier l'état du service ECS
echo "5️⃣  État du service ECS..."
CLUSTER_NAME="city-guided-cluster"
SERVICE_NAME="city-guided-service"

DESIRED_COUNT=$(aws ecs describe-services \
    --cluster "$CLUSTER_NAME" \
    --services "$SERVICE_NAME" \
    --query 'services[0].desiredCount' \
    --output text 2>/dev/null || echo "N/A")

RUNNING_COUNT=$(aws ecs describe-services \
    --cluster "$CLUSTER_NAME" \
    --services "$SERVICE_NAME" \
    --query 'services[0].runningCount' \
    --output text 2>/dev/null || echo "N/A")

echo "  Desired Count: $DESIRED_COUNT"
echo "  Running Count: $RUNNING_COUNT"
echo ""

# 6. Vérifier les métriques CloudWatch
echo "6️⃣  Métriques CloudWatch récentes..."
print_info "ServiceDesiredCount (dernière heure)..."
aws cloudwatch get-metric-statistics \
    --namespace CityGuided/ECS \
    --metric-name ServiceDesiredCount \
    --dimensions Name=Service,Value="$SERVICE_NAME" Name=Cluster,Value="$CLUSTER_NAME" \
    --start-time "$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S)" \
    --end-time "$(date -u +%Y-%m-%dT%H:%M:%S)" \
    --period 300 \
    --statistics Maximum \
    --query 'Datapoints[*].[Timestamp,Maximum]' \
    --output table || print_error "Métriques non disponibles"

echo ""

# 7. Dashboard URL
echo "7️⃣  Dashboard CloudWatch"
REGION=$(aws configure get region || echo "us-east-1")
DASHBOARD_URL="https://$REGION.console.aws.amazon.com/cloudwatch/home?region=$REGION#dashboards:name=CityGuided-ECS-ScaleToZero"
echo "  URL: $DASHBOARD_URL"
echo ""

# 8. Logs CloudWatch (dernières lignes)
echo "8️⃣  Logs CloudWatch (5 dernières minutes)..."
echo ""
echo "Scale-to-Zero Lambda:"
SCALE_TO_ZERO_LOG_GROUP="/aws/lambda/$(echo $SCALE_TO_ZERO_ARN | awk -F':' '{print $NF}')"
aws logs tail "$SCALE_TO_ZERO_LOG_GROUP" --since 5m --format short 2>/dev/null | tail -20 || print_error "Logs non disponibles"

echo ""
echo "Scale-Up Lambda:"
SCALE_UP_LOG_GROUP="/aws/lambda/$(echo $SCALE_UP_ARN | awk -F':' '{print $NF}')"
aws logs tail "$SCALE_UP_LOG_GROUP" --since 5m --format short 2>/dev/null | tail -20 || print_error "Logs non disponibles"

echo ""
echo "=================================="
print_success "Tests terminés !"
echo ""
echo "💡 Commandes utiles :"
echo "  - Logs Scale-to-Zero : aws logs tail '$SCALE_TO_ZERO_LOG_GROUP' --follow"
echo "  - Logs Scale-Up      : aws logs tail '$SCALE_UP_LOG_GROUP' --follow"
echo "  - Dashboard          : open '$DASHBOARD_URL'"
echo ""
