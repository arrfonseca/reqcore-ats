import type { H3Event } from 'h3'

interface TrackSession {
  user: { id: string }
  session: { activeOrganizationId: string }
}

/** No-op — external product analytics disabled. */
export function trackEvent(
  _event: H3Event,
  _session: TrackSession | null,
  _eventName: string,
  _properties?: Record<string, unknown>,
): void {
}

/** No-op — external product analytics disabled. */
export function trackApiError(
  _event: H3Event,
  _statusCode: number,
  _properties?: Record<string, unknown>,
): void {
}

/** No-op — external product analytics disabled. */
export function trackServerError(
  _event: H3Event,
  _session: TrackSession | null,
  _error: unknown,
  _properties?: Record<string, unknown>,
): void {
}
