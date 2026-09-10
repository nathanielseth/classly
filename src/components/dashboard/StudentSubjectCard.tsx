import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { BookOpen, MoreHorizontal, UserMinus } from 'lucide-react'
import {
  setEnrollmentAccentColor,
  unenrollStudent,
} from '@/lib/server/functions/enrollments'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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

interface StudentSubjectCardProps {
  subject: {
    id: string
    code: string
    name: string
    materialCount: number
    announcementCount: number
    instructor: { full_name: string } | null
    accentColor: string | null
  }
  studentId: string
}

const COLORS = [
  { name: 'Green', value: 'classly-green' },
  { name: 'Gold', value: 'classly-gold' },
  { name: 'Blue', value: 'blue-500' },
  { name: 'Purple', value: 'purple-500' },
  { name: 'Pink', value: 'pink-500' },
  { name: 'Red', value: 'red-500' },
] as const

const COLOR_CLASSES: Record<
  string,
  { border: string; badge: string; swatch: string }
> = {
  'classly-green': {
    border: 'border-t-classly-green',
    badge: 'text-classly-green bg-classly-green-light',
    swatch: 'bg-classly-green',
  },
  'classly-gold': {
    border: 'border-t-classly-gold',
    badge: 'text-classly-gold bg-classly-gold-light',
    swatch: 'bg-classly-gold',
  },
  'blue-500': {
    border: 'border-t-blue-500',
    badge: 'text-blue-600 bg-blue-50',
    swatch: 'bg-blue-500',
  },
  'purple-500': {
    border: 'border-t-purple-500',
    badge: 'text-purple-600 bg-purple-50',
    swatch: 'bg-purple-500',
  },
  'pink-500': {
    border: 'border-t-pink-500',
    badge: 'text-pink-600 bg-pink-50',
    swatch: 'bg-pink-500',
  },
  'red-500': {
    border: 'border-t-red-500',
    badge: 'text-red-600 bg-red-50',
    swatch: 'bg-red-500',
  },
}

function getColorClasses(color: string | null) {
  return (
    COLOR_CLASSES[color ?? 'classly-green'] ?? COLOR_CLASSES['classly-green']
  )
}

export function StudentSubjectCard({
  subject,
  studentId,
}: StudentSubjectCardProps) {
  const queryClient = useQueryClient()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const setColorMutation = useMutation({
    mutationFn: (accentColor: (typeof COLORS)[number]['value']) =>
      setEnrollmentAccentColor({
        data: { subjectId: subject.id, accentColor },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['subjects', 'list'] })
    },
  })

  const unenrollMutation = useMutation({
    mutationFn: () =>
      unenrollStudent({ data: { subjectId: subject.id, studentId } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['subjects', 'list'] })
      setConfirmOpen(false)
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: "Couldn't unenroll",
        description: error.message,
      })
    },
  })

  const currentColor = subject.accentColor ?? 'classly-green'
  const currentColors = getColorClasses(currentColor)

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-border border-t-4 bg-card p-6 shadow-soft transition-shadow duration-300 hover:shadow-float',
        currentColors.border,
      )}
    >
      <Link
        to="/classroom/$subjectId"
        params={{ subjectId: subject.id }}
        className="block"
      >
        <div className="mb-4 flex items-start justify-between">
          <span
            className={cn(
              'rounded px-2 py-1 text-[10px] font-bold tracking-wide uppercase',
              currentColors.badge,
            )}
          >
            {subject.code}
          </span>
        </div>

        <h3 className="mb-1 line-clamp-1 font-semibold text-foreground">
          {subject.name}
        </h3>
        <p className="mb-4 text-sm text-muted-foreground">
          {subject.instructor?.full_name ?? 'Unknown instructor'}
        </p>

        <div className="flex items-center gap-4 border-t border-border pt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <BookOpen size={13} />
            {subject.materialCount} materials
          </span>
          <span>{subject.announcementCount} announcements</span>
        </div>
      </Link>

      <div className="absolute top-4 right-4">
        <DropdownMenu>
          <DropdownMenuTrigger
            onClick={(e) => e.preventDefault()}
            className="rounded-lg p-1 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-muted-foreground"
            aria-label="Card options"
          >
            <MoreHorizontal size={18} />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuLabel>Accent color</DropdownMenuLabel>
            <div className="grid grid-cols-6 gap-2 px-2.5 pb-2">
              {COLORS.map((color) => {
                const colorClasses = getColorClasses(color.value)
                return (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setColorMutation.mutate(color.value)}
                    className={cn(
                      'size-6 rounded-full transition-all hover:ring-2 hover:ring-border',
                      colorClasses.swatch,
                      currentColor === color.value &&
                        'ring-2 ring-foreground/30',
                    )}
                    title={color.name}
                  />
                )
              })}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setConfirmOpen(true)}
            >
              <UserMinus />
              Unenroll
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent onClick={(e) => e.stopPropagation()}>
            <AlertDialogHeader>
              <AlertDialogTitle>Unenroll from {subject.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                You'll lose access to its materials and grades.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => unenrollMutation.mutate()}
                disabled={unenrollMutation.isPending}
              >
                {unenrollMutation.isPending ? 'Leaving…' : 'Unenroll'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}