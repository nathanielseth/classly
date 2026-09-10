import { useEffect, useState } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { AlertCircle, Check, ChevronDown, Loader2, Plus, X } from 'lucide-react'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { formatDateTime } from '@/lib/date-utils'
import {
  approveUser,
  createUser,
  deleteUser,
  getUserDetail,
  listUsers,
  rejectUser,
  updateUser,
} from '@/lib/server/functions/admin-users'
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from '@/components/ui/toast'
import { onMutationError } from '@/lib/mutation-error'

const searchSchema = z.object({
  q: z.string().optional().catch(undefined),
  role: z.enum(['all', 'student', 'instructor', 'admin']).catch('all'),
  status: z.enum(['all', 'pending', 'approved', 'rejected']).catch('all'),
  page: z.number().int().positive().catch(1),
})

type UserRow = {
  id: string
  full_name: string
  email: string
  role: string
  status: string
  created_at: string | null
}

export const Route = createFileRoute('/_authenticated/admin/users')({
  validateSearch: searchSchema,
  // this just catches direct URL access and redirects instead of showing error toasts
  beforeLoad: ({ context }) => {
    const { userState } = context
    const isAdmin =
      userState.status === 'approved' && userState.profile.role === 'admin'
    if (!isAdmin) {
      throw redirect({ to: '/dashboard' })
    }
  },
  // filter-only search-param changes don’t reload the route; just refetch the query
  loaderDeps: ({ search }) => ({ ...search }),
  loader: async ({ deps, context }) => {
    await context.queryClient.ensureQueryData({
      queryKey: ['admin', 'users', deps],
      queryFn: () =>
        listUsers({
          data: {
            search: deps.q,
            role: deps.role,
            status: deps.status,
            page: deps.page,
            pageSize: 20,
          },
        }),
    })
  },
  component: AdminUsersPage,
})

