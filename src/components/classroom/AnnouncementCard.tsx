import { useState } from 'react'
import { MoreVertical, Pin, PinOff, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getInitials } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'

interface AnnouncementCardProps {
  announcement: {
    id: string
    title: string | null
    content: string
    pinned: boolean | null
    created_at: string | null
    updated_at: string | null
    author: { id: string; full_name: string; role: string } | null
  }
  canManage: boolean
  onTogglePin: (id: string, pinned: boolean) => void
  onEdit: (announcement: AnnouncementCardProps['announcement']) => void
  onDelete: (id: string) => void
  isMutating: boolean
}

function formatTimeAgo(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)

  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function AnnouncementCard({
  announcement,
  canManage,
  onTogglePin,
  onEdit,
  onDelete,
  isMutating,
}: AnnouncementCardProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <div
      className={cn(
        'relative rounded-xl border bg-card p-5',
        announcement.pinned
          ? 'border-primary/30 bg-primary/5'
          : 'border-border',
      )}
    >
      {announcement.pinned && (
        <div className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-primary">
          <Pin size={12} className="fill-primary" />
          Pinned
        </div>
      )}

      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {announcement.author ? getInitials(announcement.author.full_name) : '?'}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              {announcement.author?.full_name ?? 'Unknown'}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatTimeAgo(announcement.created_at)}
            </span>
            {announcement.updated_at &&
              announcement.updated_at !== announcement.created_at && (
                <span className="text-xs text-muted-foreground italic">
                  (edited)
                </span>
              )}
          </div>

          {announcement.title && (
            <h3 className="mt-2 font-semibold text-foreground">
              {announcement.title}
            </h3>
          )}
          <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/80">
            {announcement.content}
          </p>
        </div>

        {canManage && (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger
                disabled={isMutating}
                className="shrink-0 rounded-lg p-1 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-muted-foreground disabled:opacity-50"
              >
                <MoreVertical size={16} />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-44">
                <DropdownMenuItem
                  onClick={() => onTogglePin(announcement.id, !announcement.pinned)}
                >
                  {announcement.pinned ? <PinOff /> : <Pin />}
                  {announcement.pinned ? 'Unpin' : 'Pin'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(announcement)}>
                  <Pencil />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setConfirmOpen(true)}
                >
                  <Trash2 />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this announcement?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This can't be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={() => {
                      onDelete(announcement.id)
                      setConfirmOpen(false)
                    }}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </div>
    </div>
  )
}