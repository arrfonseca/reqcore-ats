import { resolveOrgLocaleSettings } from '../../utils/resolveOrgLocale'

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, { organization: ['read'] })
  const orgId = session.session.activeOrganizationId

  return resolveOrgLocaleSettings(orgId)
})
