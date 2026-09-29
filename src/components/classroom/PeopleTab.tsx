import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Users } from 'lucide-react'
import {
  listEnrollments,
  unenrollStudent,
} from '@/lib/server/functions/enrollments'
import { StudentCard } from './StudentCard'
import { ExportClassroomGrades } from './ExportClassroomGrades'
import { toast } from '@/components/ui/toast'
import { onMutationError } from '@/lib/mutation-error'
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

interface PeopleTabProps {
  subjectId: string
  subject: {
    name: string
    instructor: { id: string; full_name: string; email: string } | null
  }
  currentUserId: string
  canManage: boolean
}

export function PeopleTab({
  subjectId,
  subject,
  currentUserId,
  canManage,
}: PeopleTabProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const enrollmentsQuery = useQuery({
    queryKey: ['enrollments', 'list', subjectId],
    queryFn: () => listEnrollments({ data: { subjectId } }),
  })

  const [studentToRemove, setStudentToRemove] = useState<{
    id: string
    name: string
  } | null>(null)

  const removeMutation = useMutation({
    mutationFn: (studentId: string) =>
      unenrollStudent({ data: { subjectId, studentId } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['enrollments', 'list', subjectId],
      })
      toast({ variant: 'success', title: 'Student removed' })
      setStudentToRemove(null)
    },
    onError: onMutationError('Failed to remove student'),
  })

  const goMessage = (userId: string) => {
    if (userId === currentUserId) return
    void navigate({ to: '/messages', search: { dmUserId: userId } })
  }

  const enrollments = enrollmentsQuery.data?.enrollments ?? []
  const studentsLabel = canManage ? 'Students' : 'Classmates'

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Instructor</h2>
        <div className="bg-card border border-border rounded-xl shadow-sm">
          {subject.instructor ? (
            <StudentCard
              name={subject.instructor.full_name}
              email={subject.instructor.email}
              onMessage={
                !canManage && subject.instructor.id !== currentUserId
                  ? () => goMessage(subject.instructor!.id)
                  : undefined
              }
            />
          ) : (
            <div className="p-4 text-sm text-muted-foreground">Unknown instructor</div>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            {studentsLabel}
            <span className="text-xs font-normal text-muted-foreground/70 bg-muted px-2 py-0.5 rounded-full">
              {enrollments.length}
            </span>
          </h2>
          {canManage && (
            <ExportClassroomGrades
              subjectId={subjectId}
              subjectName={subject.name}
            />
          )}
        </div>

        {enrollmentsQuery.data?.truncated && (
          <div className="mb-3 text-xs text-warning bg-warning/8 border border-warning/30 rounded-lg px-3 py-2">
            Showing the first {enrollments.length} students. This class has
            more than that enrolled - contact support if that's unexpected.
          </div>
        )}

        {enrollmentsQuery.isError ? (
          <div className="bg-destructive/8 border border-destructive/30 rounded-xl p-6">
            <h3 className="font-semibold text-destructive mb-1">
              Failed to load roster
            </h3>
            <p className="text-sm text-destructive">
              {enrollmentsQuery.error.message}
            </p>
          </div>
        ) : enrollmentsQuery.isPending ? (
          <div className="bg-card border border-border rounded-xl p-8 flex items-center justify-center">
            <Loader2 size={20} className="animate-spin text-muted-foreground/70" />
          </div>
        ) : enrollments.length === 0 ? (
          <div className="bg-card border-2 border-dashed border-border rounded-xl p-12 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Users size={28} className="text-muted-foreground/70" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {canManage
                ? 'No students enrolled yet'
                : 'No other students enrolled yet'}
            </h3>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl shadow-sm divide-y divide-border/60">
            {enrollments.map((enrollment) => (
              <StudentCard
                key={enrollment.id}
                name={enrollment.student?.full_name ?? 'Unknown student'}
                email={
                  canManage
                    ? (enrollment.student?.email ?? undefined)
                    : undefined
                }
                onMessage={
                  canManage && enrollment.student
                    ? () => goMessage(enrollment.student!.id)
                    : undefined
                }
                onRemove={
                  canManage && enrollment.student
                    ? () =>
                        setStudentToRemove({
                          id: enrollment.student!.id,
                          name: enrollment.student!.full_name,
                        })
                    : undefined
                }
                removing={
                  removeMutation.isPending &&
                  removeMutation.variables === enrollment.student?.id
                }
              />
            ))}
          </div>
        )}
      </div>

      <AlertDialog
        open={studentToRemove !== null}
        onOpenChange={(open) => {
          if (!open && !removeMutation.isPending) setStudentToRemove(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove student?</AlertDialogTitle>
            <AlertDialogDescription>
              {studentToRemove?.name} will be unenrolled from this class and
              lose access to its materials. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={removeMutation.isPending}
              onClick={() => {
                if (studentToRemove) removeMutation.mutate(studentToRemove.id)
              }}
            >
              {removeMutation.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                'Remove'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}