/**
 * Erros tipados para integração GitHub — códigos HANDOFF_060/061/062
 * Mapeiam status HTTP da GitHub API para erros diagnosticáveis.
 */

/**
 * HANDOFF_060 — GitHub API inacessível (network error / timeout)
 */
export class GitHubApiUnreachableError extends Error {
  readonly code = 'HANDOFF_060'

  constructor(cause?: unknown) {
    const detail = cause instanceof Error ? cause.message : String(cause ?? 'network error')
    super(`GitHub API inacessível: ${detail}`)
    this.name = 'GitHubApiUnreachableError'
  }
}

/**
 * HANDOFF_061 — Token GitHub inválido ou expirado (HTTP 401)
 */
export class GitHubTokenInvalidError extends Error {
  readonly code = 'HANDOFF_061'

  constructor() {
    super('Token GitHub inválido ou expirado (401). Verifique a variável GITHUB_TOKEN.')
    this.name = 'GitHubTokenInvalidError'
  }
}

/**
 * HANDOFF_062 — Repositório não encontrado (HTTP 404)
 */
export class GitHubRepoNotFoundError extends Error {
  readonly code = 'HANDOFF_062'

  constructor(repoUrl: string) {
    super(`Repositório não encontrado: ${repoUrl}. Verifique a URL e as permissões do token.`)
    this.name = 'GitHubRepoNotFoundError'
  }
}

/**
 * Mapeia status HTTP da GitHub API para erros tipados HANDOFF_0xx.
 */
export function mapGitHubError(status: number, repoUrl: string): never {
  if (status === 401) throw new GitHubTokenInvalidError()
  if (status === 404) throw new GitHubRepoNotFoundError(repoUrl)
  throw new Error(`GitHub API error inesperado: HTTP ${status}`)
}
