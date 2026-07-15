<script setup lang="ts">
import {
  ArrowLeft, Save, Eye, EyeOff, Mail, AlertCircle, FileText,
} from 'lucide-vue-next'

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'require-org'],
})

const { t } = useI18n()

useSeoMeta({
  title: t('dashboard.interviews.templates.new.seoTitle'),
  description: t('dashboard.interviews.templates.new.seoDescription'),
  robots: 'noindex, nofollow',
})

const localePath = useLocalePath()
const { tenantPath, publicJobPath } = useTenantPaths()
const { createTemplate } = useEmailTemplates()
const { handlePreviewReadOnlyError } = usePreviewReadOnly()

// ─── Form state ──────────────────────────────────────────────────
const form = reactive({
  name: '',
  subject: '',
  body: '',
})

const showPreview = ref(false)
const isSaving = ref(false)
const saveError = ref('')

const canSave = computed(() =>
  form.name.trim().length > 0
  && form.subject.trim().length > 0
  && form.body.trim().length > 0,
)

// ─── Preview ─────────────────────────────────────────────────────
const sampleVariables = computed<Record<string, string>>(() => ({
  candidateName: t('dashboard.interviews.templates.new.samplePreview.candidateName'),
  candidateFirstName: t('dashboard.interviews.templates.new.samplePreview.candidateFirstName'),
  candidateLastName: t('dashboard.interviews.templates.new.samplePreview.candidateLastName'),
  candidateEmail: t('dashboard.interviews.templates.new.samplePreview.candidateEmail'),
  jobTitle: t('dashboard.interviews.templates.new.samplePreview.jobTitle'),
  interviewTitle: t('dashboard.interviews.templates.new.samplePreview.interviewTitle'),
  interviewDate: t('dashboard.interviews.templates.new.samplePreview.interviewDate'),
  interviewTime: t('dashboard.interviews.templates.new.samplePreview.interviewTime'),
  interviewDuration: t('dashboard.interviews.templates.new.samplePreview.interviewDuration'),
  interviewType: t('dashboard.interviews.templates.new.samplePreview.interviewType'),
  interviewLocation: t('dashboard.interviews.templates.new.samplePreview.interviewLocation'),
  interviewers: t('dashboard.interviews.templates.new.samplePreview.interviewers'),
  organizationName: t('dashboard.interviews.templates.new.samplePreview.organizationName'),
}))

const previewSubject = computed(() => renderTemplatePreview(form.subject, sampleVariables.value))
const previewBody = computed(() => renderTemplatePreview(form.body, sampleVariables.value))

