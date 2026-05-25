import type { H3Event } from 'h3'

/**
 * Structured server logging (local only — not sent to PostHog or other vendors).
 */

interface LogContext {
  org_id?: string
  [key: string]: string | number | boolean | null | undefined
}

function emit(level: 'info' | 'warn' | 'error' | 'debug', body: string, attributes?: LogContext): void {
  if (process.env.NODE_ENV === 'test') return
  const payload = attributes && Object.keys(attributes).length > 0 ? attributes : undefined
  const line = payload ? `${body} ${JSON.stringify(payload)}` : body
  if (level === 'error') console.error('[reqcore]', line)
  else if (level === 'warn') console.warn('[reqcore]', line)
  else if (level === 'debug') console.debug('[reqcore]', line)
  else console.info('[reqcore]', line)
}

export function initLoggerProvider(): void {
  // no-op (OTLP / PostHog logs disabled)
}

export async function shutdownLoggerProvider(): Promise<void> {
  // no-op
}

export function logInfo(body: string, attributes?: LogContext): void {
  emit('info', body, attributes)
}

export function logWarn(body: string, attributes?: LogContext): void {
  emit('warn', body, attributes)
}

export function logError(body: string, attributes?: LogContext): void {
  emit('error', body, attributes)
}

export function logDebug(body: string, attributes?: LogContext): void {
  emit('debug', body, attributes)
}

export function requestAttributes(event: H3Event): Record<string, string | undefined> {
  const headers = getHeaders(event)
  return {
    http_method: getMethod(event),
    http_path: getRequestURL(event).pathname,
    user_agent: headers['user-agent'],
  }
}

interface SessionInfo {
  user: { id: string }
  session: { activeOrganizationId: string }
}

export function logApiRequest(
  event: H3Event,
  session: SessionInfo | null,
  body: string,
  extra?: Record<string, unknown>,
): void {
  logInfo(body, {
    ...requestAttributes(event),
    org_id: session?.session?.activeOrganizationId,
    ...extra,
  })
}

export function logApiError(
  event: H3Event,
  session: SessionInfo | null,
  body: string,
  extra?: Record<string, unknown>,
): void {
  logError(body, {
    ...requestAttributes(event),
    org_id: session?.session?.activeOrganizationId,
    ...extra,
  })
}
