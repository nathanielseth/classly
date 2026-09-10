import * as XLSX from 'xlsx'

export interface ParsedEventRow {
  title: string
  description?: string
  eventDate: string
  eventTime?: string
  type: 'event' | 'holiday' | 'announcement'
}

export interface ParseResult {
  rows: ParsedEventRow[]
  errors: string[]
}

const HEADER_ALIASES: Record<string, keyof ParsedEventRow> = {
  title: 'title',
  name: 'title',
  event: 'title',
  description: 'description',
  details: 'description',
  notes: 'description',
  date: 'eventDate',
  eventdate: 'eventDate',
  time: 'eventTime',
  eventtime: 'eventTime',
  type: 'type',
  category: 'type',
}

function normalizeHeader(header: string): keyof ParsedEventRow | null {
  const key = header.trim().toLowerCase().replace(/[\s_-]+/g, '')
  return HEADER_ALIASES[key] ?? null
}

// spreadsheet apps store dates as either a JS Date (from XLSX's cellDates),
// an Excel serial number, or plain text depending on how the cell was
// authored - normalize all three into YYYY-MM-DD for the events table
function normalizeDate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10)
  }
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value)
    if (!parsed) return null
    const mm = String(parsed.m).padStart(2, '0')
    const dd = String(parsed.d).padStart(2, '0')
    return `${parsed.y}-${mm}-${dd}`
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    const parsed = new Date(trimmed)
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10)
    }
  }
  return null
}

function normalizeType(value: unknown): ParsedEventRow['type'] {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
  if (normalized === 'holiday' || normalized === 'announcement') {
    return normalized
  }
  return 'event'
}

export async function parseEventsFile(file: File): Promise<ParseResult> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
    firstSheet,
    { defval: '' },
  )

  const errors: string[] = []
  const rows: ParsedEventRow[] = []

  rawRows.forEach((rawRow, index) => {
    const rowNumber = index + 2 // +1 for header row, +1 for 1-indexing
    const mapped: Partial<Record<keyof ParsedEventRow, unknown>> = {}

    for (const [header, value] of Object.entries(rawRow)) {
      const field = normalizeHeader(header)
      if (field) mapped[field] = value
    }

    const title = String(mapped.title ?? '').trim()
    if (!title) {
      errors.push(`Row ${rowNumber}: missing a title, skipped.`)
      return
    }

    const eventDate = normalizeDate(mapped.eventDate)
    if (!eventDate) {
      errors.push(`Row ${rowNumber}: couldn't read a valid date, skipped.`)
      return
    }

    rows.push({
      title,
      description: mapped.description
        ? String(mapped.description).trim()
        : undefined,
      eventDate,
      eventTime: mapped.eventTime ? String(mapped.eventTime).trim() : undefined,
      type: normalizeType(mapped.type),
    })
  })

  return { rows, errors }
}
