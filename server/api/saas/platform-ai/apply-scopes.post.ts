import { and, eq, isNull } from 'drizzle-orm'
import { platformAiConfig } from '../../../database/schema'
import { buildModelInfo } from '../../../utils/ai/modelHints'
import { getPricingCatalog } from '../../../utils/ai/modelPricing'
import { resolvePlatformAiCredentials } from '../../../utils/ai/resolveCredentials'
import type { SupportedProvider } from '../../../utils/ai/provider'
import { requirePlatformPermission } from '../../../utils/requirePlatformPermission'
import { serializePlatformAiConfig } from '../../../utils/platformAiConfigSerialize'
import { applyPlatformAiScopesSchema } from '../../../utils/schemas/scoring'
import { encrypt } from '../../../utils/encryption'

function baseUrlMatch(baseUrl: string | null | undefined) {
  if (baseUrl) return eq(platformAiConfig.baseUrl, baseUrl)
  return isNull(platformAiConfig.baseUrl)
}

/**
 * POST /api/saas/platform-ai/apply-scopes
 * Upsert platform AI configs for chatbot and analysis model scopes.
 */
export default defineEventHandler(async (event) => {
  await requirePlatformPermission(event, { platformAi: ['update'] })
  const body = await readValidatedBody(event, applyPlatformAiScopesSchema.parse)

  if (!body.chatbotModelId && !body.analysisModelId) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Select at least one model for chatbot or analysis.',
    })
  }

  const { apiKey, baseUrl, provider } = await resolvePlatformAiCredentials({
    provider: body.provider as SupportedProvider,
    apiKey: body.apiKey,
    baseUrl: body.baseUrl,
    configId: body.configId,
  })

  const apiKeyEncrypted = encrypt(apiKey, env.BETTER_AUTH_SECRET)
  const catalog = await getPricingCatalog()
  const normalizedBaseUrl = baseUrl ?? null

  const scopedModels = new Map<string, { chatbot: boolean, analysis: boolean }>()
  if (body.chatbotModelId) {
    const existing = scopedModels.get(body.chatbotModelId) ?? { chatbot: false, analysis: false }
    existing.chatbot = true
    scopedModels.set(body.chatbotModelId, existing)
  }
  if (body.analysisModelId) {
    const existing = scopedModels.get(body.analysisModelId) ?? { chatbot: false, analysis: false }
    existing.analysis = true
    scopedModels.set(body.analysisModelId, existing)
  }

  const wantsChatbotDefault = !!body.chatbotModelId
  const wantsAnalysisDefault = !!body.analysisModelId

  const saved = await db.transaction(async (tx) => {
    if (wantsChatbotDefault) {
      await tx.update(platformAiConfig).set({ isDefaultChatbot: false })
    }
    if (wantsAnalysisDefault) {
      await tx.update(platformAiConfig).set({ isDefaultAnalysis: false })
    }

    const results = []
    for (const [modelId, scopes] of scopedModels) {
      const info = buildModelInfo(provider, modelId, catalog)
      const inputPrice = body.inputPricePer1m ?? info.inputPricePer1m ?? null
      const outputPrice = body.outputPricePer1m ?? info.outputPricePer1m ?? null

      const existing = await tx.query.platformAiConfig.findFirst({
        where: and(
          eq(platformAiConfig.provider, provider),
          eq(platformAiConfig.model, modelId),
          baseUrlMatch(normalizedBaseUrl),
        ),
      })

      if (existing) {
        const [row] = await tx.update(platformAiConfig)
          .set({
            apiKeyEncrypted,
            baseUrl: normalizedBaseUrl,
            maxTokens: body.maxTokens,
            inputPricePer1m: inputPrice != null ? String(inputPrice) : null,
            outputPricePer1m: outputPrice != null ? String(outputPrice) : null,
            isDefaultChatbot: scopes.chatbot,
            isDefaultAnalysis: scopes.analysis,
            isActive: true,
          })
          .where(eq(platformAiConfig.id, existing.id))
          .returning()
        results.push(row!)
      }
      else {
        const [row] = await tx.insert(platformAiConfig)
          .values({
            name: info.label,
            provider,
            model: modelId,
            apiKeyEncrypted,
            baseUrl: normalizedBaseUrl,
            maxTokens: body.maxTokens,
            inputPricePer1m: inputPrice != null ? String(inputPrice) : null,
            outputPricePer1m: outputPrice != null ? String(outputPrice) : null,
            isDefaultChatbot: scopes.chatbot,
            isDefaultAnalysis: scopes.analysis,
            isActive: true,
          })
          .returning()
        results.push(row!)
      }
    }
    return results
  })

  return { configs: saved.map(serializePlatformAiConfig) }
})
