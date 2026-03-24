// ─── CHANGE ORDER SCHEMAS (legacy shim) ───────────────────────────────────────
// GAP-018: CreateChangeOrderSchema e CreateChangeOrderInput migrados para
// '@/lib/schemas/change-order'. Este arquivo mantém apenas ListChangeOrdersSchema
// que ainda não existe na lib canônica.
// TODO: mover ListChangeOrdersSchema para lib e remover este arquivo.

import { z } from 'zod'

export const ListChangeOrdersSchema = z.object({
  projectId: z.string().uuid(),
  status: z.enum(['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED']).optional(),
})