// ─── Save ────────────────────────────────────────────────────────
async function handleCreate() {
  saveError.value = ''
  if (!canSave.value) {
    saveError.value = t('dashboard.interviews.templates.new.errors.allFieldsRequired')
    return
  }

  isSaving.value = true
  try {
    const created = await createTemplate({
      name: form.name.trim(),
      subject: form.subject.trim(),
      body: form.body.trim(),
    })
    await navigateTo(tenantPath(`interviews/templates/${(created as any).id}`))
  } catch (err: any) {
    if (handlePreviewReadOnlyError(err)) return
    saveError.value = err?.data?.statusMessage ?? t('dashboard.interviews.templates.new.errors.createFailed')
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-5xl px-6 py-8">
    <!-- Breadcrumb -->
    <NuxtLink
      :to="tenantPath('interviews/templates')"
      class="mb-6 inline-flex items-center gap-1 rounded-full border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 px-3 py-1.5 text-sm text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors no-underline"
    >
      <ArrowLeft class="size-4" />
      {{ t('dashboard.interviews.templates.new.allTemplates') }}
    </NuxtLink>

    <!-- Page header -->
    <div class="mb-6 flex items-start justify-between gap-4">
      <div class="flex items-start gap-3">
        <div class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-sm shadow-brand-500/20">
          <FileText class="size-5 text-white" />
        </div>
        <div>
          <h1 class="text-xl font-bold text-surface-900 dark:text-surface-50 tracking-tight">
            {{ t('dashboard.interviews.templates.new.title') }}
          </h1>
          <p class="text-sm text-surface-500 dark:text-surface-400 mt-0.5">
            {{ t('dashboard.interviews.templates.new.creationHint') }}
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <button
          class="cursor-pointer inline-flex items-center gap-1.5 rounded-xl border border-surface-200 dark:border-surface-700 px-3.5 py-2 text-sm font-medium text-surface-600 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-all"
          @click="showPreview = !showPreview"
        >
          <component :is="showPreview ? EyeOff : Eye" class="size-4" />
          {{ showPreview ? t('dashboard.interviews.templates.new.hidePreview') : t('dashboard.interviews.templates.new.preview') }}
        </button>
        <button
          :disabled="!canSave || isSaving"
          class="cursor-pointer inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-brand-600/20 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          @click="handleCreate"
        >
          <Save class="size-4" />
          {{ isSaving ? t('dashboard.interviews.templates.new.creating') : t('dashboard.interviews.templates.new.createTemplate') }}
        </button>
      </div>
    </div>

    <!-- Error -->
    <div v-if="saveError" class="mb-6 flex items-start gap-2.5 rounded-xl border border-danger-200/80 bg-danger-50 p-4 text-sm text-danger-700 dark:border-danger-800/60 dark:bg-danger-950/40 dark:text-danger-300">
      <AlertCircle class="size-4 shrink-0 mt-0.5" />
      {{ saveError }}
    </div>

    <div class="grid gap-6" :class="showPreview ? 'lg:grid-cols-2' : 'lg:grid-cols-[1fr_320px]'">
      <!-- Editor panel -->
      <div class="space-y-5">
        <!-- Name -->
        <div class="rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-5">
          <label for="template-name" class="block text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400 mb-2">
            {{ t('dashboard.interviews.templates.new.templateName') }}
          </label>
          <input
            id="template-name"
            v-model="form.name"
            type="text"
            :placeholder="t('dashboard.interviews.emailModal.templateName')"
            class="w-full rounded-lg border border-surface-200 dark:border-surface-700 px-3.5 py-2.5 text-sm text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-800 placeholder:text-surface-400 dark:placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all"
          />
        </div>

        <!-- Subject -->
        <div class="rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-5">
          <label for="template-subject" class="block text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400 mb-2">
            {{ t('dashboard.interviews.templates.new.subjectLine') }}
          </label>
          <input
            id="template-subject"
            v-model="form.subject"
            type="text"
            :placeholder="t('dashboard.interviews.emailModal.subjectLinePlaceholder')"
            class="w-full rounded-lg border border-surface-200 dark:border-surface-700 px-3.5 py-2.5 text-sm text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-800 placeholder:text-surface-400 dark:placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all font-mono text-[13px]"
          />
        </div>

        <!-- Body -->
        <div class="rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-5">
          <label for="template-body" class="block text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400 mb-2">
            {{ t('dashboard.interviews.templates.new.emailBody') }}
          </label>
          <textarea
            id="template-body"
            v-model="form.body"
            rows="18"
            :placeholder="t('dashboard.interviews.emailModal.emailBodyPlaceholder')"
            class="w-full rounded-lg border border-surface-200 dark:border-surface-700 px-3.5 py-2.5 text-sm text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-800 placeholder:text-surface-400 dark:placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition-all resize-none font-mono text-[13px] leading-relaxed"
          />
        </div>
      </div>

      <!-- Right panel -->
      <div class="space-y-5">
        <!-- Live preview -->
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 translate-y-2"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 translate-y-2"
        >
          <div v-if="showPreview" class="rounded-xl border border-brand-200 dark:border-brand-800/60 bg-white dark:bg-surface-900 overflow-hidden">
            <div class="border-b border-brand-100 dark:border-brand-900/40 bg-brand-50/50 dark:bg-brand-950/20 px-5 py-3">
              <div class="flex items-center gap-2">
                <Mail class="size-4 text-brand-500 dark:text-brand-400" />
                <span class="text-xs font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">{{ t('dashboard.interviews.templates.new.livePreview') }}</span>
              </div>
            </div>
            <div class="p-5 space-y-4">
              <div>
                <span class="text-[10px] uppercase tracking-wider font-semibold text-surface-400 block mb-1">{{ t('dashboard.interviews.templates.new.subject') }}</span>
                <p class="text-sm font-semibold text-surface-800 dark:text-surface-200">
                  {{ previewSubject || t('dashboard.interviews.templates.new.subjectPlaceholder') }}
                </p>
              </div>
              <div class="border-t border-surface-100 dark:border-surface-800 pt-4">
                <span class="text-[10px] uppercase tracking-wider font-semibold text-surface-400 block mb-2">{{ t('dashboard.interviews.templates.new.body') }}</span>
                <div class="text-sm text-surface-700 dark:text-surface-300 whitespace-pre-wrap leading-relaxed">
                  {{ previewBody || t('dashboard.interviews.templates.new.bodyPlaceholder') }}
                </div>
              </div>
            </div>
            <div class="border-t border-surface-100 dark:border-surface-800 bg-surface-50/50 dark:bg-surface-950/30 px-5 py-2.5">
              <p class="text-[11px] text-surface-400 dark:text-surface-500 italic">
                {{ t('dashboard.interviews.templates.new.previewHelper') }}
              </p>
            </div>
          </div>
        </Transition>

        <!-- Variable reference -->
        <div class="rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-5">
          <h3 class="text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400 mb-3">
            {{ t('dashboard.interviews.templates.new.availableVariables') }}
          </h3>
          <p class="text-xs text-surface-400 dark:text-surface-500 mb-3">
            {{ t('dashboard.interviews.templates.new.variablesHelper') }}
          </p>
          <div class="space-y-1.5">
            <div
              v-for="v in AVAILABLE_VARIABLES"
              :key="v.key"
              class="flex items-center justify-between rounded-lg bg-surface-50 dark:bg-surface-800/50 px-3 py-2"
            >
              <code class="text-[11px] font-mono text-brand-700 dark:text-brand-300 select-all">{{ v.key }}</code>
              <span class="text-[11px] text-surface-400 dark:text-surface-500">{{ v.desc }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
