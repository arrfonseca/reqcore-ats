<script setup lang="ts">
import { ArrowLeft, Pencil, Trash2, Mail, Phone, Calendar, Clock, Briefcase, FileText, Plus, Upload, Download, Eye, X, AlertTriangle, Venus, Mars, MessageSquare, ExternalLink } from 'lucide-vue-next'
import { z } from 'zod'
import { usePreviewReadOnly } from '~/composables/usePreviewReadOnly'

const { t, locale } = useI18n()

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'require-org'],
})

const route = useRoute()
const candidateId = route.params.id as string
const { handlePreviewReadOnlyError } = usePreviewReadOnly()
const toast = useToast()

const { candidate, status: fetchStatus, error, refresh, updateCandidate, deleteCandidate } = useCandidate(candidateId)
const { formatCandidateName, formatDate } = useOrgSettings()

useSeoMeta({
  title: computed(() =>
    candidate.value
      ? `${candidate.value.firstName} ${candidate.value.lastName} — ${t('common.brand.name')}`
      : t('dashboard.candidates.detail.seoTitle'),
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
// Tabs
// ─────────────────────────────────────────────

const activeTab = ref<'applications' | 'documents'>('applications')

// ─────────────────────────────────────────────
// Edit mode
// ─────────────────────────────────────────────

const isEditing = ref(false)
const editForm = ref({
  firstName: '',
  lastName: '',
  displayName: '',
  email: '',
  phone: '',
  gender: '' as '' | 'male' | 'female' | 'other' | 'prefer_not_to_say',
  dateOfBirth: '',
})

function startEdit() {
  if (!candidate.value) return
  editForm.value = {
    firstName: candidate.value.firstName,
    lastName: candidate.value.lastName,
    displayName: candidate.value.displayName ?? '',
    email: candidate.value.email,
    phone: candidate.value.phone ?? '',
    gender: (candidate.value.gender as '' | 'male' | 'female' | 'other' | 'prefer_not_to_say') ?? '',
    dateOfBirth: candidate.value.dateOfBirth ?? '',
  }
  isEditing.value = true
}

function cancelEdit() {
  isEditing.value = false
  editErrors.value = {}
}

const editSchema = computed(() => z.object({
  firstName: z.string().min(1, t('dashboard.candidates.new.errors.firstNameRequired')).max(100),
  lastName: z.string().min(1, t('dashboard.candidates.new.errors.lastNameRequired')).max(100),
  displayName: z.string().max(200).optional(),
  email: z.string().min(1, t('dashboard.candidates.new.errors.emailRequired')).email(t('dashboard.candidates.new.errors.invalidEmail')).max(255),
  phone: z.string().max(50).optional(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, t('dashboard.candidates.new.errors.dateFormat'))
    .refine((v) => {
      const d = new Date(v)
      return !isNaN(d.getTime()) && d.getFullYear() >= 1900 && d <= new Date()
    }, t('dashboard.candidates.new.errors.pastDate'))
    .optional(),
}))

const isSaving = ref(false)
const editErrors = ref<Record<string, string>>({})

async function handleSave() {
  const result = editSchema.value.safeParse({
    ...editForm.value,
    gender: editForm.value.gender || undefined,
    dateOfBirth: editForm.value.dateOfBirth || undefined,
    displayName: editForm.value.displayName || undefined,
  })
  if (!result.success) {
    editErrors.value = {}
    for (const issue of result.error.issues) {
      const field = issue.path[0]?.toString()
      if (field) editErrors.value[field] = issue.message
    }
    return
  }
  editErrors.value = {}

  isSaving.value = true
  try {
    await updateCandidate({
      firstName: editForm.value.firstName,
      lastName: editForm.value.lastName,
      displayName: editForm.value.displayName || null,
      email: editForm.value.email,
      phone: editForm.value.phone || null,
      gender: (editForm.value.gender as 'male' | 'female' | 'other' | 'prefer_not_to_say') || null,
      dateOfBirth: editForm.value.dateOfBirth || null,
    })
    isEditing.value = false
  } catch (err: any) {
    if (handlePreviewReadOnlyError(err)) return
    const message = err.data?.statusMessage ?? t('dashboard.candidates.detail.errors.saveFailed')
    if (err.statusCode === 409 || err.data?.statusCode === 409) {
      editErrors.value.email = message
    } else {
      toast.error(message, { message, statusCode: err.statusCode ?? err.data?.statusCode })
    }
  } finally {
    isSaving.value = false
  }
}

// ─────────────────────────────────────────────
// Delete
// ─────────────────────────────────────────────

const isDeleting = ref(false)
const showDeleteConfirm = ref(false)

async function handleDelete() {
  isDeleting.value = true
  try {
    await deleteCandidate()
  } catch (err: any) {
    if (handlePreviewReadOnlyError(err)) return
    toast.error(t('dashboard.candidates.detail.errors.deleteFailed'), { message: err.data?.statusMessage, statusCode: err.data?.statusCode })
    isDeleting.value = false
    showDeleteConfirm.value = false
  }
}

// ─────────────────────────────────────────────
// Display helpers
// ─────────────────────────────────────────────

const applicationStatusClasses: Record<string, string> = {
  new: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
  screening: 'bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-400',
  interview: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  offer: 'bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-400',
  hired: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400',
  rejected: 'bg-surface-100 text-surface-500 dark:bg-surface-800 dark:text-surface-400',
}

const genderLabels = computed(() => ({
  male: t('dashboard.candidates.shared.gender.male'),
  female: t('dashboard.candidates.shared.gender.female'),
  other: t('dashboard.candidates.shared.gender.other'),
  prefer_not_to_say: t('dashboard.candidates.shared.gender.prefer_not_to_say'),
}))

const documentTypeLabels = computed(() => ({
  resume: t('dashboard.candidates.shared.documentTypes.resume'),
  cover_letter: t('dashboard.candidates.shared.documentTypes.cover_letter'),
  other: t('dashboard.candidates.shared.documentTypes.other'),
}))

const stageLabels = computed(() => ({
  new: t('common.stages.new'),
  screening: t('common.stages.screening'),
  interview: t('common.stages.interview'),
  offer: t('common.stages.offer'),
  hired: t('common.stages.hired'),
  rejected: t('common.stages.rejected'),
}))

// ─────────────────────────────────────────────
// Apply to job modal
// ─────────────────────────────────────────────

const showApplyModal = ref(false)

function handleApplied() {
  showApplyModal.value = false
  refresh()
}

// ─────────────────────────────────────────────
// Interview scheduling
// ─────────────────────────────────────────────

const showInterviewSidebar = ref(false)
const interviewTargetApp = ref<{ id: string; jobTitle: string } | null>(null)

function openScheduleInterview(app: { id: string; job: { title: string } }) {
  interviewTargetApp.value = { id: app.id, jobTitle: app.job.title }
  showInterviewSidebar.value = true
}

// ─────────────────────────────────────────────
// Quick notes
// ─────────────────────────────────────────────

const isEditingQuickNotes = ref(false)
const quickNotesInput = ref('')
const isSavingQuickNotes = ref(false)

function startEditQuickNotes() {
  quickNotesInput.value = candidate.value?.quickNotes ?? ''
  isEditingQuickNotes.value = true
}

async function saveQuickNotes() {
  if (isSavingQuickNotes.value) return
  isSavingQuickNotes.value = true
  try {
    await updateCandidate({ quickNotes: quickNotesInput.value || null })
    isEditingQuickNotes.value = false
  } catch (err: any) {
    if (handlePreviewReadOnlyError(err)) return
    toast.error(t('dashboard.candidates.detail.errors.saveFailed'), { message: err.data?.statusMessage, statusCode: err.data?.statusCode })
  } finally {
    isSavingQuickNotes.value = false
  }
}

// ─────────────────────────────────────────────
// Documents — upload, download, delete
// ─────────────────────────────────────────────

const { uploadDocument, downloadDocument, getPreviewUrl, deleteDocument } = useDocuments()

const fileInput = ref<HTMLInputElement | null>(null)
const selectedDocType = ref<'resume' | 'cover_letter' | 'other'>('resume')
const isUploading = ref(false)
const uploadError = ref<string | null>(null)
const showDocDeleteConfirm = ref<string | null>(null)
const isDeletingDoc = ref(false)

// Preview state
const showPreview = ref(false)
const previewUrl = ref<string | null>(null)
const previewFilename = ref('')
const previewMimeType = ref('')
const previewDocId = ref<string | null>(null)
const isLoadingPreview = ref(false)
const previewError = ref<string | null>(null)

/** Whether the current preview file is a PDF (renderable in iframe) */
const isPdfPreview = computed(() => previewMimeType.value === 'application/pdf')

async function handlePreview(docId: string, mimeType?: string) {
  // Only PDFs can be previewed inline — for DOC/DOCX, download directly
  if (mimeType && mimeType !== 'application/pdf') {
    await handleDownload(docId)
    return
  }

  previewError.value = null
  showPreview.value = true
  previewDocId.value = docId

  // Find the document name from the candidate data
  const doc = candidate.value?.documents?.find((d: any) => d.id === docId)
  previewFilename.value = doc?.originalFilename ?? t('dashboard.candidates.documents.preview')
  previewMimeType.value = doc?.mimeType ?? 'application/pdf'

  // Use the API endpoint URL directly — server streams the PDF (same-origin)
  previewUrl.value = getPreviewUrl(docId)
}

function closePreview() {
  showPreview.value = false
  previewUrl.value = null
  previewFilename.value = ''
  previewMimeType.value = ''
  previewDocId.value = null
  previewError.value = null
}

function triggerFileSelect() {
  fileInput.value?.click()
}

async function handleFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  uploadError.value = null
  isUploading.value = true

  try {
    await uploadDocument(candidateId, file, selectedDocType.value)
  } catch (err: any) {
    const msg = err.data?.statusMessage ?? err.statusMessage ?? t('dashboard.candidates.detail.errors.uploadFailed')
    uploadError.value = msg
  } finally {
    isUploading.value = false
    // Reset input so the same file can be re-selected
    input.value = ''
  }
}

async function handleDownload(docId: string) {
  try {
    await downloadDocument(docId)
  } catch {
    toast.error(t('dashboard.candidates.detail.errors.downloadFailed'))
  }
}

async function handleDeleteDoc(docId: string) {
  isDeletingDoc.value = true
  try {
    await deleteDocument(docId, candidateId)
    showDocDeleteConfirm.value = null
  } catch (err: any) {
    if (handlePreviewReadOnlyError(err)) return
    toast.error(t('dashboard.candidates.detail.errors.deleteDocumentFailed'), { message: err.data?.statusMessage, statusCode: err.data?.statusCode })
  } finally {
    isDeletingDoc.value = false
  }
}

/** Format bytes into a human-readable string */
function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
</script>

<template>
  <div class="mx-auto max-w-4xl">
    <!-- Back link -->
    <NuxtLink
      :to="$localePath('/dashboard/candidates')"
      class="inline-flex items-center gap-1 text-sm text-surface-500 hover:text-surface-700 mb-6 transition-colors"
    >
      <ArrowLeft class="size-4" />
      {{ t('dashboard.candidates.detail.backToCandidates') }}
    </NuxtLink>

    <!-- Loading -->
    <div v-if="fetchStatus === 'pending'" class="text-center py-12 text-surface-400">
      {{ t('dashboard.candidates.detail.loading') }}
    </div>

    <!-- Error / not found -->
    <div
      v-else-if="error"
      class="rounded-lg border border-danger-200 bg-danger-50 p-4 text-sm text-danger-700"
    >
      {{ error.statusCode === 404 ? t('dashboard.candidates.detail.notFound') : t('dashboard.candidates.detail.loadFailed') }}
      <NuxtLink :to="$localePath('/dashboard/candidates')" class="underline ml-1">{{ t('dashboard.candidates.detail.backToCandidates') }}</NuxtLink>
    </div>

    <!-- Candidate detail -->
    <template v-else-if="candidate">
      <!-- VIEW MODE -->
      <div v-if="!isEditing">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div class="min-w-0">
            <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-50 truncate mb-1">
              {{ formatCandidateName(candidate) }}
            </h1>
            <div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm text-surface-500">
              <a
                :href="`mailto:${candidate.email}`"
                target="_blank"
                class="inline-flex items-center gap-1 hover:text-brand-600 dark:hover:text-brand-400 hover:underline cursor-pointer transition-colors"
              >
                <Mail class="size-3.5" />
                {{ candidate.email }}
              </a>
              <span v-if="candidate.phone" class="inline-flex items-center gap-1">
                <Phone class="size-3.5" />
                {{ candidate.phone }}
              </span>
            </div>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <button
              class="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-surface-300 dark:border-surface-700 px-3 py-1.5 text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
              @click="startEdit"
            >
              <Pencil class="size-3.5" />
              {{ t('dashboard.candidates.detail.edit') }}
            </button>
            <button
              class="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-danger-300 dark:border-danger-700 px-3 py-1.5 text-sm font-medium text-danger-600 dark:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-950 transition-colors"
              @click="showDeleteConfirm = true"
            >
              <Trash2 class="size-3.5" />
              {{ t('dashboard.candidates.detail.delete') }}
            </button>
          </div>
        </div>

        <!-- Contact details -->
        <div class="rounded-lg border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-5 mb-4">
          <h2 class="text-sm font-semibold text-surface-700 dark:text-surface-200 mb-3">{{ t('dashboard.candidates.detail.details') }}</h2>
          <dl class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <dt class="text-surface-400">{{ t('dashboard.candidates.detail.email') }}</dt>
              <dd class="text-surface-700 dark:text-surface-200 font-medium">
                <a
                  :href="`mailto:${candidate.email}`"
                  target="_blank"
                  class="hover:text-brand-600 dark:hover:text-brand-400 hover:underline cursor-pointer transition-colors"
                >{{ candidate.email }}</a>
              </dd>
            </div>
            <div>
              <dt class="text-surface-400">{{ t('dashboard.candidates.detail.phone') }}</dt>
              <dd class="text-surface-700 dark:text-surface-200 font-medium">
                {{ candidate.phone || '—' }}
              </dd>
            </div>
            <div v-if="candidate.gender">
              <dt class="text-surface-400">{{ t('dashboard.candidates.detail.gender') }}</dt>
              <dd class="text-surface-700 dark:text-surface-200 font-medium">
                {{ genderLabels[candidate.gender] ?? candidate.gender }}
              </dd>
            </div>
            <div v-if="candidate.dateOfBirth">
              <dt class="text-surface-400">{{ t('dashboard.candidates.detail.dateOfBirth') }}</dt>
              <dd class="text-surface-700 dark:text-surface-200 font-medium">
                {{ formatDate(candidate.dateOfBirth) }}
              </dd>
            </div>
            <div v-if="candidate.displayName">
              <dt class="text-surface-400">{{ t('dashboard.candidates.detail.displayName') }}</dt>
              <dd class="text-surface-700 dark:text-surface-200 font-medium">
                {{ candidate.displayName }}
              </dd>
            </div>
            <div>
              <dt class="text-surface-400 inline-flex items-center gap-1">
                <Calendar class="size-3.5" />
                {{ t('dashboard.candidates.detail.created') }}
              </dt>
              <dd class="text-surface-700 dark:text-surface-200 font-medium">
                <TimelineDateLink :date="candidate.createdAt">{{ formatLocaleDate(candidate.createdAt) }}</TimelineDateLink>
              </dd>
            </div>
            <div>
              <dt class="text-surface-400 inline-flex items-center gap-1">
                <Clock class="size-3.5" />
                {{ t('dashboard.candidates.detail.updated') }}
              </dt>
              <dd class="text-surface-700 dark:text-surface-200 font-medium">
                <TimelineDateLink :date="candidate.updatedAt">{{ formatLocaleDate(candidate.updatedAt) }}</TimelineDateLink>
              </dd>
            </div>
          </dl>
        </div>

        <!-- Custom properties (Notion-style) -->
        <div class="rounded-lg border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-4 mb-4">
          <h2 class="text-sm font-semibold text-surface-700 dark:text-surface-200 mb-2 px-2">{{ t('dashboard.candidates.detail.properties') }}</h2>
          <PropertyBlock
            entity-type="candidate"
            :entity-id="candidateId"
            :entries="(candidate.properties ?? []) as import('~~/shared/properties').PropertyEntry[]"
            @refresh="refresh()"
          />
        </div>

        <!-- Quick notes -->
        <div class="rounded-lg border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-5 mb-4">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2.5">
              <div class="flex size-7 items-center justify-center rounded-lg bg-warning-50 dark:bg-warning-950/40">
                <MessageSquare class="size-3.5 text-warning-600 dark:text-warning-400" />
              </div>
              <h2 class="text-sm font-semibold text-surface-700 dark:text-surface-200">{{ t('dashboard.candidates.detail.quickNotes') }}</h2>
            </div>
            <button
              v-if="!isEditingQuickNotes"
              type="button"
              class="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 font-medium transition-colors"
              @click="startEditQuickNotes"
            >
              <Plus class="size-3.5" />
              {{ candidate.quickNotes ? t('common.actions.edit') : t('dashboard.candidates.detail.addNewNote') }}
            </button>
          </div>

          <div v-if="isEditingQuickNotes">
            <textarea
              v-model="quickNotesInput"
              rows="4"
              maxlength="1000"
              :placeholder="t('dashboard.candidates.detail.notesPlaceholder')"
              class="w-full rounded-lg border border-surface-300 dark:border-surface-700 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-100 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
            />
            <div class="flex items-center gap-2 mt-2">
              <button
                type="button"
                :disabled="isSavingQuickNotes"
                class="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
                @click="saveQuickNotes"
              >
                {{ isSavingQuickNotes ? t('common.actions.saving') : t('common.actions.save') }}
              </button>
              <button
                type="button"
                class="rounded-lg border border-surface-300 dark:border-surface-600 px-3 py-1.5 text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
                @click="isEditingQuickNotes = false"
              >
                {{ t('common.actions.cancel') }}
              </button>
            </div>
          </div>

          <p
            v-else-if="candidate.quickNotes"
            class="text-sm leading-relaxed text-surface-600 dark:text-surface-300 whitespace-pre-wrap"
          >
            {{ candidate.quickNotes }}
          </p>
          <p v-else class="text-sm text-surface-400 italic">{{ t('dashboard.candidates.detail.noQuickNotes') }}</p>
        </div>

        <!-- Tabs -->
        <div class="border-b border-surface-200 dark:border-surface-800 mb-4">
          <div class="flex gap-1">
            <button
              class="cursor-pointer px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px"
              :class="activeTab === 'applications'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-surface-500 hover:text-surface-700 hover:border-surface-300 dark:hover:text-surface-300'"
              @click="activeTab = 'applications'"
            >
              {{ t('dashboard.candidates.detail.applications') }} ({{ candidate.applications?.length ?? 0 }})
            </button>
            <button
              class="cursor-pointer px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px"
              :class="activeTab === 'documents'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-surface-500 hover:text-surface-700 hover:border-surface-300 dark:hover:text-surface-300'"
              @click="activeTab = 'documents'"
            >
              {{ t('dashboard.candidates.detail.documents') }} ({{ candidate.documents?.length ?? 0 }})
            </button>
          </div>
        </div>

        <!-- Applications tab -->
        <div v-if="activeTab === 'applications'">
          <!-- Apply to Job button -->
          <div class="flex justify-end mb-3">
            <button
              class="inline-flex items-center gap-1.5 rounded-lg border border-surface-300 dark:border-surface-600 px-3 py-1.5 text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
              @click="showApplyModal = true"
            >
              <Plus class="size-3.5" />
              {{ t('dashboard.candidates.detail.applyToJob') }}
            </button>
          </div>

          <div
            v-if="!candidate.applications?.length"
            class="rounded-lg border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-8 text-center"
          >
            <Briefcase class="size-8 text-surface-300 dark:text-surface-600 mx-auto mb-2" />
            <p class="text-sm text-surface-500 dark:text-surface-400">{{ t('dashboard.candidates.detail.noApplications') }}</p>
          </div>

          <div v-else class="space-y-4">
            <div
              v-for="app in candidate.applications"
              :key="app.id"
              class="rounded-lg border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 overflow-hidden"
            >
              <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 py-3 gap-2 border-b border-surface-100 dark:border-surface-800">
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2 min-w-0">
                    <NuxtLink
                      :to="$localePath(`/dashboard/jobs/${app.job.id}`)"
                      class="text-sm font-semibold text-surface-900 dark:text-surface-100 hover:text-brand-600 dark:hover:text-brand-400 transition-colors truncate"
                    >
                      {{ app.job.title }}
                    </NuxtLink>
                    <NuxtLink
                      :to="$localePath(`/dashboard/jobs/${app.job.id}`)"
                      class="shrink-0 text-surface-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                      :title="t('dashboard.candidates.detail.openJobPipeline')"
                    >
                      <ExternalLink class="size-3.5" />
                    </NuxtLink>
                  </div>
                  <span class="text-xs text-surface-400">
                    {{ t('dashboard.candidates.detail.applied') }} <TimelineDateLink :date="app.createdAt">{{ formatLocaleDate(app.createdAt) }}</TimelineDateLink>
                  </span>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  <ScheduleInterviewButton
                    :application-id="app.id"
                    variant="compact"
                    @schedule="openScheduleInterview(app)"
                  />
                  <NuxtLink
                    :to="$localePath(`/dashboard/applications/${app.id}`)"
                    class="inline-flex items-center gap-1 rounded-lg border border-surface-200 dark:border-surface-700 px-2 py-1 text-xs font-medium text-surface-600 dark:text-surface-400 hover:border-brand-400 dark:hover:border-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/30 hover:text-brand-700 dark:hover:text-brand-300 transition-all"
                  >
                    {{ t('dashboard.candidates.detail.viewApplication') }}
                  </NuxtLink>
                  <span
                    class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium shrink-0"
                    :class="applicationStatusClasses[app.status] ?? 'bg-surface-100 text-surface-600'"
                  >
                    {{ stageLabels[app.status as keyof typeof stageLabels] ?? app.status }}
                  </span>
                </div>
              </div>

              <div class="p-4">
                <ScoreBreakdown
                  :application-id="app.id"
                  @scored="refresh()"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Apply to Job Modal -->
        <ApplyToJobModal
          v-if="showApplyModal"
          :candidate-id="candidateId"
          @close="showApplyModal = false"
          @created="handleApplied"
        />

        <!-- Interview Schedule Sidebar -->
        <InterviewScheduleSidebar
          v-if="showInterviewSidebar && interviewTargetApp"
          :application-id="interviewTargetApp.id"
          :candidate-name="`${candidate.firstName} ${candidate.lastName}`"
          :job-title="interviewTargetApp.jobTitle"
          @close="showInterviewSidebar = false"
          @scheduled="showInterviewSidebar = false"
        />

        <!-- Documents tab -->
        <div v-if="activeTab === 'documents'">
          <!-- Hidden file input -->
          <input
            ref="fileInput"
            type="file"
            accept=".pdf,.doc,.docx"
            class="hidden"
            @change="handleFileSelected"
          />

          <!-- ── Inline PDF preview (replaces document list when active) ── -->
          <template v-if="showPreview">
            <!-- Preview toolbar -->
            <div class="flex items-center justify-between mb-3">
              <button
                class="inline-flex items-center gap-1.5 text-sm font-medium text-surface-600 dark:text-surface-300 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                @click="closePreview"
              >
                <ArrowLeft class="size-3.5" />
                {{ t('dashboard.candidates.documents.backToDocuments') }}
              </button>
              <div class="flex items-center gap-1">
                <button
                  v-if="previewDocId"
                  class="rounded-lg p-1.5 text-surface-400 hover:text-brand-600 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                  :title="t('dashboard.candidates.documents.download')"
                  @click="handleDownload(previewDocId!)"
                >
                  <Download class="size-4" />
                </button>
              </div>
            </div>

            <!-- Filename -->
            <div v-if="previewFilename" class="flex items-center gap-2 mb-3">
              <FileText class="size-4 text-surface-400 shrink-0" />
              <span class="text-sm font-medium text-surface-700 dark:text-surface-200 truncate">
                {{ previewFilename }}
              </span>
            </div>

            <!-- Error state -->
            <div
              v-if="previewError"
              class="rounded-lg border border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950 p-6 text-center"
            >
              <AlertTriangle class="size-8 text-danger-400 mx-auto mb-2" />
              <p class="text-sm text-danger-700 dark:text-danger-400">{{ previewError }}</p>
              <button
                class="mt-3 text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400 font-medium"
                @click="closePreview"
              >
                {{ t('dashboard.candidates.documents.goBack') }}
              </button>
            </div>

            <!-- PDF iframe — same-origin, server streams the bytes -->
            <iframe
              v-else-if="previewUrl && isPdfPreview"
              :src="previewUrl"
              class="w-full rounded-lg border border-surface-200 dark:border-surface-800"
              style="height: 70vh;"
              :title="t('dashboard.candidates.documents.preview')"
            />
          </template>

          <!-- ── Document list (normal state) ── -->
          <template v-else>
            <!-- Upload controls -->
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2">
                <select
                  v-model="selectedDocType"
                  class="rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-2.5 py-1.5 text-sm text-surface-700 dark:text-surface-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="resume">{{ t('dashboard.candidates.shared.documentTypes.resume') }}</option>
                  <option value="cover_letter">{{ t('dashboard.candidates.shared.documentTypes.cover_letter') }}</option>
                  <option value="other">{{ t('dashboard.candidates.shared.documentTypes.other') }}</option>
                </select>
              </div>
              <button
                :disabled="isUploading"
                class="inline-flex items-center gap-1.5 rounded-lg border border-surface-300 dark:border-surface-600 px-3 py-1.5 text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                @click="triggerFileSelect"
              >
                <Upload class="size-3.5" />
                {{ isUploading ? t('dashboard.candidates.documents.uploading') : t('dashboard.candidates.documents.upload') }}
              </button>
            </div>

            <!-- Upload error -->
            <div
              v-if="uploadError"
              class="rounded-lg border border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950 p-3 text-sm text-danger-700 dark:text-danger-400 mb-3"
            >
              {{ uploadError }}
              <button class="underline ml-1" @click="uploadError = null">{{ t('dashboard.candidates.documents.dismiss') }}</button>
            </div>

            <!-- Empty state -->
            <div
              v-if="!candidate.documents?.length"
              class="rounded-lg border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-8 text-center"
            >
              <FileText class="size-8 text-surface-300 dark:text-surface-600 mx-auto mb-2" />
              <p class="text-sm text-surface-500 dark:text-surface-400">{{ t('dashboard.candidates.documents.empty') }}</p>
              <p class="text-xs text-surface-400 mt-1">
                {{ t('dashboard.candidates.documents.uploadHint') }}
              </p>
            </div>

            <!-- Document list -->
            <div v-else class="space-y-2">
              <div
                v-for="doc in candidate.documents"
                :key="doc.id"
                class="group flex items-center justify-between rounded-lg border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 px-4 py-3 transition-colors"
                :class="doc.mimeType === 'application/pdf' ? 'cursor-pointer hover:border-brand-300 dark:hover:border-brand-700 hover:bg-brand-50/50 dark:hover:bg-brand-950/30' : ''"
                @click="doc.mimeType === 'application/pdf' ? handlePreview(doc.id, doc.mimeType) : undefined"
              >
                <div class="flex items-center gap-3 min-w-0">
                  <FileText class="size-4 shrink-0" :class="doc.mimeType === 'application/pdf' ? 'text-danger-500 dark:text-danger-400' : 'text-surface-400'" />
                  <div class="min-w-0">
                    <p class="text-sm font-medium text-surface-700 dark:text-surface-200 truncate">
                      {{ doc.originalFilename }}
                    </p>
                    <span class="text-xs text-surface-400">
                      {{ documentTypeLabels[doc.type] ?? doc.type }}
                      · <TimelineDateLink :date="doc.createdAt">{{ formatLocaleDate(doc.createdAt) }}</TimelineDateLink>
                      <template v-if="doc.mimeType === 'application/pdf'"> · <span class="text-brand-500 dark:text-brand-400">{{ t('dashboard.candidates.documents.clickToPreview') }}</span></template>
                    </span>
                  </div>
                </div>
                <div class="flex items-center gap-1 shrink-0" @click.stop>
                  <button
                    v-if="doc.mimeType === 'application/pdf'"
                    class="rounded-lg p-1.5 text-surface-400 hover:text-brand-600 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                    :title="t('dashboard.candidates.documents.previewPdf')"
                    @click="handlePreview(doc.id, doc.mimeType)"
                  >
                    <Eye class="size-4" />
                  </button>
                  <button
                    class="rounded-lg p-1.5 text-surface-400 hover:text-brand-600 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                    :title="t('dashboard.candidates.documents.download')"
                    @click="handleDownload(doc.id)"
                  >
                    <Download class="size-4" />
                  </button>
                  <button
                    class="rounded-lg p-1.5 text-surface-400 hover:text-danger-600 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                    :title="t('common.actions.delete')"
                    @click="showDocDeleteConfirm = doc.id"
                  >
                    <Trash2 class="size-4" />
                  </button>
                </div>
              </div>
            </div>
          </template>

          <!-- Document delete confirmation dialog -->
          <Teleport to="body">
            <div v-if="showDocDeleteConfirm" class="fixed inset-0 z-50 flex items-center justify-center">
              <div class="absolute inset-0 bg-black/50" @click="showDocDeleteConfirm = null" />
              <div class="relative bg-white dark:bg-surface-900 rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
                <h3 class="text-lg font-semibold text-surface-900 dark:text-surface-50 mb-2">{{ t('dashboard.candidates.documents.deleteDocument') }}</h3>
                <p class="text-sm text-surface-600 dark:text-surface-400 mb-4">
                  {{ t('dashboard.candidates.documents.deleteConfirm') }}
                </p>
                <div class="flex justify-end gap-2">
                  <button
                    :disabled="isDeletingDoc"
                    class="rounded-lg border border-surface-300 dark:border-surface-600 px-3 py-1.5 text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
                    @click="showDocDeleteConfirm = null"
                  >
                    {{ t('common.cancel') }}
                  </button>
                  <button
                    :disabled="isDeletingDoc"
                    class="rounded-lg bg-danger-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-danger-700 disabled:opacity-50 transition-colors"
                    @click="handleDeleteDoc(showDocDeleteConfirm!)"
                  >
                    {{ isDeletingDoc ? t('common.actions.deleting') : t('common.actions.delete') }}
                  </button>
                </div>
              </div>
            </div>
          </Teleport>
        </div>
      </div>

      <!-- EDIT MODE -->
      <div v-else>
        <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-50 mb-6">{{ t('common.actions.edit') }} — {{ formatCandidateName(candidate) }}</h1>

        <form class="space-y-5" @submit.prevent="handleSave">
          <!-- First Name -->
          <div>
            <label for="edit-firstName" class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
              {{ t('dashboard.candidates.new.firstName') }} <span class="text-danger-500">*</span>
            </label>
            <input
              id="edit-firstName"
              v-model="editForm.firstName"
              type="text"
              class="w-full rounded-lg border px-3 py-2 text-sm text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
              :class="editErrors.firstName ? 'border-danger-300' : 'border-surface-300 dark:border-surface-700'"
            />
            <p v-if="editErrors.firstName" class="mt-1 text-xs text-danger-600 dark:text-danger-400">{{ editErrors.firstName }}</p>
          </div>

          <!-- Last Name -->
          <div>
            <label for="edit-lastName" class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
              {{ t('dashboard.candidates.new.lastName') }} <span class="text-danger-500">*</span>
            </label>
            <input
              id="edit-lastName"
              v-model="editForm.lastName"
              type="text"
              class="w-full rounded-lg border px-3 py-2 text-sm text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
              :class="editErrors.lastName ? 'border-danger-300' : 'border-surface-300 dark:border-surface-700'"
            />
            <p v-if="editErrors.lastName" class="mt-1 text-xs text-danger-600 dark:text-danger-400">{{ editErrors.lastName }}</p>
          </div>

          <!-- Email -->
          <div>
            <label for="edit-email" class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
              {{ t('dashboard.candidates.new.email') }} <span class="text-danger-500">*</span>
            </label>
            <input
              id="edit-email"
              v-model="editForm.email"
              type="email"
              class="w-full rounded-lg border px-3 py-2 text-sm text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
              :class="editErrors.email ? 'border-danger-300' : 'border-surface-300 dark:border-surface-700'"
            />
            <p v-if="editErrors.email" class="mt-1 text-xs text-danger-600 dark:text-danger-400">{{ editErrors.email }}</p>
          </div>

          <!-- Phone -->
          <div>
            <label for="edit-phone" class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
              {{ t('dashboard.candidates.new.phone') }}
            </label>
            <input
              id="edit-phone"
              v-model="editForm.phone"
              type="tel"
              class="w-full rounded-lg border border-surface-300 dark:border-surface-700 px-3 py-2 text-sm text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
            />
          </div>

          <!-- Display Name -->
          <div>
            <label for="edit-displayName" class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
              {{ t('dashboard.candidates.new.displayName') }}
              <span class="ml-1 text-xs font-normal text-surface-400">{{ t('dashboard.candidates.new.displayNameHint') }}</span>
            </label>
            <input
              id="edit-displayName"
              v-model="editForm.displayName"
              type="text"
              :placeholder="t('dashboard.candidates.new.placeholders.displayName')"
              class="w-full rounded-lg border border-surface-300 dark:border-surface-700 px-3 py-2 text-sm text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
            />
          </div>

          <!-- Gender + Date of Birth -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label for="edit-gender" class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                {{ t('dashboard.candidates.new.gender') }}
              </label>
              <select
                id="edit-gender"
                v-model="editForm.gender"
                class="w-full rounded-lg border border-surface-300 dark:border-surface-700 px-3 py-2 text-sm text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
              >
                <option value="">{{ t('dashboard.candidates.new.notSpecified') }}</option>
                <option value="male">{{ t('dashboard.candidates.shared.gender.male') }}</option>
                <option value="female">{{ t('dashboard.candidates.shared.gender.female') }}</option>
                <option value="other">{{ t('dashboard.candidates.shared.gender.other') }}</option>
                <option value="prefer_not_to_say">{{ t('dashboard.candidates.shared.gender.prefer_not_to_say') }}</option>
              </select>
            </div>
            <div>
              <label for="edit-dateOfBirth" class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
                {{ t('dashboard.candidates.new.dateOfBirth') }}
              </label>
              <input
                id="edit-dateOfBirth"
                v-model="editForm.dateOfBirth"
                type="date"
                :max="new Date().toISOString().split('T')[0]"
                class="w-full rounded-lg border px-3 py-2 text-sm text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                :class="editErrors.dateOfBirth ? 'border-danger-300' : 'border-surface-300 dark:border-surface-700'"
              />
              <p v-if="editErrors.dateOfBirth" class="mt-1 text-xs text-danger-600 dark:text-danger-400">{{ editErrors.dateOfBirth }}</p>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-3 pt-2">
            <button
              type="submit"
              :disabled="isSaving"
              class="inline-flex items-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {{ isSaving ? t('common.actions.saving') : t('common.actions.saveChanges') }}
            </button>
            <button
              type="button"
              class="rounded-lg border border-surface-300 dark:border-surface-700 px-4 py-2 text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
              @click="cancelEdit"
            >
              {{ t('common.cancel') }}
            </button>
          </div>
        </form>
      </div>

      <!-- Delete confirmation dialog -->
      <Teleport to="body">
        <div v-if="showDeleteConfirm" class="fixed inset-0 z-50 flex items-center justify-center">
          <div class="absolute inset-0 bg-black/50" @click="showDeleteConfirm = false" />
          <div class="relative bg-white dark:bg-surface-900 rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 class="text-lg font-semibold text-surface-900 dark:text-surface-50 mb-2">{{ t('common.actions.delete') }} — {{ formatCandidateName(candidate) }}</h3>
            <p class="text-sm text-surface-600 dark:text-surface-400 mb-4">
              {{ t('dashboard.jobs.detail.settings.deleteConfirm', { title: formatCandidateName(candidate) }) }}
            </p>
            <div class="flex justify-end gap-2">
              <button
                :disabled="isDeleting"
                class="rounded-lg border border-surface-300 dark:border-surface-700 px-3 py-1.5 text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
                @click="showDeleteConfirm = false"
              >
                {{ t('common.cancel') }}
              </button>
              <button
                :disabled="isDeleting"
                class="rounded-lg bg-danger-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-danger-700 disabled:opacity-50 transition-colors"
                @click="handleDelete"
              >
                {{ isDeleting ? t('common.actions.deleting') : t('common.actions.delete') }}
              </button>
            </div>
          </div>
        </div>
      </Teleport>
    </template>
  </div>
</template>
