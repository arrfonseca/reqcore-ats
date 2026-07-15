import { platformAiConfig } from '../../../database/schema'
import { requirePlatformPermission } from '../../../utils/requirePlatformPermission'
import { platformAiConfigColumns, serializePlatformAiConfig } from '../../../utils/platformAiConfigSerialize'

/** @deprecated Use GET /api/saas/platform-ai/configs and /delegations instead. */
export default defineEventHandler(async (event) => {
  await requirePlatformPermission(event, { platformAi: ['read'] })

  const configs = await db.query.platformAiConfig.findMany({
    columns: platformAiConfigColumns,
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  })

  return {
    configs: configs.map(serializePlatformAiConfig),
  }
})
