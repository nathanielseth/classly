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
  X,
} from 'lucide-react'
import {
  createEvent,
  deleteEvent,
  listCalendarItems,
} from '@/lib/server/functions/calendar'

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
  const queryClient = useQueryClient()

  const role = userState.status === 'approved' ? userState.profile.role : null
  const isAdmin = role === 'admin'

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
    onSuccess: invalidate,
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
            {isAdmin && (
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-classly-green text-white text-sm font-medium rounded-lg hover:bg-classly-green/90 transition-all"
              >
                <Plus size={16} />
                Add Event
              </button>
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

  const mutation = useMutation({
    mutationFn: () =>
      createEvent({ data: { title, description, eventDate, eventTime, type } }),
    onSuccess,
  })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Add System Event</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            mutation.mutate()
          }}
        >
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-classly-green focus:ring-2 focus:ring-classly-green/20 text-sm"
                placeholder="e.g. University Foundation Day"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as typeof type)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-classly-green text-sm bg-white"
              >
                <option value="event">Event</option>
                <option value="holiday">Holiday</option>
                <option value="announcement">Announcement</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Date *
                </label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-classly-green text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Time
                </label>
                <input
                  type="time"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-classly-green text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-classly-green text-sm resize-none"
                placeholder="Optional details..."
              />
            </div>
            {mutation.isError && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                {mutation.error.message}
              </p>
            )}
          </div>
          <div className="p-6 pt-0 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending || !title.trim() || !eventDate}
              className="flex-1 px-4 py-2.5 bg-classly-green text-white rounded-lg hover:bg-classly-green/90 text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {mutation.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Plus size={16} />
              )}
              Create Event
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}