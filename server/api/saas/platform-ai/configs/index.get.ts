import { platformAiConfig } from '../../../../database/schema'
import { requirePlatformPermission } from '../../../../utils/requirePlatformPermission'
import { platformAiConfigColumns, serializePlatformAiConfig } from '../../../../utils/platformAiConfigSerialize'

export default defineEventHandler(async (event) => {
  await requirePlatformPermission(event, { platformAi: ['read'] })

  const rows = await db.query.platformAiConfig.findMany({
    columns: platformAiConfigColumns,
    orderBy: (t, { desc }) => [desc(t.isDefaultChatbot), desc(t.isDefaultAnalysis), desc(t.createdAt)],
  })

  return rows.map(serializePlatformAiConfig)
})
