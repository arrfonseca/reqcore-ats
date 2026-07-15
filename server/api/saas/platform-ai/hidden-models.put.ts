import { and, eq } from 'drizzle-orm'
import { platformAiHiddenModel } from '../../../database/schema'
import { requirePlatformPermission } from '../../../utils/requirePlatformPermission'
import type { SupportedProvider } from '../../../utils/ai/provider'
import { setHiddenModelSchema } from '../../../utils/schemas/scoring'

/**
 * PUT /api/saas/platform-ai/hidden-models
 * Persist hide/show for a model card in the SaaS Global AI picker.
 */
export default defineEventHandler(async (event) => {
  await requirePlatformPermission(event, { platformAi: ['update'] })
  const body = await readValidatedBody(event, setHiddenModelSchema.parse)
  const provider = body.provider as SupportedProvider

  if (body.hidden) {
    await db.insert(platformAiHiddenModel)
      .values({ provider, modelId: body.modelId })
      .onConflictDoNothing({
        target: [platformAiHiddenModel.provider, platformAiHiddenModel.modelId],
      })
  }
  else {
    await db.delete(platformAiHiddenModel)
      .where(and(
        eq(platformAiHiddenModel.provider, provider),
        eq(platformAiHiddenModel.modelId, body.modelId),
      ))
  }

  return { success: true }
})
