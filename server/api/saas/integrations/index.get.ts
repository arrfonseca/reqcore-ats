import { requirePlatformPermission } from '../../../utils/requirePlatformPermission'

export default defineEventHandler(async (event) => {
  await requirePlatformPermission(event, { platformIntegration: ['read'] })

  const rows = await db.query.platformIntegrationConfig.findMany({
    orderBy: (t, { asc }) => [asc(t.provider)],
  })

  const googleConfigured = !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET)

  return {
    integrations: rows.map((r) => ({
      provider: r.provider,
      enabled: r.enabled,
      config: r.configJson,
      envConfigured: r.provider === 'google_calendar' ? googleConfigured : false,
      description: r.provider === 'remotecal'
        ? 'Remotecal integration will connect to the external Remotecal project.'
        : r.provider === 'google_calendar'
          ? 'Google Calendar OAuth credentials are configured at the application environment level.'
          : null,
    })),
  }
})
