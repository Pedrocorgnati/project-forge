// ─── CHANGE ORDER SHARED UTILITIES ────────────────────────────────────────────
// GAP-017: mapCO extraído das routes para utilitário compartilhado

/**
 * Converte campos Decimal do Prisma para Number e normaliza aliases de campo.
 * Garante que impactHours, impactCost, requestedBy e affectedTaskIds sejam expostos
 * de forma consistente em todas as routes de Change Order.
 */
interface RawChangeOrder {
  hoursImpact?: number | null
  costImpact?: number | null
  createdBy?: string
  createdAt?: string | Date
  tasks?: Array<{ taskId: string }>
  [key: string]: unknown
}

export function mapCO(co: RawChangeOrder) {
  return {
    ...co,
    impactHours: Number(co.hoursImpact),
    impactCost: Number(co.costImpact),
    requestedBy: co.createdBy,
    requestedAt: co.createdAt,
    affectedTaskIds: co.tasks?.map((t) => t.taskId) ?? [],
  }
}
