#!/usr/bin/env node
/**
 * scripts/check-bundle-size.js
 * Verifica que os chunks do Next.js estão dentro dos limites de tamanho.
 *
 * Uso:
 *   node scripts/check-bundle-size.js
 *   npm run bundle:check
 *
 * Limites:
 *   - Chunks individuais: 100KB
 *   - Falha com exit code 1 se exceder
 *   - Análise visual: ANALYZE=true npm run build → analyze/client.html
 */

const fs = require('fs')
const path = require('path')

const LIMITS = {
  route: 100 * 1024, // 100KB por chunk de rota
}

const buildManifestPath = path.join('.next', 'build-manifest.json')

if (!fs.existsSync(buildManifestPath)) {
  console.error('Build manifest não encontrado. Execute "npm run build" primeiro.')
  process.exit(1)
}

let passed = true
let totalChecks = 0
let failedChecks = 0

console.log('\nVerificação de Bundle Size:')
console.log('='.repeat(60))

// Verificar chunks em .next/static/chunks/
const chunksDir = path.join('.next', 'static', 'chunks')
if (fs.existsSync(chunksDir)) {
  const chunks = fs
    .readdirSync(chunksDir)
    .filter((f) => f.endsWith('.js'))
    .map((f) => ({
      name: f,
      size: fs.statSync(path.join(chunksDir, f)).size,
    }))
    .sort((a, b) => b.size - a.size)
    .slice(0, 15) // Top 15 maiores

  chunks.forEach((chunk) => {
    const sizeKB = (chunk.size / 1024).toFixed(1)
    const limit = LIMITS.route
    const exceeded = chunk.size > limit
    const status = exceeded ? 'EXCEDE LIMITE' : 'OK'

    if (exceeded) {
      passed = false
      failedChecks++
    }
    totalChecks++

    const statusPad = status.padEnd(14)
    const namePad = chunk.name.substring(0, 45).padEnd(47)
    console.log(`  ${statusPad} ${namePad} ${sizeKB}KB`)
  })
} else {
  console.error('.next/static/chunks/ não encontrado. Verifique se o build foi executado.')
  process.exit(1)
}

console.log('='.repeat(60))
console.log(`Resultado: ${totalChecks - failedChecks}/${totalChecks} checks passaram`)

if (!passed) {
  console.error('\nFALHA: Bundle size excede os limites configurados.')
  console.error('Execute "ANALYZE=true npm run build" para investigar os chunks.')
  process.exit(1)
} else {
  console.log('\nPASSOU: Todos os bundles dentro dos limites.')
  process.exit(0)
}
