import { validateOrgSlug } from '~~/shared/tenant-routing'

const ORG_SLUG_PATHS = [
  '/api/auth/organization/create',
  '/api/auth/organization/update',
]

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname
  if (event.method !== 'POST') return
  if (!ORG_SLUG_PATHS.some(p => path.endsWith(p))) return

  const body = await readBody(event).catch(() => null)
  const slug: string | undefined = body?.slug ?? body?.data?.slug
  if (!slug || typeof slug !== 'string') return

  const error = validateOrgSlug(slug)
  if (error) {
    throw createError({ statusCode: 400, statusMessage: error })
  }
})
