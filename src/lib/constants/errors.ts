/**
 * Catálogo centralizado de erros — gerado a partir do ERROR-CATALOG.md
 * Formato: {MODULE}_{NNN}
 */
export const ERROR_CODES = {
  // ── AUTH / AUTHZ ──────────────────────────────────────────────────────────
  AUTH_001: {
    code: 'AUTH_001',
    message: 'Não autenticado. Faça login para continuar.',
    httpStatus: 401,
  },
  AUTH_002: {
    code: 'AUTH_002',
    message: 'Token expirado. Faça login novamente.',
    httpStatus: 401,
  },
  AUTH_003: {
    code: 'AUTH_003',
    message: 'Acesso negado. Permissão insuficiente.',
    httpStatus: 403,
  },
  AUTH_004: {
    code: 'AUTH_004',
    message: 'Credenciais inválidas.',
    httpStatus: 401,
  },
  AUTH_005: {
    code: 'AUTH_005',
    message: 'Acesso a dados financeiros requer role SOCIO ou PM.',
    httpStatus: 403,
  },
  AUTH_006: {
    code: 'AUTH_006',
    message: 'Acesso cross-organization não permitido.',
    httpStatus: 403,
  },
  AUTH_007: {
    code: 'AUTH_007',
    message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
    httpStatus: 429,
  },
  AUTH_008: {
    code: 'AUTH_008',
    message: 'Token inválido ou adulterado.',
    httpStatus: 401,
  },

  // ── VALIDATION ────────────────────────────────────────────────────────────
  VAL_001: {
    code: 'VAL_001',
    message: 'Dados de entrada inválidos.',
    httpStatus: 422,
  },
  VAL_002: {
    code: 'VAL_002',
    message: 'Campo obrigatório ausente.',
    httpStatus: 422,
  },
  VAL_003: {
    code: 'VAL_003',
    message: 'Formato de campo inválido.',
    httpStatus: 422,
  },
  VAL_004: {
    code: 'VAL_004',
    message: 'Valor fora do intervalo permitido.',
    httpStatus: 422,
  },
  VAL_005: {
    code: 'VAL_005',
    message: 'Campo não permitido nesta operação.',
    httpStatus: 400,
  },

  // ── PROJECT ────────────────────────────────────────────────────────────────
  PROJECT_050: {
    code: 'PROJECT_050',
    message: 'Projeto já existe com este nome na organização.',
    httpStatus: 409,
  },
  PROJECT_051: {
    code: 'PROJECT_051',
    message: 'Slug de projeto já está em uso.',
    httpStatus: 409,
  },
  PROJECT_080: {
    code: 'PROJECT_080',
    message: 'Projeto não encontrado.',
    httpStatus: 404,
  },

  // ── BRIEF ─────────────────────────────────────────────────────────────────
  BRIEF_050: {
    code: 'BRIEF_050',
    message: 'Brief já existe para este projeto.',
    httpStatus: 422,
  },
  BRIEF_080: {
    code: 'BRIEF_080',
    message: 'Brief não encontrado.',
    httpStatus: 404,
  },
  BRIEF_081: {
    code: 'BRIEF_081',
    message: 'Já existe uma sessão ativa para este brief.',
    httpStatus: 409,
  },
  BRIEF_082: {
    code: 'BRIEF_082',
    message: 'Brief já foi concluído e não aceita novas sessões.',
    httpStatus: 422,
  },
  BRIEF_083: {
    code: 'BRIEF_083',
    message: 'Brief não está completo. Conclua a entrevista antes de prosseguir.',
    httpStatus: 422,
  },

  // ── PRD ───────────────────────────────────────────────────────────────────
  PRD_001: {
    code: 'PRD_GENERATION_ERROR',
    message: 'Falha ao gerar o PRD. Tente novamente.',
    httpStatus: 500,
  },
  PRD_080: {
    code: 'PRD_NOT_FOUND',
    message: 'PRD ainda não foi gerado para este brief.',
    httpStatus: 404,
  },

  // ── DOCUMENT ──────────────────────────────────────────────────────────────
  DOC_050: {
    code: 'DOC_050',
    message: 'Regra de negócio de documento violada.',
    httpStatus: 422,
  },
  DOC_051: {
    code: 'DOC_051',
    message: 'Documento já existe neste status.',
    httpStatus: 409,
  },
  DOC_052: {
    code: 'DOC_052',
    message: 'SLA expirado. O prazo para aprovação foi ultrapassado.',
    httpStatus: 422,
  },
  DOC_080: {
    code: 'DOC_080',
    message: 'Documento não encontrado.',
    httpStatus: 404,
  },

  // ── TASK ──────────────────────────────────────────────────────────────────
  TASK_080: {
    code: 'TASK_080',
    message: 'Task não encontrada.',
    httpStatus: 404,
  },

  // ── SCOPE ALERT ───────────────────────────────────────────────────────────
  SCOPE_050: {
    code: 'SCOPE_050',
    message: 'Alerta já foi dismissado e não pode ser alterado.',
    httpStatus: 409,
  },
  SCOPE_051: {
    code: 'SCOPE_051',
    message: 'Alerta já está acknowledged.',
    httpStatus: 409,
  },
  SCOPE_080: {
    code: 'SCOPE_080',
    message: 'Alerta de escopo não encontrado.',
    httpStatus: 404,
  },

  // ── CHANGE ORDER ──────────────────────────────────────────────────────────
  CO_001: {
    code: 'CO_001',
    message: 'Permissão insuficiente para esta ação de Change Order.',
    httpStatus: 403,
  },
  CO_020: {
    code: 'CO_020',
    message: 'Dados inválidos ou campos obrigatórios ausentes.',
    httpStatus: 422,
  },
  CO_050: {
    code: 'CO_050',
    message: 'Change order em status inválido para esta operação.',
    httpStatus: 409,
  },
  CO_051: {
    code: 'CO_051',
    message: 'Já existe uma Change Order aguardando aprovação neste projeto.',
    httpStatus: 409,
  },
  CO_080: {
    code: 'CO_080',
    message: 'Change order não encontrada.',
    httpStatus: 404,
  },
  CO_081: {
    code: 'CO_081',
    message: 'Projeto não encontrado.',
    httpStatus: 404,
  },

  // ── TIMESHEET ─────────────────────────────────────────────────────────────
  TS_050: {
    code: 'TS_050',
    message: 'Registro de horas inválido (máximo 24h por entrada).',
    httpStatus: 422,
  },
  TS_051: {
    code: 'TS_051',
    message: 'Data no futuro não é permitida.',
    httpStatus: 422,
  },
  TS_052: {
    code: 'TS_052',
    message: 'Prazo de undo (24h) expirado para este registro.',
    httpStatus: 422,
  },
  TS_053: {
    code: 'TS_053',
    message: 'Janela de edição de 7 dias expirada para este registro.',
    httpStatus: 422,
  },
  TS_054: {
    code: 'TS_054',
    message: 'Apenas o dono do registro pode editá-lo.',
    httpStatus: 403,
  },
  TS_055: {
    code: 'TS_055',
    message: 'Horas devem ser múltiplo de 0.25.',
    httpStatus: 422,
  },
  TS_060: {
    code: 'TS_060',
    message: 'Nenhuma configuração de custo ativa para este role.',
    httpStatus: 422,
  },
  TS_061: {
    code: 'TS_061',
    message: 'Usuário não é membro deste projeto.',
    httpStatus: 422,
  },
  TS_062: {
    code: 'TS_062',
    message: 'Conflito de configuração de custo (unique constraint).',
    httpStatus: 409,
  },
  TS_080: {
    code: 'TS_080',
    message: 'Registro de timesheet não encontrado.',
    httpStatus: 404,
  },
  TS_081: {
    code: 'TS_081',
    message: 'Configuração de custo não encontrada.',
    httpStatus: 404,
  },

  // ── HANDOFF / RAG ─────────────────────────────────────────────────────────
  HANDOFF_020: {
    code: 'HANDOFF_020',
    message: 'URL do repositório inválida.',
    httpStatus: 400,
  },
  HANDOFF_050: {
    code: 'HANDOFF_050',
    message: 'Indexação já em andamento para este projeto.',
    httpStatus: 422,
  },
  HANDOFF_051: {
    code: 'HANDOFF_051',
    message: 'Chunk de texto excede o limite de 2048 caracteres.',
    httpStatus: 422,
  },
  HANDOFF_052: {
    code: 'HANDOFF_052',
    message: 'Conteúdo de embedding rejeitado.',
    httpStatus: 422,
  },
  HANDOFF_053: {
    code: 'HANDOFF_053',
    message: 'Dimensão do vetor de embedding incompatível.',
    httpStatus: 422,
  },
  HANDOFF_060: {
    code: 'HANDOFF_060',
    message: 'Acesso negado ao repositório. Verifique as permissões do token.',
    httpStatus: 422,
  },
  HANDOFF_061: {
    code: 'HANDOFF_061',
    message: 'Repositório muito grande. Indexando apenas extensões relevantes.',
    httpStatus: 422,
  },
  HANDOFF_080: {
    code: 'HANDOFF_080',
    message: 'Índice RAG não encontrado.',
    httpStatus: 404,
  },

  // ── CLIENT PORTAL / APPROVAL ──────────────────────────────────────────────
  APPROVAL_080: {
    code: 'APPROVAL_080',
    message: 'Convite ativo já existe para este email/projeto.',
    httpStatus: 409,
  },
  APPROVAL_081: {
    code: 'APPROVAL_081',
    message: 'Token de convite não encontrado.',
    httpStatus: 404,
  },
  APPROVAL_082: {
    code: 'APPROVAL_082',
    message: 'Este convite já foi utilizado.',
    httpStatus: 409,
  },
  APPROVAL_083: {
    code: 'APPROVAL_083',
    message: 'Este convite foi revogado.',
    httpStatus: 410,
  },

  // ── APPROVAL WORKFLOW (module-17) ──────────────────────────────────────────
  APPROVAL_050: {
    code: 'APPROVAL_050',
    message: 'Cliente não encontrado ou sem acesso ativo neste projeto.',
    httpStatus: 404,
  },
  APPROVAL_051: {
    code: 'APPROVAL_051',
    message: 'Esta aprovação já foi respondida.',
    httpStatus: 409,
  },

  // ── RATE LIMIT ────────────────────────────────────────────────────────────
  RATE_001: {
    code: 'RATE_001',
    message: 'Limite de requisições atingido. Tente novamente em 1 minuto.',
    httpStatus: 429,
  },
  RATE_002: {
    code: 'RATE_002',
    message: 'Limite de indexações atingido. Máximo 5 por hora.',
    httpStatus: 429,
  },

  // ── ESTIMATE ──────────────────────────────────────────────────────────────
  ESTIMATE_050: {
    code: 'ESTIMATE_050',
    message: 'Custo total abaixo do mínimo de mercado para este tipo de projeto.',
    httpStatus: 422,
  },
  ESTIMATE_080: {
    code: 'ESTIMATE_080',
    message: 'Estimativa não encontrada.',
    httpStatus: 404,
  },

  // ── SYSTEM ────────────────────────────────────────────────────────────────
  SYS_001: {
    code: 'SYS_001',
    message: 'Erro interno do servidor.',
    httpStatus: 500,
  },
  SYS_002: {
    code: 'SYS_002',
    message: 'Serviço temporariamente indisponível.',
    httpStatus: 503,
  },
  SYS_003: {
    code: 'SYS_003',
    message: 'Tempo limite da operação atingido.',
    httpStatus: 504,
  },
  SYS_010: {
    code: 'SYS_010',
    message: 'IA indisponível. Operando em modo degradado.',
    httpStatus: 503,
  },
} as const

export type ErrorCode = keyof typeof ERROR_CODES