function AdminUsersPage() {
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const queryClient = useQueryClient()

  const [createOpen, setCreateOpen] = useState(false)
  const [editUser, setEditUser] = useState<UserRow | null>(null)
  const [viewUserId, setViewUserId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [confirmTarget, setConfirmTarget] = useState<{
    user: UserRow
    action: 'reject' | 'delete'
  } | null>(null)

  const [searchText, setSearchText] = useState(search.q ?? '')
  const debouncedSearchText = useDebouncedValue(searchText, 300)

  // keep local text synced when URL changes externally
  useEffect(() => {
    setSearchText(search.q ?? '')
  }, [search.q])

  useEffect(() => {
    if (debouncedSearchText === (search.q ?? '')) return
    navigate({
      search: (prev) => ({
        ...prev,
        q: debouncedSearchText || undefined,
        page: 1, // reset to page 1 on a new search, same as before
      }),
      replace: true, // don't spam browser history on every keystroke
    })
    // only fire when the debounced value rlly changes
  }, [debouncedSearchText])

  const { data } = useQuery({
    queryKey: ['admin', 'users', search],
    queryFn: () =>
      listUsers({
        data: {
          search: search.q,
          role: search.role,
          status: search.status,
          page: search.page,
          pageSize: 20,
        },
      }),
  })

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })

  const approveMutation = useMutation({
    mutationFn: (userId: string) => approveUser({ data: { userId } }),
    onSuccess: invalidate,
    onError: (err: Error) => setActionError(err.message),
  })

  const rejectMutation = useMutation({
    mutationFn: (userId: string) => rejectUser({ data: { userId } }),
    onSuccess: invalidate,
    onError: (err: Error) => setActionError(err.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => deleteUser({ data: { userId } }),
    onSuccess: invalidate,
    onError: (err: Error) => setActionError(err.message),
  })

  const handleApprove = (user: UserRow) => {
    setActionError(null)
    approveMutation.mutate(user.id)
  }

  const handleReject = (user: UserRow) => {
    setActionError(null)
    setConfirmTarget({ user, action: 'reject' })
  }

  const handleDelete = (user: UserRow) => {
    setActionError(null)
    setConfirmTarget({ user, action: 'delete' })
  }

  const confirmAction = () => {
    if (!confirmTarget) return
    if (confirmTarget.action === 'reject') {
      rejectMutation.mutate(confirmTarget.user.id)
    } else {
      deleteMutation.mutate(confirmTarget.user.id)
    }
    setConfirmTarget(null)
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {data?.total ?? 0} total users
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-classly-green text-white text-sm font-medium rounded-lg hover:bg-classly-green/90 transition-colors"
        >
          <Plus size={16} strokeWidth={2.5} />
          Create User
        </button>
      </div>

      {actionError && (
        <div className="mb-4 flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span className="flex-1">{actionError}</span>
          <button
            onClick={() => setActionError(null)}
            className="text-red-400 hover:text-red-600"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-classly-green"
        />
        <select
          value={search.role}
          onChange={(e) =>
            navigate({
              search: (prev) => ({
                ...prev,
                role: e.target.value as typeof search.role,
                page: 1,
              }),
            })
          }
          className="px-4 py-2 border border-gray-200 rounded-xl"
        >
          <option value="all">All roles</option>
          <option value="student">Student</option>
          <option value="instructor">Instructor</option>
          <option value="admin">Admin</option>
        </select>
        <select
          value={search.status}
          onChange={(e) =>
            navigate({
              search: (prev) => ({
                ...prev,
                status: e.target.value as typeof search.status,
                page: 1,
              }),
            })
          }
          className="px-4 py-2 border border-gray-200 rounded-xl"
        >
          <option value="all">All status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-200">
        {data?.users.length === 0 && (
          <div className="p-8 text-center text-sm text-gray-500">
            No users found.
          </div>
        )}
        {data?.users.map((user) => (
          <UserRowItem
            key={user.id}
            user={user}
            onView={() => setViewUserId(user.id)}
            onEdit={() => setEditUser(user)}
            onApprove={() => handleApprove(user)}
            onReject={() => handleReject(user)}
            onDelete={() => handleDelete(user)}
            busy={
              (approveMutation.isPending &&
                approveMutation.variables === user.id) ||
              (rejectMutation.isPending &&
                rejectMutation.variables === user.id) ||
              (deleteMutation.isPending && deleteMutation.variables === user.id)
            }
          />
        ))}
      </div>

      <AlertDialog
        open={confirmTarget !== null}
        onOpenChange={(open) => !open && setConfirmTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmTarget?.action === 'delete'
                ? `Delete "${confirmTarget.user.full_name}"?`
                : `Reject "${confirmTarget?.user.full_name ?? confirmTarget?.user.email}"?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmTarget?.action === 'delete'
                ? "This will permanently delete their account record. This action can't be undone."
                : "They won't be able to log in."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmAction}>
              {confirmTarget?.action === 'delete' ? 'Delete' : 'Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Pagination reads/writes `page` the same way - it's just another
          search param, so browser back/forward and refresh both work
          correctly for free. */}
      <div className="flex justify-between items-center mt-6 text-sm text-gray-500">
        <span>
          Page {data?.page} · {data?.total ?? 0} total users
        </span>
        <div className="flex gap-2">
          <button
            disabled={search.page <= 1}
            onClick={() =>
              navigate({ search: (prev) => ({ ...prev, page: prev.page - 1 }) })
            }
            className="px-3 py-1 border rounded-lg disabled:opacity-40"
          >
            Prev
          </button>
          <button
            disabled={
              data === undefined || data.page * data.pageSize >= data.total
            }
            onClick={() =>
              navigate({ search: (prev) => ({ ...prev, page: prev.page + 1 }) })
            }
            className="px-3 py-1 border rounded-lg disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

      {createOpen && (
        <CreateUserModal
          onClose={() => setCreateOpen(false)}
          onSuccess={() => {
            setCreateOpen(false)
            invalidate()
          }}
        />
      )}
      {editUser && (
        <EditUserModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSuccess={() => {
            setEditUser(null)
            invalidate()
          }}
        />
      )}
      {viewUserId && (
        <ViewUserModal
          userId={viewUserId}
          onClose={() => setViewUserId(null)}
        />
      )}
    </div>
  )
}

const roleColors: Record<string, string> = {
  student: 'bg-blue-50 text-blue-700 border-blue-200',
  instructor: 'bg-purple-50 text-purple-700 border-purple-200',
  admin: 'bg-red-50 text-red-700 border-red-200',
}

function statusColor(status: string | null) {
  if (status === 'approved')
    return 'bg-green-50 text-green-700 border-green-200'
  if (status === 'rejected') return 'bg-red-50 text-red-700 border-red-200'
  return 'bg-amber-50 text-amber-700 border-amber-200'
}

function UserRowItem({
  user,
  onView,
  onEdit,
  onApprove,
  onReject,
  onDelete,
  busy,
}: {
  user: UserRow
  onView: () => void
  onEdit: () => void
  onApprove: () => void
  onReject: () => void
  onDelete: () => void
  busy: boolean
}) {
  return (
    <div className="p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 bg-linear-to-br from-classly-green to-green-600 rounded-full flex items-center justify-center text-white font-semibold shrink-0">
            {user.full_name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate">
              {user.full_name}
            </p>
            <p className="text-sm text-gray-500 truncate">{user.email}</p>
          </div>
        </div>

        <span
          className={`px-2.5 py-1 rounded-full text-xs font-medium border shrink-0 ${roleColors[user.role] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}
        >
          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
        </span>

        <span
          className={`px-2.5 py-1 rounded-full text-xs font-medium border shrink-0 capitalize ${statusColor(user.status)}`}
        >
          {user.status}
        </span>

        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={busy}
            className="flex shrink-0 items-center gap-1 rounded-lg px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-50"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : 'Actions'}
            {!busy && <ChevronDown size={14} />}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onView}>View Details</DropdownMenuItem>
            <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
            {(user.status === 'pending' || user.status === 'rejected') && (
              <DropdownMenuItem
                onClick={onApprove}
                className="text-green-600 data-highlighted:bg-green-50"
              >
                Approve
              </DropdownMenuItem>
            )}
            {user.status === 'approved' && (
              <DropdownMenuItem variant="destructive" onClick={onReject}>
                Reject
              </DropdownMenuItem>
            )}
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

function ModalShell({
  title,
  subtitle,
  onClose,
  busy,
  children,
}: {
  title: string
  subtitle?: string
  onClose: () => void
  busy?: boolean
  children: React.ReactNode
}) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose()
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div>
            <DialogTitle>{title}</DialogTitle>
            {subtitle && <DialogDescription>{subtitle}</DialogDescription>}
          </div>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}

function CreateUserModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void
  onSuccess: () => void
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<'student' | 'instructor' | 'admin'>(
    'student',
  )

  const mutation = useMutation<unknown, Error>({
    mutationFn: () => createUser({ data: { email, password, fullName, role } }),
    onSuccess: () => {
      toast({ variant: 'success', title: 'User created' })
      onSuccess()
    },
    onError: onMutationError('Failed to create user'),
  })

  return (
    <ModalShell
      title="Create User"
      subtitle="Add a new user to the system"
      onClose={onClose}
      busy={mutation.isPending}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          mutation.mutate()
        }}
        className="p-6 space-y-4"
      >
        <Field label="Full Name" required>
          <Input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="John Doe"
            disabled={mutation.isPending}
          />
        </Field>
        <Field label="Email" required>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            disabled={mutation.isPending}
          />
        </Field>
        <Field label="Password" required>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            placeholder="••••••••"
            disabled={mutation.isPending}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Minimum 6 characters
          </p>
        </Field>
        <Field label="Role" required>
          <Select
            value={role}
            onValueChange={(value) => setRole(value as typeof role)}
            disabled={mutation.isPending}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="student">Student</SelectItem>
              <SelectItem value="instructor">Instructor</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        {mutation.isError && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{mutation.error.message}</span>
          </div>
        )}

        <DialogFooter className="p-0 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={mutation.isPending}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={mutation.isPending || !email || !password || !fullName}
            className="flex-1"
          >
            {mutation.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Check size={16} />
            )}
            Create User
          </Button>
        </DialogFooter>
      </form>
    </ModalShell>
  )
}

