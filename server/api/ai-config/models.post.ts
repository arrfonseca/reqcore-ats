import { and, eq } from 'drizzle-orm'
import { aiConfig } from '../../database/schema'
import { ensureModelInList, listProviderModels } from '../../utils/ai/listModels'
import { getPricingCatalog } from '../../utils/ai/modelPricing'
import { resolveTenantAiCredentials } from '../../utils/ai/resolveCredentials'
import { requireTenantOwnLlm } from '../../utils/ai/tenantAiPolicy'
import type { SupportedProvider } from '../../utils/ai/provider'
import { createRateLimiter } from '../../utils/rateLimit'
import { listAiModelsSchema } from '../../utils/schemas/scoring'

const limiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 10,
  message: 'Too many model list requests. Please wait before retrying.',
})

/**
 * POST /api/ai-config/models
 * Fetch available models from the provider API using supplied or stored credentials.
 */
export default defineEventHandler(async (event) => {
  await limiter(event)
  const session = await requirePermission(event, { scoring: ['create'] })
  const orgId = session.session.activeOrganizationId
  await requireTenantOwnLlm(orgId)
  const body = await readValidatedBody(event, listAiModelsSchema.parse)

  const { apiKey, baseUrl, provider } = await resolveTenantAiCredentials({
    provider: body.provider as SupportedProvider,
    orgId,
    apiKey: body.apiKey,
    baseUrl: body.baseUrl,
    configId: body.configId,
  })

  try {
    const catalog = await getPricingCatalog()
    let models = await listProviderModels(provider, apiKey, baseUrl, catalog)
    if (body.configId) {
      const config = await db.query.aiConfig.findFirst({
        where: and(eq(aiConfig.id, body.configId), eq(aiConfig.organizationId, orgId)),
        columns: { model: true },
      })
      if (config?.model) {
        models = ensureModelInList(models, provider, config.model, catalog)
      }
    }
    return { models }
  }
  catch (err: any) {
    if (err?.statusCode) throw err
    const message = err?.message ?? 'Failed to fetch models from provider.'
    throw createError({ statusCode: 422, statusMessage: message })
  }
})
