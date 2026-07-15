import { and, eq } from 'drizzle-orm'
import { platformAiConfig } from '../../../database/schema'
import { ensureModelInList, listProviderModels } from '../../../utils/ai/listModels'
import { getPricingCatalog } from '../../../utils/ai/modelPricing'
import { getHiddenModelIds, verifyProviderModels } from '../../../utils/ai/probeModel'
import { resolvePlatformAiCredentials } from '../../../utils/ai/resolveCredentials'
import type { SupportedProvider } from '../../../utils/ai/provider'
import { requirePlatformPermission } from '../../../utils/requirePlatformPermission'
import { createRateLimiter } from '../../../utils/rateLimit'
import { listAiModelsSchema } from '../../../utils/schemas/scoring'

const limiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 10,
  message: 'Too many model list requests. Please wait before retrying.',
})

/**
 * POST /api/saas/platform-ai/models
 * Fetch available models from the provider API for the platform AI console.
 */
export default defineEventHandler(async (event) => {
  await limiter(event)
  await requirePlatformPermission(event, { platformAi: ['read'] })
  const body = await readValidatedBody(event, listAiModelsSchema.parse)

  const { apiKey, baseUrl, provider } = await resolvePlatformAiCredentials({
    provider: body.provider as SupportedProvider,
    apiKey: body.apiKey,
    baseUrl: body.baseUrl,
    configId: body.configId,
  })

  const shouldVerify = body.verify !== false
  const includeHidden = body.includeHidden === true

  try {
    const catalog = await getPricingCatalog()
    let models = await listProviderModels(provider, apiKey, baseUrl, catalog)

    const ensureIds = new Set<string>(body.ensureModelIds ?? [])
    if (body.configId) {
      const config = await db.query.platformAiConfig.findFirst({
        where: eq(platformAiConfig.id, body.configId),
        columns: { model: true },
      })
      if (config?.model) ensureIds.add(config.model)
    }
    for (const id of ensureIds) {
      models = ensureModelInList(models, provider, id, catalog)
    }

    let verifying = false
    if (shouldVerify && models.length > 0) {
      verifying = true
      const verifyResults = await verifyProviderModels(
        provider,
        apiKey,
        models.map(m => m.id),
        baseUrl,
        {
          force: body.forceVerify === true,
          cacheOnly: body.cacheOnly === true,
        },
      )
      const okIds = new Set(verifyResults.filter(r => r.ok).map(r => r.modelId))
      models = models
        .map(m => ({ ...m, verified: okIds.has(m.id) }))
        .filter(m => m.verified || ensureIds.has(m.id))
    }

    if (!includeHidden) {
      const hidden = await getHiddenModelIds(provider)
      models = models.filter(m => !hidden.has(m.id) || ensureIds.has(m.id))
    }

    return { models, verifying: shouldVerify ? verifying : undefined }
  }
  catch (err: any) {
    if (err?.statusCode) throw err
    const message = err?.message ?? 'Failed to fetch models from provider.'
    throw createError({ statusCode: 422, statusMessage: message })
  }
})
