<script setup lang="ts">
import {
  ArrowLeft, Calendar, Clock, Video, Phone, Building2, Code2,
  FileText, UsersRound, CheckCircle2, XCircle, AlertTriangle,
  UserRound, Briefcase, Pencil, MapPin, Users, MessageSquare,
  Save, X, Mail, Send, CheckCheck, ChevronDown, ExternalLink,
  Check, AlertCircle,
} from 'lucide-vue-next'

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'require-org'],
})

const route = useRoute()
const interviewId = route.params.id as string
const { t, locale } = useI18n()
const { handlePreviewReadOnlyError } = usePreviewReadOnly()
const toast = useToast()
const { activeOrg } = useCurrentOrg()
const { track } = useTrack()
const { formatPersonName } = useOrgSettings()

const { interview, status: fetchStatus, error, updateInterview, deleteInterview, refresh } = useInterview(interviewId)

useSeoMeta({
  title: computed(() =>
    interview.value
      ? `${interview.value.title} — ${t('common.brand.name')}`
      : t('dashboard.interviews.detail.seoTitle'),
  ),
  robots: 'noindex, nofollow',
})

// ─── Status config ──────────────────────────────────────────────
type InterviewStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show'

const statusConfig = computed<Record<InterviewStatus, { label: string; icon: any; class: string; dot: string }>>(() => ({
  scheduled: {
    label: t('dashboard.interviews.shared.status.scheduled'),
    icon: Calendar,
    class: 'bg-brand-50 text-brand-700 ring-brand-200 dark:bg-brand-950/50 dark:text-brand-300 dark:ring-brand-800',
    dot: 'bg-brand-500',
  },
  completed: {
    label: t('dashboard.interviews.shared.status.completed'),
    icon: CheckCircle2,
    class: 'bg-success-50 text-success-700 ring-success-200 dark:bg-success-950/50 dark:text-success-300 dark:ring-success-800',
    dot: 'bg-success-500',
  },
  cancelled: {
    label: t('dashboard.interviews.shared.status.cancelled'),
    icon: XCircle,
    class: 'bg-surface-100 text-surface-500 ring-surface-200 dark:bg-surface-800/50 dark:text-surface-400 dark:ring-surface-700',
    dot: 'bg-surface-400',
  },
  no_show: {
    label: t('dashboard.interviews.shared.status.no_show'),
    icon: AlertTriangle,
    class: 'bg-danger-50 text-danger-700 ring-danger-200 dark:bg-danger-950/50 dark:text-danger-300 dark:ring-danger-800',
    dot: 'bg-danger-500',
  },
}))

type CandidateResponse = 'pending' | 'accepted' | 'declined' | 'tentative'

const candidateResponseConfig = computed<Record<CandidateResponse, { label: string; class: string; dot: string }>>(() => ({
  pending: {
    label: t('dashboard.interviews.shared.candidateResponse.pending'),
    class: 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-800',
    dot: 'bg-amber-500',
  },
  accepted: {
    label: t('dashboard.interviews.shared.candidateResponse.accepted'),
    class: 'bg-success-50 text-success-700 ring-success-200 dark:bg-success-950/50 dark:text-success-300 dark:ring-success-800',
    dot: 'bg-success-500',
  },
  declined: {
    label: t('dashboard.interviews.shared.candidateResponse.declined'),
    class: 'bg-danger-50 text-danger-700 ring-danger-200 dark:bg-danger-950/50 dark:text-danger-300 dark:ring-danger-800',
    dot: 'bg-danger-500',
  },
  tentative: {
    label: t('dashboard.interviews.shared.candidateResponse.tentative'),
    class: 'bg-warning-50 text-warning-800 ring-warning-200 dark:bg-warning-950/50 dark:text-warning-300 dark:ring-warning-800',
    dot: 'bg-warning-500',
  },
}))

const typeIcons: Record<string, any> = {
  video: Video,
  phone: Phone,
  in_person: Building2,
  technical: Code2,
  panel: UsersRound,
  take_home: FileText,
}

const typeLabels = computed<Record<string, string>>(() => ({
  video: t('dashboard.interviews.shared.types.video'),
  phone: t('dashboard.interviews.shared.types.phone'),
  in_person: t('dashboard.interviews.shared.types.in_person'),
  technical: t('dashboard.interviews.shared.types.technical'),
  panel: t('dashboard.interviews.shared.types.panel'),
  take_home: t('dashboard.interviews.shared.types.take_home'),
}))

const typeLabelsEmail = computed<Record<string, string>>(() => ({
  video: t('dashboard.interviews.shared.typeLabels.video'),
  phone: t('dashboard.interviews.shared.typeLabels.phone'),
  in_person: t('dashboard.interviews.shared.typeLabels.in_person'),
  technical: t('dashboard.interviews.shared.typeLabels.technical'),
  panel: t('dashboard.interviews.shared.typeLabels.panel'),
  take_home: t('dashboard.interviews.shared.typeLabels.take_home'),
}))

// ─── Status transitions (from shared single source of truth) ────
import { INTERVIEW_STATUS_TRANSITIONS } from '~~/shared/status-transitions'

const transitionClasses: Record<InterviewStatus, string> = {
  scheduled: 'border border-surface-300 dark:border-surface-700 bg-white/80 dark:bg-surface-900 text-surface-700 dark:text-surface-300 hover:border-surface-400 dark:hover:border-surface-600 hover:bg-surface-50 dark:hover:bg-surface-800',
  completed: 'bg-success-600 text-white shadow-sm shadow-success-900/20 hover:bg-success-700',
  cancelled: 'bg-surface-500 text-white shadow-sm shadow-surface-900/20 hover:bg-surface-600',
  no_show: 'bg-danger-600 text-white shadow-sm shadow-danger-900/20 hover:bg-danger-700',
}