function EditUserModal({
  user,
  onClose,
  onSuccess,
}: {
  user: UserRow
  onClose: () => void
  onSuccess: () => void
}) {
  const [fullName, setFullName] = useState(user.full_name)
  const [role, setRole] = useState(
    user.role as 'student' | 'instructor' | 'admin',
  )

  const mutation = useMutation<unknown, Error>({
    mutationFn: () => updateUser({ data: { userId: user.id, fullName, role } }),
    onSuccess: () => {
      toast({ variant: 'success', title: 'User updated' })
      onSuccess()
    },
    onError: onMutationError('Failed to update user'),
  })

  return (
    <ModalShell
      title="Edit User"
      subtitle="Update user information"
      onClose={onClose}
      busy={mutation.isPending}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          mutation.mutate()
        }}
        className="p-6 space-y-4"
      >
        <Field label="Full Name">
          <Input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={mutation.isPending}
          />
        </Field>
        <Field label="Email">
          <Input type="email" value={user.email} disabled />
          <p className="mt-1 text-xs text-muted-foreground">
            Email is tied to the login account and can't be changed here.
          </p>
        </Field>
        <Field label="Role">
          <Select
            value={role}
            onValueChange={(value) => setRole(value as typeof role)}
            disabled={mutation.isPending}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="student">Student</SelectItem>
              <SelectItem value="instructor">Instructor</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        {mutation.isError && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{mutation.error.message}</span>
          </div>
        )}

        <DialogFooter className="p-0 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={mutation.isPending}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={mutation.isPending || !fullName}
            className="flex-1"
          >
            {mutation.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Check size={16} />
            )}
            Save Changes
          </Button>
        </DialogFooter>
      </form>
    </ModalShell>
  )
}

