<script setup lang="ts">
import {
  Save, Trash2, ArrowLeft, ExternalLink, Link2, ClipboardCopy,
} from 'lucide-vue-next'
import { z } from 'zod'
import { ISCO_CATEGORY_IDS } from '~~/shared/scoring-criteria-templates'
import { ALL_JOB_TYPE_IDS, DEFAULT_JOB_TYPE } from '~~/shared/job-types'

const { t } = useI18n()

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'require-org'],
})

const route = useRoute()
const localePath = useLocalePath()
const jobId = route.params.id as string
const toast = useToast()
const { handlePreviewReadOnlyError } = usePreviewReadOnly()
const { track } = useTrack()

const { job, status: fetchStatus, error: fetchError, updateJob, deleteJob } = useJob(jobId)
const { iscoCategories } = useScoringCriteriaTemplates()
const { contractTypeOptions } = useJobTypes()

useSeoMeta({
  title: computed(() =>
    job.value
      ? t('dashboard.jobs.settings.seoTitle', { title: job.value.title })
      : t('dashboard.jobs.settings.seoTitleFallback'),
  ),
})

// ─────────────────────────────────────────────
// Form state — synced from fetched job
// ─────────────────────────────────────────────

const form = ref({
  title: '',
  iscoCategoryId: '' as string,
  description: '',
  location: '',
  type: DEFAULT_JOB_TYPE as string,
  slug: '',
  salaryMin: null as number | null,
  salaryMax: null as number | null,
  salaryCurrency: '',
  salaryUnit: '' as string,
  salaryNegotiable: false,
  remoteStatus: '' as string,
  experienceLevel: '' as string,
  validThrough: '',
  requireResume: false,
  requireCoverLetter: false,
  autoScoreOnApply: false,
})

const {
  isDisabled: isRemoteModelDisabled,
  settingsOptions: remoteOptions,
  syncRemoteStatusForSettings,
} = useJobRemoteModel(computed(() => form.value.type))

watch(() => form.value.type, () => {
  form.value.remoteStatus = syncRemoteStatusForSettings(form.value.remoteStatus)
})

watch(job, (j) => {
  if (j) {
    form.value = {
      title: j.title ?? '',
      iscoCategoryId: j.iscoCategoryId ?? '',
      description: j.description ?? '',
      location: j.location ?? '',
      type: j.type ?? DEFAULT_JOB_TYPE,
      slug: j.slug ?? '',
      salaryMin: j.salaryMin ?? null,
      salaryMax: j.salaryMax ?? null,
      salaryCurrency: j.salaryCurrency ?? '',
      salaryUnit: j.salaryUnit ?? '',
      salaryNegotiable: j.salaryNegotiable ?? false,
      remoteStatus: j.remoteStatus ?? '',
      experienceLevel: j.experienceLevel ?? '',
      validThrough: j.validThrough ? new Date(j.validThrough).toISOString().split('T')[0] ?? '' : '',
      requireResume: j.requireResume ?? false,
      requireCoverLetter: j.requireCoverLetter ?? false,
      autoScoreOnApply: j.autoScoreOnApply ?? false,
    }
    form.value.remoteStatus = syncRemoteStatusForSettings(form.value.remoteStatus)
  }
}, { immediate: true })

// When "Negotiable" is toggled on, clear the salary range fields
watch(() => form.value.salaryNegotiable, (negotiable) => {
  if (negotiable) {
    form.value.salaryMin = null
    form.value.salaryMax = null
    form.value.salaryCurrency = ''
    form.value.salaryUnit = ''
  }
})

// ─────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────

const editSchema = z.object({
  title: z.string().min(1, t('dashboard.jobs.settings.errors.titleRequired')).max(200),
  description: z.string().optional(),
  location: z.string().optional(),
  type: z.enum(ALL_JOB_TYPE_IDS),
  slug: z.string().max(80).optional(),
  salaryMin: z.union([z.coerce.number().int().min(0), z.null()]).optional(),
  salaryMax: z.union([z.coerce.number().int().min(0), z.null()]).optional(),
  salaryCurrency: z.string().length(3).optional().or(z.literal('')),
  salaryUnit: z.enum(['YEAR', 'MONTH', 'HOUR']).optional().or(z.literal('')),
  salaryNegotiable: z.boolean().optional(),
  remoteStatus: z.enum(['remote', 'hybrid', 'onsite']).optional().or(z.literal('')),
  experienceLevel: z.enum(['junior', 'mid', 'senior', 'lead']).optional().or(z.literal('')),
  iscoCategoryId: z.enum(ISCO_CATEGORY_IDS).optional().or(z.literal('')),
  validThrough: z.string().optional(),
  requireResume: z.boolean().optional(),
  requireCoverLetter: z.boolean().optional(),
  autoScoreOnApply: z.boolean().optional(),
})

