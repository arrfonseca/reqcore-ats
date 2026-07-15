import { eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { platformAiConfig } from '../../../../../database/schema'
import { requirePlatformPermission } from '../../../../../utils/requirePlatformPermission'
import { setAiConfigDefaultSchema } from '../../../../../utils/schemas/scoring'

const paramsSchema = z.object({ id: z.string().min(1) })

export default defineEventHandler(async (event) => {
  await requirePlatformPermission(event, { platformAi: ['update'] })
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)
  const body = await readValidatedBody(event, setAiConfigDefaultSchema.parse)

  const existing = await db.query.platformAiConfig.findFirst({
    where: eq(platformAiConfig.id, id),
    columns: { id: true },
  })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'AI configuration not found.' })

  await db.transaction(async (tx) => {
    if (body.purposes.includes('chatbot')) {
      await tx.update(platformAiConfig)
        .set({
          isDefaultChatbot: sql`${platformAiConfig.id} = ${id}`,
          updatedAt: new Date(),
        })
    }
    if (body.purposes.includes('analysis')) {
      await tx.update(platformAiConfig)
        .set({
          isDefaultAnalysis: sql`${platformAiConfig.id} = ${id}`,
          updatedAt: new Date(),
        })
    }
  })

  return { success: true }
})
