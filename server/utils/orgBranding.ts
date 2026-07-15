import { eq } from 'drizzle-orm'
import { organization, orgSettings } from '../database/schema'
import type { LogoVariant } from './schemas/branding'

export interface OrgBrandingKeys {
  logoLightKey: string | null
  logoDarkKey: string | null
  brandSubtitle: string | null
}

export interface OrgBrandingUrls {
  logoLightUrl: string | null
  logoDarkUrl: string | null
}

export function buildPublicLogoUrl(orgSlug: string, variant: LogoVariant): string {
  return `/api/public/orgs/${encodeURIComponent(orgSlug)}/branding/logo/${variant}`
}

export function keysToPublicUrls(
  orgSlug: string,
  keys: OrgBrandingKeys,
): OrgBrandingUrls {
  return {
    logoLightUrl: keys.logoLightKey ? buildPublicLogoUrl(orgSlug, 'light') : null,
    logoDarkUrl: keys.logoDarkKey ? buildPublicLogoUrl(orgSlug, 'dark') : null,
  }
}

export async function getOrgBrandingKeysByOrgId(organizationId: string): Promise<OrgBrandingKeys> {
  const settings = await db.query.orgSettings.findFirst({
    where: eq(orgSettings.organizationId, organizationId),
    columns: { logoLightKey: true, logoDarkKey: true, brandSubtitle: true },
  })
  return {
    logoLightKey: settings?.logoLightKey ?? null,
    logoDarkKey: settings?.logoDarkKey ?? null,
    brandSubtitle: settings?.brandSubtitle ?? null,
  }
}

export async function getOrgBrandingBySlug(orgSlug: string) {
  const org = await db.query.organization.findFirst({
    where: eq(organization.slug, orgSlug),
    columns: { id: true, name: true, slug: true },
  })
  if (!org) return null

  const keys = await getOrgBrandingKeysByOrgId(org.id)
  const urls = keysToPublicUrls(org.slug, keys)

  return {
    orgName: org.name,
    orgSlug: org.slug,
    organizationId: org.id,
    brandSubtitle: keys.brandSubtitle,
    ...keys,
    ...urls,
  }
}

export async function upsertOrgLogoKey(
  organizationId: string,
  variant: LogoVariant,
  storageKey: string,
): Promise<void> {
  const column = variant === 'light' ? 'logoLightKey' : 'logoDarkKey'
  await db
    .insert(orgSettings)
    .values({
      organizationId,
      nameDisplayFormat: 'first_last',
      dateFormat: 'dmy',
      [column]: storageKey,
    })
    .onConflictDoUpdate({
      target: orgSettings.organizationId,
      set: {
        [column]: storageKey,
        updatedAt: new Date(),
      },
    })
}

export async function clearOrgLogoKey(organizationId: string, variant: LogoVariant): Promise<string | null> {
  const keys = await getOrgBrandingKeysByOrgId(organizationId)
  const existingKey = variant === 'light' ? keys.logoLightKey : keys.logoDarkKey
  const column = variant === 'light' ? 'logoLightKey' : 'logoDarkKey'

  await db
    .insert(orgSettings)
    .values({
      organizationId,
      nameDisplayFormat: 'first_last',
      dateFormat: 'dmy',
      [column]: null,
    })
    .onConflictDoUpdate({
      target: orgSettings.organizationId,
      set: {
        [column]: null,
        updatedAt: new Date(),
      },
    })

  return existingKey
}