const errors = ref<Record<string, string>>({})
const isSaving = ref(false)
const saved = ref(false)

async function handleSave() {
  const result = editSchema.safeParse(form.value)
  if (!result.success) {
    errors.value = {}
    for (const issue of result.error.issues) {
      const field = issue.path[0]?.toString()
      if (field) errors.value[field] = issue.message
    }
    return
  }
  errors.value = {}
  isSaving.value = true

  try {
    const payload: Record<string, unknown> = {
      title: form.value.title,
      description: form.value.description || null,
      location: form.value.location || null,
      type: form.value.type,
      slug: form.value.slug || undefined,
      requireResume: form.value.requireResume,
      requireCoverLetter: form.value.requireCoverLetter,
      autoScoreOnApply: form.value.autoScoreOnApply,
      salaryNegotiable: form.value.salaryNegotiable,
      // Always send salary fields so cleared values write null to the DB
      salaryMin: form.value.salaryNegotiable ? null : (form.value.salaryMin ?? null),
      salaryMax: form.value.salaryNegotiable ? null : (form.value.salaryMax ?? null),
      salaryCurrency: form.value.salaryNegotiable ? null : (form.value.salaryCurrency || null),
      salaryUnit: form.value.salaryNegotiable ? null : (form.value.salaryUnit || null),
      remoteStatus: form.value.remoteStatus || null,
      experienceLevel: (form.value.experienceLevel as 'junior' | 'mid' | 'senior' | 'lead' | null) || null,
      iscoCategoryId: form.value.iscoCategoryId || null,
      // Send null when cleared so the DB column is set to NULL
      validThrough: form.value.validThrough ? new Date(form.value.validThrough) : null,
    }

    await updateJob(payload as any)
    track('job_settings_saved', { job_id: jobId })
    saved.value = true
    setTimeout(() => { saved.value = false }, 2000)
  } catch (err: any) {
    if (handlePreviewReadOnlyError(err)) return
    toast.error(t('dashboard.jobs.settings.errors.saveFailed'), { message: err.data?.statusMessage, statusCode: err.data?.statusCode })
  } finally {
    isSaving.value = false
  }
}

// ─────────────────────────────────────────────
// Application link
// ─────────────────────────────────────────────

const requestUrl = useRequestURL()
const applicationUrl = computed(() => {
  const base = `${requestUrl.protocol}//${requestUrl.host}`
  return `${base}/jobs/${job.value?.slug ?? jobId}/apply`
})

const linkCopied = ref(false)

async function copyApplicationLink() {
  try {
    await navigator.clipboard.writeText(applicationUrl.value)
    linkCopied.value = true
    setTimeout(() => { linkCopied.value = false }, 2000)
  } catch {
    toast.info(applicationUrl.value)
  }
}

// ─────────────────────────────────────────────
// Delete
// ─────────────────────────────────────────────

const showDeleteConfirm = ref(false)
const isDeleting = ref(false)

async function handleDelete() {
  isDeleting.value = true
  try {
    track('job_deleted', { job_id: jobId, source: 'settings' })
    await deleteJob()
  } catch (err: any) {
    if (handlePreviewReadOnlyError(err)) return
    toast.error(t('dashboard.jobs.settings.errors.deleteFailed'), { message: err.data?.statusMessage, statusCode: err.data?.statusCode })
    isDeleting.value = false
    showDeleteConfirm.value = false
  }
}

// ─────────────────────────────────────────────
// Options
// ─────────────────────────────────────────────

const typeOptions = contractTypeOptions

const experienceLevelOptions = computed(() => [
  { value: '', label: t('dashboard.jobs.shared.notSpecified') },
  { value: 'junior', label: t('dashboard.jobs.shared.experience.junior') },
  { value: 'mid', label: t('dashboard.jobs.shared.midLevel') },
  { value: 'senior', label: t('dashboard.jobs.shared.experience.senior') },
  { value: 'lead', label: t('dashboard.jobs.shared.experience.lead') },
])

