import { PROVIDER_REGISTRY } from '../../../utils/ai/provider'
import { requirePlatformPermission } from '../../../utils/requirePlatformPermission'

/**
 * GET /api/saas/platform-ai/providers
 * Provider catalog for the platform Global AI console (no tenant org required).
 */
export default defineEventHandler(async (event) => {
  await requirePlatformPermission(event, { platformAi: ['read'] })
  return PROVIDER_REGISTRY
})