function ViewUserModal({
  userId,
  onClose,
}: {
  userId: string
  onClose: () => void
}) {
  const { data: user, isLoading } = useQuery({
    queryKey: ['admin', 'users', 'detail', userId],
    queryFn: () => getUserDetail({ data: { userId } }),
  })

  return (
    <ModalShell title="User Details" onClose={onClose}>
      <div className="p-6 space-y-4">
        {isLoading || !user ? (
          <div className="flex justify-center py-8">
            <Loader2 size={20} className="animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
              <div className="w-16 h-16 bg-linear-to-br from-classly-green to-green-600 rounded-full flex items-center justify-center text-white text-2xl font-semibold">
                {user.full_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {user.full_name}
                </h3>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
            </div>

            <DetailRow
              label="Role"
              value={user.role.charAt(0).toUpperCase() + user.role.slice(1)}
            />
            <DetailRow
              label="Status"
              value={user.status}
              capitalize
            />
            <DetailRow
              label="Created"
              value={
                user.created_at ? formatDateTime(user.created_at) : 'Unknown'
              }
            />

            {user.stats && 'enrollmentCount' in user.stats && (
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">
                  Statistics
                </label>
                <div className="mt-2 space-y-2">
                  <StatLine
                    label="Enrollments"
                    value={user.stats.enrollmentCount}
                  />
                  <StatLine
                    label="Submissions"
                    value={user.stats.submissionCount}
                  />
                </div>
              </div>
            )}
            {user.stats && 'subjectCount' in user.stats && (
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase">
                  Statistics
                </label>
                <div className="mt-2 space-y-2">
                  <StatLine label="Subjects" value={user.stats.subjectCount} />
                  <StatLine
                    label="Materials"
                    value={user.stats.materialCount}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
      <div className="p-6 pt-0">
        <Button variant="secondary" onClick={onClose} className="w-full">
          Close
        </Button>
      </div>
    </ModalShell>
  )
}

function DetailRow({
  label,
  value,
  capitalize,
}: {
  label: string
  value: string
  capitalize?: boolean
}) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-500 uppercase">
        {label}
      </label>
      <p
        className={`text-sm text-gray-900 mt-1 ${capitalize ? 'capitalize' : ''}`}
      >
        {value}
      </p>
    </div>
  )
}

function StatLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-600">{label}:</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  )
}