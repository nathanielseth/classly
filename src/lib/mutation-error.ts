import { toast } from '@/components/ui/toast'

export function onMutationError(fallbackTitle: string) {
  return (err: unknown) => {
    const description = err instanceof Error ? err.message : undefined
    toast({
      variant: 'destructive',
      title: fallbackTitle,
      description,
    })
  }
}