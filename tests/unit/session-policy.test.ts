import { describe, expect, it } from 'vitest'
import {
  SESSION_ABSOLUTE_SECONDS,
  SESSION_IDLE_SECONDS,
  absoluteSessionExpiresAt,
  clampSessionExpiresAt,
  isSessionPastAbsoluteLifetime,
} from '../../server/utils/sessionPolicy'

describe('session lifetime policy', () => {
  const signedInAt = new Date('2026-10-09T08:00:00.000Z')

  it('keeps an idle expiry that is still inside the absolute cap', () => {
    const requested = new Date(signedInAt.getTime() + SESSION_IDLE_SECONDS * 1000)
    expect(clampSessionExpiresAt(signedInAt, requested).toISOString())
      .toBe(requested.toISOString())
  })

  it('does not let a refresh extend past 12 hours from sign-in', () => {
    const requested = new Date(signedInAt.getTime() + 20 * 60 * 60 * 1000)
    expect(clampSessionExpiresAt(signedInAt, requested).toISOString())
      .toBe(absoluteSessionExpiresAt(signedInAt).toISOString())
  })

  it('treats a session from the previous day as past the absolute cap', () => {
    const yesterday = new Date('2026-10-08T15:00:00.000Z')
    const thisMorning = new Date('2026-10-09T10:00:00.000Z')
    expect(isSessionPastAbsoluteLifetime(yesterday, thisMorning.getTime())).toBe(true)
  })

  it('keeps a session signed in earlier the same work day', () => {
    const later = new Date(signedInAt.getTime() + 4 * 60 * 60 * 1000)
    expect(isSessionPastAbsoluteLifetime(signedInAt, later.getTime())).toBe(false)
  })
})
