export function getInitial(name: string | null | undefined) {
  return name?.charAt(0).toUpperCase() || '?'
}

export const roleColor: Record<string, string> = {
  student: 'bg-blue-100 text-blue-700',
  instructor: 'bg-purple-100 text-purple-700',
  admin: 'bg-red-100 text-red-700',
}

export function formatTime(ts: string | null | undefined) {
  if (!ts) return ''
  const date = new Date(ts)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  return isToday
    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}