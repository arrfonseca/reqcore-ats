import { eq, ne } from 'drizzle-orm'
import { z } from 'zod'
import { platformAiConfig } from '../../../../database/schema'
import { requirePlatformPermission } from '../../../../utils/requirePlatformPermission'

const paramsSchema = z.object({ id: z.string().min(1) })

export default defineEventHandler(async (event) => {
  await requirePlatformPermission(event, { platformAi: ['update'] })
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)

  const existing = await db.query.platformAiConfig.findFirst({
    where: eq(platformAiConfig.id, id),
    columns: { id: true, isDefaultChatbot: true, isDefaultAnalysis: true },
  })
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'AI configuration not found.' })

  await db.transaction(async (tx) => {
    await tx.delete(platformAiConfig).where(eq(platformAiConfig.id, id))

    if (existing.isDefaultChatbot || existing.isDefaultAnalysis) {
      const successor = await tx.query.platformAiConfig.findFirst({
        where: ne(platformAiConfig.id, id),
        orderBy: (t, { desc }) => [desc(t.createdAt)],
        columns: { id: true },
      })
      if (successor) {
        const promote: Record<string, unknown> = { updatedAt: new Date() }
        if (existing.isDefaultChatbot) promote.isDefaultChatbot = true
        if (existing.isDefaultAnalysis) promote.isDefaultAnalysis = true
        await tx.update(platformAiConfig).set(promote).where(eq(platformAiConfig.id, successor.id))
      }
    }
  })

  return { success: true }
})
