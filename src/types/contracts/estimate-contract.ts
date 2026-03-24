// ─── CONTRATO PÚBLICO: EstimaAI → RentabilIA (module-14) ─────────────────────
// Tipo exportado para consumo por módulos downstream.

export interface EstimateBaseline {
  estimateId: string
  projectId: string
  version: number
  totalMin: number   // horas mínimas (Prisma Decimal → number)
  totalMax: number   // horas máximas
  currency: string
  confidence: 'LOW' | 'MEDIUM' | 'HIGH'
  status: 'READY'   // Apenas estimates READY são consumíveis
}

/**
 * Converte um Estimate do Prisma para EstimateBaseline tipado.
 * Lança erro se o estimate não estiver com status READY.
 */
export function toEstimateBaseline(estimate: {
  id: string
  projectId: string
  version: number
  totalMin: unknown
  totalMax: unknown
  currency: string
  confidence: string
  status: string
}): EstimateBaseline {
  if (estimate.status !== 'READY') {
    throw new Error(`Estimate ${estimate.id} não está READY (status: ${estimate.status})`)
  }
  return {
    estimateId: estimate.id,
    projectId: estimate.projectId,
    version: estimate.version,
    totalMin: Number(estimate.totalMin),
    totalMax: Number(estimate.totalMax),
    currency: estimate.currency,
    confidence: estimate.confidence as EstimateBaseline['confidence'],
    status: 'READY',
  }
}