const allowedTransitions = computed(() => {
  if (!interview.value) return [] as InterviewStatus[]
  return (INTERVIEW_STATUS_TRANSITIONS[interview.value.status] ?? []) as InterviewStatus[]
})

const isTransitioning = ref(false)

async function handleTransition(newStatus: InterviewStatus) {
  isTransitioning.value = true
  try {
    await updateInterview({ status: newStatus })
    track('interview_status_changed', {
      interview_id: interviewId,
      from_status: interview.value?.status,
      to_status: newStatus,
    })
  } catch (err: any) {
    if (handlePreviewReadOnlyError(err)) return
    toast.error(t('dashboard.interviews.detail.errors.updateStatusFailed'), { message: err.data?.statusMessage, statusCode: err.data?.statusCode })
  } finally {
    isTransitioning.value = false
  }
}

// ─── Display helpers ─────────────────────────────────────────────
function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString(locale.value, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(locale.value, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function isUpcoming(dateStr: string) {
  return new Date(dateStr) > new Date()
}

function getCandidateInitials(firstName?: string, lastName?: string) {
  const first = firstName?.trim().charAt(0) ?? ''
  const last = lastName?.trim().charAt(0) ?? ''
  return `${first}${last}`.toUpperCase() || 'C'
}

// ─── Notes editing ───────────────────────────────────────────────
const isEditingNotes = ref(false)
const notesInput = ref('')
const isSavingNotes = ref(false)

function startEditNotes() {
  notesInput.value = interview.value?.notes ?? ''
  isEditingNotes.value = true
}

async function saveNotes() {
  isSavingNotes.value = true
  try {
    await updateInterview({ notes: notesInput.value.trim() || null })
    isEditingNotes.value = false
  } catch (err: any) {
    if (handlePreviewReadOnlyError(err)) return
    toast.error(t('dashboard.interviews.detail.errors.saveNotesFailed'), { message: err.data?.statusMessage, statusCode: err.data?.statusCode })
  } finally {
    isSavingNotes.value = false
  }
}

// ─── Reschedule ──────────────────────────────────────────────────
const showReschedule = ref(false)
const rescheduleForm = reactive({
  date: '',
  time: '',
  duration: 60,
})
const isRescheduling = ref(false)
const rescheduleError = ref('')

function openReschedule() {
  if (!interview.value) return
  const d = new Date(interview.value.scheduledAt)
  rescheduleForm.date = d.toISOString().slice(0, 10)
  rescheduleForm.time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  rescheduleForm.duration = interview.value.duration
  rescheduleError.value = ''
  showReschedule.value = true
}

async function handleReschedule() {
  rescheduleError.value = ''
  if (!rescheduleForm.date || !rescheduleForm.time) {
    rescheduleError.value = t('dashboard.interviews.detail.errors.dateTimeRequired')
    return
  }

  isRescheduling.value = true
  try {
    const scheduledAt = new Date(`${rescheduleForm.date}T${rescheduleForm.time}`).toISOString()
    await updateInterview({
      scheduledAt,
      duration: rescheduleForm.duration,
      status: 'scheduled',
    })
    showReschedule.value = false
  } catch (err: any) {
    if (handlePreviewReadOnlyError(err)) return
    rescheduleError.value = err.data?.statusMessage ?? t('dashboard.interviews.detail.errors.rescheduleFailed')
  } finally {
    isRescheduling.value = false
  }
}

// ─── Edit details ────────────────────────────────────────────────
const showEditDetails = ref(false)
const editForm = reactive({
  title: '',
  type: 'video' as string,
  location: '',
  interviewers: [''] as string[],
})
const editErrors = ref<Record<string, string>>({})
const isSavingEdit = ref(false)

function openEditDetails() {
  if (!interview.value) return
  editForm.title = interview.value.title
  editForm.type = interview.value.type
  editForm.location = interview.value.location ?? ''
  editForm.interviewers = interview.value.interviewers?.length ? [...interview.value.interviewers] : ['']
  editErrors.value = {}
  showEditDetails.value = true
}

async function handleSaveDetails() {
  editErrors.value = {}
  if (!editForm.title.trim()) {
    editErrors.value.title = t('dashboard.interviews.detail.errors.titleRequired')
    return
  }

  isSavingEdit.value = true
  try {
    const filteredInterviewers = editForm.interviewers.filter(i => i.trim())
    await updateInterview({
      title: editForm.title.trim(),
      type: editForm.type as any,
      location: editForm.location.trim() || null,
      interviewers: filteredInterviewers.length > 0 ? filteredInterviewers : null,
    })
    showEditDetails.value = false
  } catch (err: any) {
    if (handlePreviewReadOnlyError(err)) return
    editErrors.value.submit = err.data?.statusMessage ?? t('dashboard.interviews.detail.errors.updateFailed')
  } finally {
    isSavingEdit.value = false
  }
}

// ─── Delete ──────────────────────────────────────────────────────
const router = useRouter()
const showDeleteConfirm = ref(false)
const isDeleting = ref(false)

async function handleDelete() {
  isDeleting.value = true
  try {
    await deleteInterview()
    await navigateTo(useLocalePath()('/dashboard/interviews'))
  } catch (err: any) {
    if (handlePreviewReadOnlyError(err)) return
    toast.error(t('dashboard.interviews.detail.errors.deleteFailed'), { message: err.data?.statusMessage, statusCode: err.data?.statusCode })
  } finally {
    isDeleting.value = false
  }
}

// ─── Email invitation (inline) ───────────────────────────────────
const showSendInvitation = ref(false)
const selectedTemplateId = ref<string>('system-standard')
const isSendingEmail = ref(false)
const sendEmailError = ref('')
const sendEmailSuccess = ref(false)
const showEmailPreview = ref(false)

const { templates: emailTemplates, sendInvitation } = useEmailTemplates()

const allTemplates = computed(() => [
  ...getSystemTemplates(locale.value).map(t => ({ ...t, isSystem: true as const })),
  ...(emailTemplates.value ?? []).map(t => ({ ...t, isSystem: false as const, description: '' })),
])

const selectedTemplate = computed(() =>
  allTemplates.value.find(t => t.id === selectedTemplateId.value),
)

const emailPreviewVariables = computed(() => {
  if (!interview.value) return {} as Record<string, string>
  return {
    candidateName: `${interview.value.candidateFirstName} ${interview.value.candidateLastName}`,
    candidateFirstName: interview.value.candidateFirstName,
    candidateLastName: interview.value.candidateLastName,
    candidateEmail: interview.value.candidateEmail,
    jobTitle: interview.value.jobTitle,
    interviewTitle: interview.value.title,
    interviewDate: new Date(interview.value.scheduledAt).toLocaleDateString(locale.value, {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    }),
    interviewTime: new Date(interview.value.scheduledAt).toLocaleTimeString(locale.value, {
      hour: 'numeric', minute: '2-digit',
    }),
    interviewDuration: String(interview.value.duration),
    interviewType: typeLabelsEmail.value[interview.value.type] ?? interview.value.type,
    interviewLocation: interview.value.location ?? t('dashboard.interviews.shared.toBeConfirmed'),
    interviewers: interview.value.interviewers?.join(', ') ?? t('dashboard.interviews.shared.toBeConfirmed'),
    organizationName: activeOrg.value?.name ?? t('dashboard.interviews.shared.yourOrganization'),
  }
})

const emailPreviewSubject = computed(() =>
  selectedTemplate.value ? renderTemplatePreview(selectedTemplate.value.subject, emailPreviewVariables.value) : '',
)

const emailPreviewBody = computed(() =>
  selectedTemplate.value ? renderTemplatePreview(selectedTemplate.value.body, emailPreviewVariables.value) : '',
)

async function handleSendInvitation() {
  sendEmailError.value = ''
  isSendingEmail.value = true
  try {
    await sendInvitation(interviewId, { templateId: selectedTemplateId.value })
    sendEmailSuccess.value = true
    setTimeout(async () => {
      sendEmailSuccess.value = false
      showSendInvitation.value = false
      await refresh()
    }, 2000)
  } catch (err: any) {
    if (handlePreviewReadOnlyError(err)) return
    sendEmailError.value = err?.data?.statusMessage ?? err?.message ?? t('dashboard.interviews.detail.errors.sendInvitationFailed')
  } finally {
    isSendingEmail.value = false
  }
}

const localePath = useLocalePath()
</script>

<template>
  <div class="mx-auto max-w-3xl px-6 py-8">
    <!-- Back link -->
    <NuxtLink
      :to="$localePath('/dashboard/interviews')"
      class="mb-4 inline-flex items-center gap-1 rounded-full border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 px-3 py-1.5 text-sm text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
    >
      <ArrowLeft class="size-4" />
      {{ t('dashboard.interviews.detail.backToInterviews') }}
    </NuxtLink>

    <!-- Loading -->
    <div v-if="fetchStatus === 'pending'" class="flex flex-col items-center justify-center py-20">
      <div class="size-8 rounded-full border-2 border-brand-200 border-t-brand-600 dark:border-brand-800 dark:border-t-brand-400 animate-spin" />
      <p class="mt-3 text-sm text-surface-400">{{ t('dashboard.interviews.detail.loading') }}</p>
    </div>

    <!-- Error -->
    <div
      v-else-if="error"
      class="rounded-xl border border-danger-200 bg-danger-50 p-5 text-sm text-danger-700 dark:border-danger-800/60 dark:bg-danger-950/40 dark:text-danger-300"
    >
      {{ (error as any).statusCode === 404 ? t('dashboard.interviews.detail.notFound') : t('dashboard.interviews.detail.loadFailed') }}
      <NuxtLink :to="$localePath('/dashboard/interviews')" class="underline ml-1">{{ t('dashboard.interviews.detail.backToInterviews') }}</NuxtLink>
    </div>

    <!-- Interview detail -->
    <template v-else-if="interview">
      <!-- Header card -->
      <div class="mb-4 rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-5">
        <div class="flex items-start justify-between gap-4">
          <div class="flex items-start gap-4 min-w-0">
            <div
              class="flex size-12 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
              :class="isUpcoming(interview.scheduledAt)
                ? 'bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-sm shadow-brand-500/20 dark:from-brand-500 dark:to-brand-700'
                : 'bg-surface-100 text-surface-500 dark:bg-surface-800 dark:text-surface-400'"
            >
              {{ getCandidateInitials(interview.candidateFirstName, interview.candidateLastName) }}
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2.5 flex-wrap">
                <h1 class="text-xl font-bold text-surface-900 dark:text-surface-50 truncate">
                  {{ interview.title }}
                </h1>
                <span
                  class="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ring-inset"
                  :class="statusConfig[interview.status as InterviewStatus]?.class"
                >
                  <span class="size-1.5 rounded-full" :class="statusConfig[interview.status as InterviewStatus]?.dot" />
                  {{ statusConfig[interview.status as InterviewStatus]?.label }}
                </span>
                <span
                  class="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ring-inset"
                  :class="candidateResponseConfig[interview.candidateResponse as CandidateResponse]?.class"
                >
                  <span class="size-1.5 rounded-full" :class="candidateResponseConfig[interview.candidateResponse as CandidateResponse]?.dot" />
                  {{ candidateResponseConfig[interview.candidateResponse as CandidateResponse]?.label }}
                </span>
              </div>
              <div class="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-sm text-surface-500 dark:text-surface-400">
                <NuxtLink
                  :to="$localePath(`/dashboard/candidates/${interview.candidateId}`)"
                  class="inline-flex items-center gap-1.5 hover:text-brand-600 dark:hover:text-brand-400 transition-colors group"
                >
                  <UserRound class="size-4" />
                  {{ formatPersonName(interview.candidateFirstName, interview.candidateLastName) }}
                  <ExternalLink class="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </NuxtLink>
                <NuxtLink
                  :to="$localePath(`/dashboard/jobs/${interview.jobId}`)"
                  class="inline-flex items-center gap-1.5 hover:text-brand-600 dark:hover:text-brand-400 transition-colors group"
                >
                  <Briefcase class="size-4" />
                  {{ interview.jobTitle }}
                  <ExternalLink class="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </NuxtLink>
              </div>
            </div>
          </div>
          <button
            class="cursor-pointer rounded-lg border border-surface-200 dark:border-surface-700 p-2 text-surface-400 hover:text-surface-600 hover:bg-surface-50 dark:hover:text-surface-300 dark:hover:bg-surface-800 transition-all"
            @click="openEditDetails"
          >
            <Pencil class="size-4" />
          </button>
        </div>
        <!-- Invitation status -->
        <div
          v-if="interview.invitationSentAt"
          class="mt-3 flex items-center gap-1.5 text-xs text-success-600 dark:text-success-400"
        >
          <CheckCheck class="size-3.5" />
          {{ t('dashboard.interviews.detail.invitationSent') }} <TimelineDateLink :date="interview.invitationSentAt" class="text-success-600 dark:text-success-400">{{ formatDate(interview.invitationSentAt) }}</TimelineDateLink>
        </div>
        <div
          v-if="interview.candidateRespondedAt"
          class="mt-2 flex items-center gap-1.5 text-xs text-surface-600 dark:text-surface-400"
        >
          <UserRound class="size-3.5" />
          {{ t('dashboard.interviews.detail.candidateRespondedAt') }} <TimelineDateLink :date="interview.candidateRespondedAt" class="text-surface-600 dark:text-surface-400">{{ formatDate(interview.candidateRespondedAt) }}</TimelineDateLink>
        </div>
        <!-- Google Calendar sync status -->
        <div
          v-if="interview.googleCalendarEventId"
          class="mt-2 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400"
        >
          <Calendar class="size-3.5" />
          <a
            v-if="interview.googleCalendarEventLink"
            :href="interview.googleCalendarEventLink"
            target="_blank"
            rel="noopener noreferrer"
            class="underline underline-offset-2 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
          >{{ t('dashboard.interviews.detail.openInGoogleCalendar') }}</a>
          <span v-else>{{ t('dashboard.interviews.detail.syncedToGoogleCalendar') }}</span>
        </div>
      </div>

      <!-- Quick actions -->
      <div
        v-if="allowedTransitions.length > 0"
        class="mb-6 rounded-xl border border-surface-200 dark:border-surface-800 bg-white/80 dark:bg-surface-900/70 p-3"
      >
        <div class="flex flex-wrap items-center gap-2">
          <span class="inline-flex items-center rounded-full bg-surface-100 dark:bg-surface-800 px-2.5 py-1 text-xs font-medium text-surface-600 dark:text-surface-400">{{ t('dashboard.interviews.detail.quickActions') }}</span>
          <button
            v-for="nextStatus in allowedTransitions"
            :key="nextStatus"
            :disabled="isTransitioning"
            class="inline-flex cursor-pointer items-center rounded-full px-3.5 py-1.5 text-sm font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:cursor-not-allowed disabled:opacity-50"
            :class="transitionClasses[nextStatus]"
            @click="handleTransition(nextStatus)"
          >
            <span
              class="mr-2 inline-flex size-1.5 rounded-full"
              :class="nextStatus === 'completed' ? 'bg-success-200' : nextStatus === 'cancelled' ? 'bg-surface-200' : nextStatus === 'no_show' ? 'bg-danger-200' : 'bg-brand-200'"
            />
            {{ nextStatus === 'scheduled' ? t('dashboard.interviews.detail.reschedule') : statusConfig[nextStatus]?.label }}
          </button>
          <button
            class="inline-flex cursor-pointer items-center rounded-full border border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-950/30 px-3.5 py-1.5 text-sm font-medium text-brand-700 dark:text-brand-300 hover:bg-brand-100 dark:hover:bg-brand-950/50 transition-all duration-150"
            @click="openReschedule"
          >
            <Calendar class="mr-1.5 size-3.5" />
            {{ t('dashboard.interviews.detail.rescheduleAction') }}
          </button>
          <button
            v-if="interview.status === 'scheduled'"
            class="inline-flex cursor-pointer items-center rounded-full border border-success-200 dark:border-success-800 bg-success-50 dark:bg-success-950/30 px-3.5 py-1.5 text-sm font-medium text-success-700 dark:text-success-300 hover:bg-success-100 dark:hover:bg-success-950/50 transition-all duration-150"
            @click="showSendInvitation = !showSendInvitation"
          >
            <Mail class="mr-1.5 size-3.5" />
            {{ interview.invitationSentAt ? t('dashboard.interviews.detail.resendInvitation') : t('dashboard.interviews.detail.sendInvitation') }}
            <ChevronDown class="ml-1 size-3 transition-transform" :class="showSendInvitation ? 'rotate-180' : ''" />
          </button>
        </div>
      </div>

      <!-- Send Invitation inline panel -->
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 -translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-2"
      >
        <div v-if="showSendInvitation" class="mb-6 rounded-xl border border-brand-200 dark:border-brand-800/60 bg-white dark:bg-surface-900 overflow-hidden shadow-sm">
          <!-- Success state -->
          <div v-if="sendEmailSuccess" class="flex flex-col items-center justify-center py-10 px-6">
            <div class="flex size-12 items-center justify-center rounded-full bg-success-100 dark:bg-success-950/40 mb-3">
              <Check class="size-6 text-success-600 dark:text-success-400" />
            </div>
            <h3 class="text-base font-semibold text-surface-900 dark:text-surface-100 mb-1">{{ t('dashboard.interviews.detail.invitationSentToast') }}</h3>
            <p class="text-sm text-surface-500 dark:text-surface-400">{{ t('dashboard.interviews.emailModal.sentTo', { email: interview.candidateEmail }) }}</p>
          </div>

          <template v-else>
            <!-- Panel header -->
            <div class="border-b border-brand-100 dark:border-brand-900/40 bg-brand-50/50 dark:bg-brand-950/20 px-5 py-3.5">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2.5">
                  <div class="flex size-8 items-center justify-center rounded-lg bg-brand-100 dark:bg-brand-900/40">
                    <Mail class="size-4 text-brand-600 dark:text-brand-400" />
                  </div>
                  <div>
                    <h3 class="text-sm font-semibold text-surface-800 dark:text-surface-200">{{ t('dashboard.interviews.detail.sections.sendInvitation') }}</h3>
                    <p class="text-xs text-surface-500 dark:text-surface-400">to {{ interview.candidateEmail }}</p>
                  </div>
                </div>
                <button
                  class="cursor-pointer rounded-lg p-1.5 text-surface-400 hover:text-surface-600 hover:bg-surface-100 dark:hover:text-surface-300 dark:hover:bg-surface-800 transition-all"
                  @click="showSendInvitation = false"
                >
                  <X class="size-4" />
                </button>
              </div>
            </div>

            <!-- Error -->
            <div v-if="sendEmailError" class="mx-5 mt-4 flex items-start gap-2.5 rounded-xl border border-danger-200/80 bg-danger-50 p-3.5 text-sm text-danger-700 dark:border-danger-800/60 dark:bg-danger-950/40 dark:text-danger-300">
              <AlertCircle class="size-4 shrink-0 mt-0.5" />
              {{ sendEmailError }}
            </div>

            <!-- Template selection -->
            <div class="p-5">
              <div class="flex items-center justify-between mb-3">
                <p class="text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400">{{ t('dashboard.interviews.detail.sections.chooseTemplate') }}</p>
                <NuxtLink
                  :to="localePath('/dashboard/interviews/templates')"
                  class="inline-flex items-center gap-1 text-xs font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors no-underline"
                >
                  {{ t('dashboard.interviews.detail.sections.manageTemplates') }}
                  <ExternalLink class="size-3" />
                </NuxtLink>
              </div>

              <div class="grid gap-2 sm:grid-cols-2">
                <button
                  v-for="tmpl in allTemplates"
                  :key="tmpl.id"
                  type="button"
                  class="w-full text-left rounded-xl border-2 p-3.5 transition-all duration-150 cursor-pointer"
                  :class="selectedTemplateId === tmpl.id
                    ? 'border-brand-500 bg-brand-50/50 dark:border-brand-400 dark:bg-brand-950/20 shadow-sm'
                    : 'border-surface-200 dark:border-surface-700/80 hover:border-surface-300 dark:hover:border-surface-600 hover:bg-surface-50 dark:hover:bg-surface-800/40'"
                  @click="selectedTemplateId = tmpl.id"
                >
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-sm font-semibold text-surface-800 dark:text-surface-200">{{ tmpl.name }}</span>
                    <span v-if="tmpl.isSystem" class="text-[10px] uppercase tracking-wider font-semibold text-surface-400 bg-surface-100 dark:bg-surface-800 px-1.5 py-0.5 rounded">
                      {{ t('dashboard.interviews.shared.builtIn') }}
                    </span>
                  </div>
                  <p class="text-xs text-surface-500 dark:text-surface-400 truncate">{{ tmpl.subject }}</p>
                </button>
              </div>

              <!-- Preview toggle -->
              <div v-if="selectedTemplate" class="mt-4">
                <button
                  type="button"
                  class="flex items-center gap-1.5 text-sm font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors cursor-pointer"
                  @click="showEmailPreview = !showEmailPreview"
                >
                  <component :is="showEmailPreview ? X : Mail" class="size-3.5" />
                  {{ showEmailPreview ? t('dashboard.interviews.detail.sections.hidePreview') : t('dashboard.interviews.detail.sections.previewEmail') }}
                </button>
                <Transition
                  enter-active-class="transition duration-200 ease-out"
                  enter-from-class="opacity-0 -translate-y-1"
                  enter-to-class="opacity-100 translate-y-0"
                  leave-active-class="transition duration-100 ease-in"
                  leave-from-class="opacity-100"
                  leave-to-class="opacity-0"
                >
                  <div v-if="showEmailPreview" class="mt-3 rounded-xl border border-surface-200 dark:border-surface-700/80 bg-surface-50 dark:bg-surface-800/40 p-4">
                    <div class="mb-3">
                      <span class="text-[10px] uppercase tracking-wider font-semibold text-surface-400">{{ t('dashboard.interviews.detail.sections.subject') }}</span>
                      <p class="text-sm font-semibold text-surface-800 dark:text-surface-200">{{ emailPreviewSubject }}</p>
                    </div>
                    <div class="border-t border-surface-200 dark:border-surface-700 pt-3">
                      <span class="text-[10px] uppercase tracking-wider font-semibold text-surface-400">{{ t('dashboard.interviews.detail.sections.body') }}</span>
                      <p class="text-sm text-surface-700 dark:text-surface-300 whitespace-pre-wrap mt-1 leading-relaxed">{{ emailPreviewBody }}</p>
                    </div>
                  </div>
                </Transition>
              </div>
            </div>

            <!-- Send button -->
            <div class="border-t border-surface-100 dark:border-surface-800 bg-surface-50/80 dark:bg-surface-950/40 px-5 py-4">
              <div class="flex items-center gap-3">
                <button
                  type="button"
                  class="flex-1 rounded-xl border border-surface-200 dark:border-surface-700 px-4 py-2.5 text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-800 transition-all cursor-pointer"
                  @click="showSendInvitation = false"
                >
                  {{ t('common.cancel') }}
                </button>
                <button
                  type="button"
                  :disabled="!selectedTemplateId || isSendingEmail"
                  class="flex-1 flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer shadow-sm shadow-brand-500/20"
                  @click="handleSendInvitation"
                >
                  <Send class="size-4" />
                  {{ isSendingEmail ? t('dashboard.interviews.emailModal.sending') : t('dashboard.interviews.emailModal.sendInvitation') }}
                </button>
              </div>
            </div>
          </template>
        </div>
      </Transition>

      <!-- Detail cards -->
      <div class="grid gap-4 md:grid-cols-2">
        <!-- Schedule info -->
        <div class="rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-5">
          <div class="flex items-center gap-2 mb-3">
            <Calendar class="size-4 text-surface-500 dark:text-surface-400" />
            <h2 class="text-sm font-semibold text-surface-700 dark:text-surface-200">{{ t('dashboard.interviews.detail.sections.schedule') }}</h2>
          </div>
          <dl class="grid grid-cols-1 gap-3 text-sm">
            <div>
              <dt class="text-surface-400">{{ t('dashboard.interviews.detail.sections.dateTime') }}</dt>
              <dd class="text-surface-700 dark:text-surface-200 font-medium">
                <TimelineDateLink :date="interview.scheduledAt">{{ formatDateTime(interview.scheduledAt) }}</TimelineDateLink>
              </dd>
            </div>
            <div>
              <dt class="text-surface-400">{{ t('dashboard.interviews.detail.sections.duration') }}</dt>
              <dd class="text-surface-700 dark:text-surface-200 font-medium">{{ t('dashboard.jobs.shared.minutes', { count: interview.duration }) }}</dd>
            </div>
            <div>
              <dt class="text-surface-400">{{ t('dashboard.interviews.detail.sections.type') }}</dt>
              <dd class="inline-flex items-center gap-1.5 text-surface-700 dark:text-surface-200 font-medium">
                <component :is="typeIcons[interview.type] || Video" class="size-4 text-surface-400" />
                {{ typeLabels[interview.type] ?? interview.type }}
              </dd>
            </div>
            <div v-if="interview.location">
              <dt class="text-surface-400">{{ t('dashboard.interviews.detail.sections.locationLink') }}</dt>
              <dd class="text-surface-700 dark:text-surface-200 font-medium break-all">{{ interview.location }}</dd>
            </div>
            <div v-if="interview.googleCalendarEventId">
              <dt class="text-surface-400">{{ t('dashboard.interviews.detail.sections.calendar') }}</dt>
              <dd>
                <a
                  v-if="interview.googleCalendarEventLink"
                  :href="interview.googleCalendarEventLink"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 transition-colors"
                >
                  <CheckCircle2 class="size-3.5" />
                  {{ t('dashboard.interviews.detail.openInGoogleCalendar') }}
                  <ExternalLink class="size-3" />
                </a>
                <span v-else class="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 class="size-3.5" />
                  {{ t('dashboard.interviews.detail.syncedToGoogleCalendar') }}
                </span>
              </dd>
            </div>
          </dl>
        </div>

        <!-- Candidate info -->
        <div class="rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-5">
          <div class="flex items-center justify-between gap-2 mb-3">
            <div class="flex items-center gap-2">
              <UserRound class="size-4 text-surface-500 dark:text-surface-400" />
              <h2 class="text-sm font-semibold text-surface-700 dark:text-surface-200">{{ t('dashboard.interviews.detail.sections.candidate') }}</h2>
            </div>
            <NuxtLink
              :to="$localePath(`/dashboard/candidates/${interview.candidateId}`)"
              class="inline-flex items-center gap-1 text-xs font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors"
            >
              {{ t('dashboard.interviews.detail.sections.viewProfile') }}
              <ExternalLink class="size-3" />
            </NuxtLink>
          </div>
          <dl class="grid grid-cols-1 gap-3 text-sm">
            <div>
              <dt class="text-surface-400">{{ t('common.fields.name') }}</dt>
              <dd class="text-surface-700 dark:text-surface-200 font-medium">
                {{ formatPersonName(interview.candidateFirstName, interview.candidateLastName) }}
              </dd>
            </div>
            <div>
              <dt class="text-surface-400">{{ t('common.fields.email') }}</dt>
              <dd class="text-surface-700 dark:text-surface-200 font-medium">{{ interview.candidateEmail }}</dd>
            </div>
            <div v-if="interview.candidatePhone">
              <dt class="text-surface-400">{{ t('common.fields.phone') }}</dt>
              <dd class="text-surface-700 dark:text-surface-200 font-medium">{{ interview.candidatePhone }}</dd>
            </div>
            <div>
              <dt class="text-surface-400">{{ t('dashboard.topBar.job') }}</dt>
              <dd>
                <NuxtLink
                  :to="$localePath(`/dashboard/jobs/${interview.jobId}`)"
                  class="inline-flex items-center gap-1 font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors"
                >
                  {{ interview.jobTitle }}
                  <ExternalLink class="size-3" />
                </NuxtLink>
              </dd>
            </div>
          </dl>
        </div>

        <!-- Interviewers -->
        <div v-if="interview.interviewers?.length" class="rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-5 md:col-span-2">
          <div class="flex items-center gap-2 mb-3">
            <Users class="size-4 text-surface-500 dark:text-surface-400" />
            <h2 class="text-sm font-semibold text-surface-700 dark:text-surface-200">{{ t('dashboard.interviews.detail.sections.interviewers') }}</h2>
          </div>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="(interviewer, idx) in interview.interviewers"
              :key="idx"
              class="inline-flex items-center gap-1.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 px-3 py-1.5 text-sm text-surface-700 dark:text-surface-300"
            >
              <UserRound class="size-3.5 text-surface-400" />
              {{ interviewer }}
            </span>
          </div>
        </div>

        <!-- Timestamps -->
        <div class="rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-5 md:col-span-2">
          <dl class="flex flex-wrap gap-x-8 gap-y-2 text-sm">
            <div>
              <dt class="text-surface-400 inline-flex items-center gap-1"><Clock class="size-3.5" /> {{ t('dashboard.interviews.detail.sections.created') }}</dt>
              <dd class="text-surface-700 dark:text-surface-200 font-medium"><TimelineDateLink :date="interview.createdAt">{{ formatDate(interview.createdAt) }}</TimelineDateLink></dd>
            </div>
            <div>
              <dt class="text-surface-400 inline-flex items-center gap-1"><Clock class="size-3.5" /> {{ t('dashboard.interviews.detail.sections.updated') }}</dt>
              <dd class="text-surface-700 dark:text-surface-200 font-medium"><TimelineDateLink :date="interview.updatedAt">{{ formatDate(interview.updatedAt) }}</TimelineDateLink></dd>
            </div>
          </dl>
        </div>
      </div>

      <!-- Notes -->
      <div class="mt-4 rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-5 mb-4">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <MessageSquare class="size-4 text-surface-500 dark:text-surface-400" />
            <h2 class="text-sm font-semibold text-surface-700 dark:text-surface-200">{{ t('dashboard.interviews.detail.sections.notes') }}</h2>
          </div>
          <button
            v-if="!isEditingNotes"
            class="cursor-pointer text-xs text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 font-medium transition-colors"
            @click="startEditNotes"
          >
            {{ interview.notes ? t('common.actions.edit') : t('dashboard.interviews.detail.sections.addNotes') }}
          </button>
        </div>

        <div v-if="isEditingNotes">
          <textarea
            v-model="notesInput"
            rows="5"
            :placeholder="t('dashboard.interviews.edit.notesPlaceholder')"
            class="w-full rounded-lg border border-surface-300 dark:border-surface-700 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-100 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors resize-none"
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
          v-else-if="interview.notes"
          class="text-sm text-surface-600 dark:text-surface-300 whitespace-pre-wrap"
        >
          {{ interview.notes }}
        </p>
        <p v-else class="text-sm text-surface-400 italic">{{ t('dashboard.interviews.detail.sections.noNotes') }}</p>
      </div>

      <!-- Danger zone -->
      <div class="rounded-xl border border-danger-200/60 dark:border-danger-900/40 bg-danger-50/30 dark:bg-danger-950/20 p-5">
        <h3 class="text-sm font-semibold text-danger-700 dark:text-danger-400 mb-1">{{ t('dashboard.interviews.detail.sections.dangerZone') }}</h3>
        <p class="text-xs text-danger-600/80 dark:text-danger-400/60 mb-3">{{ t('dashboard.interviews.edit.deleteConfirm') }}</p>
        <button
          class="cursor-pointer rounded-lg bg-danger-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-danger-700 transition-colors"
          @click="showDeleteConfirm = true"
        >
          {{ t('dashboard.interviews.detail.sections.deleteInterview') }}
        </button>
      </div>
    </template>

    <!-- Reschedule Modal -->
    <Teleport to="body">
      <div v-if="showReschedule" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="showReschedule = false" />
        <div class="relative bg-white dark:bg-surface-900 rounded-2xl shadow-2xl shadow-surface-900/10 dark:shadow-black/30 ring-1 ring-surface-200/80 dark:ring-surface-700/60 p-6 max-w-md w-full mx-4">
          <h3 class="text-lg font-semibold text-surface-900 dark:text-surface-100 mb-4">{{ t('dashboard.interviews.detail.sections.rescheduleInterview') }}</h3>

          <div v-if="rescheduleError" class="mb-4 rounded-lg border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700 dark:border-danger-800 dark:bg-danger-950/40 dark:text-danger-300">
            {{ rescheduleError }}
          </div>

          <form class="space-y-4" @submit.prevent="handleReschedule">
            <div>
              <label for="reschedule-date" class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                {{ t('dashboard.interviews.edit.date') }} <span class="text-danger-500">*</span>
              </label>
              <input
                id="reschedule-date"
                v-model="rescheduleForm.date"
                type="date"
                class="w-full rounded-lg border border-surface-300 dark:border-surface-700 px-3 py-2 text-sm text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-800 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
              />
            </div>
            <div>
              <label for="reschedule-time" class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                {{ t('dashboard.interviews.edit.time') }} <span class="text-danger-500">*</span>
              </label>
              <input
                id="reschedule-time"
                v-model="rescheduleForm.time"
                type="time"
                class="w-full rounded-lg border border-surface-300 dark:border-surface-700 px-3 py-2 text-sm text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-800 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
              />
            </div>
            <div>
              <label for="reschedule-duration" class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">{{ t('dashboard.interviews.edit.durationMinutes') }}</label>
              <input
                id="reschedule-duration"
                v-model.number="rescheduleForm.duration"
                type="number"
                min="5"
                max="480"
                class="w-full rounded-lg border border-surface-300 dark:border-surface-700 px-3 py-2 text-sm text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-800 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
              />
            </div>

            <div class="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                class="cursor-pointer rounded-lg border border-surface-300 dark:border-surface-700 px-4 py-2 text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
                @click="showReschedule = false"
              >
                {{ t('common.cancel') }}
              </button>
              <button
                type="submit"
                :disabled="isRescheduling"
                class="cursor-pointer rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {{ isRescheduling ? t('common.actions.saving') : t('dashboard.interviews.detail.rescheduleAction') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Edit Details Modal -->
    <Teleport to="body">
      <div v-if="showEditDetails" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="showEditDetails = false" />
        <div class="relative bg-white dark:bg-surface-900 rounded-2xl shadow-2xl shadow-surface-900/10 dark:shadow-black/30 ring-1 ring-surface-200/80 dark:ring-surface-700/60 p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
          <h3 class="text-lg font-semibold text-surface-900 dark:text-surface-100 mb-5">{{ t('dashboard.interviews.detail.sections.editDetails') }}</h3>

          <div v-if="editErrors.submit" class="mb-4 rounded-lg border border-danger-200 bg-danger-50 p-3 text-sm text-danger-700 dark:border-danger-800 dark:bg-danger-950/40 dark:text-danger-300">
            {{ editErrors.submit }}
          </div>

          <form class="space-y-4" @submit.prevent="handleSaveDetails">
            <div>
              <label for="edit-title" class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                {{ t('dashboard.interviews.edit.fieldTitle') }} <span class="text-danger-500">*</span>
              </label>
              <input
                id="edit-title"
                v-model="editForm.title"
                type="text"
                class="w-full rounded-lg border px-3 py-2 text-sm text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                :class="editErrors.title ? 'border-danger-300' : 'border-surface-300 dark:border-surface-700'"
              />
              <p v-if="editErrors.title" class="mt-1 text-xs text-danger-600">{{ editErrors.title }}</p>
            </div>

            <div>
              <label for="edit-type" class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">{{ t('dashboard.interviews.edit.type') }}</label>
              <select
                id="edit-type"
                v-model="editForm.type"
                class="w-full rounded-lg border border-surface-300 dark:border-surface-700 px-3 py-2 text-sm text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-800 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
              >
                <option v-for="(label, key) in typeLabels" :key="key" :value="key">{{ label }}</option>
              </select>
            </div>

            <div>
              <label for="edit-location" class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">{{ t('dashboard.interviews.edit.locationLink') }}</label>
              <input
                id="edit-location"
                v-model="editForm.location"
                type="text"
                :placeholder="t('dashboard.interviews.edit.locationPlaceholder')"
                class="w-full rounded-lg border border-surface-300 dark:border-surface-700 px-3 py-2 text-sm text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-800 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">{{ t('dashboard.interviews.detail.sections.interviewers') }}</label>
              <div class="space-y-2">
                <div v-for="(_, idx) in editForm.interviewers" :key="idx" class="flex gap-2">
                  <input
                    v-model="editForm.interviewers[idx]"
                    type="text"
                    :placeholder="t('common.fields.name')"
                    class="flex-1 rounded-lg border border-surface-300 dark:border-surface-700 px-3 py-2 text-sm text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-800 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
                  />
                  <button
                    v-if="editForm.interviewers.length > 1"
                    type="button"
                    class="cursor-pointer rounded-lg border border-surface-300 dark:border-surface-700 p-2 text-surface-400 hover:text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-950/30 transition-colors"
                    @click="editForm.interviewers.splice(idx, 1)"
                  >
                    <X class="size-4" />
                  </button>
                </div>
                <button
                  v-if="editForm.interviewers.length < 20"
                  type="button"
                  class="cursor-pointer text-xs text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 font-medium transition-colors"
                  @click="editForm.interviewers.push('')"
                >
                  + {{ t('dashboard.interviews.detail.sections.addInterviewer') }}
                </button>
              </div>
            </div>

            <div class="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                class="cursor-pointer rounded-lg border border-surface-300 dark:border-surface-700 px-4 py-2 text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
                @click="showEditDetails = false"
              >
                {{ t('common.cancel') }}
              </button>
              <button
                type="submit"
                :disabled="isSavingEdit"
                class="cursor-pointer rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {{ isSavingEdit ? t('common.actions.saving') : t('common.actions.saveChanges') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Delete Confirm Modal -->
    <Teleport to="body">
      <div v-if="showDeleteConfirm" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="showDeleteConfirm = false" />
        <div class="relative bg-white dark:bg-surface-900 rounded-2xl shadow-2xl shadow-surface-900/10 dark:shadow-black/30 ring-1 ring-surface-200/80 dark:ring-surface-700/60 p-6 max-w-sm w-full mx-4">
          <h3 class="text-lg font-semibold text-surface-900 dark:text-surface-100 mb-2">{{ t('dashboard.interviews.edit.deleteInterview') }}</h3>
          <p class="text-sm text-surface-600 dark:text-surface-400 mb-4">
            {{ t('dashboard.interviews.edit.deleteConfirm') }}
            <strong v-if="interview?.title" class="block mt-1">{{ interview.title }}</strong>
          </p>
          <div class="flex justify-end gap-2">
            <button
              :disabled="isDeleting"
              class="cursor-pointer rounded-lg border border-surface-300 dark:border-surface-700 px-3 py-1.5 text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
              @click="showDeleteConfirm = false"
            >
              {{ t('common.cancel') }}
            </button>
            <button
              :disabled="isDeleting"
              class="cursor-pointer rounded-lg bg-danger-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-danger-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              @click="handleDelete"
            >
              {{ isDeleting ? t('common.actions.deleting') : t('common.actions.delete') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>
