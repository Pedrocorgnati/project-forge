/**
 * test-vector-search.ts
 *
 * Teste manual de busca vetorial end-to-end.
 * Execute: tsx scripts/test-vector-search.ts
 *
 * Requer:
 *   - DATABASE_URL e DIRECT_URL configurados no .env.local
 *   - Extension pgvector ativa no Supabase
 *   - Migrations aplicadas (npx prisma migrate dev --name init)
 *   - post-init-constraints.sql executado (função match_embeddings)
 */

import { prisma } from '../src/lib/db'
import { insertEmbedding } from '../src/lib/db/embeddings'
import { matchEmbeddings } from '../src/lib/db/vector-search'

const VECTOR_DIM = 384

function randomNormalizedVector(): number[] {
  const v = Array.from({ length: VECTOR_DIM }, () => Math.random() - 0.5)
  const norm = Math.sqrt(v.reduce((acc, x) => acc + x * x, 0))
  return v.map((x) => x / norm)
}

async function main() {
  console.log('🔍 Iniciando teste de busca vetorial...\n')

  // 1. Buscar um RAGIndex existente
  const ragIndex = await prisma.rAGIndex.findFirst()
  if (!ragIndex) {
    console.error('❌ Nenhum RAGIndex encontrado. Execute `npx prisma db seed` primeiro.')
    process.exit(1)
  }
  console.log(`✓ RAGIndex: ${ragIndex.id} (projeto: ${ragIndex.projectId})`)

  // 2. Inserir 3 embeddings de teste
  console.log('\n📝 Inserindo embeddings de teste...')
  const vectors = [randomNormalizedVector(), randomNormalizedVector(), randomNormalizedVector()]

  const ids = await Promise.all(
    vectors.map((v, i) =>
      insertEmbedding({
        ragIndexId: ragIndex.id,
        chunkText: `Chunk de teste ${i + 1}: conteúdo de exemplo para busca vetorial`,
        vector: v,
        filePath: `/src/test-chunk-${i + 1}.ts`,
        commitSha: `test-sha-${i + 1}`,
        metadata: { testIndex: i },
      })
    )
  )
  console.log(`✓ Inseridos ${ids.length} embeddings: ${ids.map((id) => id.slice(0, 8)).join(', ')}...`)

  // 3. Self-similarity: buscar o primeiro vetor
  console.log('\n🎯 Testando self-similarity (threshold=0.0)...')
  const selfResults = await matchEmbeddings(vectors[0], ragIndex.id, 5, 0.0)

  if (selfResults.length === 0) {
    console.error('❌ FALHA: Busca não retornou resultados')
    process.exit(1)
  }

  const topResult = selfResults[0]
  console.log(`✓ Top result: id=${topResult.id.slice(0, 8)}... similarity=${topResult.similarity.toFixed(4)}`)

  if (topResult.similarity < 0.99) {
    console.warn(`⚠️  Self-similarity baixa (${topResult.similarity.toFixed(4)} < 0.99) — verificar normalização do vetor`)
  } else {
    console.log('✓ Self-similarity ≈ 1.0 — PASSOU')
  }

  // 4. Ranking correto
  console.log('\n📊 Testando ranking (3 resultados, threshold=0.0)...')
  const rankResults = await matchEmbeddings(vectors[0], ragIndex.id, 3, 0.0)
  console.log(`✓ ${rankResults.length} resultados retornados`)

  if (rankResults.length >= 2) {
    const inOrder = rankResults.every((r, i) =>
      i === 0 || r.similarity <= rankResults[i - 1].similarity
    )
    console.log(`✓ Ranking correto (similarity decrescente): ${inOrder ? 'PASSOU' : 'FALHOU'}`)
  }

  // 5. Threshold filtrando
  console.log('\n🔒 Testando filtro por threshold (threshold=0.999)...')
  const thresholdResults = await matchEmbeddings(vectors[0], ragIndex.id, 5, 0.999)
  console.log(`✓ Com threshold=0.999: ${thresholdResults.length} resultado(s) (esperado: ≤1 — apenas self)`)

  // 6. Cleanup dos embeddings de teste
  console.log('\n🧹 Removendo embeddings de teste...')
  await prisma.$executeRaw`
    DELETE FROM embeddings WHERE id = ANY(${ids}::uuid[])
  `
  console.log(`✓ ${ids.length} embeddings removidos`)

  console.log('\n✅ Teste de busca vetorial concluído com sucesso!')
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
