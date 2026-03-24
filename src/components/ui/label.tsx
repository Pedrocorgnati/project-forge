// src/components/ui/label.tsx
// module-16-clientportal-auth / TASK-5 ST001 (correção pós-auditoria)
// Componente Label shadcn/ui padrão
// Rastreabilidade: GAP-011

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        className
      )}
      {...props}
    />
  )
)
Label.displayName = 'Label'

export { Label }
