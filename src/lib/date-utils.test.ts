import { describe, expect, it } from 'vitest'
import {
  formatDate,
  formatDateStamp,
  formatDateTime,
  formatShortDateTime,
} from './date-utils'

describe('formatDate', () => {
  it('formats a Date object', () => {
    expect(formatDate(new Date('2026-08-19T00:00:00Z'))).toBe('Aug 19, 2026')
  })

  it('formats an ISO string the same as a Date object', () => {
    expect(formatDate('2026-08-19T00:00:00Z')).toBe(
      formatDate(new Date('2026-08-19T00:00:00Z')),
    )
  })

  it('formats an epoch number', () => {
    // 2026-08-19T00:00:00Z
    expect(formatDate(1787097600000)).toBe(formatDate('2026-08-19T00:00:00Z'))
  })

  it('returns empty string for null', () => {
    expect(formatDate(null)).toBe('')
  })

  it('returns empty string for undefined', () => {
    expect(formatDate(undefined)).toBe('')
  })

  it('returns empty string for an invalid date string', () => {
    expect(formatDate('not a real date')).toBe('')
  })
})

describe('formatDateTime', () => {
  it('includes a time component', () => {
    const result = formatDateTime('2026-08-19T15:45:00Z')
    expect(result).not.toBe('')
    expect(result).toMatch(/\d{1,2}:\d{2}/)
  })

  it('returns empty string for null', () => {
    expect(formatDateTime(null)).toBe('')
  })
})

describe('formatShortDateTime', () => {
  it('omits the year', () => {
    const result = formatShortDateTime('2026-08-19T15:45:00Z')
    expect(result).not.toContain('2026')
  })

  it('returns empty string for an invalid value', () => {
    expect(formatShortDateTime('garbage')).toBe('')
  })
})

describe('formatDateStamp', () => {
  it('formats as YYYY-MM-DD', () => {
    expect(formatDateStamp(new Date('2026-08-19T12:00:00Z'))).toBe(
      '2026-08-19',
    )
  })

  it('defaults to the current date when called with no argument', () => {
    const result = formatDateStamp()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('falls back to the current date for an invalid input rather than throwing', () => {
    expect(() => formatDateStamp('not a date')).not.toThrow()
    expect(formatDateStamp('not a date')).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
