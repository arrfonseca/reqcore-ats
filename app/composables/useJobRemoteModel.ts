import {
  allowedRemoteStatuses,
  isRemoteModelDisabled,
  normalizeRemoteStatus,
  type RemoteStatusValue,
} from '~~/shared/job-types'

/**
 * Remote work model options tied to contract type (Tipo de Contrato).
 */
export function useJobRemoteModel(contractType: MaybeRefOrGetter<string>) {
  const { t } = useI18n()

  const type = computed(() => toValue(contractType))

  const isDisabled = computed(() => isRemoteModelDisabled(type.value))

  const options = computed(() => {
    const allowed = allowedRemoteStatuses(type.value)
    const all = [
      { value: undefined as undefined, label: t('dashboard.jobs.shared.notSpecified') },
      { value: 'remote' as const, label: t('dashboard.jobs.shared.remote.remote') },
      { value: 'hybrid' as const, label: t('dashboard.jobs.shared.remote.hybrid') },
      { value: 'onsite' as const, label: t('dashboard.jobs.shared.remote.onsite') },
    ]
    return all.filter(opt => allowed.includes(opt.value))
  })

  /** Settings form uses empty string for "not specified" */
  const settingsOptions = computed(() =>
    options.value.map(opt => ({
      value: opt.value ?? '',
      label: opt.label,
    })),
  )

  function syncRemoteStatus<T extends RemoteStatusValue | undefined | null | ''>(current: T) {
    return normalizeRemoteStatus(type.value, current)
  }

  function syncRemoteStatusForSettings(current: string) {
    const normalized = normalizeRemoteStatus(type.value, current || undefined)
    return normalized ?? ''
  }

  return {
    isDisabled,
    options,
    settingsOptions,
    syncRemoteStatus,
    syncRemoteStatusForSettings,
  }
}
