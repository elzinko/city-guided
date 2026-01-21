# Guide de Publication - @bacasable/lifefindsaway

## Configuration Initiale (à faire une seule fois)

### 1. Créer un Personal Access Token (PAT) GitHub

1. Allez sur GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Cliquez "Generate new token (classic)"
3. Donnez un nom: `npm-packages`
4. Cochez les permissions:
   - `write:packages` (pour publier)
   - `read:packages` (pour installer)
   - `delete:packages` (optionnel, pour supprimer des versions)
5. Générez et **copiez le token** (vous ne le reverrez plus)

### 2. Configurer npm pour utiliser GitHub Packages

Créez ou éditez `~/.npmrc`:

```bash
@bacasable:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=VOTRE_TOKEN_ICI
```

Remplacez `VOTRE_TOKEN_ICI` par votre PAT GitHub.

## Publication

### Option 1: Publication manuelle

```bash
cd .lifefindsaway

# 1. Bumper la version (choisir: patch, minor, major)
npm version patch

# 2. Build
pnpm build

# 3. Publier
npm publish
```

### Option 2: Script automatique

```bash
cd .lifefindsaway
pnpm run publish:patch  # 0.1.0 → 0.1.1
# ou
pnpm run publish:minor  # 0.1.0 → 0.2.0
# ou
pnpm run publish:major  # 0.1.0 → 1.0.0
```

## Installation dans un autre projet

### 1. Configurer le projet pour utiliser GitHub Packages

Dans votre projet, créez/éditez `.npmrc`:

```
@bacasable:registry=https://npm.pkg.github.com
```

### 2. Installer le package

```bash
# Avec pnpm
pnpm add @bacasable/lifefindsaway

# Avec npm
npm install @bacasable/lifefindsaway

# Avec yarn
yarn add @bacasable/lifefindsaway
```

### 3. Utiliser le CLI

```bash
# Le CLI sera disponible globalement
npx lifefindsaway setup cursor

# Ou via pnpm
pnpm lifefindsaway setup cursor
```

## Mise à jour

### Dans le package source (lifefindsaway)

```bash
# Faire vos modifications...

# Publier une nouvelle version
cd .lifefindsaway
pnpm run publish:patch
```

### Dans les projets consommateurs

```bash
# Mettre à jour vers la dernière version
pnpm update @bacasable/lifefindsaway

# Ou spécifier une version précise
pnpm add @bacasable/lifefindsaway@0.2.0
```

## Vérifier les versions publiées

```bash
npm view @bacasable/lifefindsaway versions
```

Ou sur GitHub: https://github.com/bacasable?tab=packages

## Dépannage

### Erreur 401 (Unauthorized)

- Vérifiez que votre PAT est valide et dans `~/.npmrc`
- Vérifiez que vous avez les permissions `write:packages`

### Erreur 404 (Package not found)

- Le package n'a pas encore été publié
- Ou votre `.npmrc` n'est pas configuré pour pointer vers GitHub Packages

### "Cannot publish over existing version"

Vous essayez de republier la même version. Bumpez d'abord:

```bash
npm version patch
```

## Alternative: Installation locale (développement)

Si vous ne voulez pas publier, vous pouvez utiliser un lien local:

```bash
# Dans .lifefindsaway
pnpm link --global

# Dans votre projet
pnpm link --global @bacasable/lifefindsaway
```

Ou via le path:

```json
{
  "dependencies": {
    "@bacasable/lifefindsaway": "file:../.lifefindsaway"
  }
}
```
