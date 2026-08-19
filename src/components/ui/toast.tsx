import * as React from 'react'
import { Toast as ToastPrimitive } from '@base-ui/react/toast'

const createToastManager = ToastPrimitive.createToastManager
import { CheckCircle2, Info, TriangleAlert, X, XCircle } from 'lucide-react'

import { cn } from '@/lib/utils'

export const toastManager = createToastManager()

type ToastVariant = 'default' | 'success' | 'warning' | 'destructive'

const variantIcon: Record<
  ToastVariant,
  React.ComponentType<{ className?: string }>
> = {
  default: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
  destructive: XCircle,
}

const variantIconClass: Record<ToastVariant, string> = {
  default: 'text-foreground',
  success: 'text-primary',
  warning: 'text-warning',
  destructive: 'text-destructive',
}

export function toast(
  options: Parameters<typeof toastManager.add>[0] & { variant?: ToastVariant },
) {
  const { variant = 'default', ...rest } = options
  return toastManager.add({ ...rest, type: variant })
}

function ToastProvider(
  props: React.ComponentProps<typeof ToastPrimitive.Provider>,
) {
  return <ToastPrimitive.Provider toastManager={toastManager} {...props} />
}

function ToastViewport({
  className,
  ...props
}: React.ComponentProps<typeof ToastPrimitive.Viewport>) {
  return (
    <ToastPrimitive.Portal>
      <ToastPrimitive.Viewport
        data-slot="toast-viewport"
        className={cn(
          'fixed bottom-4 right-4 z-100 flex w-full max-w-sm flex-col gap-2',
          className,
        )}
        {...props}
      />
    </ToastPrimitive.Portal>
  )
}

function Toasts() {
  const { toasts } = ToastPrimitive.useToastManager()

  return (
    <>
      {toasts.map((t) => {
        const variant = (t.type as ToastVariant) ?? 'default'
        const Icon = variantIcon[variant]

        return (
          <ToastPrimitive.Root
            key={t.id}
            toast={t}
            data-slot="toast"
            className={cn(
              'relative flex w-full items-start gap-3 rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-float',
              'data-starting-style:translate-x-(--toast-swipe-movement-x,0) data-starting-style:opacity-0',
              'data-ending-style:opacity-0',
              'transition-all duration-200',
            )}
          >
            <Icon
              className={cn(
                'mt-0.5 size-4.5 shrink-0',
                variantIconClass[variant],
              )}
            />
            <div className="flex-1 space-y-0.5">
              {t.title && (
                <ToastPrimitive.Title className="text-sm font-semibold text-foreground" />
              )}
              {t.description && (
                <ToastPrimitive.Description className="text-sm text-muted-foreground" />
              )}
            </div>
            <ToastPrimitive.Close
              aria-label="Dismiss"
              className="rounded-md p-1 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-muted-foreground"
            >
              <X className="size-3.5" />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        )
      })}
    </>
  )
}

function Toaster() {
  return (
    <ToastProvider>
      <ToastViewport>
        <Toasts />
      </ToastViewport>
    </ToastProvider>
  )
}

export { Toaster }