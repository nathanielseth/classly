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
  Users,
  BookOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
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
import { toast } from '@/components/ui/toast'

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

  const handleCopyCode = () => {
    void navigator.clipboard.writeText(subject.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDelete = async () => {
    try {
      await onDelete()
      setConfirmOpen(false)
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description: err instanceof Error ? err.message : 'Delete failed.',
      })
    }
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-border border-t-4 bg-card p-6 shadow-soft transition-shadow duration-300 hover:shadow-float',
        subject.archived
          ? 'border-t-muted-foreground/30 opacity-70'
          : 'border-t-classly-green',
      )}
    >
      <div className="mb-4 flex items-start justify-between">
        <button
          onClick={handleCopyCode}
          className="flex items-center gap-2 rounded bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-primary/20"
        >
          {subject.code}
          {copied ? <Check size={12} /> : <Copy size={12} />}
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger className="rounded-lg p-1 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-muted-foreground">
            <MoreVertical size={18} />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-52">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onToggleArchive(subject.id, !subject.archived)}
              disabled={isToggling}
              className="text-warning data-highlighted:bg-warning/10"
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

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Permanently delete "{subject.name}"?
              </AlertDialogTitle>
              <AlertDialogDescription>
                All materials, announcements, and enrollments will be lost.
                This can't be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
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

      <Link
        to="/classroom/$subjectId"
        params={{ subjectId: subject.id }}
        className="block"
      >
        <h3 className="mb-4 line-clamp-1 font-semibold text-foreground transition-colors hover:text-primary">
          {subject.name}
        </h3>

        <div className="flex items-center gap-4 border-t border-border pt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users size={13} />
            {subject.enrollmentCount} students
          </span>
          <span className="flex items-center gap-1">
            <BookOpen size={13} />
            {subject.materialCount} materials
          </span>
        </div>
      </Link>
    </div>
  )
}