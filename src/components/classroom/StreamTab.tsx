import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Megaphone, Plus } from 'lucide-react'
import {
  createAnnouncement,
  deleteAnnouncement,
  listAnnouncements,
  setAnnouncementPinned,
  updateAnnouncement,
} from '@/lib/server/functions/announcements'
import { AnnouncementCard } from './AnnouncementCard'
import { AnnouncementModal } from './AnnouncementModal'

interface StreamTabProps {
  subjectId: string
  currentUserId: string
  canPost: boolean
  isAdmin: boolean
}

type AnnouncementRow = Awaited<
  ReturnType<typeof listAnnouncements>
>['announcements'][number]

const ANNOUNCEMENTS_POLL_MS = 15000

export function StreamTab({
  subjectId,
  currentUserId,
  canPost,
  isAdmin,
}: StreamTabProps) {
  const queryClient = useQueryClient()
  const [composerOpen, setComposerOpen] = useState(false)
  const [editing, setEditing] = useState<AnnouncementRow | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const announcementsQuery = useQuery({
    queryKey: ['announcements', 'list', subjectId],
    queryFn: () => listAnnouncements({ data: { subjectId } }),
    refetchInterval: ANNOUNCEMENTS_POLL_MS,
  })

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: ['announcements', 'list', subjectId],
    })

  const createMutation = useMutation({
    mutationFn: (values: { title: string; content: string }) =>
      createAnnouncement({ data: { subjectId, ...values } }),
    onSuccess: async () => {
      setFormError(null)
      setComposerOpen(false)
      await invalidate()
    },
    onError: (error: Error) => setFormError(error.message),
  })

  const updateMutation = useMutation({
    mutationFn: (values: {
      announcementId: string
      title: string
      content: string
    }) => updateAnnouncement({ data: values }),
    onSuccess: async () => {
      setFormError(null)
      setEditing(null)
      await invalidate()
    },
    onError: (error: Error) => setFormError(error.message),
  })

  const pinMutation = useMutation({
    mutationFn: (values: { announcementId: string; pinned: boolean }) =>
      setAnnouncementPinned({ data: values }),
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: (announcementId: string) =>
      deleteAnnouncement({ data: { announcementId } }),
    onSuccess: invalidate,
  })

  const announcements = announcementsQuery.data?.announcements ?? []

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {canPost && (
        <button
          onClick={() => setComposerOpen(true)}
          className="w-full flex items-center gap-3 px-4 py-3.5 bg-white border border-gray-200 rounded-xl text-left text-sm text-gray-400 hover:border-classly-green/40 hover:text-gray-500 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-classly-green/10 text-classly-green flex items-center justify-center shrink-0">
            <Plus size={16} />
          </div>
          Share something with your class...
        </button>
      )}

      {announcementsQuery.isError ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <h3 className="font-semibold text-red-900 mb-1">
            Failed to load announcements
          </h3>
          <p className="text-sm text-red-700">
            {announcementsQuery.error.message}
          </p>
        </div>
      ) : announcementsQuery.isPending ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="h-28 bg-gray-100 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : announcements.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Megaphone size={28} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No announcements yet
          </h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            {canPost
              ? 'Post an update to keep your class in the loop.'
              : "Your instructor hasn't posted anything here yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <AnnouncementCard
              key={announcement.id}
              announcement={announcement}
              canManage={isAdmin || announcement.author?.id === currentUserId}
              onTogglePin={(id, pinned) =>
                pinMutation.mutate({ announcementId: id, pinned })
              }
              onEdit={(a) => setEditing(a)}
              onDelete={(id) => deleteMutation.mutate(id)}
              isMutating={pinMutation.isPending || deleteMutation.isPending}
            />
          ))}
        </div>
      )}

      {composerOpen && (
        <AnnouncementModal
          mode="create"
          onClose={() => {
            setComposerOpen(false)
            setFormError(null)
          }}
          onSubmit={(values) => createMutation.mutateAsync(values)}
          submitting={createMutation.isPending}
          error={formError}
        />
      )}

      {editing && (
        <AnnouncementModal
          mode="edit"
          initial={{ title: editing.title, content: editing.content }}
          onClose={() => {
            setEditing(null)
            setFormError(null)
          }}
          onSubmit={(values) =>
            updateMutation.mutateAsync({
              announcementId: editing.id,
              ...values,
            })
          }
          submitting={updateMutation.isPending}
          error={formError}
        />
      )}
    </div>
  )
}