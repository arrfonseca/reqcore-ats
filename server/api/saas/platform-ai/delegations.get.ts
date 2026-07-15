import { eq } from 'drizzle-orm'
import { organization, tenantAiSettings } from '../../../database/schema'
import { requirePlatformPermission } from '../../../utils/requirePlatformPermission'

export default defineEventHandler(async (event) => {
  await requirePlatformPermission(event, { platformAi: ['read'] })

  const rows = await db
    .select({
      organizationId: organization.id,
      name: organization.name,
      slug: organization.slug,
      allowOwnLlm: tenantAiSettings.allowOwnLlm,
    })
    .from(organization)
    .innerJoin(tenantAiSettings, eq(tenantAiSettings.organizationId, organization.id))
    .where(eq(tenantAiSettings.allowOwnLlm, true))
    .orderBy(organization.name)

  return {
    data: rows.map(r => ({
      organizationId: r.organizationId,
      name: r.name,
      slug: r.slug,
    })),
  }
})
