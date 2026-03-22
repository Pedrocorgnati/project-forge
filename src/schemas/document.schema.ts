import { z } from 'zod'
import { DocumentType, DocumentStatus, ApprovalAction } from '@prisma/client'

export const CreateDocumentSchema = z.object({
  projectId: z.string().uuid(),
  type: z.nativeEnum(DocumentType),
  title: z.string().min(1).max(255),
  content: z.string().min(1),
})

export const CreateDocumentVersionSchema = z.object({
  content: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const ListDocumentsSchema = z.object({
  projectId: z.string().uuid(),
  type: z.nativeEnum(DocumentType).optional(),
  status: z.nativeEnum(DocumentStatus).optional(),
})

export const DiffDocumentSchema = z.object({
  v1: z.coerce.number().int().positive(),
  v2: z.coerce.number().int().positive(),
})

export const SendApprovalSchema = z.object({
  documentId: z.string().uuid(),
})

export const ApprovalActionSchema = z.object({
  action: z.nativeEnum(ApprovalAction),
  comment: z.string().max(2000).optional(),
})

export type CreateDocumentInput = z.infer<typeof CreateDocumentSchema>
export type CreateDocumentVersionInput = z.infer<typeof CreateDocumentVersionSchema>
export type ApprovalActionInput = z.infer<typeof ApprovalActionSchema>
