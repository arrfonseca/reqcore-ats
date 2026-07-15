import { encrypt } from '../../../utils/encryption'
import { probeModelConnection } from '../../../utils/ai/probeModel'
import type { SupportedProvider } from '../../../utils/ai/provider'
import { resolvePlatformAiCredentials } from '../../../utils/ai/resolveCredentials'
import { requirePlatformPermission } from '../../../utils/requirePlatformPermission'
import { createRateLimiter } from '../../../utils/rateLimit'
import { testAiConnectionSchema } from '../../../utils/schemas/scoring'

const limiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 5,
  message: 'Too many test connection requests. Please wait before retrying.',
})

/**
 * POST /api/saas/platform-ai/test-connection
 * Test provider connectivity before saving a platform AI configuration.
 */
export default defineEventHandler(async (event) => {
  await limiter(event)
  await requirePlatformPermission(event, { platformAi: ['update'] })
  const body = await readValidatedBody(event, testAiConnectionSchema.parse)

  const { apiKey, baseUrl, provider } = await resolvePlatformAiCredentials({
    provider: body.provider as SupportedProvider,
    apiKey: body.apiKey,
    baseUrl: body.baseUrl,
    configId: body.configId,
  })

  try {
    await probeModelConnection({
      provider,
      model: body.model,
      apiKeyEncrypted: encrypt(apiKey, env.BETTER_AUTH_SECRET),
      baseUrl,
      maxTokens: 10,
    })
    return { success: true }
  }
  catch (err: any) {
    const message = err?.data?.statusMessage ?? err?.message ?? 'Unknown error'
    throw createError({
      statusCode: 422,
      statusMessage: `Connection test failed: ${message}`,
    })
  }
})
