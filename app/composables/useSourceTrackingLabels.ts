export function useSourceTrackingLabels() {
  const { t, te } = useI18n()

  function getChannelLabel(channel: string) {
    const key = `sourceTracking.channels.${channel}`
    return te(key) ? t(key) : channel
  }

  function getStageLabel(status: string) {
    const key = `common.stages.${status}`
    return te(key) ? t(key) : status
  }

  function formatRelativeDate(dateStr: string) {
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return t('sourceTracking.relativeTime.justNow')
    if (diffMins < 60) return t('sourceTracking.relativeTime.minutesAgo', { count: diffMins })
    if (diffHours < 24) return t('sourceTracking.relativeTime.hoursAgo', { count: diffHours })
    if (diffDays < 7) return t('sourceTracking.relativeTime.daysAgo', { count: diffDays })
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }

  return {
    getChannelLabel,
    getStageLabel,
    formatRelativeDate,
  }
}
