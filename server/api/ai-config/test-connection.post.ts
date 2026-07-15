import { encrypt } from '../../utils/encryption'
import { probeModelConnection } from '../../utils/ai/probeModel'
import type { SupportedProvider } from '../../utils/ai/provider'
import { resolveTenantAiCredentials } from '../../utils/ai/resolveCredentials'
import { requireTenantOwnLlm } from '../../utils/ai/tenantAiPolicy'
import { createRateLimiter } from '../../utils/rateLimit'
import { testAiConnectionSchema } from '../../utils/schemas/scoring'

const limiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 5,
  message: 'Too many test connection requests. Please wait before retrying.',
})

/**
 * POST /api/ai-config/test-connection
 * Test provider connectivity before saving a configuration.
 */
export default defineEventHandler(async (event) => {
  await limiter(event)
  const session = await requirePermission(event, { scoring: ['create'] })
  const orgId = session.session.activeOrganizationId
  await requireTenantOwnLlm(orgId)
  const body = await readValidatedBody(event, testAiConnectionSchema.parse)

  const { apiKey, baseUrl, provider } = await resolveTenantAiCredentials({
    provider: body.provider as SupportedProvider,
    orgId,
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
