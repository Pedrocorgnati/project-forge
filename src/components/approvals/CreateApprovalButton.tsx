'use client'

// src/components/approvals/CreateApprovalButton.tsx
// module-17-clientportal-approvals / TASK-6 ST003
// Botão que abre o modal de criação de aprovação
// Rastreabilidade: INT-107

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CreateApprovalModal } from './CreateApprovalModal'

interface ActiveClient {
  id: string
  clientEmail: string
  clientName: string
}

interface CreateApprovalButtonProps {
  projectId: string
  activeClients: ActiveClient[]
}

export function CreateApprovalButton({ projectId, activeClients }: CreateApprovalButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant="primary"
        size="md"
        icon={<Plus className="w-4 h-4" />}
        onClick={() => setOpen(true)}
        data-testid="CreateApprovalButton"
      >
        Nova Aprovação
      </Button>

      <CreateApprovalModal
        open={open}
        onOpenChange={setOpen}
        projectId={projectId}
        activeClients={activeClients}
      />
    </>
  )
}
