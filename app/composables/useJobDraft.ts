export const JOB_DRAFT_STORAGE_KEY = 'reqcore-job-draft'

export type JobDraftSnapshot = {
  form?: {
    title?: string
    iscoCategoryId?: string
    description?: string
    isTestDescription?: boolean
    location?: string
    type?: string
    experienceLevel?: string
    remoteStatus?: string
  }
  applicationForm?: {
    requireResume?: boolean
    requireCoverLetter?: boolean
    questions?: unknown[]
  }
  scoringCriteria?: unknown[]
  scoringMode?: string
  autoScoreOnApply?: boolean
  currentStep?: number
}

export function getJobDraftStorageKey(organizationId?: string | null): string {
  if (organizationId) return `${JOB_DRAFT_STORAGE_KEY}:${organizationId}`
  return JOB_DRAFT_STORAGE_KEY
}

function legacyStorageKey(): string {
  return JOB_DRAFT_STORAGE_KEY
}

export function readJobDraft(organizationId?: string | null): JobDraftSnapshot | null {
  if (!import.meta.client) return null
  try {
    const key = getJobDraftStorageKey(organizationId)
    let raw = localStorage.getItem(key)

    // Migrate drafts saved before org-scoped keys
    if (!raw && organizationId) {
      const legacy = localStorage.getItem(legacyStorageKey())
      if (legacy) {
        localStorage.setItem(key, legacy)
        localStorage.removeItem(legacyStorageKey())
        raw = legacy
      }
    }

    if (!raw) return null
    return JSON.parse(raw) as JobDraftSnapshot
  } catch {
    return null
  }
}

/** True when the user has meaningful in-progress wizard data (not an empty form). */
export function hasJobDraft(organizationId?: string | null): boolean {
  const data = readJobDraft(organizationId)
  if (!data) return false

  const title = data.form?.title?.trim()
  const step = data.currentStep ?? 1
  const questions = data.applicationForm?.questions?.length ?? 0
  const criteria = data.scoringCriteria?.length ?? 0
  const isco = data.form?.iscoCategoryId?.trim()
  const location = data.form?.location?.trim()
  const description = data.form?.description?.trim()

  return !!(
    title
    || isco
    || location
    || description
    || step > 1
    || questions > 0
    || criteria > 0
  )
}

export function jobDraftSummary(organizationId?: string | null): { title: string, step: number } | null {
  if (!hasJobDraft(organizationId)) return null
  const data = readJobDraft(organizationId)
  if (!data) return null

  const title = data.form?.title?.trim() || ''
  const step = data.currentStep ?? 1
  return { title, step }
}

export function writeJobDraft(snapshot: JobDraftSnapshot, organizationId?: string | null): void {
  if (!import.meta.client) return
  try {
    localStorage.setItem(getJobDraftStorageKey(organizationId), JSON.stringify(snapshot))
    refreshJobDraftState(organizationId)
  } catch { /* storage full or unavailable */ }
}

export function clearJobDraftStorage(organizationId?: string | null): void {
  if (!import.meta.client) return
  try {
    localStorage.removeItem(getJobDraftStorageKey(organizationId))
    localStorage.removeItem(legacyStorageKey())
    refreshJobDraftState(organizationId)
  } catch { /* ignore */ }
}

type JobDraftUiState = {
  ready: boolean
  hasDraft: boolean
  summary: { title: string, step: number } | null
}

/** Shared reactive draft banner state (updated whenever the wizard saves or clears). */
export function refreshJobDraftState(organizationId?: string | null) {
  if (!import.meta.client) return

  const state = useState<JobDraftUiState>('job-draft-ui', () => ({
    ready: false,
    hasDraft: false,
    summary: null,
  }))

  state.value = {
    ready: true,
    hasDraft: hasJobDraft(organizationId),
    summary: jobDraftSummary(organizationId),
  }
}

/**
 * Shared job-creation wizard draft (localStorage + reactive banner state).
 */
export function useJobDraft() {
  const { activeOrg } = useCurrentOrg()
  const organizationId = computed(() => activeOrg.value?.id ?? null)
  const state = useState<JobDraftUiState>('job-draft-ui', () => ({
    ready: false,
    hasDraft: false,
    summary: null,
  }))

  function sync() {
    refreshJobDraftState(organizationId.value)
  }

  onMounted(sync)
  watch(organizationId, (id) => {
    if (id) sync()
  }, { immediate: true })

  const hasDraft = computed(() => state.value.ready && state.value.hasDraft)
  const draftSummary = computed(() => state.value.summary)

  return {
    organizationId,
    draftSummary,
    hasDraft,
    readJobDraft: () => readJobDraft(organizationId.value),
    writeJobDraft: (snapshot: JobDraftSnapshot) => writeJobDraft(snapshot, organizationId.value),
    clearJobDraftStorage: () => clearJobDraftStorage(organizationId.value),
    syncFromStorage: sync,
    getStorageKey: () => getJobDraftStorageKey(organizationId.value),
  }
}
