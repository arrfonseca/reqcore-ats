/** Brazilian contract types used in job creation and listings */
export const JOB_CONTRACT_TYPE_IDS = [
  'prazo_indeterminado',
  'prazo_determinado',
  'contrato_experiencia',
  'trabalho_intermitente',
  'teletrabalho',
  'trabalho_temporario',
  'aprendizagem',
  'contrato_pj',
] as const

export type JobContractTypeId = (typeof JOB_CONTRACT_TYPE_IDS)[number]

/** Legacy employment types kept for existing database rows */
export const LEGACY_JOB_TYPE_IDS = [
  'full_time',
  'part_time',
  'contract',
  'internship',
] as const

export type LegacyJobTypeId = (typeof LEGACY_JOB_TYPE_IDS)[number]

export const ALL_JOB_TYPE_IDS = [
  ...JOB_CONTRACT_TYPE_IDS,
  ...LEGACY_JOB_TYPE_IDS,
] as const

export type JobTypeId = (typeof ALL_JOB_TYPE_IDS)[number]

export const DEFAULT_JOB_TYPE: JobContractTypeId = 'prazo_indeterminado'

/** Contract types where remote work model does not apply */
export const CONTRACT_TYPES_WITHOUT_REMOTE_MODEL = [
  'prazo_indeterminado',
  'prazo_determinado',
] as const

export type RemoteStatusValue = 'remote' | 'hybrid' | 'onsite'

export function isRemoteModelDisabled(contractType: string): boolean {
  return (CONTRACT_TYPES_WITHOUT_REMOTE_MODEL as readonly string[]).includes(contractType)
}

/** Allowed remote model values for a contract type (empty = field disabled) */
export function allowedRemoteStatuses(contractType: string): Array<RemoteStatusValue | undefined> {
  if (isRemoteModelDisabled(contractType)) return []
  if (contractType === 'teletrabalho') return ['remote', 'hybrid', undefined]
  return ['remote', 'hybrid', 'onsite', undefined]
}

/** Clear remote status when contract type disallows it or current value is invalid */
export function normalizeRemoteStatus<T extends RemoteStatusValue | undefined | null | ''>(
  contractType: string,
  current: T,
): undefined | RemoteStatusValue {
  const allowed = allowedRemoteStatuses(contractType)
  if (allowed.length === 0) return undefined
  const value = current === '' || current == null ? undefined : current
  if (value === undefined) return undefined
  return allowed.includes(value) ? value : undefined
}
