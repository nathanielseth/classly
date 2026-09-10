import { useEffect } from 'react'
import { useQueryClient  } from '@tanstack/react-query'
import type {QueryKey} from '@tanstack/react-query';
import { getBrowserSupabase } from '@/lib/browser-supabase'

interface UseRealtimeInvalidateOptions {
  channel: string
  table: string
  filter?: string
  queryKey: QueryKey
  enabled?: boolean
}

// subscribes to supabase realtime and invalidates react‑query keys on changes, to ensure updates refetch through server‑enforced authorization
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
