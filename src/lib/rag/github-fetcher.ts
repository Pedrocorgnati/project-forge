/**
 * GitHubFetcher — busca e sincroniza arquivos de repositórios GitHub via REST API.
 *
 * Funcionalidades:
 * - Busca árvore recursiva do repositório
 * - Filtra por extensões indexáveis, exclui pastas irrelevantes
 * - Sync incremental via comparação de SHA (commitSha no RAGDocument)
 * - Rate limiting automático (X-RateLimit-Reset + Retry-After)
 * - Tratamento de tree truncada para repos grandes
 */

import { prisma } from '@/lib/db'
import { createLogger } from '@/lib/logger'
import { DocumentIndexer } from './document-indexer'
import {
  RAG_INDEXABLE_EXTENSIONS,
  RAG_EXCLUDED_PATHS,
  RAG_GITHUB_RATE_LIMIT_DELAY_MS,
} from './constants'
import {
  GitHubApiUnreachableError,
  mapGitHubError,
} from './github-errors'

const log = createLogger('github-fetcher')

interface SyncOptions {
  ragIndexId: string
  repoOwner: string
  repoName: string
  branch: string
  lastCommitSha?: string | null
}

interface GitHubTreeItem {
  path: string
  sha: string
  size: number
  type: 'blob' | 'tree'
  url: string
}

interface SyncResult {
  indexed: number
  skipped: number
  failed: number
  truncated: boolean
  headSha: string | null
}

export class GitHubFetcher {
  private static readonly MAX_FILE_SIZE = 500_000 // 500KB

