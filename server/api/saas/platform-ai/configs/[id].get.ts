import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { platformAiConfig } from '../../../../database/schema'
import { requirePlatformPermission } from '../../../../utils/requirePlatformPermission'
import { platformAiConfigColumns, serializePlatformAiConfig } from '../../../../utils/platformAiConfigSerialize'

const paramsSchema = z.object({ id: z.string().min(1) })

export default defineEventHandler(async (event) => {
  await requirePlatformPermission(event, { platformAi: ['read'] })
  const { id } = await getValidatedRouterParams(event, paramsSchema.parse)

  const row = await db.query.platformAiConfig.findFirst({
    where: eq(platformAiConfig.id, id),
    columns: platformAiConfigColumns,
  })
  if (!row) throw createError({ statusCode: 404, statusMessage: 'AI configuration not found.' })

  return serializePlatformAiConfig(row)
})
