import * as React from 'react'
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-react'
import { cva } from 'class-variance-authority'
import type { VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const inlineMessageVariants = cva(
  'flex items-start gap-2 rounded-md border px-3 py-2.5 text-sm [&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      tone: {
        error: 'border-destructive/25 bg-destructive/8 text-destructive',
        warning: 'border-warning/25 bg-warning/8 text-warning',
        success: 'border-success/25 bg-success/8 text-success',
        info: 'border-info/25 bg-info/8 text-info',
      },
    },
    defaultVariants: { tone: 'error' },
  },
)

const icons = {
  error: AlertCircle,
  warning: TriangleAlert,
  success: CheckCircle2,
  info: Info,
} as const

interface InlineMessageProps
  extends
    Omit<React.ComponentProps<'div'>, 'role'>,
    VariantProps<typeof inlineMessageVariants> {}

function InlineMessage({
  className,
  tone = 'error',
  children,
  ...props
}: InlineMessageProps) {
  const Icon = icons[tone ?? 'error']
  return (
    <div
      data-slot="inline-message"
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(inlineMessageVariants({ tone }), className)}
      {...props}
    >
      <Icon aria-hidden />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

export { InlineMessage, inlineMessageVariants }