import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { listDirectMessages, listGroupConversations } from '@/lib/server/functions/messages'
import { MessagesView } from '@/components/messages/MessagesView'

const searchSchema = z.object({
  dmUserId: z.uuid(),.optional().catch(undefined),
})

export const Route = createFileRoute('/_authenticated/messages')({
  validateSearch: searchSchema,
  loader: async ({ context }) => {
    const { queryClient } = context
    await Promise.all([
      queryClient.ensureQueryData({
        queryKey: ['messages', 'direct-conversations'],
        queryFn: () => listDirectMessages(),
      }),
      queryClient.ensureQueryData({
        queryKey: ['messages', 'group-conversations'],
        queryFn: () => listGroupConversations(),
      }),
    ])
  },
  component: MessagesPage,
})

function MessagesPage() {
  const { userState } = Route.useRouteContext()
  const { dmUserId } = Route.useSearch()

  if (userState.status !== 'approved') return null

  return <MessagesView currentUserId={userState.profile.id} openDmUserId={dmUserId} />
}
