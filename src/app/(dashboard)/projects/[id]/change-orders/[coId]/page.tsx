// ─── CHANGE ORDER DETAIL PAGE ─────────────────────────────────────────────────
// module-11-scopeshield-change-orders / TASK-2
// Redireciona para a lista com o detail aberto via query param
// Rastreabilidade: INT-074

import { redirect } from 'next/navigation'

interface ChangeOrderDetailPageProps {
  params: Promise<{ id: string; coId: string }>
}

export default async function ChangeOrderDetailPage({ params }: ChangeOrderDetailPageProps) {
  const { id: projectId, coId } = await params
  // Redireciona para a lista com query param para abrir o detail automaticamente
  redirect(`/projects/${projectId}/change-orders?open=${coId}`)
}
