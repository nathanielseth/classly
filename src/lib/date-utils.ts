type DateInput = Date | number | string | null | undefined

function toDate(value: DateInput): Date | null {
  if (value == null) return null
  const date = value instanceof Date ? value : new Date(value)
  return isNaN(date.getTime()) ? null : date
}

// Aug 24, 20XX
export function formatDate(value: DateInput): string {
  const date = toDate(value)
  if (!date) return ''
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// Aug 24, 20XX, X:XX PM
export function formatDateTime(value: DateInput): string {
  const date = toDate(value)
  if (!date) return ''
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

// Aug 24, X:XX PM
export function formatShortDateTime(value: DateInput): string {
  const date = toDate(value)
  if (!date) return ''
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

// YYYY-MM-DD
export function formatDateStamp(value: DateInput = new Date()): string {
  const date = toDate(value) ?? new Date()
  return date.toISOString().split('T')[0]
}