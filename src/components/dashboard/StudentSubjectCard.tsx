import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { MoreHorizontal, UserMinus } from 'lucide-react'
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
import { InlineMessage } from '@/components/ui/inline-message'

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

const DOT: Record<string, string> = {
  'classly-green': 'bg-classly-green',
  'classly-gold': 'bg-classly-gold',
  'blue-500': 'bg-info',
  'purple-500': 'bg-chart-4',
  'pink-500': 'bg-chart-5',
  'red-500': 'bg-destructive',
}

function dotClass(color: string | null) {
  return DOT[color ?? 'classly-green'] ?? DOT['classly-green']
}

function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`
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
  })

  const currentColor = subject.accentColor ?? 'classly-green'

  return (
    <div className="group relative rounded-lg border border-border bg-card transition-colors hover:border-foreground/25">
      <Link
        to="/classroom/$subjectId"
        params={{ subjectId: subject.id }}
        className="block rounded-lg p-5 pr-12 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <span
            aria-hidden
            className={cn('size-2 shrink-0 rounded-full', dotClass(currentColor))}
          />
          {subject.code}
        </p>

        <h3 className="mt-2 line-clamp-2 text-base leading-snug font-semibold text-foreground">
          {subject.name}
        </h3>
        <p className="mt-1 truncate text-sm text-muted-foreground">
          {subject.instructor?.full_name ?? 'No instructor assigned'}
        </p>

        <p className="mt-4 text-sm text-muted-foreground tabular-nums">
          {plural(subject.materialCount, 'material')}
          <span aria-hidden> · </span>
          {plural(subject.announcementCount, 'announcement')}
        </p>
      </Link>

      <div className="absolute top-3 right-3">
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none data-popup-open:bg-muted"
            aria-label={`Options for ${subject.name}`}
          >
            <MoreHorizontal className="size-4" aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56">
            <DropdownMenuLabel>Accent color</DropdownMenuLabel>
            <div className="grid grid-cols-6 gap-2 px-2.5 pb-2">
              {COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setColorMutation.mutate(color.value)}
                  aria-label={color.name}
                  aria-pressed={currentColor === color.value}
                  className={cn(
                    'size-6 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-popover',
                    dotClass(color.value),
                    currentColor === color.value &&
                      'ring-2 ring-foreground/40 ring-offset-2 ring-offset-popover',
                  )}
                />
              ))}
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

        <AlertDialog
          open={confirmOpen}
          onOpenChange={(open) => {
            setConfirmOpen(open)
            if (!open) unenrollMutation.reset()
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Unenroll from {subject.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                You will lose access to its materials and grades. You can rejoin
                with the subject code.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {/* The error stays in the dialog, next to the button that caused it. */}
            {unenrollMutation.isError && (
              <InlineMessage className="mt-4">
                {unenrollMutation.error.message}
              </InlineMessage>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => unenrollMutation.mutate()}
                disabled={unenrollMutation.isPending}
              >
                {unenrollMutation.isPending ? 'Unenrolling…' : 'Unenroll'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}