import { eq } from 'drizzle-orm'
import { platformAiConfig } from '../../../../database/schema'
import { requirePlatformPermission } from '../../../../utils/requirePlatformPermission'
import { createAiConfigSchema } from '../../../../utils/schemas/scoring'
import { encrypt } from '../../../../utils/encryption'
import { serializePlatformAiConfig } from '../../../../utils/platformAiConfigSerialize'

export default defineEventHandler(async (event) => {
  await requirePlatformPermission(event, { platformAi: ['update'] })
  const body = await readValidatedBody(event, createAiConfigSchema.parse)

  const apiKeyEncrypted = encrypt(body.apiKey, env.BETTER_AUTH_SECRET)

  const existingCount = await db.$count(platformAiConfig)
  const isFirst = existingCount === 0
  const isDefaultChatbot = isFirst || body.isDefaultChatbot === true
  const isDefaultAnalysis = isFirst || body.isDefaultAnalysis === true

  const created = await db.transaction(async (tx) => {
    if (isDefaultChatbot) {
      await tx.update(platformAiConfig).set({ isDefaultChatbot: false })
    }
    if (isDefaultAnalysis) {
      await tx.update(platformAiConfig).set({ isDefaultAnalysis: false })
    }

    const [row] = await tx.insert(platformAiConfig)
      .values({
        name: body.name,
        provider: body.provider,
        model: body.model,
        apiKeyEncrypted,
        baseUrl: body.baseUrl ?? null,
        maxTokens: body.maxTokens,
        inputPricePer1m: body.inputPricePer1m != null ? String(body.inputPricePer1m) : null,
        outputPricePer1m: body.outputPricePer1m != null ? String(body.outputPricePer1m) : null,
        isDefaultChatbot,
        isDefaultAnalysis,
        isActive: true,
      })
      .returning({
        id: platformAiConfig.id,
        name: platformAiConfig.name,
        provider: platformAiConfig.provider,
        model: platformAiConfig.model,
        baseUrl: platformAiConfig.baseUrl,
        maxTokens: platformAiConfig.maxTokens,
        inputPricePer1m: platformAiConfig.inputPricePer1m,
        outputPricePer1m: platformAiConfig.outputPricePer1m,
        isDefaultChatbot: platformAiConfig.isDefaultChatbot,
        isDefaultAnalysis: platformAiConfig.isDefaultAnalysis,
        apiKeyEncrypted: platformAiConfig.apiKeyEncrypted,
        createdAt: platformAiConfig.createdAt,
        updatedAt: platformAiConfig.updatedAt,
      })
    return row!
  })

  setResponseStatus(event, 201)
  return { config: serializePlatformAiConfig(created) }
})
