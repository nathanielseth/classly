import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { BookOpen, MoreHorizontal } from 'lucide-react'
import { setEnrollmentAccentColor } from '@/lib/server/functions/enrollments'
import { cn } from '@/lib/utils'

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

export function StudentSubjectCard({ subject }: StudentSubjectCardProps) {
  const queryClient = useQueryClient()
  const [menuOpen, setMenuOpen] = useState(false)
  const [colorPickerOpen, setColorPickerOpen] = useState(false)

  const setColorMutation = useMutation({
    mutationFn: (accentColor: (typeof COLORS)[number]['value']) =>
      setEnrollmentAccentColor({
        data: { subjectId: subject.id, accentColor },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['subjects', 'list'] })
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
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setMenuOpen((v) => !v)
          }}
          className="rounded-lg p-1 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-muted-foreground"
          aria-label="Card options"
        >
          <MoreHorizontal size={18} />
        </button>

        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setMenuOpen(false)
                setColorPickerOpen(false)
              }}
            />
            <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-lg border border-border bg-card shadow-float">
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setColorPickerOpen((v) => !v)
                }}
                className="w-full px-4 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-muted"
              >
                Change Color
              </button>

              {colorPickerOpen && (
                <div className="border-t border-border bg-muted/60 px-4 py-3">
                  <div className="grid grid-cols-6 gap-2">
                    {COLORS.map((color) => {
                      const colorClasses = getColorClasses(color.value)
                      return (
                        <button
                          key={color.value}
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setColorPickerOpen(false)
                            setMenuOpen(false)
                            setColorMutation.mutate(color.value)
                          }}
                          className={cn(
                            'size-7 rounded-full transition-all hover:ring-2 hover:ring-border',
                            colorClasses.swatch,
                            currentColor === color.value &&
                              'ring-2 ring-foreground/30',
                          )}
                          title={color.name}
                        />
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}