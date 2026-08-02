import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BookOpen, Plus, FileText, Megaphone, Clock } from 'lucide-react'
import {
  listSubjects,
  joinSubjectByCode,
} from '@/lib/server/functions/subjects'
import { getUpcomingMaterials } from '@/lib/server/functions/materials'
import { StudentSubjectCard } from './StudentSubjectCard'
import { UpcomingMaterialsBanner } from './UpcomingMaterialsBanner'
import { JoinSubjectModal } from './JoinSubjectModal'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export function StudentDashboardView() {
  const queryClient = useQueryClient()
  const [joinModalOpen, setJoinModalOpen] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)

  const subjectsQuery = useQuery({
    queryKey: ['subjects', 'list', { includeArchived: false }],
    queryFn: () => listSubjects({ data: { includeArchived: false } }),
  })

  const upcomingQuery = useQuery({
    queryKey: ['materials', 'upcoming'],
    queryFn: () => getUpcomingMaterials({ data: { limit: 5 } }),
  })

  const joinMutation = useMutation({
    mutationFn: (code: string) => joinSubjectByCode({ data: { code } }),
    onSuccess: async () => {
      setJoinError(null)
      setJoinModalOpen(false)
      await queryClient.invalidateQueries({ queryKey: ['subjects', 'list'] })
    },
    onError: (error: Error) => setJoinError(error.message),
  })

  const subjects = subjectsQuery.data?.subjects ?? []
  const upcoming = upcomingQuery.data?.materials ?? []
  const totalMaterials = subjects.reduce((sum, s) => sum + s.materialCount, 0)
  const totalAnnouncements = subjects.reduce(
    (sum, s) => sum + s.announcementCount,
    0,
  )

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {subjectsQuery.isError ? (
        <Card className="border-destructive/20 bg-destructive/5 p-6">
          <h3 className="mb-1 font-semibold text-destructive">
            Failed to load dashboard
          </h3>
          <p className="text-sm text-destructive/80">
            {subjectsQuery.error.message}
          </p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatTile
              icon={BookOpen}
              label="Subjects"
              value={subjects.length}
            />
            <StatTile
              icon={FileText}
              label="Materials"
              value={totalMaterials}
            />
            <StatTile
              icon={Megaphone}
              label="Announcements"
              value={totalAnnouncements}
            />
            <StatTile
              icon={Clock}
              label="Due soon"
              value={upcoming.length}
              accent="warning"
            />
          </div>

          {!upcomingQuery.isPending && (
            <UpcomingMaterialsBanner materials={upcoming} />
          )}

          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                Your Subjects
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                  {subjects.length}
                </span>
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setJoinModalOpen(true)}
                className="text-primary hover:bg-primary/10 hover:text-primary"
              >
                <Plus size={16} strokeWidth={2.5} />
                Join Subject
              </Button>
            </div>

            {subjectsQuery.isPending ? (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-40 animate-pulse rounded-xl bg-muted"
                  />
                ))}
              </div>
            ) : subjects.length === 0 ? (
              <Card className="border-2 border-dashed p-12 text-center shadow-none">
                <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
                  <BookOpen size={28} className="text-muted-foreground" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">
                  No subjects yet
                </h3>
                <p className="mx-auto mb-4 max-w-sm text-sm text-muted-foreground">
                  Get started by joining a subject using a code from your
                  instructor
                </p>
                <Button onClick={() => setJoinModalOpen(true)}>
                  <Plus size={18} strokeWidth={2.5} />
                  Join Your First Subject
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                {subjects.map((subject) => (
                  <StudentSubjectCard key={subject.id} subject={subject} />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {joinModalOpen && (
        <JoinSubjectModal
          onClose={() => {
            setJoinModalOpen(false)
            setJoinError(null)
          }}
          onSubmit={(code) => joinMutation.mutateAsync(code)}
          submitting={joinMutation.isPending}
          error={joinError}
        />
      )}
    </div>
  )
}

function StatTile({
  icon: Icon,
  label,
  value,
  accent = 'primary',
}: {
  icon: typeof BookOpen
  label: string
  value: number
  accent?: 'primary' | 'warning'
}) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <div
        className={
          accent === 'warning'
            ? 'flex size-10 shrink-0 items-center justify-center rounded-lg bg-warning/10 text-warning'
            : 'flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary'
        }
      >
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold leading-tight text-foreground">
          {value}
        </p>
        <p className="truncate text-xs text-muted-foreground">{label}</p>
      </div>
    </Card>
  )
}