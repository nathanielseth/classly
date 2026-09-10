import { afterEach, describe, expect, it, vi } from 'vitest'
import { dbError } from './db-error'

describe('dbError', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns a generic message by default, never the raw error text', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const raw = {
      message: 'duplicate key value violates unique constraint "profiles_email_key"',
      code: '23505',
    }
    const result = dbError(raw)

    expect(result).toBeInstanceOf(Error)
    expect(result.message).not.toContain('constraint')
    expect(result.message).not.toContain(raw.message)
  })

  it('uses a caller-supplied fallback message when provided', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const result = dbError({ message: 'internal detail' }, 'Could not save your changes.')
    expect(result.message).toBe('Could not save your changes.')
  })

  it('logs the original error server-side for debugging', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const raw = { message: 'some internal db failure' }

    dbError(raw)

    expect(spy).toHaveBeenCalledWith('[db error]', raw)
  })

  it('accepts a real Error instance, not just a {message} shape', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const result = dbError(new Error('column "foo" does not exist'))
    expect(result.message).not.toContain('column')
  })
})
