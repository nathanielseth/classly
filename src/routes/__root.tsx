import type { ReactNode } from 'react'
import {
  Outlet,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
  Link,
} from '@tanstack/react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import appCss from '@/styles.css?url'

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Classly' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  component: RootComponent,
  notFoundComponent: NotFound,
})

function RootComponent() {
  const { queryClient } = Route.useRouteContext()

  return (
    <QueryClientProvider client={queryClient}>
      <RootDocument>
        <Outlet />
      </RootDocument>
    </QueryClientProvider>
  )
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}

function NotFound() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-3 bg-gray-50 text-center">
      <h1 className="text-2xl font-bold text-gray-900">Page not found</h1>
      <p className="text-sm text-gray-500">
        That page doesn't exist or may have moved.
      </p>
      <Link
        to="/dashboard"
        className="mt-2 rounded-lg bg-classly-green px-4 py-2 text-sm font-medium text-white hover:bg-classly-dark"
      >
        Back to Dashboard
      </Link>
    </div>
  )
}