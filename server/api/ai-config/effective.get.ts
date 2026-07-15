import { getEffectiveAiSummary } from '../../utils/ai/loadConfig'

/**
 * GET /api/ai-config/effective
 * Read-only summary of the AI configs used for analysis and chatbot (tenant or platform).
 */
export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, { scoring: ['read'] })
  const orgId = session.session.activeOrganizationId
  return getEffectiveAiSummary(orgId)
})
