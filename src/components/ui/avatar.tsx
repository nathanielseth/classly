import * as React from 'react'
import { Avatar as AvatarPrimitive } from '@base-ui/react/avatar'
import { cva  } from 'class-variance-authority'
import type {VariantProps} from 'class-variance-authority';

import { cn } from '@/lib/utils'

// TODO: rework this placeholder component

const avatarVariants = cva(
  'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 font-medium text-primary select-none',
  {
    variants: {
      size: {
        sm: 'size-7 text-xs',
        default: 'size-9 text-sm',
        lg: 'size-11 text-base',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  },
)

function Avatar({
  className,
  size,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root> &
  VariantProps<typeof avatarVariants>) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(avatarVariants({ size, className }))}
      {...props}
    />
  )
}

function AvatarImage(
  props: React.ComponentProps<typeof AvatarPrimitive.Image>,
) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className="size-full object-cover"
      {...props}
    />
  )
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn('flex size-full items-center justify-center', className)}
      {...props}
    />
  )
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export { Avatar, AvatarImage, AvatarFallback, avatarVariants, getInitials }