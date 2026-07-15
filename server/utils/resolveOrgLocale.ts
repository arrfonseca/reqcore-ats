import { eq } from 'drizzle-orm'
import { organization, orgSettings, platformCountryLocale, tenantAiSettings } from '../database/schema'

export async function resolveOrgLocaleSettings(organizationId: string) {
  const [org, settings, aiSettings] = await Promise.all([
    db.query.organization.findFirst({
      where: eq(organization.id, organizationId),
      columns: { country: true },
    }),
    db.query.orgSettings.findFirst({
      where: eq(orgSettings.organizationId, organizationId),
      columns: {
        nameDisplayFormat: true,
        dateFormat: true,
        companyWebsiteUrl: true,
        brandSubtitle: true,
      },
    }),
    db.query.tenantAiSettings.findFirst({
      where: eq(tenantAiSettings.organizationId, organizationId),
      columns: { allowOwnLlm: true },
    }),
  ])

  const countryCode = (org?.country ?? 'BR').toUpperCase()
  const countryLocale = await db.query.platformCountryLocale.findFirst({
    where: eq(platformCountryLocale.countryCode, countryCode),
  })

  return {
    nameDisplayFormat: countryLocale?.nameDisplayFormat
      ?? settings?.nameDisplayFormat
      ?? 'first_last',
    dateFormat: countryLocale?.dateFormat
      ?? settings?.dateFormat
      ?? 'dmy',
    companyWebsiteUrl: settings?.companyWebsiteUrl ?? null,
    brandSubtitle: settings?.brandSubtitle ?? null,
    countryCode,
    defaultLanguage: countryLocale?.defaultLanguage ?? 'pt-BR',
    localeSource: countryLocale ? 'platform' as const : 'org' as const,
    allowOwnLlm: aiSettings?.allowOwnLlm ?? false,
  }
}
