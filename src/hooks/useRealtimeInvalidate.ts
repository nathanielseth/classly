import { useEffect } from 'react'
import { useQueryClient, type QueryKey } from '@tanstack/react-query'
import { getBrowserSupabase } from '@/lib/browser-supabase'

interface UseRealtimeInvalidateOptions {
  channel: string
  table: string
  filter?: string
  queryKey: QueryKey
  enabled?: boolean
}

// keeps realtime updates consistent with server‑enforced authorization by always invalidating and refetching instead of merging payloads
export function useRealtimeInvalidate({
  channel,
  table,
  filter,
  queryKey,
  enabled = true,
}: UseRealtimeInvalidateOptions) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!enabled) return

    const supabase = getBrowserSupabase()
    const sub = supabase
      .channel(channel)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter },
        () => {
          void queryClient.invalidateQueries({ queryKey })
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(sub)
    }
  }, [channel, table, filter, enabled])
}
