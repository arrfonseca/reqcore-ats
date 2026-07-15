<script setup lang="ts">
const { tenantPath, platformPath } = useTenantPaths()
import { X, ExternalLink, User, Briefcase, Calendar, Clock, Hash, FileText, MessageSquare } from 'lucide-vue-next'
import { APPLICATION_STATUS_TRANSITIONS } from '~~/shared/status-transitions'
import { usePreviewReadOnly } from '~/composables/usePreviewReadOnly'

const props = defineProps<{
  applicationId: string
}>()

const emit = defineEmits<{
  close: []
}>()

const { t, locale } = useI18n()
const localePath = useLocalePath()
const { handlePreviewReadOnlyError } = usePreviewReadOnly()
const toast = useToast()

function formatLocaleDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(locale.value, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

const { application, status: fetchStatus, error, refresh, updateApplication } = useApplication(() => props.applicationId)
const { formatCandidateName } = useOrgSettings()

// ─── Status transitions ───────────────────────────────────────────────────────

const transitionLabels = computed<Record<string, string>>(() => ({
  new: t('dashboard.applications.drawer.transitions.new'),
  screening: t('dashboard.applications.drawer.transitions.screening'),
  interview: t('dashboard.applications.drawer.transitions.interview'),
  offer: t('dashboard.applications.drawer.transitions.offer'),
  hired: t('dashboard.applications.drawer.transitions.hired'),
  rejected: t('dashboard.applications.drawer.transitions.rejected'),
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

// ─── Notes editing ────────────────────────────────────────────────────────────

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

// ─── Display helpers ──────────────────────────────────────────────────────────

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
  if (typeof value === 'boolean') return value ? t('dashboard.applications.drawer.yes') : t('dashboard.applications.drawer.no')
  return String(value ?? '—')
}

// ─── Body scroll lock + keyboard handling ─────────────────────────────────────

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
  document.body.style.overflow = 'hidden'
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <!-- Backdrop -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        class="fixed inset-0 z-[55] bg-surface-900/40"
        @click="emit('close')"
      />
    </Transition>

    <!-- Panel -->
    <Transition
      enter-active-class="transition-transform duration-300 ease-out"
      leave-active-class="transition-transform duration-200 ease-in"
      enter-from-class="translate-x-full"
      leave-to-class="translate-x-full"
    >
      <aside
        class="fixed inset-y-0 right-0 z-[60] w-full max-w-2xl flex flex-col bg-white dark:bg-surface-900 shadow-2xl border-l border-surface-200 dark:border-surface-800"
        role="dialog"
        aria-modal="true"
        :aria-label="t('dashboard.applications.drawer.heading')"
      >
        <!-- Header -->
        <header class="flex items-center justify-between gap-3 px-5 py-4 border-b border-surface-200 dark:border-surface-800 shrink-0">
          <span class="text-sm font-semibold text-surface-900 dark:text-surface-100 truncate">{{ t('dashboard.applications.drawer.heading') }}</span>
          <div class="flex items-center gap-2 shrink-0">
            <NuxtLink
              :to="tenantPath(`applications/${applicationId}`)"
              class="inline-flex items-center gap-1.5 rounded-lg border border-surface-300 dark:border-surface-700 px-3 py-1.5 text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
            >
              <ExternalLink class="size-3.5" />
              {{ t('dashboard.applications.drawer.openFullPage') }}
            </NuxtLink>
            <button
              class="rounded-lg p-1.5 text-surface-500 hover:text-surface-700 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
              @click="emit('close')"
            >
              <X class="size-4" />
            </button>
          </div>
        </header>

        <!-- Scrollable body -->
        <div class="flex-1 overflow-y-auto p-5 space-y-4">
          <!-- Loading -->
          <div v-if="fetchStatus === 'pending'" class="text-center py-12 text-surface-400">
            {{ t('dashboard.applications.drawer.loading') }}
          </div>

          <!-- Error -->
          <div
            v-else-if="error"
            class="rounded-lg border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700"
          >
            {{ error.statusCode === 404 ? t('dashboard.applications.drawer.notFound') : t('dashboard.applications.drawer.loadFailed') }}
          </div>

          <template v-else-if="application">
            <!-- Header card -->
            <div class="rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-5">
              <p class="mb-2 text-xs font-medium uppercase tracking-wide text-surface-500 dark:text-surface-400">
                {{ t('dashboard.applications.drawer.overview') }}
              </p>
              <div class="mb-2 flex flex-wrap items-center gap-2 text-surface-400">
                <h2 class="text-2xl font-bold text-surface-900 dark:text-surface-50 truncate">
                  {{ formatCandidateName(application.candidate) }}
                </h2>
                <span class="text-surface-400">→</span>
                <NuxtLink
                  :to="tenantPath(`jobs/${application.job.id}`)"
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
                  {{ t('dashboard.applications.drawer.applied') }} {{ formatLocaleDate(application.createdAt) }}
                </TimelineDateLink>
              </div>
            </div>

            <!-- Quick actions -->
            <div class="rounded-xl border border-surface-200 dark:border-surface-800 bg-white/80 dark:bg-surface-900/70 p-3">
              <div class="flex flex-wrap items-center gap-2">
                <span class="inline-flex items-center rounded-full bg-surface-100 dark:bg-surface-800 px-2.5 py-1 text-xs font-medium text-surface-600 dark:text-surface-400">{{ t('dashboard.applications.drawer.quickActions') }}</span>
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

            <!-- Candidate & Job cards -->
            <div class="grid gap-4 sm:grid-cols-2">
              <!-- Candidate info -->
              <div class="rounded-lg border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-5">
                <div class="flex items-center gap-2 mb-3">
                  <User class="size-4 text-surface-500 dark:text-surface-400" />
                  <h3 class="text-sm font-semibold text-surface-700 dark:text-surface-200">{{ t('dashboard.applications.drawer.candidate') }}</h3>
                </div>
                <dl class="grid grid-cols-1 gap-3 text-sm">
                  <div>
                    <dt class="text-surface-400">{{ t('dashboard.applications.drawer.name') }}</dt>
                    <dd class="text-surface-700 dark:text-surface-200 font-medium">
                      <NuxtLink
                        :to="tenantPath(`candidates/${application.candidate.id}`)"
                        class="text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 transition-colors"
                      >
                        {{ formatCandidateName(application.candidate) }}
                      </NuxtLink>
                    </dd>
                  </div>
                  <div>
                    <dt class="text-surface-400">{{ t('dashboard.applications.drawer.email') }}</dt>
                    <dd class="text-surface-700 dark:text-surface-200 font-medium">
                      <a
                        :href="`mailto:${application.candidate.email}`"
                        target="_blank"
                        class="hover:text-brand-600 dark:hover:text-brand-400 hover:underline cursor-pointer transition-colors"
                      >{{ application.candidate.email }}</a>
                    </dd>
                  </div>
                  <div v-if="application.candidate.phone">
                    <dt class="text-surface-400">{{ t('dashboard.applications.drawer.phone') }}</dt>
                    <dd class="text-surface-700 dark:text-surface-200 font-medium">{{ application.candidate.phone }}</dd>
                  </div>
                </dl>
              </div>

              <!-- Job info -->
              <div class="rounded-lg border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-5">
                <div class="flex items-center gap-2 mb-3">
                  <Briefcase class="size-4 text-surface-500 dark:text-surface-400" />
                  <h3 class="text-sm font-semibold text-surface-700 dark:text-surface-200">{{ t('dashboard.applications.drawer.job') }}</h3>
                </div>
                <dl class="grid grid-cols-1 gap-3 text-sm">
                  <div>
                    <dt class="text-surface-400">{{ t('dashboard.applications.drawer.title') }}</dt>
                    <dd class="text-surface-700 dark:text-surface-200 font-medium">
                      <NuxtLink
                        :to="tenantPath(`jobs/${application.job.id}`)"
                        class="text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 transition-colors"
                      >
                        {{ application.job.title }}
                      </NuxtLink>
                    </dd>
                  </div>
                  <div>
                    <dt class="text-surface-400">{{ t('dashboard.applications.drawer.jobStatus') }}</dt>
                    <dd class="text-surface-700 dark:text-surface-200 font-medium capitalize">{{ application.job.status }}</dd>
                  </div>
                </dl>
              </div>
            </div>

            <!-- Application details -->
            <div class="rounded-lg border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-5">
              <div class="flex items-center gap-2 mb-3">
                <Hash class="size-4 text-surface-500 dark:text-surface-400" />
                <h3 class="text-sm font-semibold text-surface-700 dark:text-surface-200">{{ t('dashboard.applications.drawer.details') }}</h3>
              </div>
              <dl class="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt class="text-surface-400">{{ t('dashboard.applications.drawer.score') }}</dt>
                  <dd class="text-surface-700 dark:text-surface-200 font-medium">{{ application.score ?? '—' }}</dd>
                </div>
                <div>
                  <dt class="text-surface-400">{{ t('dashboard.applications.drawer.status') }}</dt>
                  <dd class="text-surface-700 dark:text-surface-200 font-medium">{{ stageLabels[application.status as keyof typeof stageLabels] ?? application.status }}</dd>
                </div>
                <div>
                  <dt class="text-surface-400 inline-flex items-center gap-1">
                    <Calendar class="size-3.5" />
                    {{ t('dashboard.applications.drawer.applied') }}
                  </dt>
                  <dd class="text-surface-700 dark:text-surface-200 font-medium">
                    <TimelineDateLink :date="application.createdAt">{{ formatLocaleDate(application.createdAt) }}</TimelineDateLink>
                  </dd>
                </div>
                <div>
                  <dt class="text-surface-400 inline-flex items-center gap-1">
                    <Clock class="size-3.5" />
                    {{ t('dashboard.applications.drawer.updated') }}
                  </dt>
                  <dd class="text-surface-700 dark:text-surface-200 font-medium">
                    <TimelineDateLink :date="application.updatedAt">{{ formatLocaleDate(application.updatedAt) }}</TimelineDateLink>
                  </dd>
                </div>
              </dl>
            </div>

            <!-- Notes -->
            <div class="rounded-lg border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-5">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                  <MessageSquare class="size-4 text-surface-500 dark:text-surface-400" />
                  <h3 class="text-sm font-semibold text-surface-700 dark:text-surface-200">{{ t('dashboard.applications.drawer.notes') }}</h3>
                </div>
                <button
                  v-if="!isEditingNotes"
                  class="cursor-pointer text-xs text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 font-medium transition-colors"
                  @click="startEditNotes"
                >
                  {{ application.notes ? t('common.actions.edit') : t('dashboard.applications.drawer.addNotes') }}
                </button>
              </div>

              <div v-if="isEditingNotes">
                <textarea
                  v-model="notesInput"
                  rows="4"
                  :placeholder="t('dashboard.applications.drawer.notesPlaceholder')"
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
              <p v-else class="text-sm text-surface-400 italic">{{ t('dashboard.applications.drawer.noNotes') }}</p>
            </div>

            <!-- Properties -->
            <div class="rounded-lg border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-4">
              <h3 class="text-sm font-semibold text-surface-700 dark:text-surface-200 mb-2 px-2">{{ t('dashboard.applications.drawer.properties') }}</h3>
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
                <h3 class="text-sm font-semibold text-surface-700 dark:text-surface-200">
                  {{ t('dashboard.applications.detail.responsesCount', { count: application.responses.length }) }}
                </h3>
              </div>
              <div class="space-y-3">
                <div
                  v-for="response in application.responses"
                  :key="response.id"
                  class="border-b border-surface-100 dark:border-surface-800 pb-3 last:border-0 last:pb-0"
                >
                  <dt class="text-xs font-medium text-surface-500 dark:text-surface-400 mb-0.5">
                    {{ response.question?.label ?? t('dashboard.applications.drawer.unknownQuestion') }}
                  </dt>
                  <dd class="text-sm text-surface-700 dark:text-surface-200">
                    {{ formatResponseValue(response.value) }}
                  </dd>
                </div>
              </div>
            </div>
          </template>
        </div>
      </aside>
    </Transition>
  </Teleport>

  <!-- Schedule overlay teleports to body — must sit outside the drawer Teleport -->
  <InterviewScheduleSidebar
    v-if="showInterviewSidebar && application"
    :application-id="applicationId"
    :candidate-name="`${application.candidate.firstName} ${application.candidate.lastName}`"
    :job-title="application.job.title"
    @close="showInterviewSidebar = false"
    @scheduled="showInterviewSidebar = false"
  />
</template>
