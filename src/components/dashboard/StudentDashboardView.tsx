import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import {
  listSubjects,
  joinSubjectByCode,
} from '@/lib/server/functions/subjects'
import { getUpcomingMaterials } from '@/lib/server/functions/materials'
import { StudentSubjectCard } from './StudentSubjectCard'
import { UpcomingMaterialsBanner } from './UpcomingMaterialsBanner'
import { JoinSubjectModal } from './JoinSubjectModal'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { InlineMessage } from '@/components/ui/inline-message'

export function StudentDashboardView({ studentId }: { studentId: string }) {
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

  return (
    <div className="page space-y-8">
      {subjectsQuery.isError ? (
        <InlineMessage>
          Could not load your subjects. {subjectsQuery.error.message}
        </InlineMessage>
      ) : (
        <>
          {!upcomingQuery.isPending && (
            <UpcomingMaterialsBanner materials={upcoming} />
          )}

          <section aria-labelledby="subjects-heading">
            <div className="mb-3 flex items-center justify-between gap-4">
              <h2
                id="subjects-heading"
                className="text-base font-semibold text-foreground"
              >
                Subjects
                {!subjectsQuery.isPending && (
                  <span className="ml-2 font-normal text-muted-foreground tabular-nums">
                    {subjects.length}
                  </span>
                )}
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setJoinModalOpen(true)}
              >
                <Plus aria-hidden />
                Join subject
              </Button>
            </div>

            {subjectsQuery.isPending ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-36" />
                ))}
              </div>
            ) : subjects.length === 0 ? (
              <div className="rounded-lg border border-dashed border-input px-6 py-12">
                <h3 className="text-base font-semibold text-foreground">
                  You are not enrolled in any subjects
                </h3>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">
                  Your instructor gives you a code for each subject. Enter it to
                  join.
                </p>
                <Button className="mt-4" onClick={() => setJoinModalOpen(true)}>
                  Join a subject
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {subjects.map((subject) => (
                  <StudentSubjectCard
                    key={subject.id}
                    subject={subject}
                    studentId={studentId}
                  />
                ))}
              </div>
            )}
          </section>
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
