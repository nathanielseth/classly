import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  Archive,
  ArchiveRestore,
  Check,
  Copy,
  MoreVertical,
  Pencil,
  Trash2,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { InlineMessage } from '@/components/ui/inline-message'

interface InstructorSubjectCardProps {
  subject: {
    id: string
    code: string
    name: string
    description: string | null
    schedule: string | null
    room: string | null
    archived: boolean
    enrollmentCount: number
    materialCount: number
  }
  onToggleArchive: (subjectId: string, archived: boolean) => void
  isToggling: boolean
  onEdit: () => void
  onDelete: () => Promise<unknown>
  isDeleting: boolean
}

function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`
}

export function InstructorSubjectCard({
  subject,
  onToggleArchive,
  isToggling,
  onEdit,
  onDelete,
  isDeleting,
}: InstructorSubjectCardProps) {
  const [copied, setCopied] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const handleCopyCode = () => {
    void navigator.clipboard.writeText(subject.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDelete = async () => {
    setDeleteError(null)
    try {
      await onDelete()
      setConfirmOpen(false)
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Delete failed.')
    }
  }

  return (
    <div className="group relative rounded-lg border border-border bg-card transition-colors hover:border-foreground/25">
      <Link
        to="/classroom/$subjectId"
        params={{ subjectId: subject.id }}
        className="block rounded-lg p-5 pr-12 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <p className="text-sm text-muted-foreground">
          {subject.code}
          {subject.archived && (
            <>
              <span aria-hidden> · </span>
              Archived
            </>
          )}
        </p>
        <h3 className="mt-2 line-clamp-2 text-base leading-snug font-semibold text-foreground">
          {subject.name}
        </h3>
        <p className="mt-4 text-sm text-muted-foreground tabular-nums">
          {plural(subject.enrollmentCount, 'student')}
          <span aria-hidden> · </span>
          {plural(subject.materialCount, 'material')}
        </p>
      </Link>

      <div className="absolute top-3 right-3 flex items-center gap-1">
        <button
          type="button"
          onClick={handleCopyCode}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {copied ? (
            <Check className="size-3.5" aria-hidden />
          ) : (
            <Copy className="size-3.5" aria-hidden />
          )}
          <span className="sr-only">Copy join code</span>
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none data-popup-open:bg-muted"
            aria-label={`Options for ${subject.name}`}
          >
            <MoreVertical className="size-4" aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-52">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onToggleArchive(subject.id, !subject.archived)}
              disabled={isToggling}
            >
              {subject.archived ? <ArchiveRestore /> : <Archive />}
              {subject.archived ? 'Unarchive' : 'Archive'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setConfirmOpen(true)}
            >
              <Trash2 />
              Delete permanently
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open)
          if (!open) setDeleteError(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Permanently delete "{subject.name}"?
            </AlertDialogTitle>
            <AlertDialogDescription>
              All materials, announcements, and enrollments will be lost. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && <InlineMessage className="mt-4">{deleteError}</InlineMessage>}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting…' : 'Delete forever'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}