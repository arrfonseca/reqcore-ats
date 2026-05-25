import { randomBytes } from 'node:crypto'

/**
 * Nonce-based Content Security Policy middleware.
 *
 * Skipped for:
 *   - /api/*     — JSON endpoints
 *   - /_nuxt/*   — Nuxt build assets
 *   - Static file extensions
 */
export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname

  if (
    path.startsWith('/api/')
    || path.startsWith('/_nuxt/')
    || /\.(js|css|png|jpg|jpeg|svg|ico|woff2?|ttf|eot|webp|avif|gif|json|xml|txt|map)$/i.test(path)
  ) {
    return
  }

  const nonce = randomBytes(16).toString('base64url')
  event.context.nonce = nonce

  setResponseHeader(
    event,
    'Content-Security-Policy',
    [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}'`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  )
})
