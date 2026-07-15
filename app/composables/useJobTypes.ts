import {
  ALL_JOB_TYPE_IDS,
  JOB_CONTRACT_TYPE_IDS,
  type JobContractTypeId,
  type JobTypeId,
} from '~~/shared/job-types'

/**
 * i18n-backed job contract type labels and select options.
 */
export function useJobTypes() {
  const { t, te } = useI18n()

  function typeLabel(id: JobTypeId | string): string {
    const key = `jobs.shared.types.${id}`
    if (te(key)) return t(key)
    return id
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const contractTypeOptions = computed(() =>
    JOB_CONTRACT_TYPE_IDS.map((value: JobContractTypeId) => ({
      value,
      label: typeLabel(value),
    })),
  )

  const allTypeLabels = computed(() =>
    Object.fromEntries(ALL_JOB_TYPE_IDS.map(id => [id, typeLabel(id)])) as Record<JobTypeId, string>,
  )

  return {
    contractTypeOptions,
    allTypeLabels,
    typeLabel,
  }
}
