import { prisma } from '@/lib/db'
import { createLogger } from '@/lib/logger'
import { PRDStatus } from '@/types/briefforge'
import type { PRDDocument } from '@/types/briefforge'

const log = createLogger('briefforge/document-service')

// ─── ERRORS ───────────────────────────────────────────────────────────────────

export class ImmutableDocumentError extends Error {
  readonly statusCode = 422
  readonly code = 'DOC_050'
  constructor(message: string) {
    super(message)
    this.name = 'ImmutableDocumentError'
  }
}

// ─── DOCUMENT SERVICE ─────────────────────────────────────────────────────────

/**
 * Serviço de documentos PRD — padrão append-only.
 * NUNCA usa prisma.pRDDocument.update() para content de documentos READY.
 * Design intencional: PRDDocument é imutável após criação (sem updatedAt).
 */
export class DocumentService {
  /**
   * ÚNICA forma de criar um PRDDocument.
   * Incrementa version automaticamente via transaction atômica.
   * Nunca sobrescreve versões existentes.
   */
  static async createVersion(input: {
    briefId: string
    generatedBy: string
    status: PRDStatus
    content: string
  }): Promise<PRDDocument> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return prisma.$transaction(async (tx: any) => {
      const lastVersion = await tx.pRDDocument.findFirst({
        where: { briefId: input.briefId },
        orderBy: { version: 'desc' },
        select: { version: true },
      })

      const nextVersion = (lastVersion?.version ?? 0) + 1

      const doc = await tx.pRDDocument.create({
        data: {
          briefId: input.briefId,
          version: nextVersion,
          content: input.content,
          generatedBy: input.generatedBy,
          status: input.status,
        },
      })

      return doc as unknown as PRDDocument
    })
  }

  /**
   * Única atualização de status permitida: GENERATING → READY com content.
   * Lança ImmutableDocumentError se o documento já está READY.
   */
  static async finalizeGeneration(id: string, content: string): Promise<PRDDocument> {
    const existing = await prisma.pRDDocument.findUniqueOrThrow({ where: { id } })

    if (existing.status === PRDStatus.READY) {
      throw new ImmutableDocumentError(
        `PRDDocument ${id} já está READY e não pode ser modificado`,
      )
    }

    const doc = await prisma.pRDDocument.update({
      where: { id },
      data: { status: 'READY', content },
    })

    return doc as unknown as PRDDocument
  }

  /**
   * Marca documento como ERROR. Única outra atualização permitida.
   */
  static async markError(id: string, errorMessage: string): Promise<void> {
    const existing = await prisma.pRDDocument.findUnique({ where: { id } })

    if (existing?.status === PRDStatus.READY) {
      throw new ImmutableDocumentError(
        `PRDDocument ${id} está READY e não pode ser marcado como ERROR`,
      )
    }

    await prisma.pRDDocument.update({
      where: { id },
      data: { status: 'ERROR', content: `[ERRO DE GERAÇÃO]: ${errorMessage}` },
    })
  }

  /**
   * Retorna a versão mais recente do PRD para um brief.
   */
  static async findLatest(briefId: string): Promise<PRDDocument | null> {
    const doc = await prisma.pRDDocument.findFirst({
      where: { briefId },
      orderBy: { version: 'desc' },
    })

    return doc as unknown as PRDDocument | null
  }

  /**
   * Busca PRDDocument por ID.
   */
  static async findById(id: string): Promise<PRDDocument | null> {
    const doc = await prisma.pRDDocument.findUnique({ where: { id } })
    return doc as unknown as PRDDocument | null
  }

  /**
   * Lista todas as versões do PRD para um brief, em ordem decrescente.
   * Não inclui content (campo pesado) — apenas metadados.
   */
  static async listVersions(briefId: string): Promise<Omit<PRDDocument, 'content'>[]> {
    const docs = await prisma.pRDDocument.findMany({
      where: { briefId },
      orderBy: { version: 'desc' },
      select: {
        id: true,
        briefId: true,
        version: true,
        status: true,
        createdAt: true,
        generatedBy: true,
      },
    })

    return docs as unknown as Omit<PRDDocument, 'content'>[]
  }

  /**
   * Registra acesso ao documento (fire-and-forget — não bloqueia resposta).
   * Erros de log nunca propagam para o cliente.
   */
  static logAccess(input: {
    documentId: string
    accessedBy: string
    action?: 'VIEW' | 'EXPORT_MD' | 'EXPORT_PDF'
    ipAddress?: string
    userAgent?: string
  }): void {
    prisma.documentAccessLog
      .create({
        data: {
          documentId: input.documentId,
          accessedBy: input.accessedBy,
          action: input.action ?? 'VIEW',
          ipAddress: input.ipAddress ?? null,
          userAgent: input.userAgent ?? null,
        },
      })
      .catch((err: unknown) =>
        log.error({ err }, '[DocumentService.logAccess] Erro ao registrar acesso'),
      )
  }
}
