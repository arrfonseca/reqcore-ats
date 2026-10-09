import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'
import { session as sessionTable } from '../database/schema'
import { isSessionPastAbsoluteLifetime } from '../utils/sessionPolicy'

const SESSION_COOKIE_NAMES = [
  'better-auth.session_token',
  '__Secure-better-auth.session_token',
]

function clearSessionCookies(event: H3Event) {
  for (const name of SESSION_COOKIE_NAMES) {
    setCookie(event, name, '', {
      path: '/',
      maxAge: 0,
      httpOnly: true,
      sameSite: 'lax',
      secure: name.startsWith('__Secure-'),
    })
  }
}

/**
 * Ends a login 12 hours after sign-in, even when the idle expiry is still
 * in the future. Covers sessions created before this policy.
 */
export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname
  if (
    path.startsWith('/_nuxt/')
    || /\.(js|css|png|jpg|jpeg|svg|ico|woff2?|ttf|eot|webp|avif|gif|json|xml|txt|map)$/i.test(path)
  ) {
    return
  }

  const cookie = getRequestHeader(event, 'cookie') ?? ''
  if (!cookie.includes('session_token')) return

  try {
    const session = await auth.api.getSession({ headers: event.headers })
    const createdAt = session?.session?.createdAt
    if (!session || !createdAt || !isSessionPastAbsoluteLifetime(createdAt)) return

    await db.delete(sessionTable).where(eq(sessionTable.id, session.session.id))
    clearSessionCookies(event)
  }
  catch {
    // A session lookup failure must not block the request.
  }
})
