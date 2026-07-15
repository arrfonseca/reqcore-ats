export interface EffectiveAiPurposeSummary {
  configured: boolean
  source: 'tenant' | 'platform'
  provider: string | null
  model: string | null
  name: string | null
}

export interface EffectiveAiSummary {
  allowOwnLlm: boolean
  analysis: EffectiveAiPurposeSummary
  chatbot: EffectiveAiPurposeSummary
}

/**
 * Wraps GET /api/ai-config/effective plus org policy for runtime UI.
 */
export function useEffectiveAi() {
  const { t } = useI18n()
  const { allowOwnLlm } = useOrgSettings()

  const { data, status, refresh } = useFetch<EffectiveAiSummary>('/api/ai-config/effective', {
    key: 'ai-config-effective',
    headers: useRequestHeaders(['cookie']),
  })

  const analysis = computed(() => data.value?.analysis ?? null)
  const chatbot = computed(() => data.value?.chatbot ?? null)

  const isAnalysisConfigured = computed(() => analysis.value?.configured ?? false)
  const isChatbotConfigured = computed(() => chatbot.value?.configured ?? false)
  const isAiConfigured = computed(() => isAnalysisConfigured.value)

  const aiSettingsPath = computed(() =>
    allowOwnLlm.value ? '/dashboard/settings/ai-analysis' : '/dashboard/ai-analysis',
  )

  const aiSettingsLinkLabel = computed(() =>
    allowOwnLlm.value
      ? t('common.actions.goToAiSettings')
      : t('common.actions.goToAiAnalysisSettings'),
  )

  function formatPurposeLabel(purpose: EffectiveAiPurposeSummary | null): string {
    if (!purpose?.configured) return t('settings.aiAnalysis.notConfigured')
    if (purpose.source === 'platform') {
      return t('settings.aiAnalysis.platformModel', {
        name: purpose.name ?? purpose.model ?? '',
        model: purpose.model ?? '',
      })
    }
    return purpose.name ?? purpose.model ?? ''
  }

  return {
    data,
    status,
    refresh,
    allowOwnLlm,
    analysis,
    chatbot,
    isAnalysisConfigured,
    isChatbotConfigured,
    isAiConfigured,
    aiSettingsPath,
    aiSettingsLinkLabel,
    formatPurposeLabel,
  }
}
