/** Constantes do domínio RAG — módulo 12 (HandoffAI Indexing) */

/** Tamanho padrão de cada chunk de texto (caracteres) */
export const RAG_CHUNK_SIZE = 1000

/** Overlap entre chunks consecutivos (caracteres) */
export const RAG_CHUNK_OVERLAP = 200

/** Tamanho mínimo de chunk — chunks menores são descartados */
export const RAG_MIN_CHUNK_SIZE = 100

/** Dimensão dos vetores de embedding (text-embedding-3-small) */
export const RAG_EMBEDDING_DIMENSIONS = 384

/** Quantidade de chunks por batch de embedding */
export const RAG_EMBEDDING_BATCH_SIZE = 20

/** Extensões de arquivos indexáveis do GitHub */
export const RAG_INDEXABLE_EXTENSIONS = ['.md', '.ts', '.tsx', '.js', '.py', '.json']

/** Paths excluídos da indexação do GitHub */
export const RAG_EXCLUDED_PATHS = ['node_modules/', '.git/', 'dist/', 'build/', '.next/']

/** Delay entre batches para respeitar rate limits do GitHub (ms) */
export const RAG_GITHUB_RATE_LIMIT_DELAY_MS = 100

/** Limite máximo de arquivos por repositório */
export const RAG_MAX_REPO_FILES = 10_000

/** Tamanho máximo de chunk text no banco (validação Zod) */
export const RAG_MAX_CHUNK_TEXT_LENGTH = 2048
