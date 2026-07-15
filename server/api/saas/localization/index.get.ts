import { requirePlatformPermission } from '../../../utils/requirePlatformPermission'

export default defineEventHandler(async (event) => {
  await requirePlatformPermission(event, { localization: ['read'] })

  const locales = await db.query.platformCountryLocale.findMany({
    orderBy: (t, { asc }) => [asc(t.countryCode)],
  })

  return { locales }
})