const salaryUnitOptions = computed(() => [
  { value: '', label: t('dashboard.jobs.shared.notSpecified') },
  { value: 'YEAR', label: t('dashboard.jobs.shared.perYear') },
  { value: 'MONTH', label: t('dashboard.jobs.shared.perMonth') },
  { value: 'HOUR', label: t('dashboard.jobs.shared.perHour') },
])

function onSalaryMinChange(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.value) form.value.salaryMin = null
}

function onSalaryMaxChange(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.value) form.value.salaryMax = null
}
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <JobSubNavActions :job-id="jobId" />

    <!-- Loading -->
    <div v-if="fetchStatus === 'pending'" class="text-center py-12 text-surface-400">
      {{ t('common.actions.loading') }}
    </div>

    <!-- Error -->
    <div
      v-else-if="fetchError"
      class="rounded-lg border border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950 p-4 text-sm text-danger-700 dark:text-danger-400"
    >
      {{ fetchError.statusCode === 404 ? t('dashboard.jobs.settings.jobNotFound') : t('dashboard.jobs.settings.loadFailed') }}
      <NuxtLink :to="$localePath('/dashboard/jobs')" class="underline ml-1">{{ t('common.actions.backToJobs') }}</NuxtLink>
    </div>

    <template v-else-if="job">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-50">{{ t('dashboard.jobs.settings.title') }}</h1>
        <p class="text-sm text-surface-500 dark:text-surface-400 mt-1">
          {{ t('dashboard.jobs.settings.subtitle', { title: job.title }) }}
        </p>
      </div>

      <form @submit.prevent="handleSave" class="space-y-8">
        <!-- ═══════════════════════════════════════ -->
        <!-- SECTION: Basic Details                   -->
        <!-- ═══════════════════════════════════════ -->
        <section class="rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-6">
          <h2 class="text-base font-semibold text-surface-900 dark:text-surface-100 mb-5">{{ t('dashboard.jobs.settings.sections.basicDetails') }}</h2>
          <div class="space-y-4">
            <!-- Title -->
            <div>
              <label for="settings-title" class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                {{ t('common.fields.title') }} <span class="text-danger-500">*</span>
              </label>
              <input
                id="settings-title"
                v-model="form.title"
                type="text"
                class="w-full rounded-lg border px-3 py-2 text-sm text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-800 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                :class="errors.title ? 'border-danger-300' : 'border-surface-300 dark:border-surface-700'"
              />
              <p v-if="errors.title" class="mt-1 text-xs text-danger-600 dark:text-danger-400">{{ errors.title }}</p>
            </div>

            <!-- ISCO category (internal only) -->
            <div>
              <label for="settings-isco-category" class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                {{ t('dashboard.jobs.settings.fields.iscoCategory') }}
              </label>
              <select
                id="settings-isco-category"
                v-model="form.iscoCategoryId"
                class="w-full rounded-lg border border-surface-300 dark:border-surface-700 px-3 py-2 text-sm text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
              >
                <option value="">{{ t('dashboard.jobs.settings.fields.iscoCategoryPlaceholder') }}</option>
                <option v-for="cat in iscoCategories" :key="cat.id" :value="cat.id">
                  {{ cat.label }}
                </option>
              </select>
              <p class="mt-1 text-xs text-surface-500">{{ t('dashboard.jobs.settings.fields.iscoCategoryInternal') }}</p>
            </div>

            <!-- Description -->
            <div>
              <label for="settings-description" class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                {{ t('common.fields.description') }}
              </label>
              <textarea
                id="settings-description"
                v-model="form.description"
                rows="6"
                :placeholder="t('dashboard.jobs.settings.fields.descriptionPlaceholder')"
                class="w-full rounded-lg border border-surface-300 dark:border-surface-700 px-3 py-2 text-sm text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-800 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
              />
            </div>

            <!-- Location + Type row -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label for="settings-location" class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  {{ t('common.fields.location') }}
                </label>
                <LocationAutocomplete
                  id="settings-location"
                  v-model="form.location"
                  :placeholder="t('dashboard.jobs.settings.fields.locationPlaceholder')"
                  input-class="w-full rounded-lg border border-surface-300 dark:border-surface-700 px-3 py-2 text-sm text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-800 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                />
              </div>
              <div>
                <label for="settings-type" class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                  {{ t('dashboard.jobs.settings.fields.employmentType') }}
                </label>
                <select
                  id="settings-type"
                  v-model="form.type"
                  class="w-full rounded-lg border border-surface-300 dark:border-surface-700 px-3 py-2 text-sm text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                >
                  <option v-for="opt in typeOptions" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>
              </div>
            </div>

            <!-- Remote model -->
            <div>
              <label
                for="settings-remote"
                class="block text-sm font-medium mb-1"
                :class="isRemoteModelDisabled ? 'text-surface-400 dark:text-surface-500' : 'text-surface-700 dark:text-surface-300'"
              >
                {{ t('dashboard.jobs.settings.fields.workArrangement') }}
              </label>
              <select
                id="settings-remote"
                v-model="form.remoteStatus"
                :disabled="isRemoteModelDisabled"
                class="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors bg-white dark:bg-surface-800 border-surface-300 dark:border-surface-700"
                :class="isRemoteModelDisabled
                  ? 'opacity-50 cursor-not-allowed bg-surface-100 dark:bg-surface-900 text-surface-400 dark:text-surface-500 focus:ring-0'
                  : 'text-surface-900 dark:text-surface-100 focus:ring-brand-500 focus:border-brand-500'"
              >
                <option v-if="isRemoteModelDisabled" value="">
                  {{ t('dashboard.jobs.shared.notSpecified') }}
                </option>
                <option v-for="opt in remoteOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>

            <!-- Experience Level -->
            <div>
              <label for="settings-experience-level" class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                {{ t('dashboard.jobs.settings.fields.experienceLevel') }}
              </label>
              <select
                id="settings-experience-level"
                v-model="form.experienceLevel"
                class="w-full rounded-lg border border-surface-300 dark:border-surface-700 px-3 py-2 text-sm text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
              >
                <option v-for="opt in experienceLevelOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>

            <!-- Slug -->
            <div>
              <label for="settings-slug" class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                {{ t('dashboard.jobs.settings.fields.urlSlug') }}
              </label>
              <input
                id="settings-slug"
                v-model="form.slug"
                type="text"
                :placeholder="t('dashboard.jobs.settings.fields.slugPlaceholder')"
                class="w-full rounded-lg border border-surface-300 dark:border-surface-700 px-3 py-2 text-sm text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-800 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors font-mono text-xs"
              />
              <p class="mt-1 text-xs text-surface-400 dark:text-surface-500">
                {{ t('dashboard.jobs.settings.fields.slugHint') }}
              </p>
            </div>
          </div>
        </section>

        <!-- ═══════════════════════════════════════ -->
        <!-- SECTION: Salary & Compensation           -->
        <!-- ═══════════════════════════════════════ -->
        <section class="rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-6">
          <h2 class="text-base font-semibold text-surface-900 dark:text-surface-100 mb-1">{{ t('dashboard.jobs.settings.sections.salary') }}</h2>
          <p class="text-xs text-surface-400 dark:text-surface-500 mb-5">
            {{ t('dashboard.jobs.settings.fields.salaryHint') }}
          </p>
          <div class="space-y-4">
            <!-- Negotiable toggle -->
            <label class="flex items-center gap-3 cursor-pointer">
              <input
                v-model="form.salaryNegotiable"
                type="checkbox"
                class="size-4 rounded border-surface-300 dark:border-surface-600 text-brand-600 focus:ring-brand-500"
              />
              <div>
                <span class="text-sm font-medium text-surface-900 dark:text-surface-100">{{ t('dashboard.jobs.settings.fields.salaryNegotiable') }}</span>
                <p class="text-xs text-surface-400 dark:text-surface-500">
                  {{ t('dashboard.jobs.settings.fields.salaryNegotiableHint') }}
                </p>
              </div>
            </label>

            <!-- Salary range fields — hidden when negotiable -->
            <template v-if="!form.salaryNegotiable">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label for="settings-salary-min" class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                    {{ t('dashboard.jobs.settings.fields.minimumSalary') }}
                  </label>
                  <input
                    id="settings-salary-min"
                    v-model.number="form.salaryMin"
                    type="number"
                    min="0"
                    :placeholder="t('dashboard.jobs.settings.fields.salaryMinPlaceholder')"
                    class="w-full rounded-lg border border-surface-300 dark:border-surface-700 px-3 py-2 text-sm text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-800 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                    @change="onSalaryMinChange"
                  />
                </div>
                <div>
                  <label for="settings-salary-max" class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                    {{ t('dashboard.jobs.settings.fields.maximumSalary') }}
                  </label>
                  <input
                    id="settings-salary-max"
                    v-model.number="form.salaryMax"
                    type="number"
                    min="0"
                    :placeholder="t('dashboard.jobs.settings.fields.salaryMaxPlaceholder')"
                    class="w-full rounded-lg border border-surface-300 dark:border-surface-700 px-3 py-2 text-sm text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-800 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                    @change="onSalaryMaxChange"
                  />
                </div>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label for="settings-currency" class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                    {{ t('dashboard.jobs.settings.fields.currency') }}
                  </label>
                  <input
                    id="settings-currency"
                    v-model="form.salaryCurrency"
                    type="text"
                    maxlength="3"
                    :placeholder="t('dashboard.jobs.settings.fields.currencyPlaceholder')"
                    class="w-full rounded-lg border border-surface-300 dark:border-surface-700 px-3 py-2 text-sm text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-800 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors uppercase"
                  />
                </div>
                <div>
                  <label for="settings-salary-unit" class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                    {{ t('dashboard.jobs.settings.fields.payPeriod') }}
                  </label>
                  <select
                    id="settings-salary-unit"
                    v-model="form.salaryUnit"
                    class="w-full rounded-lg border border-surface-300 dark:border-surface-700 px-3 py-2 text-sm text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                  >
                    <option v-for="opt in salaryUnitOptions" :key="opt.value" :value="opt.value">
                      {{ opt.label }}
                    </option>
                  </select>
                </div>
              </div>
            </template>
          </div>
        </section>

        <!-- ═══════════════════════════════════════ -->
        <!-- SECTION: Application Options             -->
        <!-- ═══════════════════════════════════════ -->
        <section class="rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-6">
          <h2 class="text-base font-semibold text-surface-900 dark:text-surface-100 mb-1">{{ t('dashboard.jobs.settings.sections.applicationOptions') }}</h2>
          <p class="text-xs text-surface-400 dark:text-surface-500 mb-5">
            {{ t('dashboard.jobs.settings.fields.applicationOptionsHint') }}
          </p>
          <div class="space-y-3">
            <label class="flex items-center gap-3 cursor-pointer">
              <input
                v-model="form.requireResume"
                type="checkbox"
                class="size-4 rounded border-surface-300 dark:border-surface-600 text-brand-600 focus:ring-brand-500"
              />
              <div>
                <span class="text-sm font-medium text-surface-900 dark:text-surface-100">{{ t('dashboard.jobs.settings.fields.requireResume') }}</span>
                <p class="text-xs text-surface-400 dark:text-surface-500">{{ t('dashboard.jobs.settings.fields.requireResumeHint') }}</p>
              </div>
            </label>
            <label class="flex items-center gap-3 cursor-pointer">
              <input
                v-model="form.requireCoverLetter"
                type="checkbox"
                class="size-4 rounded border-surface-300 dark:border-surface-600 text-brand-600 focus:ring-brand-500"
              />
              <div>
                <span class="text-sm font-medium text-surface-900 dark:text-surface-100">{{ t('dashboard.jobs.settings.fields.requireCoverLetter') }}</span>
                <p class="text-xs text-surface-400 dark:text-surface-500">{{ t('dashboard.jobs.settings.fields.requireCoverLetterHint') }}</p>
              </div>
            </label>
            <label class="flex items-center gap-3 cursor-pointer">
              <input
                v-model="form.autoScoreOnApply"
                type="checkbox"
                class="size-4 rounded border-surface-300 dark:border-surface-600 text-brand-600 focus:ring-brand-500"
              />
              <div>
                <span class="text-sm font-medium text-surface-900 dark:text-surface-100">{{ t('dashboard.jobs.settings.fields.autoScoreOnApply') }}</span>
                <p class="text-xs text-surface-400 dark:text-surface-500">{{ t('dashboard.jobs.settings.fields.autoScoreOnApplyHint') }}</p>
              </div>
            </label>
          </div>
        </section>

        <!-- ═══════════════════════════════════════ -->
        <!-- SECTION: Listing Expiry                  -->
        <!-- ═══════════════════════════════════════ -->
        <section class="rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-6">
          <h2 class="text-base font-semibold text-surface-900 dark:text-surface-100 mb-1">{{ t('dashboard.jobs.settings.sections.listingExpiry') }}</h2>
          <p class="text-xs text-surface-400 dark:text-surface-500 mb-5">
            {{ t('dashboard.jobs.settings.fields.listingExpiryHint') }}
          </p>
          <div>
            <label for="settings-valid-through" class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
              {{ t('dashboard.jobs.settings.fields.validThrough') }}
            </label>
            <div class="flex items-center gap-2">
              <input
                id="settings-valid-through"
                v-model="form.validThrough"
                type="date"
                class="w-full sm:w-64 rounded-lg border border-surface-300 dark:border-surface-700 px-3 py-2 text-sm text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
              />
              <button
                v-if="form.validThrough"
                type="button"
                class="text-xs text-surface-400 hover:text-danger-500 dark:hover:text-danger-400 transition-colors underline shrink-0"
                @click="form.validThrough = ''"
              >
                {{ t('common.actions.clear') }}
              </button>
            </div>
            <p class="mt-1.5 text-xs text-surface-400 dark:text-surface-500">{{ t('dashboard.jobs.settings.fields.validThroughHint') }}</p>
          </div>
        </section>

        <!-- ═══════════════════════════════════════ -->
        <!-- SECTION: Application Link                -->
        <!-- ═══════════════════════════════════════ -->
        <section v-if="job.status === 'open'" class="rounded-xl border border-brand-200 dark:border-brand-800 bg-brand-50/50 dark:bg-brand-950/30 p-6">
          <div class="flex items-center gap-2 mb-2">
            <Link2 class="size-4 text-brand-600 dark:text-brand-400" />
            <h2 class="text-base font-semibold text-brand-700 dark:text-brand-300">{{ t('dashboard.jobs.settings.sections.applicationLink') }}</h2>
          </div>
          <p class="text-xs text-surface-600 dark:text-surface-400 mb-3">
            {{ t('dashboard.jobs.settings.fields.shareLinkHint') }}
          </p>
          <div class="flex items-center gap-2">
            <input
              type="text"
              readonly
              :value="applicationUrl"
              class="flex-1 rounded-lg border border-brand-200 dark:border-brand-800 bg-white dark:bg-surface-900 px-3 py-1.5 text-sm text-surface-700 dark:text-surface-300 select-all"
            />
            <button
              type="button"
              class="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
              @click="copyApplicationLink"
            >
              <ClipboardCopy class="size-3.5" />
              {{ linkCopied ? t('common.actions.copied') : t('common.actions.copy') }}
            </button>
          </div>
        </section>

        <!-- ═══════════════════════════════════════ -->
        <!-- Save button                              -->
        <!-- ═══════════════════════════════════════ -->
        <div class="flex items-center justify-between pt-2 pb-8">
          <button
            type="submit"
            :disabled="isSaving"
            class="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save class="size-4" />
            {{ saved ? t('common.actions.saved') : isSaving ? t('common.actions.saving') : t('common.actions.saveChanges') }}
          </button>
        </div>
      </form>

      <!-- ═══════════════════════════════════════ -->
      <!-- DANGER ZONE                              -->
      <!-- ═══════════════════════════════════════ -->
      <section class="rounded-xl border border-danger-200 dark:border-danger-800/60 bg-danger-50/50 dark:bg-danger-950/20 p-6 mb-12">
        <h2 class="text-base font-semibold text-danger-700 dark:text-danger-400 mb-1">{{ t('dashboard.jobs.settings.sections.dangerZone') }}</h2>
        <p class="text-xs text-surface-500 dark:text-surface-400 mb-4">
          {{ t('dashboard.jobs.settings.dangerZoneHint') }}
        </p>

        <div v-if="!showDeleteConfirm">
          <button
            type="button"
            class="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-danger-300 dark:border-danger-700 px-4 py-2 text-sm font-medium text-danger-700 dark:text-danger-400 hover:bg-danger-100 dark:hover:bg-danger-950/40 transition-colors"
            @click="showDeleteConfirm = true"
          >
            <Trash2 class="size-4" />
            {{ t('dashboard.jobs.settings.deleteJob') }}
          </button>
        </div>

        <div v-else class="rounded-lg border border-danger-300 dark:border-danger-700 bg-white dark:bg-surface-900 p-4">
          <p class="text-sm text-surface-700 dark:text-surface-300 mb-3">
            {{ t('dashboard.jobs.settings.deleteConfirm', { title: job.title }) }}
          </p>
          <div class="flex items-center gap-2">
            <button
              type="button"
              :disabled="isDeleting"
              class="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-danger-600 px-4 py-2 text-sm font-medium text-white hover:bg-danger-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              @click="handleDelete"
            >
              {{ isDeleting ? t('common.actions.deleting') : t('common.actions.yesDelete') }}
            </button>
            <button
              type="button"
              :disabled="isDeleting"
              class="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-surface-300 dark:border-surface-700 px-4 py-2 text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
              @click="showDeleteConfirm = false"
            >
              {{ t('common.cancel') }}
            </button>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>
