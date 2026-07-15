import { eq } from 'drizzle-orm'
import { platformCountryLocale } from '../../../database/schema'
import { requirePlatformPermission } from '../../../utils/requirePlatformPermission'
import { updatePlatformCountryLocaleSchema } from '../../../utils/schemas/saasTenant'

export default defineEventHandler(async (event) => {
  await requirePlatformPermission(event, { localization: ['update'] })
  const body = await readValidatedBody(event, updatePlatformCountryLocaleSchema.parse)

  const countryCode = body.countryCode.toUpperCase()
  const existing = await db.query.platformCountryLocale.findFirst({
    where: eq(platformCountryLocale.countryCode, countryCode),
  })

  if (existing) {
    const [updated] = await db
      .update(platformCountryLocale)
      .set({
        nameDisplayFormat: body.nameDisplayFormat,
        dateFormat: body.dateFormat,
        defaultLanguage: body.defaultLanguage,
        updatedAt: new Date(),
      })
      .where(eq(platformCountryLocale.countryCode, countryCode))
      .returning()
    return { locale: updated }
  }

  const [created] = await db
    .insert(platformCountryLocale)
    .values({
      countryCode,
      nameDisplayFormat: body.nameDisplayFormat,
      dateFormat: body.dateFormat,
      defaultLanguage: body.defaultLanguage,
    })
    .returning()

  return { locale: created }
})
