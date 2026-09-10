// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDebouncedValue } from './useDebouncedValue'

describe('useDebouncedValue', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebouncedValue('a', 300))
    expect(result.current).toBe('a')
  })

  it('does not update before the delay has elapsed', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: 'a' } },
    )

    rerender({ value: 'b' })
    act(() => {
      vi.advanceTimersByTime(299)
    })
    expect(result.current).toBe('a')
  })

  it('updates once the delay has elapsed', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: 'a' } },
    )

    rerender({ value: 'b' })
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(result.current).toBe('b')
  })

  it('resets the timer on every change, so only the final value in a burst is committed', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      { initialProps: { value: '' } },
    )

    for (const partial of ['j', 'jo', 'joh', 'john']) {
      rerender({ value: partial })
      act(() => {
        vi.advanceTimersByTime(100) // less than the 300ms delay
      })
    }
    // only 100ms has passed since the last keystroke
    // should still be unset
    expect(result.current).toBe('')

    act(() => {
      vi.advanceTimersByTime(200) // completes the 300ms since "john"
    })
    expect(result.current).toBe('john')
  })
})