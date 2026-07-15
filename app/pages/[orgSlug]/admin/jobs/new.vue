<script setup lang="ts">
import {
  ArrowLeft,
  Check,
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Link2,
  ClipboardCopy,
  Rocket,
  FileEdit,
  ExternalLink,
  PartyPopper,
  Copy,
  Eye,
  Briefcase,
  FileText,
  MessageSquare,
  Brain,
  Sparkles,
  Loader2,
  SlidersHorizontal,
  Lock,
  Upload,
  CircleHelp,
  Share2,
  Globe,
  Mail,
  Users,
  BarChart3,
  Hash,
  Building2,
  Search,
  Instagram,
} from 'lucide-vue-next'
import { z } from 'zod'
import { ISCO_CATEGORY_IDS } from '~~/shared/scoring-criteria-templates'
import { DEFAULT_JOB_TYPE, JOB_CONTRACT_TYPE_IDS } from '~~/shared/job-types'
import {
  hasJobDraft,
  readJobDraft,
  writeJobDraft,
  clearJobDraftStorage,
  refreshJobDraftState,
} from '~/composables/useJobDraft'

const { t } = useI18n()
const { activeOrg } = useCurrentOrg()

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'require-org'],
})

useSeoMeta({
  title: t('dashboard.jobs.create.seoTitle'),
  description: t('dashboard.jobs.create.seoDescription'),
})

const localePath = useLocalePath()
const { tenantPath, publicJobPath } = useTenantPaths()
const { createJob } = useJobs()
const { track } = useTrack()
const toast = useToast()

type QuestionType =
  | 'short_text'
  | 'long_text'
  | 'single_select'
  | 'multi_select'
  | 'number'
  | 'date'
  | 'url'
  | 'checkbox'
  | 'file_upload'

type DraftQuestion = {
  id: string
  label: string
  type: QuestionType
  description?: string | null
  required: boolean
  options?: string[] | null
}

// Wizard state
const currentStep = ref<1 | 2 | 3 | 4>(1)
const steps = computed(() => [
  { id: 1, title: t('dashboard.jobs.create.steps.details.title'), description: t('dashboard.jobs.create.steps.details.description') },
  { id: 2, title: t('dashboard.jobs.create.steps.applicationForm.title'), description: t('dashboard.jobs.create.steps.applicationForm.description') },
  { id: 3, title: t('dashboard.jobs.create.steps.aiScoring.title'), description: t('dashboard.jobs.create.steps.aiScoring.description') },
  { id: 4, title: t('dashboard.jobs.create.steps.publish.title'), description: t('dashboard.jobs.create.steps.publish.description') },
])

// Step 1: Job details (API-supported fields)
const form = ref({
  title: '',
  iscoCategoryId: '' as '' | (typeof ISCO_CATEGORY_IDS)[number],
  description: '',
  location: '',
  type: DEFAULT_JOB_TYPE,
  experienceLevel: 'mid' as 'junior' | 'mid' | 'senior' | 'lead',
  remoteStatus: '' as '' | 'remote' | 'hybrid' | 'onsite',
})

// Step 2: Application form (client-only for now)
const applicationForm = ref({
  requireResume: true,
  requireCoverLetter: false,
  questions: [] as DraftQuestion[],
})

// Step 3: AI scoring criteria
type ScoringCriterionDraft = {
  key: string
  name: string
  description: string
  category: 'technical' | 'experience' | 'soft_skills' | 'education' | 'culture' | 'custom'
  maxScore: number
  weight: number
}
const scoringCriteria = ref<ScoringCriterionDraft[]>([])
const scoringMode = ref<'none' | 'premade' | 'ai' | 'custom'>('none')
const selectedTemplateId = ref<string | null>(null)
const { getCriteria: getTemplateCriteria, iscoCategories, isPremadeCriterionKey, resolveCriterionDisplay } = useScoringCriteriaTemplates()
const { contractTypeOptions } = useJobTypes()
const {
  isDisabled: isRemoteModelDisabled,
  settingsOptions: remoteOptions,
  syncRemoteStatusForSettings,
} = useJobRemoteModel(computed(() => form.value.type))

function normalizeFormDefaults() {
  if (!(JOB_CONTRACT_TYPE_IDS as readonly string[]).includes(form.value.type as typeof JOB_CONTRACT_TYPE_IDS[number])) {
    form.value.type = DEFAULT_JOB_TYPE
  }
  form.value.remoteStatus = syncRemoteStatusForSettings(form.value.remoteStatus)
}

watch(() => form.value.type, () => {
  form.value.remoteStatus = syncRemoteStatusForSettings(form.value.remoteStatus)
}, { immediate: true })
const isGeneratingCriteria = ref(false)
const showCustomForm = ref(false)
const editingCriterion = ref<ScoringCriterionDraft | null>(null)
const autoScoreOnApply = ref(false)

const customCriterionForm = ref({
  key: '',
  name: '',
  description: '',
  category: 'custom' as ScoringCriterionDraft['category'],
  maxScore: 10,
  weight: 50,
})

const categoryLabels = computed<Record<string, string>>(() => ({
  technical: t('dashboard.jobs.shared.categories.technical'),
  experience: t('dashboard.jobs.shared.categories.experience'),
  soft_skills: t('dashboard.jobs.shared.categories.soft_skills'),
  education: t('dashboard.jobs.shared.categories.education'),
  culture: t('dashboard.jobs.shared.categories.culture'),
  custom: t('dashboard.jobs.shared.categories.custom'),
}))

const categoryColorClasses: Record<string, string> = {
  technical: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-800',
  experience: 'bg-purple-50 text-purple-700 ring-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:ring-purple-800',
  soft_skills: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-800',
  education: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-800',
  culture: 'bg-pink-50 text-pink-700 ring-pink-200 dark:bg-pink-950/50 dark:text-pink-300 dark:ring-pink-800',
  custom: 'bg-surface-50 text-surface-700 ring-surface-200 dark:bg-surface-800/50 dark:text-surface-300 dark:ring-surface-700',
}

function loadPremadeCriteria(templateId: string) {
  const criteria = getTemplateCriteria(templateId)
  if (criteria.length === 0) {
    toast.error(t('dashboard.jobs.create.errors.loadTemplateFailed'), { message: t('dashboard.jobs.create.errors.unknownTemplate') })
    return
  }
  selectedTemplateId.value = templateId
  scoringCriteria.value = criteria
  scoringMode.value = 'premade'
}

async function generateAiCriteria() {
  if (!form.value.title) {
    toast.warning(t('dashboard.jobs.create.errors.jobTitleRequired'), t('dashboard.jobs.create.errors.jobTitleRequiredHint'))
    return
  }
  if (!form.value.description) {
    toast.warning(t('dashboard.jobs.create.errors.jobDescriptionRequired'), t('dashboard.jobs.create.errors.jobDescriptionRequiredHint'))
    return
  }
  isGeneratingCriteria.value = true
  try {
    const result = await $fetch('/api/ai-config/generate-criteria', {
      method: 'POST',
      body: {
        title: form.value.title,
        description: form.value.description,
      },
    })
    scoringCriteria.value = (result.criteria ?? []).map((c: any) => ({
      key: c.key,
      name: c.name,
      description: c.description ?? '',
      category: c.category ?? 'custom',
      maxScore: c.maxScore ?? 10,
      weight: c.weight ?? 50,
    }))
    scoringMode.value = 'ai'
    toast.success(t('dashboard.jobs.create.errors.criteriaGenerated'), t('dashboard.jobs.create.errors.criteriaGeneratedHint', scoringCriteria.value.length))
  } catch (err: any) {
    const statusCode = err?.data?.statusCode ?? err?.statusCode
    const statusMessage = err?.data?.statusMessage ?? ''
    if (statusCode === 422 && statusMessage.includes('AI provider not configured')) {
      toast.add({
        type: 'warning',
        title: t('dashboard.jobs.create.errors.aiNotConfigured'),
        message: t('dashboard.jobs.create.errors.aiNotConfiguredHint'),
        link: { label: aiSettingsLinkLabel.value, href: aiSettingsPath.value },
        duration: 10000,
      })
    } else {
      toast.error(t('dashboard.jobs.create.errors.generateCriteriaFailed'), {
        message: t('dashboard.jobs.create.errors.generateCriteriaFailedHint'),
        details: statusMessage || t('common.errors.serverErrorDetails', { code: statusCode ?? t('dashboard.chatbot.errors.unknownError') }),
        statusCode,
      })
    }
  } finally {
    isGeneratingCriteria.value = false
  }
}

function addCustomCriterion() {
  const f = customCriterionForm.value
  if (!f.key || !f.name) return

  const keyExists = scoringCriteria.value.some(c => c.key === f.key)
  if (keyExists) {
    toast.warning(t('dashboard.jobs.create.errors.duplicateCriterion'), t('dashboard.jobs.create.errors.duplicateCriterionHint', { key: f.key }))
    return
  }

  scoringCriteria.value.push({
    key: f.key,
    name: f.name,
    description: f.description,
    category: f.category,
    maxScore: f.maxScore,
    weight: f.weight,
  })
  customCriterionForm.value = { key: '', name: '', description: '', category: 'custom', maxScore: 10, weight: 50 }
  showCustomForm.value = false
  if (scoringMode.value === 'none') scoringMode.value = 'custom'
}

function removeCriterion(key: string) {
  scoringCriteria.value = scoringCriteria.value.filter(c => c.key !== key)
}

function autoGenerateKey(name: string): string {
  return name.toLowerCase().trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 50)
}

const isSubmitting = ref(false)
const errors = ref<Record<string, string>>({})
const showAddForm = ref(false)
const editingQuestion = ref<DraftQuestion | null>(null)
const linkCopied = ref(false)
const questionActionError = ref<string | null>(null)
const nextQuestionId = ref(1)

// Check if AI analysis is available (tenant configs or platform-managed effective config).
const { isAiConfigured, aiSettingsPath, aiSettingsLinkLabel } = useEffectiveAi()

function draftOrgId(): string | null {
  return activeOrg.value?.id ?? null
}

// Auto-save wizard progress to localStorage (restored when returning to /jobs/new)
function saveFormToStorage() {
  if (!import.meta.client) return
  const orgId = draftOrgId()
  if (!orgId) return
  writeJobDraft({
    form: { ...form.value },
    applicationForm: {
      requireResume: applicationForm.value.requireResume,
      requireCoverLetter: applicationForm.value.requireCoverLetter,
      questions: [...applicationForm.value.questions],
    },
    scoringCriteria: [...scoringCriteria.value],
    scoringMode: scoringMode.value,
    autoScoreOnApply: autoScoreOnApply.value,
    currentStep: currentStep.value,
  }, orgId)
}

function restoreFormFromStorage() {
  if (!import.meta.client) return
  const orgId = draftOrgId()
  if (!orgId) return
  try {
    const data = readJobDraft(orgId)
    if (!data) return
    if (data.form) {
      Object.assign(form.value, data.form)
      form.value.iscoCategoryId = form.value.iscoCategoryId ?? ''
    }
    if (data.applicationForm) Object.assign(applicationForm.value, data.applicationForm)
    if (data.scoringCriteria) scoringCriteria.value = data.scoringCriteria
    if (data.scoringMode) scoringMode.value = data.scoringMode
    if (data.autoScoreOnApply != null) autoScoreOnApply.value = data.autoScoreOnApply
    if (data.currentStep) currentStep.value = data.currentStep
    normalizeFormDefaults()
  } catch { /* corrupted data, ignore */ }
}

function clearFormStorage() {
  clearJobDraftStorage(draftOrgId())
}

function isJobWizardPath(path: string) {
  return /\/jobs\/new(?:\?|$|\/)/.test(path)
}

const route = useRoute()
const router = useRouter()
const hasInitializedWizard = ref(false)

function initWizardFromStorage() {
  if (!import.meta.client || hasInitializedWizard.value) return
  const orgId = draftOrgId()
  if (!orgId) return

  hasInitializedWizard.value = true

  if (route.query.fresh === '1') {
    resetState()
    router.replace(tenantPath('jobs/new'))
    return
  }

  if (hasJobDraft(orgId)) {
    restoreFormFromStorage()
  }

  refreshJobDraftState(orgId)
}

