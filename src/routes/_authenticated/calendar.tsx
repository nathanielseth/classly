import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import {
  AlertCircle,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Plus,
  Trash2,
  UploadCloud,
} from 'lucide-react'
import {
  bulkCreateEvents,
  createEvent,
  deleteEvent,
  listCalendarItems,
} from '@/lib/server/functions/calendar'
import { parseEventsFile } from '@/lib/parse-events-file'
import type { ParsedEventRow } from '@/lib/parse-events-file'
import { toast } from '@/components/ui/toast'
import { onMutationError } from '@/lib/mutation-error'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export const Route = createFileRoute('/_authenticated/calendar')({
  component: CalendarPage,
})

type Item =
  | {
      id: string
      title: string
      description: string | null
      event_date: string
      event_time: string | null
      type: string
      source: 'event'
      dateObj: Date
    }
  | {
      id: string
      title: string
      due_date: string
      type: string
      subjectName: string
      subjectCode: string
      source: 'due_date'
      dateObj: Date
    }

function CalendarPage() {
  const { userState } = Route.useRouteContext()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showAddModal, setShowAddModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const queryClient = useQueryClient()

  const role = userState.status === 'approved' ? userState.profile.role : null
  const isAdmin = role === 'admin'
  const canManageEvents = role === 'admin' || role === 'instructor'

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(monthStart)
  const gridStart = startOfWeek(monthStart)
  const gridEnd = endOfWeek(monthEnd)

  const { data, isLoading } = useQuery({
    queryKey: [
      'calendar',
      'items',
      gridStart.toISOString(),
      gridEnd.toISOString(),
    ],
    queryFn: () =>
      listCalendarItems({
        data: { from: gridStart.toISOString(), to: gridEnd.toISOString() },
      }),
    enabled: role !== null,
  })

  const allItems: Item[] = useMemo(() => {
    const events: Item[] = (data?.events ?? []).map((e) => ({
      ...e,
      dateObj: parseISO(e.event_date),
    }))
    const dues: Item[] = (data?.dueDates ?? []).map((d) => ({
      ...d,
      dateObj: parseISO(d.due_date),
    }))
    return [...events, ...dues]
  }, [data])

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['calendar', 'items'] })

  const deleteMutation = useMutation({
    mutationFn: (eventId: string) => deleteEvent({ data: { eventId } }),
    onSuccess: async () => {
      await invalidate()
      toast({ variant: 'success', title: 'Event deleted' })
    },
    onError: onMutationError('Failed to delete event'),
  })

  const getAllItemsForDay = (day: Date) =>
    allItems.filter((i) => isSameDay(i.dateObj, day))

  const now = new Date()
  const upcomingItems = allItems
    .filter((i) => i.dateObj >= now)
    .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
    .slice(0, 5)

  const selectedDayItems = getAllItemsForDay(selectedDate)

  const gridDays: Date[] = []
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) {
    gridDays.push(d)
  }
  const weekDayLabels = Array.from({ length: 7 }, (_, i) =>
    format(addDays(gridStart, i), 'EEE'),
  )

  return (
    <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row gap-6">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {format(currentMonth, 'MMMM yyyy')}
            </h2>
            <p className="text-gray-500 text-sm">Academic schedule</p>
          </div>
          <div className="flex items-center gap-2">
            {canManageEvents && (
              <>
                <button
                  onClick={() => setShowImportModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-all"
                >
                  <UploadCloud size={16} />
                  Import
                </button>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-classly-green text-white text-sm font-medium rounded-lg hover:bg-classly-green/90 transition-all"
                >
                  <Plus size={16} />
                  Add Event
                </button>
              </>
            )}
            <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
              <button
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-2 hover:bg-gray-50 rounded-md text-gray-500 transition"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={() => setCurrentMonth(new Date())}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md transition"
              >
                Today
              </button>
              <button
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-2 hover:bg-gray-50 rounded-md text-gray-500 transition"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 size={24} className="animate-spin text-classly-green" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-7 mb-1 border-b border-gray-200">
              {weekDayLabels.map((label) => (
                <div
                  key={label}
                  className="text-xs font-bold text-gray-400 uppercase tracking-wider text-center py-3"
                >
                  {label}
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              {Array.from({ length: gridDays.length / 7 }, (_, weekIdx) => (
                <div
                  key={weekIdx}
                  className="grid grid-cols-7 border-l border-t border-gray-100"
                >
                  {gridDays.slice(weekIdx * 7, weekIdx * 7 + 7).map((day) => {
                    const dayItems = getAllItemsForDay(day)
                    const isCurrentMonth = isSameMonth(day, monthStart)

                    return (
                      <div
                        key={day.toISOString()}
                        onClick={() => setSelectedDate(day)}
                        className={`min-h-27.5 border-r border-b border-gray-100 p-2 cursor-pointer flex flex-col gap-1 transition-colors
                          ${!isCurrentMonth ? 'bg-gray-50/50' : 'bg-white hover:bg-gray-50'}
                          ${isSameDay(day, selectedDate) ? 'ring-2 ring-inset ring-classly-green/40' : ''}
                        `}
                      >
                        <div
                          className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium mb-0.5
                            ${isToday(day) ? 'bg-classly-green text-white' : isCurrentMonth ? 'text-gray-700' : 'text-gray-300'}
                          `}
                        >
                          {format(day, 'd')}
                        </div>
                        <div className="flex flex-col gap-0.5 overflow-hidden">
                          {dayItems.slice(0, 2).map((item) => (
                            <div
                              key={item.id}
                              className={`text-[10px] px-1.5 py-0.5 rounded border truncate font-medium ${getItemColor(item)}`}
                            >
                              {item.title}
                            </div>
                          ))}
                          {dayItems.length > 2 && (
                            <div className="text-[10px] text-gray-400 pl-1">
                              +{dayItems.length - 2} more
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-4 mt-4 flex-wrap">
              <Legend
                color="bg-classly-green/20 border-classly-green/30"
                label="System event"
              />
              <Legend color="bg-blue-100 border-blue-200" label="Assignment" />
              <Legend color="bg-amber-100 border-amber-200" label="Quiz" />
              <Legend color="bg-red-100 border-red-200" label="Exam" />
              <Legend color="bg-purple-100 border-purple-200" label="Project" />
            </div>
          </>
        )}
      </div>

      <div className="w-full lg:w-72 flex flex-col gap-4 shrink-0">
        <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4 text-sm">
            <CalendarIcon size={16} className="text-classly-green" />
            {format(selectedDate, 'EEEE, MMMM do')}
          </h3>
          <div className="space-y-3">
            {selectedDayItems.length > 0 ? (
              selectedDayItems.map((item) => (
                <div key={item.id} className="flex items-start gap-3">
                  <div
                    className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${getDotColor(item)}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {item.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {item.source === 'event'
                        ? (item.event_time ?? 'All day')
                        : item.subjectName || item.subjectCode || item.type}
                    </p>
                  </div>
                  {isAdmin && item.source === 'event' && (
                    <button
                      onClick={() => deleteMutation.mutate(item.id)}
                      disabled={
                        deleteMutation.isPending &&
                        deleteMutation.variables === item.id
                      }
                      className="text-gray-300 hover:text-red-500 transition-colors shrink-0 disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-400 text-center py-6">
                Nothing scheduled.
              </p>
            )}
          </div>
        </div>

        <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4 text-sm">
            <AlertCircle size={16} className="text-amber-500" />
            Upcoming
          </h3>
          <div className="space-y-3">
            {upcomingItems.length > 0 ? (
              upcomingItems.map((item) => (
                <div key={item.id} className="flex items-start gap-3">
                  <div
                    className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${getDotColor(item)}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {item.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                      <Clock size={10} />
                      {format(item.dateObj, 'MMM d')}
                      {item.source === 'event' && item.event_time
                        ? ` · ${item.event_time}`
                        : ''}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">
                Nothing upcoming.
              </p>
            )}
          </div>
        </div>
      </div>

      {showAddModal && (
        <AddEventModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false)
            invalidate()
          }}
        />
      )}

      {showImportModal && (
        <ImportEventsModal
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            setShowImportModal(false)
            invalidate()
          }}
        />
      )}
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-gray-500">
      <div className={`w-3 h-3 rounded border ${color}`} />
      {label}
    </div>
  )
}

function getItemColor(item: Item) {
  if (item.source === 'event') {
    if (item.type === 'holiday') return 'bg-red-50 text-red-700 border-red-100'
    if (item.type === 'announcement')
      return 'bg-blue-50 text-blue-700 border-blue-100'
    return 'bg-classly-green/10 text-classly-green border-classly-green/20'
  }
  if (item.type === 'exam') return 'bg-red-50 text-red-700 border-red-100'
  if (item.type === 'quiz') return 'bg-amber-50 text-amber-700 border-amber-100'
  if (item.type === 'project')
    return 'bg-purple-50 text-purple-700 border-purple-100'
  return 'bg-blue-50 text-blue-700 border-blue-100'
}

function getDotColor(item: Item) {
  if (item.source === 'event') return 'bg-classly-green'
  if (item.type === 'exam') return 'bg-red-500'
  if (item.type === 'quiz') return 'bg-amber-500'
  if (item.type === 'project') return 'bg-purple-500'
  return 'bg-blue-500'
}

function ImportEventsModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void
  onSuccess: () => void
}) {
  const [fileName, setFileName] = useState<string | null>(null)
  const [rows, setRows] = useState<ParsedEventRow[]>([])
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [isParsing, setIsParsing] = useState(false)

  const mutation = useMutation<unknown, Error>({
    mutationFn: () => bulkCreateEvents({ data: { events: rows } }),
    onSuccess: () => {
      toast({
        variant: 'success',
        title: `Imported ${rows.length} event${rows.length === 1 ? '' : 's'}`,
      })
      onSuccess()
    },
    onError: onMutationError('Failed to import events'),
  })

  const handleFile = async (file: File) => {
    setFileName(file.name)
    setIsParsing(true)
    setRows([])
    setParseErrors([])
    try {
      const result = await parseEventsFile(file)
      setRows(result.rows)
      setParseErrors(result.errors)
    } catch {
      setParseErrors([
        "Couldn't read that file. Make sure it's a valid .csv or .xlsx file.",
      ])
    } finally {
      setIsParsing(false)
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) onClose()
      }}
    >
      <DialogContent className="flex max-h-[85vh] max-w-lg flex-col">
        <DialogHeader>
          <DialogTitle>Import Events from File</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto p-6">
          <div>
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl p-6 cursor-pointer hover:border-classly-green/40 hover:bg-classly-green/5 transition-colors">
              <UploadCloud size={24} className="text-gray-400" />
              <span className="text-sm font-medium text-gray-700">
                {fileName ?? 'Choose a .csv or .xlsx file'}
              </span>
              <span className="text-xs text-gray-400">
                Columns: title, date, time, type, description
              </span>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void handleFile(file)
                }}
              />
            </label>
          </div>

          {isParsing && (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500 py-4">
              <Loader2 size={16} className="animate-spin" />
              Reading file...
            </div>
          )}

          {!isParsing && rows.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                {rows.length} event{rows.length === 1 ? '' : 's'} ready to
                import
              </p>
              <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-48 overflow-y-auto">
                {rows.slice(0, 20).map((row, i) => (
                  <div
                    key={i}
                    className="px-3 py-2 text-sm flex items-center justify-between gap-3"
                  >
                    <span className="truncate text-gray-800">{row.title}</span>
                    <span className="text-xs text-gray-400 shrink-0">
                      {row.eventDate}
                    </span>
                  </div>
                ))}
                {rows.length > 20 && (
                  <div className="px-3 py-2 text-xs text-gray-400 text-center">
                    +{rows.length - 20} more
                  </div>
                )}
              </div>
            </div>
          )}

          {parseErrors.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs font-medium text-amber-800 mb-1">
                {parseErrors.length} row
                {parseErrors.length === 1 ? '' : 's'} skipped
              </p>
              <ul className="text-xs text-amber-700 space-y-0.5 max-h-24 overflow-y-auto">
                {parseErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {mutation.isError && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{mutation.error.message}</span>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-border">
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
            type="button"
            onClick={() => mutation.mutate()}
            disabled={rows.length === 0 || mutation.isPending}
            className="flex-1"
          >
            {mutation.isPending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <UploadCloud size={16} />
            )}
            Import {rows.length > 0 ? rows.length : ''} Event
            {rows.length === 1 ? '' : 's'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
function AddEventModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void
  onSuccess: () => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [eventDate, setEventDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [eventTime, setEventTime] = useState('')
  const [type, setType] = useState<'event' | 'holiday' | 'announcement'>(
    'event',
  )

  const mutation = useMutation<unknown, Error>({
    mutationFn: () =>
      createEvent({ data: { title, description, eventDate, eventTime, type } }),
    onSuccess: () => {
      toast({ variant: 'success', title: 'Event created' })
      onSuccess()
    },
    onError: onMutationError('Failed to create event'),
  })

  const canSubmit =
    title.trim().length > 0 && !!eventDate && !mutation.isPending

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) onClose()
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add System Event</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            mutation.mutate()
          }}
        >
          <div className="space-y-4 p-6">
            <div className="space-y-1.5">
              <Label htmlFor="event-title">Title *</Label>
              <Input
                id="event-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. University Foundation Day"
                autoFocus
                disabled={mutation.isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="event-type">Type</Label>
              <Select
                value={type}
                onValueChange={(value) => setType(value as typeof type)}
                disabled={mutation.isPending}
              >
                <SelectTrigger id="event-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="event">Event</SelectItem>
                  <SelectItem value="holiday">Holiday</SelectItem>
                  <SelectItem value="announcement">Announcement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="event-date">Date *</Label>
                <Input
                  id="event-date"
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  disabled={mutation.isPending}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="event-time">Time</Label>
                <Input
                  id="event-time"
                  type="time"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                  disabled={mutation.isPending}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="event-description">Description</Label>
              <Textarea
                id="event-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Optional details..."
                disabled={mutation.isPending}
              />
            </div>
            {mutation.isError && (
              <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{mutation.error.message}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={mutation.isPending}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit} className="flex-1">
              {mutation.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Plus size={16} />
              )}
              Create Event
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}