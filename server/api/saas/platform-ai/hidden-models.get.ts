import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { platformAiHiddenModel } from '../../../database/schema'
import { requirePlatformPermission } from '../../../utils/requirePlatformPermission'

const querySchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'google', 'openai_compatible']),
})

/**
 * GET /api/saas/platform-ai/hidden-models?provider=openai
 */
export default defineEventHandler(async (event) => {
  await requirePlatformPermission(event, { platformAi: ['read'] })
  const { provider } = await getValidatedQuery(event, querySchema.parse)

  const rows = await db.query.platformAiHiddenModel.findMany({
    where: eq(platformAiHiddenModel.provider, provider),
    columns: { modelId: true },
  })

  return { modelIds: rows.map(r => r.modelId) }
})