watch(activeOrg, (org) => {
  if (!org?.id) return
  initWizardFromStorage()
  saveFormToStorage()
}, { immediate: true })

onBeforeRouteLeave((to) => {
  if (!isJobWizardPath(to.path)) {
    saveFormToStorage()
  }
})

onBeforeUnmount(() => {
  saveFormToStorage()
})

// Reset all wizard state to initial values (called when user clicks "New Job" again)
function resetState() {
  currentStep.value = 1
  form.value = {
    title: '',
    iscoCategoryId: '',
    description: '',
    location: '',
    type: DEFAULT_JOB_TYPE,
    experienceLevel: 'mid',
    remoteStatus: '',
  }
  normalizeFormDefaults()
  applicationForm.value = {
    requireResume: true,
    requireCoverLetter: false,
    questions: [],
  }
  scoringCriteria.value = []
  scoringMode.value = 'none'
  autoScoreOnApply.value = false
  isPublished.value = false
  createdJobId.value = ''
  createdJobSlug.value = ''
  finalApplicationLink.value = ''
  errors.value = {}
  createdLinks.value = {}
  customBoardLinks.value = []
  clearFormStorage()
}

// Explicit fresh start when already on the wizard (header "Nova Vaga" while on /new)
const newJobResetSignal = useState('new-job-reset-signal', () => 0)
watch(newJobResetSignal, (next, prev) => {
  if (next > prev) resetState()
})

// Auto-save when step changes or form data changes
watch([currentStep, form, applicationForm, scoringCriteria, scoringMode, autoScoreOnApply], () => {
  saveFormToStorage()
}, { deep: true })

// Notify user when entering step 3 without AI configured
watch(currentStep, (step) => {
  if (step === 3 && !isAiConfigured.value) {
    toast.add({
      type: 'warning',
      title: t('dashboard.jobs.create.errors.aiIntegrationNotSetup'),
      message: t('dashboard.jobs.create.errors.aiIntegrationNotSetupHint'),
      link: { label: aiSettingsLinkLabel.value, href: aiSettingsPath.value },
      duration: 10000,
    })
  }
})

// Step 4: Publish & Distribute
const publishChoice = ref<'publish' | 'draft'>('publish')
const isPublished = ref(false)
const createdJobSlug = ref('')
const createdJobId = ref('')
const finalApplicationLink = ref('')
const linkCopiedFinal = ref(false)

// Distribution channels for quick tracking link creation
const distributionChannels = computed(() => {
  const channelName = (channel: string) =>
    t(`dashboard.jobs.create.publish.channelNames.${channel}`, t(`sourceTracking.channels.${channel}`))

  return [
    { channel: 'linkedin', name: channelName('linkedin'), description: t('dashboard.jobs.create.publish.channelDescriptions.linkedin'), category: 'job_board' as const },
    { channel: 'indeed', name: channelName('indeed'), description: t('dashboard.jobs.create.publish.channelDescriptions.indeed'), category: 'job_board' as const },
    { channel: 'glassdoor', name: channelName('glassdoor'), description: t('dashboard.jobs.create.publish.channelDescriptions.glassdoor'), category: 'job_board' as const },
    { channel: 'vagas_com', name: channelName('vagas_com'), description: t('dashboard.jobs.create.publish.channelDescriptions.vagas_com'), category: 'job_board' as const },
    { channel: 'catho', name: channelName('catho'), description: t('dashboard.jobs.create.publish.channelDescriptions.catho'), category: 'job_board' as const },
    { channel: 'infojobs', name: channelName('infojobs'), description: t('dashboard.jobs.create.publish.channelDescriptions.infojobs'), category: 'job_board' as const },
    { channel: 'adecco', name: channelName('adecco'), description: t('dashboard.jobs.create.publish.channelDescriptions.adecco'), category: 'job_board' as const },
    { channel: 'manpower', name: channelName('manpower'), description: t('dashboard.jobs.create.publish.channelDescriptions.manpower'), category: 'job_board' as const },
    { channel: 'email', name: channelName('email'), description: t('dashboard.jobs.create.publish.channelDescriptions.email'), category: 'outreach' as const },
    { channel: 'referral', name: channelName('referral'), description: t('dashboard.jobs.create.publish.channelDescriptions.referral'), category: 'outreach' as const },
    { channel: 'career_site', name: channelName('career_site'), description: t('dashboard.jobs.create.publish.channelDescriptions.career_site'), category: 'outreach' as const },
    { channel: 'twitter', name: channelName('twitter'), description: t('dashboard.jobs.create.publish.channelDescriptions.twitter'), category: 'social' as const },
    { channel: 'facebook', name: channelName('facebook'), description: t('dashboard.jobs.create.publish.channelDescriptions.facebook'), category: 'social' as const },
    { channel: 'instagram', name: channelName('instagram'), description: t('dashboard.jobs.create.publish.channelDescriptions.instagram'), category: 'social' as const },
  ]
})

const channelIcons: Record<string, any> = {
  linkedin: Briefcase,
  indeed: Search,
  glassdoor: Building2,
  vagas_com: Globe,
  catho: Building2,
  infojobs: Briefcase,
  adecco: Users,
  manpower: Users,
  email: Mail,
  referral: Users,
  career_site: Globe,
  twitter: Hash,
  facebook: Users,
  instagram: Instagram,
}

// Track created distribution links: channel → { code, url, loading, copied }
const createdLinks = ref<Record<string, { code: string; url: string; loading: boolean; copied: boolean }>>({})

async function createChannelLink(channel: string, channelName: string) {
  if (createdLinks.value[channel]?.code) return
  createdLinks.value[channel] = { code: '', url: '', loading: true, copied: false }
  try {
    const result = await $fetch<{ id: string; code: string }>('/api/tracking-links', {
      method: 'POST',
      body: {
        jobId: createdJobId.value,
        channel,
        name: `${form.value.title} — ${channelName}`,
      },
    })
    const base = `${requestUrl.protocol}//${requestUrl.host}`
    const trackUrl = `${base}/api/public/track/${encodeURIComponent(result.code)}`
    createdLinks.value[channel] = { code: result.code, url: trackUrl, loading: false, copied: false }
    track('tracking_link_created', { channel, source: 'job_wizard' })
  } catch {
    delete createdLinks.value[channel]
    toast.error(t('dashboard.jobs.create.errors.trackingLinkFailed', { channel: channelName }))
  }
}

async function copyChannelLink(channel: string) {
  const link = createdLinks.value[channel]
  if (!link?.url) return
  try {
    await navigator.clipboard.writeText(link.url)
    link.copied = true
    setTimeout(() => { link.copied = false }, 2500)
  } catch {
    toast.info(link.url)
  }
}

const createdLinkCount = computed(() =>
  Object.values(createdLinks.value).filter(l => l.code).length + customBoardLinks.value.length
)

// Custom job board links
const customBoardName = ref('')
const customBoardLinks = ref<Array<{ id: string; name: string; channel: string; code: string; url: string; copied: boolean }>>([])
const isCreatingCustomBoard = ref(false)

async function createCustomBoardLink() {
  const name = customBoardName.value.trim()
  if (!name) return
  // Use a slug derived from the custom board name for local dedup only
  const dedupeKey = `custom_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 50)}`

  // Prevent duplicates
  if (customBoardLinks.value.some(l => l.channel === dedupeKey)) {
    toast.warning(t('dashboard.jobs.create.errors.duplicateBoard'), t('dashboard.jobs.create.errors.duplicateBoardHint', { name }))
    return
  }

  isCreatingCustomBoard.value = true
  try {
    const result = await $fetch<{ id: string; code: string }>('/api/tracking-links', {
      method: 'POST',
      body: {
        jobId: createdJobId.value,
        channel: 'custom',
        name: `${form.value.title} — ${name}`,
      },
    })
    const base = `${requestUrl.protocol}//${requestUrl.host}`
    const trackUrl = `${base}/api/public/track/${encodeURIComponent(result.code)}`
    customBoardLinks.value.push({ id: result.id, name, channel: dedupeKey, code: result.code, url: trackUrl, copied: false })
    customBoardName.value = ''
    track('tracking_link_created', { channel: 'custom', customName: name, source: 'job_wizard_custom' })
  } catch {
    toast.error(t('dashboard.jobs.create.errors.trackingLinkFailed', { channel: name }))
  } finally {
    isCreatingCustomBoard.value = false
  }
}

async function copyCustomBoardLink(index: number) {
  const link = customBoardLinks.value[index]
  if (!link?.url) return
  try {
    await navigator.clipboard.writeText(link.url)
    link.copied = true
    setTimeout(() => { link.copied = false }, 2500)
  } catch {
    toast.info(link.url)
  }
}

// Validation (only Step 1 is required to submit)
const iscoCategoryRequiredMessage = () => t('dashboard.jobs.create.errors.iscoCategoryRequired')

function isValidIscoCategoryId(val: unknown): val is (typeof ISCO_CATEGORY_IDS)[number] {
  return typeof val === 'string'
    && val.length > 0
    && (ISCO_CATEGORY_IDS as readonly string[]).includes(val)
}

const formSchema = computed(() => z.object({
  title: z
    .string()
    .min(1, t('dashboard.jobs.create.errors.titleRequired'))
    .max(200, t('dashboard.jobs.create.errors.titleMax')),
  iscoCategoryId: z
    .unknown()
    .refine(isValidIscoCategoryId, { message: iscoCategoryRequiredMessage() }),
  description: z.string().optional(),
  location: z.string().optional(),
  type: z.enum(JOB_CONTRACT_TYPE_IDS),
}))

function validateStep1(): boolean {
  const result = formSchema.value.safeParse(form.value)
  if (!result.success) {
    errors.value = {}
    for (const issue of result.error.issues) {
      const field = issue.path[0]?.toString()
      if (field) errors.value[field] = issue.message
    }
    return false
  }
  errors.value = {}
  return true
}

// Pure check with no side-effects so it never populates errors on its own
const isStep1Valid = computed(() => formSchema.value.safeParse(form.value).success)

const canGoNext = computed(() => {
  if (currentStep.value === 1) return isStep1Valid.value
  return true
})

function goToStep(step: 1 | 2 | 3 | 4) {
  if (step === currentStep.value) return
  // Validate step 1 before leaving it
  if (currentStep.value === 1 && step > 1 && !validateStep1()) return
  currentStep.value = step
}

function nextStep() {
  if (currentStep.value < 4) {
    if (currentStep.value === 1 && !validateStep1()) return
    currentStep.value++
  }
}

function prevStep() {
  if (currentStep.value > 1) currentStep.value--
}

function handleAddQuestion(data: {
  label: string
  type: string
  description?: string
  required: boolean
  options?: string[]
}) {
  applicationForm.value.questions.push({
    id: `draft-${nextQuestionId.value++}`,
    label: data.label,
    type: data.type as QuestionType,
    description: data.description ?? null,
    required: data.required,
    options: data.options ?? null,
  })
  showAddForm.value = false
  questionActionError.value = null
}

function handleUpdateQuestion(data: {
  label: string
  type: string
  description?: string
  required: boolean
  options?: string[]
}) {
  if (!editingQuestion.value) return

  const index = applicationForm.value.questions.findIndex((q) => q.id === editingQuestion.value?.id)
  if (index === -1) return

  const existingQuestion = applicationForm.value.questions[index]
  if (!existingQuestion) return

  applicationForm.value.questions[index] = {
    id: existingQuestion.id,
    label: data.label,
    type: data.type as QuestionType,
    description: data.description ?? null,
    required: data.required,
    options: data.options ?? null,
  }
  editingQuestion.value = null
  questionActionError.value = null
}

function handleDeleteQuestion(questionId: string) {
  const index = applicationForm.value.questions.findIndex((q) => q.id === questionId)
  if (index === -1) return
  applicationForm.value.questions.splice(index, 1)
  if (editingQuestion.value?.id === questionId) {
    editingQuestion.value = null
  }
  questionActionError.value = null
}

