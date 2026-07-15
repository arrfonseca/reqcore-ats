<script setup lang="ts">
const { tenantPath, publicJobPath } = useTenantPaths()
import { ArrowLeft, User, Briefcase, Calendar, Clock, Hash, FileText, MessageSquare } from 'lucide-vue-next'
import { usePreviewReadOnly } from '~/composables/usePreviewReadOnly'

const { t, locale } = useI18n()

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'require-org'],
})

const route = useRoute()
const applicationId = route.params.id as string
const { handlePreviewReadOnlyError } = usePreviewReadOnly()
const toast = useToast()

const { application, status: fetchStatus, error, refresh, updateApplication } = useApplication(applicationId)

const { formatCandidateName } = useOrgSettings()

useSeoMeta({
  title: computed(() =>
    application.value
      ? `${application.value.candidate.firstName} ${application.value.candidate.lastName} → ${application.value.job.title} — ${t('common.brand.name')}`
      : t('dashboard.applications.detail.seoTitle'),
  ),
})

function formatLocaleDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(locale.value, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// ─────────────────────────────────────────────
// Status transitions
// ─────────────────────────────────────────────
import { APPLICATION_STATUS_TRANSITIONS } from '~~/shared/status-transitions'

const transitionLabels = computed<Record<string, string>>(() => ({
  new: t('dashboard.applications.detail.transitions.new'),
  screening: t('dashboard.applications.detail.transitions.screening'),
  interview: t('dashboard.applications.detail.transitions.interview'),
  offer: t('dashboard.applications.detail.transitions.offer'),
  hired: t('dashboard.applications.detail.transitions.hired'),
  rejected: t('dashboard.applications.detail.transitions.rejected'),
}))

const stageLabels = computed(() => ({
  new: t('common.stages.new'),
  screening: t('common.stages.screening'),
  interview: t('common.stages.interview'),
  offer: t('common.stages.offer'),
  hired: t('common.stages.hired'),
  rejected: t('common.stages.rejected'),
}))

const transitionClasses: Record<string, string> = {
  new: 'border border-surface-300 dark:border-surface-700 bg-white/80 dark:bg-surface-900 text-surface-700 dark:text-surface-300 hover:border-surface-400 dark:hover:border-surface-600 hover:bg-surface-50 dark:hover:bg-surface-800',
  screening: 'bg-violet-600 text-white shadow-sm shadow-violet-900/20 hover:bg-violet-700',
  interview: 'bg-amber-600 text-white shadow-sm shadow-amber-900/20 hover:bg-amber-700',
  offer: 'bg-teal-600 text-white shadow-sm shadow-teal-900/20 hover:bg-teal-700',
  hired: 'bg-green-700 text-white shadow-sm shadow-green-900/30 hover:bg-green-800',
  rejected: 'bg-danger-600 text-white shadow-sm shadow-danger-900/20 hover:bg-danger-700',
}

const transitionDotClasses: Record<string, string> = {
  new: 'bg-surface-400 dark:bg-surface-500',
  screening: 'bg-violet-200',
  interview: 'bg-amber-200',
  offer: 'bg-teal-200',
  hired: 'bg-green-100',
  rejected: 'bg-danger-200',
}

const allowedTransitions = computed(() => {
  if (!application.value) return []
  return APPLICATION_STATUS_TRANSITIONS[application.value.status] ?? []
})

const isTransitioning = ref(false)
const showInterviewSidebar = ref(false)

async function handleTransition(newStatus: string) {
  isTransitioning.value = true
  try {
    await updateApplication({ status: newStatus as any })
  } catch (err: any) {
    if (handlePreviewReadOnlyError(err)) return
    toast.error(t('dashboard.applications.detail.errors.updateStatusFailed'), { message: err.data?.statusMessage, statusCode: err.data?.statusCode })
  } finally {
    isTransitioning.value = false
  }
}

// ─────────────────────────────────────────────
// Notes editing
// ─────────────────────────────────────────────

const isEditingNotes = ref(false)
const notesInput = ref('')
const isSavingNotes = ref(false)

function startEditNotes() {
  notesInput.value = application.value?.notes ?? ''
  isEditingNotes.value = true
}

async function saveNotes() {
  isSavingNotes.value = true
  try {
    await updateApplication({ notes: notesInput.value || null })
    isEditingNotes.value = false
  } catch (err: any) {
    if (handlePreviewReadOnlyError(err)) return
    toast.error(t('dashboard.applications.detail.errors.saveNotesFailed'), { message: err.data?.statusMessage, statusCode: err.data?.statusCode })
  } finally {
    isSavingNotes.value = false
  }
}

// ─────────────────────────────────────────────
// Display helpers
// ─────────────────────────────────────────────

const statusBadgeClasses: Record<string, string> = {
  new: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
  screening: 'bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-400',
  interview: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  offer: 'bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-400',
  hired: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400',
  rejected: 'bg-surface-100 text-surface-500 dark:bg-surface-800 dark:text-surface-400',
}

function formatResponseValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'boolean') return value ? t('dashboard.applications.detail.yes') : t('dashboard.applications.detail.no')
  return String(value ?? '—')
}
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <!-- Back link -->
    <NuxtLink
      :to="$tenantPath('applications')"
      class="mb-4 inline-flex items-center gap-1 rounded-full border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 px-3 py-1.5 text-sm text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
    >
      <ArrowLeft class="size-4" />
      {{ t('dashboard.applications.detail.backToApplications') }}
    </NuxtLink>

    <!-- Loading -->
    <div v-if="fetchStatus === 'pending'" class="text-center py-12 text-surface-400">
      {{ t('dashboard.applications.detail.loading') }}
    </div>

    <!-- Error / not found -->
    <div
      v-else-if="error"
      class="rounded-lg border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700"
    >
      {{ error.statusCode === 404 ? t('dashboard.applications.detail.notFound') : t('dashboard.applications.detail.loadFailed') }}
      <NuxtLink :to="$tenantPath('applications')" class="underline ml-1">{{ t('dashboard.applications.detail.backToApplications') }}</NuxtLink>
    </div>

    <!-- Application detail -->
    <template v-else-if="application">
      <!-- Header -->
      <div class="mb-4 rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-5">
        <p class="mb-2 text-xs font-medium uppercase tracking-wide text-surface-500 dark:text-surface-400">
          {{ t('dashboard.applications.detail.overview') }}
        </p>
        <div class="mb-2 flex flex-wrap items-center gap-2 text-surface-400">
          <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-50 truncate">
            {{ formatCandidateName(application.candidate) }}
          </h1>
          <span class="text-surface-400">→</span>
          <NuxtLink
            :to="$tenantPath(`jobs/${application.job.id}`)"
            class="text-xl text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 truncate transition-colors"
          >
            {{ application.job.title }}
          </NuxtLink>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <span
            class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
            :class="statusBadgeClasses[application.status] ?? 'bg-surface-100 text-surface-600'"
          >
            {{ stageLabels[application.status as keyof typeof stageLabels] ?? application.status }}
          </span>
          <TimelineDateLink :date="application.createdAt" class="text-sm text-surface-500 dark:text-surface-400">
            {{ t('dashboard.applications.detail.applied') }} {{ formatLocaleDate(application.createdAt) }}
          </TimelineDateLink>
        </div>
      </div>

      <!-- Quick actions -->
      <div class="mb-6 rounded-xl border border-surface-200 dark:border-surface-800 bg-white/80 dark:bg-surface-900/70 p-3">
        <div class="flex flex-wrap items-center gap-2">
          <span class="inline-flex items-center rounded-full bg-surface-100 dark:bg-surface-800 px-2.5 py-1 text-xs font-medium text-surface-600 dark:text-surface-400">{{ t('dashboard.applications.detail.quickActions') }}</span>
          <button
            v-for="nextStatus in allowedTransitions"
            :key="nextStatus"
            :disabled="isTransitioning"
            class="inline-flex cursor-pointer items-center rounded-full px-3.5 py-1.5 text-sm font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:cursor-not-allowed disabled:opacity-50"
            :class="transitionClasses[nextStatus] ?? 'border border-surface-300 dark:border-surface-700 bg-white/80 dark:bg-surface-900 text-surface-700 dark:text-surface-300 hover:border-surface-400 dark:hover:border-surface-600 hover:bg-surface-50 dark:hover:bg-surface-800'"
            @click="handleTransition(nextStatus)"
          >
            <span
              class="mr-2 inline-flex size-1.5 rounded-full"
              :class="transitionDotClasses[nextStatus] ?? 'bg-surface-400 dark:bg-surface-500'"
            />
            {{ transitionLabels[nextStatus] ?? nextStatus }}
          </button>
          <ScheduleInterviewButton
            :application-id="applicationId"
            variant="pill"
            @schedule="showInterviewSidebar = true"
          />
        </div>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <!-- Candidate info -->
        <div class="rounded-lg border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-5">
          <div class="flex items-center gap-2 mb-3">
            <User class="size-4 text-surface-500 dark:text-surface-400" />
            <h2 class="text-sm font-semibold text-surface-700 dark:text-surface-200">{{ t('dashboard.applications.detail.candidate') }}</h2>
          </div>
          <dl class="grid grid-cols-1 gap-3 text-sm">
            <div>
              <dt class="text-surface-400">{{ t('dashboard.applications.detail.name') }}</dt>
              <dd class="text-surface-700 dark:text-surface-200 font-medium">
                <NuxtLink
                  :to="$tenantPath(`candidates/${application.candidate.id}`)"
                  class="text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 transition-colors"
                >
                  {{ formatCandidateName(application.candidate) }}
                </NuxtLink>
              </dd>
            </div>
            <div>
              <dt class="text-surface-400">{{ t('dashboard.applications.detail.email') }}</dt>
              <dd class="text-surface-700 dark:text-surface-200 font-medium">
                <a
                  :href="`mailto:${application.candidate.email}`"
                  target="_blank"
                  class="hover:text-brand-600 dark:hover:text-brand-400 hover:underline cursor-pointer transition-colors"
                >{{ application.candidate.email }}</a>
              </dd>
            </div>
            <div v-if="application.candidate.phone">
              <dt class="text-surface-400">{{ t('dashboard.applications.detail.phone') }}</dt>
              <dd class="text-surface-700 dark:text-surface-200 font-medium">{{ application.candidate.phone }}</dd>
            </div>
          </dl>
        </div>

        <!-- Job info -->
        <div class="rounded-lg border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-5">
          <div class="flex items-center gap-2 mb-3">
            <Briefcase class="size-4 text-surface-500 dark:text-surface-400" />
            <h2 class="text-sm font-semibold text-surface-700 dark:text-surface-200">{{ t('dashboard.applications.detail.job') }}</h2>
          </div>
          <dl class="grid grid-cols-1 gap-3 text-sm">
            <div>
              <dt class="text-surface-400">{{ t('dashboard.applications.detail.title') }}</dt>
              <dd class="text-surface-700 dark:text-surface-200 font-medium">
                <NuxtLink
                  :to="$tenantPath(`jobs/${application.job.id}`)"
                  class="text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 transition-colors"
                >
                  {{ application.job.title }}
                </NuxtLink>
              </dd>
            </div>
            <div>
              <dt class="text-surface-400">{{ t('dashboard.applications.detail.jobStatus') }}</dt>
              <dd class="text-surface-700 dark:text-surface-200 font-medium capitalize">{{ application.job.status }}</dd>
            </div>
          </dl>
        </div>

        <!-- Application details -->
        <div class="rounded-lg border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-5 md:col-span-2">
          <div class="flex items-center gap-2 mb-3">
            <Hash class="size-4 text-surface-500 dark:text-surface-400" />
            <h2 class="text-sm font-semibold text-surface-700 dark:text-surface-200">{{ t('dashboard.applications.detail.details') }}</h2>
          </div>
          <dl class="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt class="text-surface-400">{{ t('dashboard.applications.detail.score') }}</dt>
              <dd class="text-surface-700 dark:text-surface-200 font-medium">{{ application.score ?? '—' }}</dd>
            </div>
            <div>
              <dt class="text-surface-400">{{ t('dashboard.applications.detail.status') }}</dt>
              <dd class="text-surface-700 dark:text-surface-200 font-medium">{{ stageLabels[application.status as keyof typeof stageLabels] ?? application.status }}</dd>
            </div>
            <div>
              <dt class="text-surface-400 inline-flex items-center gap-1">
                <Calendar class="size-3.5" />
                {{ t('dashboard.applications.detail.applied') }}
              </dt>
              <dd class="text-surface-700 dark:text-surface-200 font-medium">
                <TimelineDateLink :date="application.createdAt">{{ formatLocaleDate(application.createdAt) }}</TimelineDateLink>
              </dd>
            </div>
            <div>
              <dt class="text-surface-400 inline-flex items-center gap-1">
                <Clock class="size-3.5" />
                {{ t('dashboard.applications.detail.updated') }}
              </dt>
              <dd class="text-surface-700 dark:text-surface-200 font-medium">
                <TimelineDateLink :date="application.updatedAt">{{ formatLocaleDate(application.updatedAt) }}</TimelineDateLink>
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <!-- Notes -->
      <div class="mt-4 rounded-lg border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-5 mb-4">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <MessageSquare class="size-4 text-surface-500 dark:text-surface-400" />
            <h2 class="text-sm font-semibold text-surface-700 dark:text-surface-200">{{ t('dashboard.applications.detail.notes') }}</h2>
          </div>
          <button
            v-if="!isEditingNotes"
            class="cursor-pointer text-xs text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 font-medium transition-colors"
            @click="startEditNotes"
          >
            {{ application.notes ? t('common.actions.edit') : t('dashboard.applications.detail.addNotes') }}
          </button>
        </div>

        <div v-if="isEditingNotes">
          <textarea
            v-model="notesInput"
            rows="4"
            :placeholder="t('dashboard.applications.detail.notesPlaceholder')"
            class="w-full rounded-lg border border-surface-300 dark:border-surface-700 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-100 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
          />
          <div class="flex items-center gap-2 mt-2">
            <button
              :disabled="isSavingNotes"
              class="cursor-pointer rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              @click="saveNotes"
            >
              {{ isSavingNotes ? t('common.actions.saving') : t('common.save') }}
            </button>
            <button
              class="cursor-pointer rounded-lg border border-surface-300 dark:border-surface-600 px-3 py-1.5 text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
              @click="isEditingNotes = false"
            >
              {{ t('common.cancel') }}
            </button>
          </div>
        </div>

        <p
          v-else-if="application.notes"
          class="text-sm text-surface-600 dark:text-surface-300 whitespace-pre-wrap"
        >
          {{ application.notes }}
        </p>
        <p v-else class="text-sm text-surface-400 italic">{{ t('dashboard.applications.detail.noNotes') }}</p>
      </div>

      <!-- Custom properties (Notion-style) -->
      <div class="rounded-lg border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-4 mb-4">
        <h2 class="text-sm font-semibold text-surface-700 dark:text-surface-200 mb-2 px-2">{{ t('dashboard.applications.detail.properties') }}</h2>
        <PropertyBlock
          entity-type="application"
          :entity-id="applicationId"
          :job-id="application.job.id"
          :entries="(application.properties ?? []) as import('~~/shared/properties').PropertyEntry[]"
          @refresh="refresh()"
        />
      </div>

      <!-- Question Responses -->
      <div
        v-if="application.responses && application.responses.length > 0"
        class="rounded-lg border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-5"
      >
        <div class="flex items-center gap-2 mb-3">
          <FileText class="size-4 text-surface-500 dark:text-surface-400" />
          <h2 class="text-sm font-semibold text-surface-700 dark:text-surface-200">
            {{ t('dashboard.applications.detail.responsesCount', { count: application.responses.length }) }}
          </h2>
        </div>
        <div class="space-y-3">
          <div
            v-for="response in application.responses"
            :key="response.id"
            class="border-b border-surface-100 dark:border-surface-800 pb-3 last:border-0 last:pb-0"
          >
            <dt class="text-xs font-medium text-surface-500 dark:text-surface-400 mb-0.5">
              {{ response.question?.label ?? t('dashboard.applications.detail.unknownQuestion') }}
            </dt>
            <dd class="text-sm text-surface-700 dark:text-surface-200">
              {{ formatResponseValue(response.value) }}
            </dd>
          </div>
        </div>
      </div>
    </template>
  </div>

  <!-- Interview Schedule Sidebar -->
  <InterviewScheduleSidebar
    v-if="showInterviewSidebar && application"
    :application-id="applicationId"
    :candidate-name="`${application.candidate.firstName} ${application.candidate.lastName}`"
    :job-title="application.job.title"
    @close="showInterviewSidebar = false"
    @scheduled="showInterviewSidebar = false"
  />
</template>