  /**
   * Sincroniza repositório GitHub com o RAG index.
   * Busca árvore, filtra arquivos indexáveis, sync incremental por SHA.
   */
  static async syncRepository(options: SyncOptions): Promise<SyncResult> {
    const { ragIndexId, repoOwner, repoName, branch } = options
    const repoUrl = `https://github.com/${repoOwner}/${repoName}`
    const headers = this.buildHeaders()

    // 1. Buscar referência da branch para obter HEAD SHA
    const refUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/git/ref/heads/${branch}`
    const refRes = await this.fetchWithRateLimit(refUrl, headers, repoUrl)
    const refData = (await refRes.json()) as { object: { sha: string } }
    const headSha = refData.object?.sha ?? null

    // 2. Buscar árvore completa (recursiva)
    const treeUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/git/trees/${branch}?recursive=1`
    const treeRes = await this.fetchWithRateLimit(treeUrl, headers, repoUrl)
    const treeData = (await treeRes.json()) as { tree: GitHubTreeItem[]; truncated?: boolean }

    let truncated = false
    if (treeData.truncated) {
      truncated = true
      log.warn(
        `Tree truncada para ${repoOwner}/${repoName}. Apenas os primeiros arquivos serão indexados.`,
      )
    }

    // 3. Filtrar apenas arquivos indexáveis
    const indexableFiles = treeData.tree.filter(
      (item) =>
        item.type === 'blob' &&
        item.size > 0 &&
        item.size < this.MAX_FILE_SIZE &&
        this.isIndexable(item.path),
    )

    log.info(
      { repoOwner, repoName, count: indexableFiles.length },
      `[GitHubFetcher] ${indexableFiles.length} arquivos indexáveis em ${repoOwner}/${repoName}`,
    )

    // 4. Sync incremental: buscar documentos existentes para comparar SHA
    const existingDocs = await prisma.rAGDocument.findMany({
      where: { ragIndexId, sourceType: 'github' },
      select: { id: true, sourcePath: true, commitSha: true },
    })
    const existingMap = new Map<string, { id: string; sourcePath: string; commitSha: string | null }>(
      existingDocs.map((d: { id: string; sourcePath: string; commitSha: string | null }) => [d.sourcePath, d] as [string, { id: string; sourcePath: string; commitSha: string | null }])
    )

    let indexed = 0
    let skipped = 0
    let failed = 0

    for (const file of indexableFiles) {
      try {
        // Incremental: pular se SHA não mudou
        const existing = existingMap.get(file.path)
        if (existing?.commitSha === file.sha) {
          skipped++
          continue
        }

        // Buscar conteúdo do arquivo
        const contentUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${file.path}?ref=${branch}`
        const contentRes = await this.fetchWithRateLimit(contentUrl, headers, repoUrl)
        const contentData = (await contentRes.json()) as { content: string; encoding: string }

        if (contentData.encoding !== 'base64') continue
        const content = Buffer.from(contentData.content, 'base64').toString('utf-8')

        // Upsert RAGDocument
        let ragDoc
        if (existing) {
          ragDoc = await prisma.rAGDocument.update({
            where: { id: existing.id },
            data: {
              content,
              commitSha: file.sha,
              metadata: { filePath: file.path, sha: file.sha, repoOwner, repoName, branch },
            },
          })
        } else {
          ragDoc = await prisma.rAGDocument.create({
            data: {
              ragIndexId,
              sourceType: 'github',
              sourcePath: file.path,
              content,
              commitSha: file.sha,
              metadata: { filePath: file.path, sha: file.sha, repoOwner, repoName, branch },
            },
          })
        }

        // Indexar (chunk → embed → store)
        await DocumentIndexer.indexDocument({
          ragIndexId,
          ragDocumentId: ragDoc.id,
          sourcePath: file.path,
          content,
          commitSha: file.sha,
        })

        indexed++

        // Delay entre arquivos para evitar rate limiting
        if (RAG_GITHUB_RATE_LIMIT_DELAY_MS > 0) {
          await new Promise((r) => setTimeout(r, RAG_GITHUB_RATE_LIMIT_DELAY_MS))
        }
      } catch (fileErr) {
        log.warn({ err: fileErr }, `Falha ao indexar ${file.path}`)
        failed++
      }
    }

    // 5. Atualizar RAGIndex com lastCommitSha e totalChunks
    if (headSha) {
      const embeddingCount = await prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*)::bigint as count FROM embeddings WHERE rag_index_id = ${ragIndexId}::uuid
      `
      await prisma.rAGIndex.update({
        where: { id: ragIndexId },
        data: {
          lastCommitSha: headSha,
          totalChunks: Number(embeddingCount[0]?.count ?? 0),
          githubOwner: repoOwner,
          githubRepo: repoName,
        },
      })
    }

    log.info(
      { indexed, skipped, failed, truncated },
      `[GitHubFetcher] Sync completo: ${indexed} indexados, ${skipped} sem alteração, ${failed} falhas`,
    )

    return { indexed, skipped, failed, truncated, headSha }
  }

  /** Verifica se o arquivo deve ser indexado por extensão e path */
  static isIndexable(path: string): boolean {
    const parts = path.split('/')
    if (parts.some((p) => RAG_EXCLUDED_PATHS.some((exc) => exc.replace('/', '') === p))) {
      return false
    }

    const dotIndex = path.lastIndexOf('.')
    if (dotIndex === -1) return false
    const ext = path.slice(dotIndex).toLowerCase()
    return RAG_INDEXABLE_EXTENSIONS.includes(ext)
  }

  /** Constrói headers para a GitHub API */
  private static buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'ProjectForge-HandoffAI/1.0',
    }
    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`
    }
    return headers
  }

  /** Fetch com tratamento de rate limiting do GitHub */
  static async fetchWithRateLimit(
    url: string,
    headers: Record<string, string>,
    repoUrl: string,
  ): Promise<Response> {
    let res: Response
    try {
      res = await fetch(url, { headers, signal: AbortSignal.timeout(30_000) })
    } catch (networkErr) {
      throw new GitHubApiUnreachableError(networkErr)
    }

    // Retry-After (secondary rate limit)
    const retryAfter = res.headers.get('Retry-After')
    if (retryAfter && (res.status === 403 || res.status === 429)) {
      const waitMs = parseInt(retryAfter) * 1000
      log.warn(`Secondary rate limit. Retry-After: ${retryAfter}s`)
      await new Promise((r) => setTimeout(r, waitMs))
      return this.fetchWithRateLimit(url, headers, repoUrl)
    }

    // Primary rate limit
    if (res.status === 403 || res.status === 429) {
      const remaining = res.headers.get('X-RateLimit-Remaining')
      const resetHeader = res.headers.get('X-RateLimit-Reset')

      if (remaining === '0' && resetHeader) {
        const resetTime = parseInt(resetHeader) * 1000
        const waitMs = Math.max(0, resetTime - Date.now()) + 1000
        log.warn(`Rate limited. Aguardando ${waitMs}ms...`)
        await new Promise((r) => setTimeout(r, waitMs))
        return this.fetchWithRateLimit(url, headers, repoUrl)
      }
    }

    // HTTP errors → typed errors
    if (res.status === 401 || res.status === 404) {
      mapGitHubError(res.status, repoUrl)
    }

    if (!res.ok) {
      throw new Error(`GitHub API error: ${res.status} ${res.statusText} — ${url}`)
    }

    return res
  }
}
