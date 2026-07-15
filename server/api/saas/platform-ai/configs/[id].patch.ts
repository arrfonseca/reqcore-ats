import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { platformAiConfig } from '../../../../database/schema'
import { requirePlatformPermission } from '../../../../utils/requirePlatformPermission'
import { updateAiConfigSchema } from '../../../../utils/schemas/scoring'
import { encrypt } from '../../../../utils/encryption'
import { serializePlatformAiConfig } from '../../../../utils/platformAiConfigSerialize'

const paramsSchema = z.object({ id: z.string().min(1) })

export default defineEventHandler(async (event) => {
  await requirePlatformPermission(event, { platformAi: ['update'] })
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const body = await readValidatedBody(event, updateAiConfigSchema.parse)

  const existing = await db.query.platformAiConfig.findFirst({
    where: eq(platformAiConfig.id, id),
    columns: { id: true },
  })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'AI configuration not found.' })

  const updates: Record<string, unknown> = { updatedAt: new Date() }
  if (body.name !== undefined) updates.name = body.name
  if (body.provider !== undefined) updates.provider = body.provider
  if (body.model !== undefined) updates.model = body.model
  if (body.baseUrl !== undefined) updates.baseUrl = body.baseUrl ?? null
  if (body.maxTokens !== undefined) updates.maxTokens = body.maxTokens
  if (body.inputPricePer1m !== undefined) updates.inputPricePer1m = body.inputPricePer1m != null ? String(body.inputPricePer1m) : null
  if (body.outputPricePer1m !== undefined) updates.outputPricePer1m = body.outputPricePer1m != null ? String(body.outputPricePer1m) : null
  if (body.apiKey) updates.apiKeyEncrypted = encrypt(body.apiKey, env.BETTER_AUTH_SECRET)

  const [updated] = await db.update(platformAiConfig)
    .set(updates)
    .where(eq(platformAiConfig.id, id))
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

  return { config: serializePlatformAiConfig(updated!) }
})
