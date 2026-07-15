import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { platformAiConfig } from '../../../../../database/schema'
import { requirePlatformPermission } from '../../../../../utils/requirePlatformPermission'
import { probeModelConnection } from '../../../../../utils/ai/probeModel'
import type { SupportedProvider } from '../../../../../utils/ai/provider'
import { createRateLimiter } from '../../../../../utils/rateLimit'

const limiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 5,
  message: 'Too many test connection requests. Please wait before retrying.',
})

const paramsSchema = z.object({ id: z.string().min(1) })

export default defineEventHandler(async (event) => {
  await limiter(event)
  await requirePlatformPermission(event, { platformAi: ['update'] })
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)

  const config = await db.query.platformAiConfig.findFirst({
    where: eq(platformAiConfig.id, id),
  })
  if (!config) throw createError({ statusCode: 404, statusMessage: 'AI configuration not found.' })
  if (!config.apiKeyEncrypted) {
    throw createError({ statusCode: 422, statusMessage: 'No API key configured for this configuration.' })
  }

  try {
    await probeModelConnection({
      provider: config.provider as SupportedProvider,
      model: config.model,
      apiKeyEncrypted: config.apiKeyEncrypted,
      baseUrl: config.baseUrl,
      maxTokens: 10,
    })
    return { success: true }
  }
  catch (err: any) {
    const message = err?.data?.statusMessage ?? err?.message ?? 'Unknown error'
    if (typeof message === 'string' && message.includes('decrypt')) {
      throw createError({
        statusCode: 422,
        statusMessage: 'Failed to decrypt API key. If you recently rotated BETTER_AUTH_SECRET, re-enter the API key for this configuration.',
      })
    }
    throw createError({
      statusCode: 422,
      statusMessage: `Connection test failed: ${message}`,
    })
  }
})
