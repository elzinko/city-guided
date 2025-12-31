#!/usr/bin/env node
/* eslint-disable no-console */
const { spawnSync } = require('child_process')
const path = require('path')

const root = path.join(__dirname, '..')
const composeFile = path.join(root, 'infra', 'docker', 'docker-compose.yml')

const skipOsrm = process.env.SKIP_OSRM === '1' || process.env.OSRM_AUTO === '0'

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { stdio: 'inherit', ...opts })
  return res.status ?? res.signal ?? 1
}

if (!skipOsrm) {
  console.log('➡️  Démarrage OSRM via docker compose (profil osrm)...')
  const status = run('docker', ['compose', '-f', composeFile, '--profile', 'osrm', 'up', '-d', 'osrm'], {
    cwd: root,
  })
  if (status !== 0) {
    console.warn('⚠️  OSRM non démarré (Docker manquant ou erreur). Mets SKIP_OSRM=1 pour ignorer cette étape.')
  }
} else {
  console.log('⏭️  OSRM ignoré (SKIP_OSRM=1 ou OSRM_AUTO=0).')
}

const devStatus = run('pnpm', ['-r', '--parallel', '--filter', 'apps-web-frontend', '--filter', 'services-api', 'dev'], {
  cwd: root,
})
process.exit(devStatus)