function moveQuestion(index: number, direction: 'up' | 'down') {
  const list = applicationForm.value.questions
  const targetIndex = direction === 'up' ? index - 1 : index + 1
  if (targetIndex < 0 || targetIndex >= list.length) return
  ;[list[index], list[targetIndex]] = [list[targetIndex]!, list[index]!]
}

function slugifyTitle(raw: string) {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

const requestUrl = useRequestURL()
const applicationLink = computed(() => {
  const base = `${requestUrl.protocol}//${requestUrl.host}`
  const slugBase = slugifyTitle(form.value.title) || 'new-job'
  return `${base}${publicJobPath(`${slugBase}-xxxxxxxx`, '/apply')}`
})

async function copyApplicationLink() {
  try {
    await navigator.clipboard.writeText(applicationLink.value)
    linkCopied.value = true
    setTimeout(() => {
      linkCopied.value = false
    }, 2000)
  } catch {
    // ignore clipboard issues silently
  }
}

async function handleSubmit(mode: 'publish' | 'draft' = publishChoice.value) {
  // Ensure step 1 is valid before submit
  if (!validateStep1()) {
    currentStep.value = 1
    return
  }

  isSubmitting.value = true
  try {
    const created = await createJob({
      title: form.value.title,
      iscoCategoryId: form.value.iscoCategoryId,
      description: form.value.description || undefined,
      location: form.value.location || undefined,
      type: form.value.type,
      experienceLevel: form.value.experienceLevel || undefined,
      remoteStatus: form.value.remoteStatus || undefined,
      requireResume: applicationForm.value.requireResume,
      requireCoverLetter: applicationForm.value.requireCoverLetter,
      autoScoreOnApply: autoScoreOnApply.value,
    })

    track('job_created')

    if (applicationForm.value.questions.length > 0 && created?.id) {
      await Promise.all(
        applicationForm.value.questions.map((question, index) => (
          $fetch(`/api/jobs/${created.id}/questions`, {
            method: 'POST',
            body: {
              label: question.label,
              type: question.type,
              description: question.description || undefined,
              required: question.required,
              options: question.options || undefined,
              displayOrder: index,
            },
          })
        )),
      )
    }

    // Save scoring criteria if any were configured
    if (scoringCriteria.value.length > 0 && created?.id) {
      try {
        await $fetch(`/api/jobs/${created.id}/criteria`, {
          method: 'POST',
          body: {
            criteria: scoringCriteria.value.map((c, i) => ({
              key: c.key,
              name: c.name,
              description: c.description || undefined,
              category: c.category,
              maxScore: c.maxScore,
              weight: c.weight,
              displayOrder: i,
            })),
          },
        })
      } catch {
        // Non-blocking: criteria can be added later from job settings
      }
    }

    if (mode === 'publish' && created?.id) {
      // Publish the job immediately
      await $fetch(`/api/jobs/${created.id}`, {
        method: 'PATCH',
        body: { status: 'open' },
      })

      // Build the real application link
      const base = `${requestUrl.protocol}//${requestUrl.host}`
      const slug = created.slug || created.id
      finalApplicationLink.value = `${base}${publicJobPath(slug, '/apply')}`
      createdJobSlug.value = slug
      createdJobId.value = created.id

      track('job_published')

      // Auto-copy to clipboard
      try {
        await navigator.clipboard.writeText(finalApplicationLink.value)
        linkCopiedFinal.value = true
        setTimeout(() => { linkCopiedFinal.value = false }, 3000)
      } catch {
        // Clipboard may not be available
      }

      isPublished.value = true
    } else {
      // Saved as draft — go to jobs list
      await navigateTo(tenantPath('jobs'))
    }
    clearFormStorage()
  } catch (err: any) {
    const statusMessage = err?.data?.statusMessage ?? t('dashboard.jobs.create.errors.createJobFailedHint')
    toast.error(t('dashboard.jobs.create.errors.createJobFailed'), {
      message: statusMessage || t('dashboard.jobs.create.errors.createJobFailedHint'),
      statusCode: err?.data?.statusCode,
    })
  } finally {
    isSubmitting.value = false
  }
}

async function copyFinalLink() {
  try {
    await navigator.clipboard.writeText(finalApplicationLink.value)
    linkCopiedFinal.value = true
    setTimeout(() => { linkCopiedFinal.value = false }, 3000)
  } catch {
    // fallback: show the link so the user can copy manually
    toast.info(finalApplicationLink.value)
  }
}

const typeOptions = contractTypeOptions

const experienceOptions = computed(() => [
  { value: 'junior', label: t('dashboard.jobs.shared.experience.junior') },
  { value: 'mid', label: t('dashboard.jobs.shared.experience.mid') },
  { value: 'senior', label: t('dashboard.jobs.shared.experience.senior') },
  { value: 'lead', label: t('dashboard.jobs.shared.experience.lead') },
])

const questionTypeLabels = computed<Record<string, string>>(() => ({
  short_text: t('dashboard.jobs.shared.questionTypes.short_text'),
  long_text: t('dashboard.jobs.shared.questionTypes.long_text'),
  single_select: t('dashboard.jobs.shared.questionTypes.single_select'),
  multi_select: t('dashboard.jobs.shared.questionTypes.multi_select'),
  number: t('dashboard.jobs.shared.questionTypes.number'),
  date: t('dashboard.jobs.shared.questionTypes.date'),
  url: t('dashboard.jobs.shared.questionTypes.url'),
  checkbox: t('dashboard.jobs.shared.questionTypes.checkbox'),
  file_upload: t('dashboard.jobs.shared.questionTypes.file_upload'),
}))
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-8">
    <!-- Header with top actions -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
      <div>
        <NuxtLink
          :to="$tenantPath('jobs')"
          class="inline-flex items-center gap-1 text-sm text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 mb-2 transition-colors"
        >
          <ArrowLeft class="size-4" />
          {{ t('common.actions.backToJobs') }}
        </NuxtLink>
        <h1 class="text-3xl font-bold text-surface-900 dark:text-surface-100">{{ t('dashboard.jobs.create.title') }}</h1>
      </div>
      <div v-if="!isPublished" class="flex items-center gap-3">
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium text-surface-700 dark:text-surface-300 bg-white dark:bg-surface-900 border border-surface-300 dark:border-surface-700 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
          @click="handleSubmit('draft')"
          :disabled="isSubmitting"
        >
          {{ t('dashboard.jobs.create.actions.saveDraft') }}
        </button>
        <button
          v-if="currentStep < 4"
          type="button"
          :disabled="!canGoNext"
          @click="nextStep"
          class="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          {{ t('dashboard.jobs.create.actions.saveContinue') }}
        </button>
      </div>
    </div>

    <!-- Stepper -->
    <div class="mb-10">
      <ol class="flex items-center w-full gap-2">
        <li
          v-for="(step, idx) in steps"
          :key="step.id"
          class="flex items-center flex-1 min-w-0 cursor-pointer"
          @click="goToStep(step.id as typeof currentStep)"
        >
          <div class="flex items-center gap-2 min-w-0">
            <div
              class="flex items-center justify-center size-7 rounded-full border text-xs font-medium shrink-0 transition-all"
              :class="[
                currentStep === step.id
                  ? 'bg-brand-600 text-white border-brand-600 ring-2 ring-brand-100 dark:ring-brand-950'
                  : currentStep > step.id
                    ? 'bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300 border-brand-200 dark:border-brand-800'
                    : 'bg-white dark:bg-surface-900 text-surface-400 dark:text-surface-500 border-surface-200 dark:border-surface-800'
              ]"
            >
              <span v-if="currentStep > step.id" class="text-xs">&#10003;</span>
              <span v-else>{{ step.id }}</span>
            </div>
            <span
              class="text-xs font-medium truncate hidden sm:inline"
              :class="currentStep >= step.id ? 'text-surface-900 dark:text-surface-100' : 'text-surface-400 dark:text-surface-500'"
            >
              {{ step.title }}
            </span>
          </div>
          <div
            v-if="idx < steps.length - 1"
            class="flex-1 h-0.5 mx-2 rounded-full transition-colors"
            :class="currentStep > step.id ? 'bg-brand-600' : 'bg-surface-200 dark:bg-surface-800'"
          />
        </li>
      </ol>
    </div>

    <!-- Main Layout: Form + Tips -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <!-- Left side: Form -->
      <div class="lg:col-span-8 space-y-6">

        <div class="rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 shadow-sm overflow-hidden">
          <form @submit.prevent="() => handleSubmit()" class="p-6 md:p-8">
            <!-- Step 1: Job details -->
            <section v-if="currentStep === 1" class="space-y-10">
              <!-- Section: Job title and department -->
              <div class="space-y-6">
                <div>
                  <h2 class="text-lg font-semibold text-surface-900 dark:text-surface-100 mb-6 pb-2 border-b border-surface-100 dark:border-surface-800">{{ t('dashboard.jobs.create.sections.jobTitleDepartment') }}</h2>
                  <label for="title" class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                    {{ t('dashboard.jobs.create.fields.jobTitle') }} <span class="text-danger-500">*</span>
                  </label>
                  <input
                    id="title"
                    v-model="form.title"
                    type="text"
                    :placeholder="t('dashboard.jobs.create.placeholders.jobTitle')"
                    class="w-full rounded-lg border px-3 py-2.5 text-sm text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                    :class="errors.title ? 'border-danger-300 ring-1 ring-danger-100' : 'border-surface-300 dark:border-surface-700'"
                    @blur="validateStep1"
                  />
                  <p v-if="errors.title" class="mt-1.5 text-xs text-danger-600 dark:text-danger-400 font-medium">{{ errors.title }}</p>
                  <p v-else class="mt-1.5 text-xs text-surface-500">{{ t('dashboard.jobs.create.helpers.charactersLeft') }}</p>
                </div>

                <div>
                  <label for="iscoCategoryId" class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                    {{ t('dashboard.jobs.create.fields.iscoCategory') }} <span class="text-danger-500">*</span>
                  </label>
                  <select
                    id="iscoCategoryId"
                    v-model="form.iscoCategoryId"
                    class="w-full rounded-lg border px-3 py-2.5 text-sm text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors bg-white dark:bg-surface-900"
                    :class="errors.iscoCategoryId ? 'border-danger-300 ring-1 ring-danger-100' : 'border-surface-300 dark:border-surface-700'"
                    @blur="validateStep1"
                  >
                    <option value="" disabled>{{ t('dashboard.jobs.create.fields.iscoCategoryPlaceholder') }}</option>
                    <option v-for="cat in iscoCategories" :key="cat.id" :value="cat.id">
                      {{ cat.label }}
                    </option>
                  </select>
                  <p v-if="errors.iscoCategoryId" class="mt-1.5 text-xs text-danger-600 dark:text-danger-400 font-medium">{{ errors.iscoCategoryId }}</p>
                  <p v-else class="mt-1.5 text-xs text-surface-500">{{ t('dashboard.jobs.create.helpers.iscoCategoryInternal') }}</p>
                </div>
              </div>

              <!-- Section: Location -->
              <div class="space-y-6">
                <h2 class="text-lg font-semibold text-surface-900 dark:text-surface-100 mb-6 pb-2 border-b border-surface-100 dark:border-surface-800">{{ t('dashboard.jobs.create.sections.location') }}</h2>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label for="location" class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                      {{ t('dashboard.jobs.create.fields.officeLocation') }}
                    </label>
                    <LocationAutocomplete
                      id="location"
                      v-model="form.location"
                      :placeholder="t('dashboard.jobs.create.placeholders.location')"
                    />
                  </div>
                  <div>
                    <label for="type" class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                      {{ t('dashboard.jobs.create.fields.contractType') }}
                    </label>
                    <select
                      id="type"
                      v-model="form.type"
                      class="w-full rounded-lg border px-3 py-2.5 text-sm text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors bg-white dark:bg-surface-900 border-surface-300 dark:border-surface-700"
                    >
                      <option v-for="opt in typeOptions" :key="opt.value" :value="opt.value">
                        {{ opt.label }}
                      </option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- Section: Experience & Remote -->
              <div class="space-y-6">
                <h2 class="text-lg font-semibold text-surface-900 dark:text-surface-100 mb-6 pb-2 border-b border-surface-100 dark:border-surface-800">{{ t('dashboard.jobs.create.sections.details') }}</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label for="experienceLevel" class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">{{ t('dashboard.jobs.create.fields.experienceLevel') }}</label>
                    <select
                      id="experienceLevel"
                      v-model="form.experienceLevel"
                      class="w-full rounded-lg border px-3 py-2.5 text-sm bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-100 border-surface-300 dark:border-surface-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                    >
                      <option v-for="opt in experienceOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                    </select>
                  </div>
                  <div>
                    <label
                      for="remoteStatus"
                      class="block text-sm font-medium mb-1.5"
                      :class="isRemoteModelDisabled ? 'text-surface-400 dark:text-surface-500' : 'text-surface-700 dark:text-surface-300'"
                    >
                      {{ t('dashboard.jobs.create.fields.remoteModel') }}
                    </label>
                    <select
                      id="remoteStatus"
                      v-model="form.remoteStatus"
                      :disabled="isRemoteModelDisabled"
                      class="w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 transition-colors bg-white dark:bg-surface-900 border-surface-300 dark:border-surface-700"
                      :class="isRemoteModelDisabled
                        ? 'opacity-50 cursor-not-allowed bg-surface-100 dark:bg-surface-800 text-surface-400 dark:text-surface-500 focus:ring-0'
                        : 'text-surface-900 dark:text-surface-100 focus:ring-brand-500 focus:border-brand-500'"
                    >
                      <option v-if="isRemoteModelDisabled" value="">
                        {{ t('dashboard.jobs.shared.notSpecified') }}
                      </option>
                      <option v-for="opt in remoteOptions" :key="String(opt.value)" :value="opt.value">
                        {{ opt.label }}
                      </option>
                    </select>
                  </div>
                </div>
              </div>

              <!-- Section: Description -->
              <div class="space-y-6">
                <h2 class="text-lg font-semibold text-surface-900 dark:text-surface-100 mb-6 pb-2 border-b border-surface-100 dark:border-surface-800">{{ t('dashboard.jobs.create.sections.description') }}</h2>
                <div>
                  <label for="description" class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
                    {{ t('dashboard.jobs.create.fields.aboutTheRole') }}
                  </label>
                  <textarea
                    id="description"
                    v-model="form.description"
                    rows="10"
                    :placeholder="t('dashboard.jobs.create.placeholders.description')"
                    class="w-full rounded-lg border px-4 py-3 text-sm text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors border-surface-300 dark:border-surface-700"
                  />
                  <p class="mt-2 text-xs text-surface-500">{{ t('dashboard.jobs.create.helpers.minCharacters') }}</p>
                </div>
              </div>
            </section>

            <!-- Step 2: Application form -->
            <section v-else-if="currentStep === 2" class="space-y-8">
              <div>
                <p class="text-xs font-semibold text-surface-400 dark:text-surface-500 uppercase tracking-wider mb-3">{{ t('dashboard.jobs.create.applicationForm.customizeTitle') }}</p>
                <p class="text-sm text-surface-500 dark:text-surface-400 leading-relaxed">
                  {{ t('dashboard.jobs.create.applicationForm.customizeHint') }}
                </p>
              </div>

              <!-- Personal information -->
              <div>
                <h2 class="text-base font-semibold text-surface-900 dark:text-surface-100 pb-3 border-b border-surface-100 dark:border-surface-800">{{ t('dashboard.jobs.create.applicationForm.personalInformation') }}</h2>
                <div class="divide-y divide-surface-100 dark:divide-surface-800">
                  <div class="flex items-center justify-between py-3.5 px-1">
                    <div class="flex items-center gap-2.5">
                      <span class="text-sm text-surface-900 dark:text-surface-100">{{ t('dashboard.jobs.create.applicationForm.firstName') }}</span>
                      <Lock class="size-3 text-surface-300 dark:text-surface-600" />
                    </div>
                    <span class="inline-flex items-center rounded-md bg-brand-50 dark:bg-brand-950/50 px-2.5 py-1 text-xs font-medium text-brand-700 dark:text-brand-300 ring-1 ring-inset ring-brand-200 dark:ring-brand-800">
                      {{ t('dashboard.jobs.create.applicationForm.mandatory') }}
                    </span>
                  </div>
                  <div class="flex items-center justify-between py-3.5 px-1">
                    <div class="flex items-center gap-2.5">
                      <span class="text-sm text-surface-900 dark:text-surface-100">{{ t('dashboard.jobs.create.applicationForm.lastName') }}</span>
                      <Lock class="size-3 text-surface-300 dark:text-surface-600" />
                    </div>
                    <span class="inline-flex items-center rounded-md bg-brand-50 dark:bg-brand-950/50 px-2.5 py-1 text-xs font-medium text-brand-700 dark:text-brand-300 ring-1 ring-inset ring-brand-200 dark:ring-brand-800">
                      {{ t('dashboard.jobs.create.applicationForm.mandatory') }}
                    </span>
                  </div>
                  <div class="flex items-center justify-between py-3.5 px-1">
                    <div class="flex items-center gap-2.5">
                      <span class="text-sm text-surface-900 dark:text-surface-100">{{ t('common.fields.email') }}</span>
                      <Lock class="size-3 text-surface-300 dark:text-surface-600" />
                    </div>
                    <span class="inline-flex items-center rounded-md bg-brand-50 dark:bg-brand-950/50 px-2.5 py-1 text-xs font-medium text-brand-700 dark:text-brand-300 ring-1 ring-inset ring-brand-200 dark:ring-brand-800">
                      {{ t('dashboard.jobs.create.applicationForm.mandatory') }}
                    </span>
                  </div>
                  <div class="flex items-center justify-between py-3.5 px-1">
                    <div class="flex items-center gap-2.5">
                      <span class="text-sm text-surface-900 dark:text-surface-100">{{ t('dashboard.jobs.create.applicationForm.phone') }}</span>
                      <Lock class="size-3 text-surface-300 dark:text-surface-600" />
                    </div>
                    <span class="inline-flex items-center rounded-md bg-brand-50 dark:bg-brand-950/50 px-2.5 py-1 text-xs font-medium text-brand-700 dark:text-brand-300 ring-1 ring-inset ring-brand-200 dark:ring-brand-800">
                      {{ t('dashboard.jobs.create.applicationForm.mandatory') }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Documents -->
              <div>
                <h2 class="text-base font-semibold text-surface-900 dark:text-surface-100 pb-3 border-b border-surface-100 dark:border-surface-800">{{ t('dashboard.jobs.create.applicationForm.documents') }}</h2>
                <div class="divide-y divide-surface-100 dark:divide-surface-800">
                  <!-- Resume -->
                  <div class="flex items-center justify-between py-4 px-1">
                    <div>
                      <div class="flex items-center gap-2">
                        <Upload class="size-4 text-surface-400 dark:text-surface-500" />
                        <span class="text-sm font-medium text-surface-900 dark:text-surface-100">{{ t('dashboard.jobs.create.applicationForm.resumeCv') }}</span>
                      </div>
                      <p class="text-xs text-surface-400 dark:text-surface-500 mt-1 ml-6">{{ t('dashboard.jobs.create.applicationForm.resumeFormats') }}</p>
                    </div>
                    <div class="inline-flex items-center rounded-lg bg-surface-100 dark:bg-surface-800 p-0.5" role="radiogroup" :aria-label="t('dashboard.jobs.create.applicationForm.resumeRequirementAria')">
                      <button
                        type="button"
                        role="radio"
                        :aria-checked="applicationForm.requireResume"
                        @click="applicationForm.requireResume = true"
                        class="px-3 py-1.5 text-xs font-medium rounded-md transition-all"
                        :class="applicationForm.requireResume
                          ? 'bg-brand-600 text-white shadow-sm'
                          : 'text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200'"
                      >
                        {{ t('dashboard.jobs.create.applicationForm.required') }}
                      </button>
                      <button
                        type="button"
                        role="radio"
                        :aria-checked="!applicationForm.requireResume"
                        @click="applicationForm.requireResume = false"
                        class="px-3 py-1.5 text-xs font-medium rounded-md transition-all"
                        :class="!applicationForm.requireResume
                          ? 'bg-white dark:bg-surface-700 text-surface-700 dark:text-surface-300 shadow-sm'
                          : 'text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200'"
                      >
                        {{ t('dashboard.jobs.create.applicationForm.off') }}
                      </button>
                    </div>
                  </div>
                  <!-- Cover letter -->
                  <div class="flex items-center justify-between py-4 px-1">
                    <div>
                      <div class="flex items-center gap-2">
                        <FileText class="size-4 text-surface-400 dark:text-surface-500" />
                        <span class="text-sm font-medium text-surface-900 dark:text-surface-100">{{ t('dashboard.jobs.create.applicationForm.coverLetter') }}</span>
                      </div>
                      <p class="text-xs text-surface-400 dark:text-surface-500 mt-1 ml-6">{{ t('dashboard.jobs.create.applicationForm.coverLetterFormats') }}</p>
                    </div>
                    <div class="inline-flex items-center rounded-lg bg-surface-100 dark:bg-surface-800 p-0.5" role="radiogroup" :aria-label="t('dashboard.jobs.create.applicationForm.coverLetterRequirementAria')">
                      <button
                        type="button"
                        role="radio"
                        :aria-checked="applicationForm.requireCoverLetter"
                        @click="applicationForm.requireCoverLetter = true"
                        class="px-3 py-1.5 text-xs font-medium rounded-md transition-all"
                        :class="applicationForm.requireCoverLetter
                          ? 'bg-brand-600 text-white shadow-sm'
                          : 'text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200'"
                      >
                        {{ t('dashboard.jobs.create.applicationForm.required') }}
                      </button>
                      <button
                        type="button"
                        role="radio"
                        :aria-checked="!applicationForm.requireCoverLetter"
                        @click="applicationForm.requireCoverLetter = false"
                        class="px-3 py-1.5 text-xs font-medium rounded-md transition-all"
                        :class="!applicationForm.requireCoverLetter
                          ? 'bg-white dark:bg-surface-700 text-surface-700 dark:text-surface-300 shadow-sm'
                          : 'text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200'"
                      >
                        {{ t('dashboard.jobs.create.applicationForm.off') }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Screening questions -->
              <div>
                <div class="flex items-center justify-between pb-3 border-b border-surface-100 dark:border-surface-800">
                  <h2 class="text-base font-semibold text-surface-900 dark:text-surface-100">{{ t('dashboard.jobs.create.applicationForm.screeningQuestions') }}</h2>
                  <span v-if="applicationForm.questions.length > 0" class="text-xs font-medium text-surface-400 dark:text-surface-500 tabular-nums">
                    {{ t('dashboard.jobs.create.applicationForm.questionsAdded', applicationForm.questions.length) }}
                  </span>
                </div>

                <div
                  v-if="questionActionError"
                  class="rounded-lg border border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950 p-3 text-sm text-danger-700 dark:text-danger-400 mt-4"
                >
                  {{ questionActionError }}
                  <button class="ml-2 underline" @click="questionActionError = null">{{ t('common.actions.dismiss') }}</button>
                </div>

                <div v-if="applicationForm.questions.length > 0" class="divide-y divide-surface-100 dark:divide-surface-800">
                  <div
                    v-for="(q, index) in applicationForm.questions"
                    :key="q.id"
                    class="flex items-center gap-3 py-3.5 px-1 group"
                  >
                    <div class="text-surface-300 dark:text-surface-600 cursor-grab">
                      <GripVertical class="size-4" />
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2">
                        <span class="text-sm font-medium text-surface-900 dark:text-surface-100 truncate">{{ q.label }}</span>
                        <span
                          v-if="q.required"
                          class="inline-flex items-center rounded-md bg-brand-50 dark:bg-brand-950/50 px-2 py-0.5 text-[10px] font-medium text-brand-700 dark:text-brand-300 ring-1 ring-inset ring-brand-200 dark:ring-brand-800"
                        >
                          {{ t('dashboard.jobs.create.applicationForm.required') }}
                        </span>
                        <span
                          v-else
                          class="inline-flex items-center rounded-md bg-surface-100 dark:bg-surface-800 px-2 py-0.5 text-[10px] font-medium text-surface-500 dark:text-surface-400 ring-1 ring-inset ring-surface-200 dark:ring-surface-700"
                        >
                          {{ t('dashboard.jobs.create.applicationForm.optional') }}
                        </span>
                      </div>
                      <div class="flex items-center gap-1.5 mt-0.5 ml-0">
                        <span class="text-xs text-surface-400 dark:text-surface-500">{{ questionTypeLabels[q.type] ?? q.type }}</span>
                        <span v-if="q.description" class="text-xs text-surface-400 dark:text-surface-500 truncate">
                          &middot; {{ q.description }}
                        </span>
                        <span
                          v-if="(q.type === 'single_select' || q.type === 'multi_select') && q.options"
                          class="text-xs text-surface-400 dark:text-surface-500"
                        >
                          &middot; {{ t('dashboard.jobs.create.applicationForm.optionsCount', q.options.length) }}
                        </span>
                      </div>
                    </div>
                    <div class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
                      <button
                        type="button"
                        :disabled="index === 0"
                        class="rounded p-1.5 text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors disabled:opacity-30"
:title="t('dashboard.jobs.create.applicationForm.moveUp')"
                        @click="moveQuestion(index, 'up')"
                      >
                        <ChevronUp class="size-4" />
                      </button>
                      <button
                        type="button"
                        :disabled="index === applicationForm.questions.length - 1"
                        class="rounded p-1.5 text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors disabled:opacity-30"
:title="t('dashboard.jobs.create.applicationForm.moveDown')"
                        @click="moveQuestion(index, 'down')"
                      >
                        <ChevronDown class="size-4" />
                      </button>
                      <button
                        type="button"
                        class="rounded p-1.5 text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
:title="t('common.actions.edit')"
                        @click="editingQuestion = q; showAddForm = false"
                      >
                        <Pencil class="size-4" />
                      </button>
                      <button
                        type="button"
                        class="rounded p-1.5 text-surface-400 hover:text-danger-600 dark:hover:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-950 transition-colors"
:title="t('common.actions.delete')"
                        @click="handleDeleteQuestion(q.id)"
                      >
                        <Trash2 class="size-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <p v-else class="text-sm text-surface-400 dark:text-surface-500 py-6 text-center">
                  {{ t('dashboard.jobs.create.applicationForm.noScreeningQuestions') }}
                </p>

                <QuestionForm
                  v-if="editingQuestion"
                  :question="editingQuestion"
                  class="mt-4 mb-2"
                  @save="handleUpdateQuestion"
                  @cancel="editingQuestion = null"
                />

                <QuestionForm
                  v-if="showAddForm && !editingQuestion"
                  class="mt-4 mb-2"
                  @save="handleAddQuestion"
                  @cancel="showAddForm = false"
                />

                <div class="mt-4 flex items-center gap-3">
                  <button
                    v-if="!showAddForm && !editingQuestion"
                    type="button"
                    class="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-surface-300 dark:border-surface-700 px-3 py-2 text-sm font-medium text-surface-600 dark:text-surface-400 hover:border-brand-400 dark:hover:border-brand-600 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50/50 dark:hover:bg-brand-950/30 transition-colors"
                    @click="showAddForm = true"
                  >
                    <Plus class="size-4" />
                    {{ t('dashboard.jobs.create.applicationForm.addQuestion') }}
                  </button>
                </div>
              </div>
            </section>

            <!-- Step 3: AI scoring criteria -->
            <section v-else-if="currentStep === 3" class="space-y-8">
              <div>
                <h2 class="text-lg font-semibold text-surface-900 dark:text-surface-100 mb-2 pb-2 border-b border-surface-100 dark:border-surface-800">
                  {{ t('dashboard.jobs.create.ai.title') }}
                </h2>
                <p class="text-sm text-surface-500 dark:text-surface-400 mb-6">
                  {{ t('dashboard.jobs.create.ai.intro') }}
                </p>
              </div>

              <!-- AI not configured warning -->
              <div v-if="!isAiConfigured" class="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-5">
                <div class="flex items-start gap-3">
                  <Sparkles class="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p class="text-sm font-semibold text-amber-800 dark:text-amber-200">{{ t('dashboard.jobs.create.errors.aiNotConfigured') }}</p>
                    <p class="text-xs text-amber-700 dark:text-amber-300 mt-1 leading-relaxed">
                      {{ t('dashboard.jobs.create.ai.notConfiguredHint') }}
                    </p>
                    <NuxtLink
                      :to="localePath(aiSettingsPath)"
                      class="inline-flex items-center gap-1.5 mt-3 text-xs font-medium text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 underline underline-offset-2"
                    >
                      <ExternalLink class="size-3" />
                      {{ t('dashboard.jobs.create.ai.goToAiSettingsLink') }}
                    </NuxtLink>
                  </div>
                </div>
              </div>

              <!-- Mode selection cards -->
              <div v-if="scoringCriteria.length === 0" class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <!-- Pre-made templates -->
                <button
                  type="button"
                  class="relative flex flex-col items-start gap-3 p-5 rounded-xl border-2 text-left transition-all hover:shadow-md"
                  :class="scoringMode === 'premade'
                    ? 'border-brand-500 dark:border-brand-400 bg-brand-50/70 dark:bg-brand-950/30 ring-2 ring-brand-200 dark:ring-brand-900'
                    : 'border-surface-200 dark:border-surface-800 hover:border-surface-300 dark:hover:border-surface-700'"
                  @click="scoringMode = 'premade'"
                >
                  <div class="inline-flex items-center justify-center size-10 rounded-lg bg-brand-100 dark:bg-brand-900/50">
                    <Brain class="size-5 text-brand-600 dark:text-brand-400" />
                  </div>
                  <div>
                    <span class="block text-sm font-semibold text-surface-900 dark:text-surface-100">{{ t('dashboard.jobs.create.ai.premadeTemplates') }}</span>
                    <span class="text-xs text-surface-500 dark:text-surface-400 mt-1 block leading-relaxed">
                      {{ t('dashboard.jobs.create.ai.premadeHint') }}
                    </span>
                  </div>
                </button>

                <!-- AI from job description -->
                <button
                  type="button"
                  :disabled="!isAiConfigured"
                  class="relative flex flex-col items-start gap-3 p-5 rounded-xl border-2 text-left transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  :class="scoringMode === 'ai'
                    ? 'border-brand-500 dark:border-brand-400 bg-brand-50/70 dark:bg-brand-950/30 ring-2 ring-brand-200 dark:ring-brand-900'
                    : 'border-surface-200 dark:border-surface-800 hover:border-surface-300 dark:hover:border-surface-700'"
                  @click="generateAiCriteria(); scoringMode = 'ai'"
                >
                  <div class="inline-flex items-center justify-center size-10 rounded-lg bg-purple-100 dark:bg-purple-900/50">
                    <Sparkles class="size-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <span class="block text-sm font-semibold text-surface-900 dark:text-surface-100">{{ t('dashboard.jobs.create.ai.generateFromDescription') }}</span>
                    <span class="text-xs text-surface-500 dark:text-surface-400 mt-1 block leading-relaxed">
                      {{ t('dashboard.jobs.create.ai.generateHint') }}
                    </span>
                    <span v-if="!isAiConfigured" class="text-[10px] text-amber-600 dark:text-amber-400 mt-1 block">
                      {{ t('dashboard.jobs.create.ai.requiresAiSetup') }}
                    </span>
                  </div>
                  <span v-if="isGeneratingCriteria" class="absolute top-3 right-3">
                    <Loader2 class="size-4 text-purple-600 animate-spin" />
                  </span>
                </button>

                <!-- Custom criteria -->
                <button
                  type="button"
                  class="relative flex flex-col items-start gap-3 p-5 rounded-xl border-2 text-left transition-all hover:shadow-md"
                  :class="scoringMode === 'custom'
                    ? 'border-brand-500 dark:border-brand-400 bg-brand-50/70 dark:bg-brand-950/30 ring-2 ring-brand-200 dark:ring-brand-900'
                    : 'border-surface-200 dark:border-surface-800 hover:border-surface-300 dark:hover:border-surface-700'"
                  @click="scoringMode = 'custom'; showCustomForm = true"
                >
                  <div class="inline-flex items-center justify-center size-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
                    <SlidersHorizontal class="size-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <span class="block text-sm font-semibold text-surface-900 dark:text-surface-100">{{ t('dashboard.jobs.create.ai.writeYourOwn') }}</span>
                    <span class="text-xs text-surface-500 dark:text-surface-400 mt-1 block leading-relaxed">
                      {{ t('dashboard.jobs.create.ai.writeHint') }}
                    </span>
                  </div>
                </button>
              </div>

              <!-- Pre-made template selector (ISCO + universal) -->
              <div v-if="scoringMode === 'premade' && scoringCriteria.length === 0" class="mt-4">
                <ScoringCriteriaTemplatePicker @select="loadPremadeCriteria" />
              </div>

              <!-- Criteria list with weight sliders -->
              <div v-if="scoringCriteria.length > 0" class="space-y-4">
                <div class="flex items-center justify-between">
                  <h3 class="text-sm font-semibold text-surface-800 dark:text-surface-200">
                    {{ t('dashboard.jobs.create.ai.criteriaConfigured', scoringCriteria.length) }}
                  </h3>
                  <button
                    type="button"
                    class="text-xs text-danger-600 dark:text-danger-400 hover:underline"
                    @click="scoringCriteria = []; scoringMode = 'none'"
                  >
                    {{ t('dashboard.jobs.create.ai.clearAll') }}
                  </button>
                </div>

                <div class="space-y-3">
                  <div
                    v-for="criterion in scoringCriteria"
                    :key="criterion.key"
                    class="rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-950 p-4 transition-all hover:shadow-sm"
                  >
                    <div class="flex items-start justify-between gap-3 mb-3">
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 mb-1">
                          <span class="text-sm font-semibold text-surface-900 dark:text-surface-100">{{ resolveCriterionDisplay(criterion).name }}</span>
                          <span
                            class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset"
                            :class="categoryColorClasses[criterion.category] ?? categoryColorClasses.custom"
                          >
                            {{ categoryLabels[criterion.category] ?? criterion.category }}
                          </span>
                        </div>
                        <p v-if="resolveCriterionDisplay(criterion).description" class="text-xs text-surface-500 dark:text-surface-400 leading-relaxed">
                          {{ resolveCriterionDisplay(criterion).description }}
                        </p>
                      </div>
                      <button
                        type="button"
                        class="rounded p-1 text-surface-400 hover:text-danger-600 dark:hover:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-950 transition-colors shrink-0"
:title="t('dashboard.jobs.create.ai.remove')"
                        @click="removeCriterion(criterion.key)"
                      >
                        <Trash2 class="size-4" />
                      </button>
                    </div>

                    <!-- Weight slider -->
                    <div class="flex items-center gap-4">
                      <label class="text-xs font-medium text-surface-500 dark:text-surface-400 shrink-0 w-12">{{ t('dashboard.jobs.create.ai.weight') }}</label>
                      <input
                        type="range"
                        :min="0"
                        :max="100"
                        v-model.number="criterion.weight"
                        class="flex-1 h-2 rounded-lg appearance-none cursor-pointer accent-brand-600 bg-surface-200 dark:bg-surface-700"
                      />
                      <span class="text-xs font-mono font-semibold text-surface-700 dark:text-surface-300 w-8 text-right">
                        {{ criterion.weight }}
                      </span>
                    </div>

                    <div class="flex items-center gap-4 mt-2 text-xs text-surface-400">
                      <span>{{ t('dashboard.jobs.create.ai.maxScoreLabel', { score: criterion.maxScore }) }}</span>
                      <span v-if="!isPremadeCriterionKey(criterion.key)">{{ t('dashboard.jobs.create.ai.keyLabel') }} <code class="rounded bg-surface-100 dark:bg-surface-800 px-1 py-0.5 font-mono text-[10px]">{{ criterion.key }}</code></span>
                    </div>
                  </div>
                </div>

                <!-- Add another criterion -->
                <button
                  v-if="!showCustomForm"
                  type="button"
                  class="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-surface-300 dark:border-surface-700 px-3 py-2 text-sm font-medium text-surface-600 dark:text-surface-400 hover:border-brand-400 dark:hover:border-brand-600 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950 transition-colors"
                  @click="showCustomForm = true"
                >
                  <Plus class="size-4" />
                  {{ t('dashboard.jobs.create.ai.addCriterion') }}
                </button>
              </div>

              <!-- Custom criterion form -->
              <div v-if="showCustomForm" class="rounded-xl border border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-900/50 p-5 space-y-4">
                <h3 class="text-sm font-semibold text-surface-800 dark:text-surface-200">{{ t('dashboard.jobs.create.ai.addCustomCriterion') }}</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1">{{ t('dashboard.jobs.create.fields.nameRequired') }}</label>
                    <input
                      v-model="customCriterionForm.name"
                      @input="customCriterionForm.key = autoGenerateKey(customCriterionForm.name)"
                      type="text"
:placeholder="t('dashboard.jobs.create.ai.criterionNamePlaceholder')"
                      class="w-full rounded-lg border border-surface-300 dark:border-surface-700 px-3 py-2 text-sm bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1">{{ t('common.fields.category') }}</label>
                    <select
                      v-model="customCriterionForm.category"
                      class="w-full rounded-lg border border-surface-300 dark:border-surface-700 px-3 py-2 text-sm bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option v-for="(label, key) in categoryLabels" :key="key" :value="key">{{ label }}</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label class="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1">{{ t('common.fields.description') }}</label>
                  <textarea
                    v-model="customCriterionForm.description"
                    rows="2"
:placeholder="t('dashboard.jobs.create.ai.criterionDescPlaceholder')"
                    class="w-full rounded-lg border border-surface-300 dark:border-surface-700 px-3 py-2 text-sm bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1">{{ t('dashboard.jobs.create.ai.maxScore') }}</label>
                    <input
                      v-model.number="customCriterionForm.maxScore"
                      type="number"
                      min="1"
                      max="100"
                      class="w-full rounded-lg border border-surface-300 dark:border-surface-700 px-3 py-2 text-sm bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1">{{ t('dashboard.jobs.create.ai.initialWeight') }}</label>
                    <input
                      v-model.number="customCriterionForm.weight"
                      type="number"
                      min="0"
                      max="100"
                      class="w-full rounded-lg border border-surface-300 dark:border-surface-700 px-3 py-2 text-sm bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>
                <div class="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    :disabled="!customCriterionForm.name"
                    class="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    @click="addCustomCriterion"
                  >
                    {{ t('dashboard.jobs.create.ai.addCriterion') }}
                  </button>
                  <button
                    type="button"
                    class="px-4 py-2 text-sm font-medium text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition-colors"
                    @click="showCustomForm = false"
                  >
                    {{ t('common.cancel') }}
                  </button>
                </div>
              </div>

              <!-- Auto-score toggle -->
              <div v-if="scoringCriteria.length > 0" class="rounded-xl border border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-900/50 p-5">
                <label class="flex items-start gap-3 cursor-pointer">
                  <input
                    v-model="autoScoreOnApply"
                    type="checkbox"
                    :disabled="!isAiConfigured"
                    class="mt-0.5 size-4 rounded border-surface-300 dark:border-surface-600 text-brand-600 focus:ring-brand-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <div>
                    <span class="block text-sm font-semibold text-surface-900 dark:text-surface-100">
                      {{ t('dashboard.jobs.create.ai.autoScoreOnApply') }}
                    </span>
                    <span class="text-xs text-surface-500 dark:text-surface-400 mt-0.5 block leading-relaxed">
                      {{ t('dashboard.jobs.create.ai.autoScoreHint') }}
                    </span>
                    <span v-if="!isAiConfigured" class="text-xs text-amber-600 dark:text-amber-400 mt-1 block">
                      <NuxtLink :to="localePath(aiSettingsPath)" class="underline underline-offset-2 hover:text-amber-800 dark:hover:text-amber-200">{{ t('dashboard.jobs.create.ai.configureAiProvider') }}</NuxtLink> {{ t('dashboard.jobs.create.ai.configureAiProviderHint') }}
                    </span>
                  </div>
                </label>
              </div>

              <!-- Skip scoring note -->
              <div v-if="scoringCriteria.length === 0 && scoringMode === 'none'" class="text-center py-6 text-sm text-surface-400">
                <p>{{ t('dashboard.jobs.create.ai.optionalStep') }}</p>
              </div>
            </section>

            <!-- Step 4: Publish & Distribute -->
            <section v-else-if="currentStep === 4" class="space-y-8">
              <!-- Success state after publishing -->
              <div v-if="isPublished" class="space-y-8">
                <!-- Compact success header -->
                <div class="flex items-center gap-4 rounded-xl border border-success-200 dark:border-success-800 bg-success-50 dark:bg-success-950/30 p-5">
                  <div class="inline-flex items-center justify-center size-12 rounded-full bg-success-100 dark:bg-success-900/50 shrink-0">
                    <PartyPopper class="size-6 text-success-600 dark:text-success-400" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <h2 class="text-lg font-bold text-surface-900 dark:text-surface-100">{{ t('dashboard.jobs.create.publish.liveTitle') }}</h2>
                    <p class="text-sm text-surface-500 dark:text-surface-400">
                      {{ t('dashboard.jobs.create.publish.acceptingApplications', { title: form.title }) }}
                    </p>
                  </div>
                  <NuxtLink
                    :to="finalApplicationLink"
                    target="_blank"
                    class="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-brand-700 dark:text-brand-300 bg-brand-100 dark:bg-brand-900/50 rounded-lg hover:bg-brand-200 dark:hover:bg-brand-800 transition-colors shrink-0"
                  >
                    <ExternalLink class="size-3.5" />
                    {{ t('dashboard.jobs.create.actions.previewApplication') }}
                  </NuxtLink>
                </div>

                <!-- Direct application link -->
                <div class="rounded-xl border border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-900/50 p-5">
                  <div class="flex items-center gap-2 mb-3">
                    <Link2 class="size-4 text-surface-500 dark:text-surface-400" />
                    <span class="text-sm font-semibold text-surface-700 dark:text-surface-300">{{ t('dashboard.jobs.create.publish.directApplicationLink') }}</span>
                    <span class="text-xs text-surface-400 dark:text-surface-500">{{ t('dashboard.jobs.create.publish.noTracking') }}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <input
                      type="text"
                      readonly
                      :value="finalApplicationLink"
                      class="flex-1 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 px-3 py-2 text-sm text-surface-600 dark:text-surface-400 select-all font-mono"
                    />
                    <button
                      type="button"
                      class="inline-flex items-center gap-1.5 rounded-lg bg-surface-200 dark:bg-surface-700 px-4 py-2 text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-300 dark:hover:bg-surface-600 transition-colors shrink-0"
                      @click="copyFinalLink"
                    >
                      <Copy class="size-3.5" />
                      {{ linkCopiedFinal ? t('dashboard.jobs.create.actions.copied') : t('common.actions.copy') }}
                    </button>
                  </div>
                </div>

                <!-- Distribution hub -->
                <div>
                  <div class="flex items-center gap-3 mb-2">
                    <Share2 class="size-5 text-brand-600 dark:text-brand-400" />
                    <h3 class="text-lg font-semibold text-surface-900 dark:text-surface-100">{{ t('dashboard.jobs.create.publish.distributeTitle') }}</h3>
                  </div>
                  <p class="text-sm text-surface-500 dark:text-surface-400 mb-6">
                    {{ t('dashboard.jobs.create.publish.distributionHubHint') }}
                  </p>

                  <!-- Job boards -->
                  <div class="mb-6">
                    <h4 class="text-xs font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500 mb-3">{{ t('dashboard.jobs.create.publish.jobBoards') }}</h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div
                        v-for="ch in distributionChannels.filter(c => c.category === 'job_board')"
                        :key="ch.channel"
                        class="rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-950 p-4 transition-all"
                        :class="createdLinks[ch.channel]?.code ? 'ring-1 ring-brand-200 dark:ring-brand-800 border-brand-200 dark:border-brand-800' : ''"
                      >
                        <div class="flex items-start gap-3">
                          <div class="inline-flex items-center justify-center size-9 rounded-lg bg-surface-100 dark:bg-surface-800 shrink-0">
                            <component :is="channelIcons[ch.channel] ?? Globe" class="size-4 text-surface-500 dark:text-surface-400" />
                          </div>
                          <div class="flex-1 min-w-0">
                            <span class="block text-sm font-semibold text-surface-900 dark:text-surface-100">{{ ch.name }}</span>
                            <span class="text-xs text-surface-400 dark:text-surface-500">{{ ch.description }}</span>
                          </div>
                        </div>

                        <!-- Not yet created -->
                        <div v-if="!createdLinks[ch.channel]" class="mt-3">
                          <button
                            type="button"
                            class="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-950/30 px-3 py-2 text-xs font-medium text-brand-700 dark:text-brand-300 hover:bg-brand-100 dark:hover:bg-brand-900/50 transition-colors"
                            @click="createChannelLink(ch.channel, ch.name)"
                          >
                            <Plus class="size-3.5" />
                            {{ t('dashboard.jobs.create.actions.createTrackingLink') }}
                          </button>
                        </div>

                        <!-- Loading -->
                        <div v-else-if="createdLinks[ch.channel]?.loading" class="mt-3 flex items-center justify-center gap-2 py-2">
                          <Loader2 class="size-3.5 text-brand-600 animate-spin" />
                          <span class="text-xs text-surface-500">{{ t('dashboard.jobs.create.publish.creating') }}</span>
                        </div>

                        <!-- Created - show URL -->
                        <div v-else class="mt-3 space-y-2">
                          <div class="flex items-center gap-1.5">
                            <input
                              type="text"
                              readonly
                              :value="createdLinks[ch.channel]?.url"
                              class="flex-1 rounded-md border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 px-2.5 py-1.5 text-xs text-surface-600 dark:text-surface-400 select-all font-mono truncate"
                            />
                            <button
                              type="button"
                              class="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors shrink-0"
                              :class="createdLinks[ch.channel]?.copied
                                ? 'bg-success-100 dark:bg-success-900/50 text-success-700 dark:text-success-300'
                                : 'bg-brand-600 text-white hover:bg-brand-700'"
                              @click="copyChannelLink(ch.channel)"
                            >
                              <Check v-if="createdLinks[ch.channel]?.copied" class="size-3" />
                              <Copy v-else class="size-3" />
                              {{ createdLinks[ch.channel]?.copied ? t('dashboard.jobs.create.actions.copied') : t('common.actions.copy') }}
                            </button>
                          </div>
                          <p class="flex items-center gap-1 text-[11px] text-success-600 dark:text-success-400">
                            <Check class="size-3" />
                            {{ t('dashboard.jobs.create.publish.linkTrackingHint') }}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Outreach -->
                  <div class="mb-6">
                    <h4 class="text-xs font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500 mb-3">{{ t('dashboard.jobs.create.publish.directOutreach') }}</h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div
                        v-for="ch in distributionChannels.filter(c => c.category === 'outreach')"
                        :key="ch.channel"
                        class="rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-950 p-4 transition-all"
                        :class="createdLinks[ch.channel]?.code ? 'ring-1 ring-brand-200 dark:ring-brand-800 border-brand-200 dark:border-brand-800' : ''"
                      >
                        <div class="flex items-start gap-3">
                          <div class="inline-flex items-center justify-center size-9 rounded-lg bg-surface-100 dark:bg-surface-800 shrink-0">
                            <component :is="channelIcons[ch.channel] ?? Globe" class="size-4 text-surface-500 dark:text-surface-400" />
                          </div>
                          <div class="flex-1 min-w-0">
                            <span class="block text-sm font-semibold text-surface-900 dark:text-surface-100">{{ ch.name }}</span>
                            <span class="text-xs text-surface-400 dark:text-surface-500">{{ ch.description }}</span>
                          </div>
                        </div>
                        <div v-if="!createdLinks[ch.channel]" class="mt-3">
                          <button
                            type="button"
                            class="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-950/30 px-3 py-2 text-xs font-medium text-brand-700 dark:text-brand-300 hover:bg-brand-100 dark:hover:bg-brand-900/50 transition-colors"
                            @click="createChannelLink(ch.channel, ch.name)"
                          >
                            <Plus class="size-3.5" />
                            {{ t('dashboard.jobs.create.actions.createTrackingLink') }}
                          </button>
                        </div>
                        <div v-else-if="createdLinks[ch.channel]?.loading" class="mt-3 flex items-center justify-center gap-2 py-2">
                          <Loader2 class="size-3.5 text-brand-600 animate-spin" />
                          <span class="text-xs text-surface-500">{{ t('dashboard.jobs.create.publish.creating') }}</span>
                        </div>
                        <div v-else class="mt-3 space-y-2">
                          <div class="flex items-center gap-1.5">
                            <input
                              type="text"
                              readonly
                              :value="createdLinks[ch.channel]?.url"
                              class="flex-1 rounded-md border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 px-2.5 py-1.5 text-xs text-surface-600 dark:text-surface-400 select-all font-mono truncate"
                            />
                            <button
                              type="button"
                              class="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors shrink-0"
                              :class="createdLinks[ch.channel]?.copied
                                ? 'bg-success-100 dark:bg-success-900/50 text-success-700 dark:text-success-300'
                                : 'bg-brand-600 text-white hover:bg-brand-700'"
                              @click="copyChannelLink(ch.channel)"
                            >
                              <Check v-if="createdLinks[ch.channel]?.copied" class="size-3" />
                              <Copy v-else class="size-3" />
                              {{ createdLinks[ch.channel]?.copied ? t('dashboard.jobs.create.actions.copied') : t('common.actions.copy') }}
                            </button>
                          </div>
                          <p class="flex items-center gap-1 text-[11px] text-success-600 dark:text-success-400">
                            <Check class="size-3" />
                            {{ t('dashboard.jobs.create.publish.linkTrackingHint') }}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Social media -->
                  <div class="mb-6">
                    <h4 class="text-xs font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500 mb-3">{{ t('dashboard.jobs.create.publish.social') }}</h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div
                        v-for="ch in distributionChannels.filter(c => c.category === 'social')"
                        :key="ch.channel"
                        class="rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-950 p-4 transition-all"
                        :class="createdLinks[ch.channel]?.code ? 'ring-1 ring-brand-200 dark:ring-brand-800 border-brand-200 dark:border-brand-800' : ''"
                      >
                        <div class="flex items-start gap-3">
                          <div class="inline-flex items-center justify-center size-9 rounded-lg bg-surface-100 dark:bg-surface-800 shrink-0">
                            <component :is="channelIcons[ch.channel] ?? Globe" class="size-4 text-surface-500 dark:text-surface-400" />
                          </div>
                          <div class="flex-1 min-w-0">
                            <span class="block text-sm font-semibold text-surface-900 dark:text-surface-100">{{ ch.name }}</span>
                            <span class="text-xs text-surface-400 dark:text-surface-500">{{ ch.description }}</span>
                          </div>
                        </div>
                        <div v-if="!createdLinks[ch.channel]" class="mt-3">
                          <button
                            type="button"
                            class="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-950/30 px-3 py-2 text-xs font-medium text-brand-700 dark:text-brand-300 hover:bg-brand-100 dark:hover:bg-brand-900/50 transition-colors"
                            @click="createChannelLink(ch.channel, ch.name)"
                          >
                            <Plus class="size-3.5" />
                            {{ t('dashboard.jobs.create.actions.createTrackingLink') }}
                          </button>
                        </div>
                        <div v-else-if="createdLinks[ch.channel]?.loading" class="mt-3 flex items-center justify-center gap-2 py-2">
                          <Loader2 class="size-3.5 text-brand-600 animate-spin" />
                          <span class="text-xs text-surface-500">{{ t('dashboard.jobs.create.publish.creating') }}</span>
                        </div>
                        <div v-else class="mt-3 space-y-2">
                          <div class="flex items-center gap-1.5">
                            <input
                              type="text"
                              readonly
                              :value="createdLinks[ch.channel]?.url"
                              class="flex-1 rounded-md border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 px-2.5 py-1.5 text-xs text-surface-600 dark:text-surface-400 select-all font-mono truncate"
                            />
                            <button
                              type="button"
                              class="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors shrink-0"
                              :class="createdLinks[ch.channel]?.copied
                                ? 'bg-success-100 dark:bg-success-900/50 text-success-700 dark:text-success-300'
                                : 'bg-brand-600 text-white hover:bg-brand-700'"
                              @click="copyChannelLink(ch.channel)"
                            >
                              <Check v-if="createdLinks[ch.channel]?.copied" class="size-3" />
                              <Copy v-else class="size-3" />
                              {{ createdLinks[ch.channel]?.copied ? t('dashboard.jobs.create.actions.copied') : t('common.actions.copy') }}
                            </button>
                          </div>
                          <p class="flex items-center gap-1 text-[11px] text-success-600 dark:text-success-400">
                            <Check class="size-3" />
                            {{ t('dashboard.jobs.create.publish.linkTrackingHint') }}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Custom job board -->
                  <div class="mb-6">
                    <h4 class="text-xs font-semibold uppercase tracking-wider text-surface-400 dark:text-surface-500 mb-3">{{ t('dashboard.jobs.create.publish.customJobBoard') }}</h4>
                    <p class="text-sm text-surface-500 dark:text-surface-400 mb-3">
                      {{ t('dashboard.jobs.create.publish.customBoardHint') }}
                    </p>

                    <!-- Add custom board form -->
                    <div class="flex items-center gap-2 mb-4">
                      <input
                        v-model="customBoardName"
                        type="text"
                        placeholder="e.g. Hacker News, AngelList, Niche Board"
                        class="flex-1 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 px-3 py-2 text-sm text-surface-700 dark:text-surface-300 placeholder-surface-400 dark:placeholder-surface-500 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                        @keydown.enter.prevent="createCustomBoardLink"
                      />
                      <button
                        type="button"
                        class="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-950/30 px-4 py-2 text-sm font-medium text-brand-700 dark:text-brand-300 hover:bg-brand-100 dark:hover:bg-brand-900/50 transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                        :disabled="!customBoardName.trim() || isCreatingCustomBoard"
                        @click="createCustomBoardLink"
                      >
                        <Loader2 v-if="isCreatingCustomBoard" class="size-3.5 animate-spin" />
                        <Plus v-else class="size-3.5" />
                        {{ t('dashboard.jobs.create.publish.createCustomLink') }}
                      </button>
                    </div>

                    <!-- Created custom board links -->
                    <div v-if="customBoardLinks.length" class="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div
                        v-for="(cbl, idx) in customBoardLinks"
                        :key="cbl.channel"
                        class="rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-950 p-4 ring-1 ring-brand-200 dark:ring-brand-800 border-brand-200 dark:border-brand-800"
                      >
                        <div class="flex items-start gap-3">
                          <div class="inline-flex items-center justify-center size-9 rounded-lg bg-surface-100 dark:bg-surface-800 shrink-0">
                            <Globe class="size-4 text-surface-500 dark:text-surface-400" />
                          </div>
                          <div class="flex-1 min-w-0">
                            <span class="block text-sm font-semibold text-surface-900 dark:text-surface-100">{{ cbl.name }}</span>
                            <span class="text-xs text-surface-400 dark:text-surface-500">{{ t('dashboard.jobs.create.publish.customJobBoard') }}</span>
                          </div>
                        </div>
                        <div class="mt-3 space-y-2">
                          <div class="flex items-center gap-1.5">
                            <input
                              type="text"
                              readonly
                              :value="cbl.url"
                              class="flex-1 rounded-md border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900 px-2.5 py-1.5 text-xs text-surface-600 dark:text-surface-400 select-all font-mono truncate"
                            />
                            <button
                              type="button"
                              class="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors shrink-0"
                              :class="cbl.copied
                                ? 'bg-success-100 dark:bg-success-900/50 text-success-700 dark:text-success-300'
                                : 'bg-brand-600 text-white hover:bg-brand-700'"
                              @click="copyCustomBoardLink(idx)"
                            >
                              <Check v-if="cbl.copied" class="size-3" />
                              <Copy v-else class="size-3" />
                              {{ cbl.copied ? t('dashboard.jobs.create.actions.copied') : t('common.actions.copy') }}
                            </button>
                          </div>
                          <p class="flex items-center gap-1 text-[11px] text-success-600 dark:text-success-400">
                            <Check class="size-3" />
                            {{ t('dashboard.jobs.create.publish.linkTrackingHint') }}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Summary and link to full dashboard -->
                  <div class="rounded-xl border border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-900/50 p-4">
                    <div class="flex items-center gap-3">
                      <BarChart3 class="size-5 text-surface-400 dark:text-surface-500 shrink-0" />
                      <div class="flex-1">
                        <p class="text-sm text-surface-700 dark:text-surface-300">
                          <span v-if="createdLinkCount > 0">
                            {{ t('dashboard.jobs.create.publish.trackingLinksCount', createdLinkCount) }}
                          </span>
                          {{ t('dashboard.jobs.create.publish.trackingLinksManagePrefix') }}
                          <NuxtLink :to="$tenantPath('source-tracking')" class="text-brand-600 dark:text-brand-400 font-medium underline underline-offset-2">{{ t('dashboard.jobs.create.publish.sourceTrackingLink') }}</NuxtLink>.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Action buttons -->
                <div class="flex items-center justify-between pt-6 border-t border-surface-100 dark:border-surface-800">
                  <NuxtLink
                    :to="$tenantPath(`jobs/${createdJobId}`)"
                    class="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-surface-700 dark:text-surface-300 bg-white dark:bg-surface-900 border border-surface-300 dark:border-surface-700 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
                  >
                    <Eye class="size-4" />
                    {{ t('dashboard.jobs.create.actions.viewJob') }}
                  </NuxtLink>
                  <NuxtLink
                    :to="$tenantPath('')"
                    class="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors shadow-sm"
                  >
                    {{ t('common.goToDashboard') }}
                  </NuxtLink>
                </div>
              </div>

              <!-- Pre-publish state: choose publish or draft -->
              <div v-else>
                <h2 class="text-lg font-semibold text-surface-900 dark:text-surface-100 mb-2 pb-2 border-b border-surface-100 dark:border-surface-800">{{ t('dashboard.jobs.create.publish.readyTitle') }}</h2>
                <p class="text-sm text-surface-500 dark:text-surface-400 mb-6">
                  {{ t('dashboard.jobs.create.publish.intro') }}
                </p>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  <!-- Publish now option -->
                  <button
                    type="button"
                    class="relative flex flex-col items-start gap-3 p-5 rounded-xl border-2 text-left transition-all"
                    :class="publishChoice === 'publish'
                      ? 'border-brand-500 dark:border-brand-400 bg-brand-50/70 dark:bg-brand-950/30 ring-2 ring-brand-200 dark:ring-brand-900'
                      : 'border-surface-200 dark:border-surface-800 hover:border-surface-300 dark:hover:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800/50'"
                    @click="publishChoice = 'publish'"
                  >
                    <span
                      v-if="publishChoice === 'publish'"
                      class="absolute top-3 right-3 inline-flex items-center justify-center size-5 rounded-full bg-brand-600 text-white"
                    >
                      <Check class="size-3" />
                    </span>
                    <div class="inline-flex items-center justify-center size-10 rounded-lg bg-brand-100 dark:bg-brand-900/50">
                      <Rocket class="size-5 text-brand-600 dark:text-brand-400" />
                    </div>
                    <div>
                      <span class="block text-sm font-semibold text-surface-900 dark:text-surface-100">{{ t('dashboard.jobs.create.publish.publishNow') }}</span>
                      <span class="text-xs text-surface-500 dark:text-surface-400 mt-1 block leading-relaxed">
                        {{ t('dashboard.jobs.create.publish.publishNowDetail') }}
                      </span>
                    </div>
                  </button>

                  <!-- Save as draft option -->
                  <button
                    type="button"
                    class="relative flex flex-col items-start gap-3 p-5 rounded-xl border-2 text-left transition-all"
                    :class="publishChoice === 'draft'
                      ? 'border-brand-500 dark:border-brand-400 bg-brand-50/70 dark:bg-brand-950/30 ring-2 ring-brand-200 dark:ring-brand-900'
                      : 'border-surface-200 dark:border-surface-800 hover:border-surface-300 dark:hover:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800/50'"
                    @click="publishChoice = 'draft'"
                  >
                    <span
                      v-if="publishChoice === 'draft'"
                      class="absolute top-3 right-3 inline-flex items-center justify-center size-5 rounded-full bg-brand-600 text-white"
                    >
                      <Check class="size-3" />
                    </span>
                    <div class="inline-flex items-center justify-center size-10 rounded-lg bg-surface-100 dark:bg-surface-800">
                      <FileEdit class="size-5 text-surface-500 dark:text-surface-400" />
                    </div>
                    <div>
                      <span class="block text-sm font-semibold text-surface-900 dark:text-surface-100">{{ t('dashboard.jobs.create.publish.saveDraft') }}</span>
                      <span class="text-xs text-surface-500 dark:text-surface-400 mt-1 block leading-relaxed">
                        {{ t('dashboard.jobs.create.publish.saveDraftDetail') }}
                      </span>
                    </div>
                  </button>
                </div>

                <!-- Summary of what was configured -->
                <div class="rounded-xl border border-surface-200 dark:border-surface-800 bg-surface-50 dark:bg-surface-900/50 p-5">
                  <h3 class="text-sm font-semibold text-surface-700 dark:text-surface-300 mb-4">{{ t('dashboard.jobs.create.publish.jobSummary') }}</h3>
                  <dl class="space-y-3 text-sm">
                    <div class="flex items-start gap-3">
                      <dt class="flex items-center gap-1.5 text-surface-500 dark:text-surface-400 shrink-0 w-32">
                        <Briefcase class="size-3.5" /> {{ t('common.fields.title') }}
                      </dt>
                      <dd class="text-surface-900 dark:text-surface-100 font-medium">{{ form.title }}</dd>
                    </div>
                    <div v-if="form.location" class="flex items-start gap-3">
                      <dt class="flex items-center gap-1.5 text-surface-500 dark:text-surface-400 shrink-0 w-32">
                        <Link2 class="size-3.5" /> {{ t('common.fields.location') }}
                      </dt>
                      <dd class="text-surface-900 dark:text-surface-100">{{ form.location }}</dd>
                    </div>
                    <div class="flex items-start gap-3">
                      <dt class="flex items-center gap-1.5 text-surface-500 dark:text-surface-400 shrink-0 w-32">
                        <FileText class="size-3.5" /> {{ t('common.documents.resume') }}
                      </dt>
                      <dd class="text-surface-900 dark:text-surface-100">{{ applicationForm.requireResume ? t('dashboard.jobs.create.applicationForm.required') : t('dashboard.jobs.create.applicationForm.optional') }}</dd>
                    </div>
                    <div class="flex items-start gap-3">
                      <dt class="flex items-center gap-1.5 text-surface-500 dark:text-surface-400 shrink-0 w-32">
                        <MessageSquare class="size-3.5" /> {{ t('dashboard.jobs.create.applicationForm.customQuestions') }}
                      </dt>
                      <dd class="text-surface-900 dark:text-surface-100">{{ t('dashboard.jobs.create.publish.customQuestionsSummary', applicationForm.questions.length) }}</dd>
                    </div>
                  </dl>
                </div>

                <!-- What happens next hint -->
                <div v-if="publishChoice === 'publish'" class="rounded-xl border border-brand-100 dark:border-brand-900 bg-brand-50/50 dark:bg-brand-950/20 p-4 mt-6">
                  <div class="flex items-start gap-3">
                    <Share2 class="size-4 text-brand-600 dark:text-brand-400 shrink-0 mt-0.5" />
                    <div>
                      <p class="text-sm font-medium text-brand-800 dark:text-brand-200">{{ t('dashboard.jobs.create.publish.afterPublishing') }}</p>
                      <p class="text-xs text-brand-700 dark:text-brand-300 mt-0.5 leading-relaxed">
                        You'll get tracked links for LinkedIn, Indeed, and other platforms so you can see exactly where your applicants come from.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <!-- Actions Footer -->
            <div v-if="!isPublished" class="flex items-center justify-between mt-12 pt-8 border-t border-surface-100 dark:border-surface-800">
              <NuxtLink
                :to="$tenantPath('')"
                class="px-6 py-2.5 text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
              >
                {{ t('common.cancel') }}
              </NuxtLink>

              <div class="flex items-center gap-3">
                <button
                  v-if="currentStep > 1"
                  type="button"
                  @click="prevStep"
                  class="px-6 py-2.5 text-sm font-medium text-surface-700 dark:text-surface-300 bg-white dark:bg-surface-900 border border-surface-300 dark:border-surface-700 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
                >
                  {{ t('dashboard.jobs.create.actions.back') }}
                </button>
                <button
                  v-if="currentStep < 4"
                  type="button"
                  :disabled="!canGoNext"
                  @click="nextStep"
                  class="px-8 py-2.5 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  {{ t('dashboard.jobs.create.actions.saveContinue') }}
                </button>
                <button
                  v-else
                  type="submit"
                  :disabled="isSubmitting"
                  class="inline-flex items-center gap-2 px-8 py-2.5 text-sm font-medium text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                  :class="publishChoice === 'publish' ? 'bg-brand-600 hover:bg-brand-700' : 'bg-surface-600 hover:bg-surface-700'"
                >
                  <Rocket v-if="publishChoice === 'publish'" class="size-4" />
                  <FileEdit v-else class="size-4" />
                  {{ isSubmitting
                    ? (publishChoice === 'publish' ? t('dashboard.jobs.create.publish.publishing') : t('dashboard.jobs.create.publish.savingDraft'))
                    : (publishChoice === 'publish' ? t('dashboard.jobs.create.actions.publishCopyLink') : t('dashboard.jobs.create.actions.saveAsDraft'))
                  }}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <!-- Right side: Tips -->
      <aside class="lg:col-span-4 space-y-6">
        <div class="sticky top-8 space-y-6">
          <div class="rounded-xl border border-surface-200 dark:border-surface-800 bg-surface-50/50 dark:bg-surface-900/50 p-6">
            <h3 class="text-sm font-bold text-surface-900 dark:text-surface-100 uppercase tracking-wider mb-4">{{ t('dashboard.jobs.create.tips.title') }}</h3>
            <ul class="space-y-4">
              <li v-if="currentStep === 1" class="text-sm text-surface-600 dark:text-surface-400 leading-relaxed">
                <p class="font-medium text-surface-900 dark:text-surface-100 mb-1">{{ t('dashboard.jobs.create.tips.step1.commonTitles.title') }}</p>
                {{ t('dashboard.jobs.create.tips.step1.commonTitles.body') }}
              </li>
              <li v-if="currentStep === 1" class="text-sm text-surface-600 dark:text-surface-400 leading-relaxed">
                <p class="font-medium text-surface-900 dark:text-surface-100 mb-1">{{ t('dashboard.jobs.create.tips.step1.officeLocation.title') }}</p>
                {{ t('dashboard.jobs.create.tips.step1.officeLocation.body') }}
              </li>
              <li v-if="currentStep === 1" class="text-sm text-surface-600 dark:text-surface-400 leading-relaxed">
                <p class="font-medium text-surface-900 dark:text-surface-100 mb-1">{{ t('dashboard.jobs.create.tips.step1.formatDescription.title') }}</p>
                {{ t('dashboard.jobs.create.tips.step1.formatDescription.body') }}
              </li>
              <li v-if="currentStep === 2" class="text-sm text-surface-600 dark:text-surface-400 leading-relaxed">
                <p class="font-medium text-surface-900 dark:text-surface-100 mb-1">{{ t('dashboard.jobs.create.tips.step2.keepShort.title') }}</p>
                {{ t('dashboard.jobs.create.tips.step2.keepShort.body') }}
              </li>
              <li v-if="currentStep === 2" class="text-sm text-surface-600 dark:text-surface-400 leading-relaxed">
                <p class="font-medium text-surface-900 dark:text-surface-100 mb-1">{{ t('dashboard.jobs.create.tips.step2.resumeMatters.title') }}</p>
                {{ t('dashboard.jobs.create.tips.step2.resumeMatters.body') }}
              </li>
              <li v-if="currentStep === 2" class="text-sm text-surface-600 dark:text-surface-400 leading-relaxed">
                <p class="font-medium text-surface-900 dark:text-surface-100 mb-1">{{ t('dashboard.jobs.create.tips.step2.standardFields.title') }}</p>
                {{ t('dashboard.jobs.create.tips.step2.standardFields.body') }}
              </li>
              <li v-if="currentStep === 3" class="text-sm text-surface-600 dark:text-surface-400 leading-relaxed">
                <p class="font-medium text-surface-900 dark:text-surface-100 mb-1">{{ t('dashboard.jobs.create.tips.step3.startTemplate.title') }}</p>
                {{ t('dashboard.jobs.create.tips.step3.startTemplate.body') }}
              </li>
              <li v-if="currentStep === 3" class="text-sm text-surface-600 dark:text-surface-400 leading-relaxed">
                <p class="font-medium text-surface-900 dark:text-surface-100 mb-1">{{ t('dashboard.jobs.create.tips.step3.adjustWeights.title') }}</p>
                {{ t('dashboard.jobs.create.tips.step3.adjustWeights.body') }}
              </li>
              <li v-if="currentStep === 3" class="text-sm text-surface-600 dark:text-surface-400 leading-relaxed">
                <p class="font-medium text-surface-900 dark:text-surface-100 mb-1">{{ t('dashboard.jobs.create.tips.step3.aiSetupRequired.title') }}</p>
                {{ t('dashboard.jobs.create.tips.step3.aiSetupRequired.body') }} <NuxtLink :to="localePath(aiSettingsPath)" class="text-brand-600 dark:text-brand-400 underline">{{ t('dashboard.nav.settings') }}</NuxtLink>.
              </li>
              <li v-if="currentStep === 4" class="text-sm text-surface-600 dark:text-surface-400 leading-relaxed">
                <p class="font-medium text-surface-900 dark:text-surface-100 mb-1">{{ t('dashboard.jobs.create.tips.step4.publishWhenReady.title') }}</p>
                {{ t('dashboard.jobs.create.tips.step4.publishWhenReady.body') }}
              </li>
              <li v-if="currentStep === 4" class="text-sm text-surface-600 dark:text-surface-400 leading-relaxed">
                <p class="font-medium text-surface-900 dark:text-surface-100 mb-1">{{ t('dashboard.jobs.create.tips.step4.useTrackingLinks.title') }}</p>
                {{ t('dashboard.jobs.create.tips.step4.useTrackingLinks.body') }}
              </li>
              <li v-if="currentStep === 4" class="text-sm text-surface-600 dark:text-surface-400 leading-relaxed">
                <p class="font-medium text-surface-900 dark:text-surface-100 mb-1">{{ t('dashboard.jobs.create.tips.step4.oneLinkPerChannel.title') }}</p>
                {{ t('dashboard.jobs.create.tips.step4.oneLinkPerChannel.body') }}
              </li>
              <li v-if="currentStep === 4" class="text-sm text-surface-600 dark:text-surface-400 leading-relaxed">
                <p class="font-medium text-surface-900 dark:text-surface-100 mb-1">{{ t('dashboard.jobs.create.tips.step4.draftsPrivate.title') }}</p>
                {{ t('dashboard.jobs.create.tips.step4.draftsPrivate.body') }}
              </li>
            </ul>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
button:not(:disabled) {
  cursor: pointer;
}
</style>
