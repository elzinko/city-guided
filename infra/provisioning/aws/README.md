# 🚀 City-Guided AWS Staging Provisioning

Infrastructure as Code (IaC) pour déployer City-Guided sur AWS EC2 Spot avec auto-sleep et DuckDNS.

## 💰 Coût estimé

- **EC2 Spot t3.medium** : ~$9/mois (avec sleep/wake automatique)
- **Elastic IP** : Gratuit (quand attaché à une instance)
- **DuckDNS** : Gratuit
- **Total** : **~$9-12/mois**

## 📋 Prérequis

1. **AWS CLI** installé et configuré
   ```bash
   aws configure
   ```

2. **Node.js 20+** et **pnpm**

3. **Compte GitHub** avec accès au repo

4. **DuckDNS Token** (déjà configuré dans constants.ts)

## 🎯 Installation

```bash
cd infra/provisioning/aws
pnpm install
```

## 🚀 Usage Rapide

### Setup Complet (Recommandé)

Lancement du wizard interactif qui fait tout :

```bash
pnpm run setup
```

Le wizard va :
1. ✅ Créer l'EC2 Spot instance avec CDK
2. ✅ Configurer Security Groups et Elastic IP
3. ✅ Mettre à jour DuckDNS avec l'IP publique
4. ✅ Configurer les secrets GitHub automatiquement
5. ✅ Setup l'environnement GitHub "staging-aws"

### Étapes Manuelles

Si vous préférez contrôler chaque étape :

```bash
# 1. Déployer l'infrastructure AWS
pnpm run provision:infra

# 2. Configurer GitHub CICD
pnpm run provision:cicd
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│  AWS EC2 Spot Instance (t3.medium)          │
│  ┌───────────────────────────────────┐      │
│  │ Docker Compose                    │      │
│  │  ├─ Frontend (Next.js)   :3000   │      │
│  │  ├─ API (Node.js)        :4000   │      │
│  │  └─ Nginx (Reverse Proxy) :80    │      │
│  └───────────────────────────────────┘      │
│                                             │
│  Elastic IP: XX.XX.XX.XX                   │
│  Auto-shutdown après 5min d'inactivité     │
└─────────────────────────────────────────────┘
                    ↓
         DuckDNS DNS Update
                    ↓
    city-guided-staging.duckdns.org
```

## 📦 Ce qui est provisionné

### Infrastructure AWS (CDK)

- **EC2 Spot Instance** : t3.medium (2 vCPU, 4GB RAM)
- **Security Group** : Ports 22 (SSH), 80 (HTTP), 443 (HTTPS)
- **Elastic IP** : IP publique fixe
- **IAM Role** : Pour SSM et CloudWatch
- **User Data** : Installation Docker, Docker Compose, script d'auto-shutdown

### GitHub CICD

- **Environment** : staging-aws avec protection
- **Secrets** :
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
  - `AWS_REGION`
  - `EC2_INSTANCE_ID`
  - `EC2_PUBLIC_IP`
  - `DUCKDNS_TOKEN`
  - `DUCKDNS_DOMAIN`

### DuckDNS

- **Domain** : city-guided-staging.duckdns.org
- **Auto-update** : À chaque déploiement

## 🔄 Workflow CI/CD

```
Push to main
    ↓
GitHub Actions: Build Docker images
    ↓
Check EC2 state (start if stopped)
    ↓
Update DuckDNS with current IP
    ↓
Deploy Docker containers to EC2
    ↓
Health checks
    ↓
✅ Deployment complete
```

## 🛠️ Commandes CDK

```bash
# Voir les changements avant déploiement
pnpm run diff

# Générer le template CloudFormation
pnpm run synth

# Déployer manuellement
pnpm run deploy

# Détruire l'infrastructure
pnpm run destroy
```

## 🔒 Sécurité

- Clé SSH stockée dans `~/.ssh/city-guided-staging.pem` (créée automatiquement)
- Secrets GitHub jamais committés
- `.env.staging` gitignored
- Security Group limité aux ports nécessaires

## 🐛 Dépannage

### "Key pair not found"

Le script créera automatiquement une paire de clés SSH. Si vous voulez utiliser une clé existante, modifiez `EC2_CONFIG.keyPairName` dans `constants.ts`.

### "Stack already exists"

```bash
pnpm run destroy  # Détruit le stack existant
pnpm run deploy   # Redéploie
```

### "Cannot connect to EC2"

1. Vérifier que l'instance est démarrée :
   ```bash
   aws ec2 describe-instances --instance-ids <INSTANCE_ID>
   ```

2. Vérifier le Security Group :
   ```bash
   aws ec2 describe-security-groups --group-ids <SG_ID>
   ```

3. Se connecter en SSH :
   ```bash
   ssh -i ~/.ssh/city-guided-staging.pem ec2-user@<PUBLIC_IP>
   ```

### "DuckDNS not updating"

Vérifier le token dans `constants.ts` et tester manuellement :
```bash
curl "https://www.duckdns.org/update?domains=city-guided-staging&token=<TOKEN>&ip=<IP>"
```

## 📊 Monitoring

- **GitHub Actions** : https://github.com/elzinko/city-guided/actions
- **AWS Console** : https://console.aws.amazon.com/ec2
- **DuckDNS** : https://www.duckdns.org
- **Application** : https://city-guided-staging.duckdns.org

## 🔧 Configuration Avancée

### Modifier le type d'instance

Éditez `constants.ts` :
```typescript
export const EC2_CONFIG = {
  instanceType: 't3.small', // Change ici
  // ...
};
```

### Ajouter des variables d'environnement

1. Ajoutez-les dans `.env.staging.template`
2. Configurez-les comme secrets GitHub dans `provision-cicd.ts`
3. Utilisez-les dans `docker-compose.staging.yml`

### Désactiver l'auto-shutdown

Éditez le User Data dans `lib/staging-stack.ts` pour retirer le cron job.

## 📝 Notes

- L'instance EC2 s'arrête automatiquement après 5 minutes d'inactivité
- GitHub Actions démarre l'instance automatiquement au déploiement
- Utilise Docker multi-stage builds pour optimiser la taille des images
- Nginx reverse proxy pour gérer HTTP/HTTPS
