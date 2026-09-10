import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './database.types'

// listens only for realtime postgres change events, while all actual reads/writes remain server‑side under enforced auth and rls
let browserClient: ReturnType<typeof createBrowserClient<Database>> | null =
  null

export function getBrowserSupabase() {
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
    )
  }
  return browserClient
}
