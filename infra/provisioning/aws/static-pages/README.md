# Page 503 - Service en cours de réveil

Cette page s'affiche quand le service ECS est à l'échelle zéro et redémarre.

## Intégration

### Option 1: Via Caddy (Recommandé)

Ajoutez la configuration suivante dans votre `Caddyfile`:

```caddy
reverse_proxy {$ALB_URL} {
    @unavailable status 503 502 504
    handle_response @unavailable {
        root * /srv/error-pages
        rewrite * /503.html
        file_server
    }
}
```

Puis montez le dossier `static-pages` dans votre conteneur Caddy :

```yaml
volumes:
  - ./infra/provisioning/aws/static-pages:/srv/error-pages:ro
```

### Option 2: Via S3 + CloudFront

Si vous utilisez CloudFront devant votre ALB :

1. Créez un bucket S3 public
2. Uploadez `503.html`  
3. Configurez Custom Error Responses dans CloudFront :
   - HTTP Error Code: 503
   - Response Page Path: /503.html  
   - HTTP Response Code: 503

### Option 3: Inline dans CDK (Non recommandé - limite de 1024 caractères)

ALB supporte des fixed-response actions mais limitées à 1024 caractères.

## Fonctionnalités de la page

- ✅ Design moderne avec glassmorphism
- ✅ Auto-refresh toutes les 5 secondes  
- ✅ Messages de progression
- ✅ Timeout après 2 minutes
- ✅ Responsive (mobile & desktop)
- ✅ Pas de dépendances externes (CSS & JS inline)

## Personnalisation

Vous pouvez personnaliser :
- Le délai d'auto-refresh (par défaut 5s)
- Les messages de progression
- Le nombre maximum de tentatives (par défaut 24 = 2min)
- Les couleurs et le style

Éditez simplement `static-pages/503.html`.
