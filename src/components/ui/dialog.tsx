import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Dialog({ open, onOpenChange, title, description, children, className }: {
  open: boolean; onOpenChange: (open: boolean) => void; title: string; description?: string; children: ReactNode; className?: string
}) {
  const descriptionId = useId()
  return <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
    <DialogPrimitive.Portal><DialogPrimitive.Overlay className="dialog-overlay" />
      <DialogPrimitive.Content className={cn('dialog-content', className)} aria-describedby={description ? descriptionId : undefined}>
        <div className="dialog-heading"><div><DialogPrimitive.Title>{title}</DialogPrimitive.Title>
          {description && <DialogPrimitive.Description id={descriptionId}>{description}</DialogPrimitive.Description>}</div>
          <DialogPrimitive.Close className="btn btn-icon btn-ghost" aria-label="Fermer"><X size={20} /></DialogPrimitive.Close>
        </div>{children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  </DialogPrimitive.Root>
}
