import { invalidateCustomDomainCache } from '~~/server/utils/tenantContext'
import {
  buildLogoStorageKey,
  logoVariantSchema,
  validateLogoFile,
} from '~~/server/utils/schemas/branding'
import { getOrgBrandingKeysByOrgId, upsertOrgLogoKey } from '~~/server/utils/orgBranding'

/**
 * POST /api/org-settings/branding/logo
 * Multipart upload: variant=light|dark, file=<image>
 */
export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, { organization: ['update'] })
  const orgId = session.session.activeOrganizationId

  const formData = await readMultipartFormData(event)
  if (!formData) {
    throw createError({ statusCode: 400, statusMessage: 'No form data received' })
  }

  const filePart = formData.find(part => part.name === 'file')
  const variantPart = formData.find(part => part.name === 'variant')

  if (!filePart?.data || !filePart.filename) {
    throw createError({ statusCode: 400, statusMessage: 'No file provided' })
  }

  const variantResult = logoVariantSchema.safeParse(variantPart?.data?.toString())
  if (!variantResult.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid variant. Must be: light or dark' })
  }
  const variant = variantResult.data

  const fileBuffer = Buffer.from(filePart.data)
  const { mimeType, extension } = await validateLogoFile(fileBuffer, filePart.filename)

  const storageKey = buildLogoStorageKey(orgId, variant, extension)

  const keys = await getOrgBrandingKeysByOrgId(orgId)
  const previousKey = variant === 'light' ? keys.logoLightKey : keys.logoDarkKey

  try {
    await uploadToS3(storageKey, fileBuffer, mimeType)
    await upsertOrgLogoKey(orgId, variant, storageKey)
  }
  catch (err) {
    try {
      await deleteFromS3(storageKey)
    }
    catch {
      // Best-effort rollback
    }
    throw err
  }

  if (previousKey && previousKey !== storageKey) {
    try {
      await deleteFromS3(previousKey)
    }
    catch {
      // Best-effort cleanup of old object
    }
  }

  invalidateCustomDomainCache()

  logApiRequest(event, session, 'org_branding.logo_uploaded', { variant })

  return { variant, storageKey }
})
