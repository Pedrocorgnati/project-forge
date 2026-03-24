/**
 * Mapeamento de erros do domínio RAG — alinhado com ERROR-CATALOG (src/lib/constants/errors.ts)
 *
 * Códigos existentes no catálogo: HANDOFF_050, HANDOFF_051, HANDOFF_080
 * Códigos adicionados neste módulo: HANDOFF_020, HANDOFF_052, HANDOFF_053
 */

export const RAG_ERRORS = {
  /** URL do repositório GitHub inválida (formato incorreto) */
  INVALID_REPO_URL: {
    code: 'HANDOFF_020',
    status: 400,
    message: 'URL do repositório inválida.',
  },
  /** Indexação já em andamento para este projeto */
  INDEXATION_IN_PROGRESS: {
    code: 'HANDOFF_050',
    status: 422,
    message: 'Indexação já em andamento para este projeto.',
  },
  /** Chunk de texto excede o limite permitido */
  CHUNK_TOO_LARGE: {
    code: 'HANDOFF_051',
    status: 422,
    message: 'Chunk de texto excede o limite de 2048 caracteres.',
  },
  /** Conteúdo de embedding rejeitado (ex: prompt injection) */
  CHUNK_REJECTED: {
    code: 'HANDOFF_052',
    status: 422,
    message: 'Conteúdo de embedding rejeitado.',
  },
  /** Dimensão do vetor incompatível com o esperado (384) */
  DIMENSION_MISMATCH: {
    code: 'HANDOFF_053',
    status: 422,
    message: 'Dimensão do vetor de embedding incompatível.',
  },
  /** Token GitHub sem permissão de leitura no repositório */
  GITHUB_PERMISSION: {
    code: 'HANDOFF_060',
    status: 422,
    message: 'Acesso negado ao repositório. Verifique as permissões do token.',
  },
  /** Repositório excede limite de arquivos para indexação */
  REPO_TOO_LARGE: {
    code: 'HANDOFF_061',
    status: 422,
    message: 'Repositório muito grande. Indexando apenas extensões relevantes.',
  },
  /** Índice RAG não encontrado para o projeto */
  NOT_FOUND: {
    code: 'HANDOFF_080',
    status: 404,
    message: 'Índice de contexto não encontrado.',
  },
  /** Query inválida (menos de 3 ou mais de 1000 caracteres) */
  INVALID_QUERY: {
    code: 'HANDOFF_020',
    status: 400,
    message: 'Pergunta inválida.',
  },
  /** RAGIndex não está com status COMPLETE */
  RAG_NOT_READY: {
    code: 'HANDOFF_050',
    status: 422,
    message: 'Projeto não indexado. Indexe os documentos primeiro.',
  },
  /** Claude CLI indisponível para geração de respostas */
  AI_UNAVAILABLE: {
    code: 'HANDOFF_060',
    status: 503,
    message: 'Serviço de IA temporariamente indisponível.',
  },
} as const

export type RAGErrorKey = keyof typeof RAG_ERRORS
