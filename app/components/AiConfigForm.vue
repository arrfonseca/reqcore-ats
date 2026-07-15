<script setup lang="ts">
const { tenantPath, platformPath } = useTenantPaths()
/**
 * AiConfigForm
 *
 * Full-page form used by both the "Add a model" and "Edit model" pages.
 * Provider → credentials → live model list → display name → save.
 */
import {
  Brain, Sparkles, Eye, EyeOff, ExternalLink, Loader2, Check,
  Save, Zap, Star, AlertTriangle, ChevronDown, KeyRound, ArrowLeft, RefreshCw, X,
} from 'lucide-vue-next'

interface ModelInfo {
  id: string
  label: string
  description: string
  inputPricePer1m?: number
  outputPricePer1m?: number
  badge?: 'recommended' | 'fast' | 'powerful' | 'cheap'
  pricingFromCatalog?: boolean
  verified?: boolean
}

interface ProviderInfo {
  name: string
  tagline: string
  modelsUrl: string
  apiKeyUrl: string
  signupUrl?: string
  supportsBaseUrl: boolean
  defaultModel: string
}

interface AiConfigRow {
  id: string
  name: string
  provider: string
  model: string
  baseUrl: string | null
  maxTokens: number
  inputPricePer1m: number | null
  outputPricePer1m: number | null
  isDefaultChatbot: boolean
  isDefaultAnalysis: boolean
  hasApiKey: boolean
}

const props = withDefaults(defineProps<{
  config: AiConfigRow | null
  providers: Record<string, ProviderInfo> | null
  isFirst: boolean
  apiBase?: string
  variant?: 'tenant' | 'saas'
}>(), {
  apiBase: '/api/ai-config',
  variant: 'tenant',
})

const emit = defineEmits<{
  saved: []
  cancel: []
}>()

const { t } = useI18n()
const toast = useToast()
const localePath = useLocalePath()

const isSaas = computed(() => props.variant === 'saas')
const isEdit = computed(() => props.config !== null)
const apiRoot = computed(() => props.apiBase.replace(/\/configs$/, ''))
const backToPath = computed(() =>
  isSaas.value ? platformPath('ai') : tenantPath('settings/ai'),
)

const VERIFY_INTERVAL_MS = 15 * 60 * 1000

const DEFAULT_MAX_TOKENS = 16384

const form = ref({
  name: props.config?.name ?? '',
  provider: props.config?.provider ?? 'openai',
  model: props.config?.model ?? '',
  apiKey: '',
  baseUrl: props.config?.baseUrl ?? '',
  maxTokens: props.config?.maxTokens ?? DEFAULT_MAX_TOKENS,
  inputPricePer1m: props.config?.inputPricePer1m ?? null as number | null,
  outputPricePer1m: props.config?.outputPricePer1m ?? null as number | null,
  isDefaultChatbot: !isEdit.value && props.isFirst,
  isDefaultAnalysis: !isEdit.value && props.isFirst,
})

const showApiKey = ref(false)
const showAdvanced = ref(false)
const isSaving = ref(false)
const isTesting = ref(false)
const testResult = ref<{ success: boolean, message?: string } | null>(null)

const availableModels = ref<ModelInfo[]>([])
const isLoadingModels = ref(false)
const isVerifying = ref(false)
const modelsError = ref<string | null>(null)
const lastVerifiedAt = ref<Date | null>(null)
const scopeAnalysisModelId = ref('')
const scopeChatbotModelId = ref('')
const hiddenModelIds = ref<Set<string>>(new Set())
let fetchDebounceTimer: ReturnType<typeof setTimeout> | null = null
let verifyIntervalTimer: ReturnType<typeof setInterval> | null = null

const selectedProvider = computed<ProviderInfo | null>(() =>
  props.providers?.[form.value.provider] ?? null,
)

const isCustomProvider = computed(() => form.value.provider === 'openai_compatible')

const visibleModels = computed(() => {
  if (!isSaas.value) return availableModels.value
  return availableModels.value.filter(m => !hiddenModelIds.value.has(m.id))
})

const modelsBusy = computed(() => isLoadingModels.value || isVerifying.value)

function canFetchModels(): boolean {
  if (isCustomProvider.value && !form.value.baseUrl.trim()) return false
  if (form.value.apiKey.trim()) return true
  if (isEdit.value && props.config?.hasApiKey) return true
  return false
}

async function loadHiddenModels() {
  if (!isSaas.value) return
  try {
    const result = await $fetch<{ modelIds: string[] }>(`${apiRoot.value}/hidden-models`, {
      query: { provider: form.value.provider },
      headers: useRequestHeaders(['cookie']),
    })
    hiddenModelIds.value = new Set(result.modelIds ?? [])
  }
  catch {
    hiddenModelIds.value = new Set()
  }
}

async function loadSaasScopes() {
  if (!isSaas.value) return
  try {
    const configs = await $fetch<AiConfigRow[]>(props.apiBase, {
      headers: useRequestHeaders(['cookie']),
    })
    const sameProvider = (configs ?? []).filter(c => c.provider === form.value.provider)
    scopeChatbotModelId.value = sameProvider.find(c => c.isDefaultChatbot)?.model ?? ''
    scopeAnalysisModelId.value = sameProvider.find(c => c.isDefaultAnalysis)?.model ?? ''
  }
  catch {
    // ignore — scopes stay empty
  }
}

async function fetchModels(options?: { includeHidden?: boolean, verify?: boolean, forceVerify?: boolean, cacheOnly?: boolean }): Promise<boolean> {
  if (!canFetchModels()) {
    availableModels.value = []
    modelsError.value = null
    return false
  }

  const hasExistingModels = availableModels.value.length > 0
  isLoadingModels.value = !hasExistingModels
  const shouldVerify = options?.verify ?? isSaas.value
  if (shouldVerify && !options?.cacheOnly) isVerifying.value = true
  modelsError.value = null
  try {
    const ensureIds = [
      form.value.model,
      scopeAnalysisModelId.value,
      scopeChatbotModelId.value,
    ].filter(Boolean)

    const body: Record<string, unknown> = {
      provider: form.value.provider,
      verify: shouldVerify,
      includeHidden: options?.includeHidden ?? false,
    }
    if (options?.forceVerify) body.forceVerify = true
    if (options?.cacheOnly) body.cacheOnly = true
    if (ensureIds.length) body.ensureModelIds = ensureIds
    if (form.value.apiKey.trim()) body.apiKey = form.value.apiKey.trim()
    if (isCustomProvider.value && form.value.baseUrl.trim()) body.baseUrl = form.value.baseUrl.trim()
    if (isEdit.value && props.config) body.configId = props.config.id

    const result = await $fetch<{ models: ModelInfo[] }>(`${apiRoot.value}/models`, {
      method: 'POST',
      body,
      headers: useRequestHeaders(['cookie']),
    })
    availableModels.value = result.models ?? []
    if (shouldVerify && !options?.cacheOnly) lastVerifiedAt.value = new Date()
    if (options?.includeHidden) {
      hiddenModelIds.value = new Set()
    }
    return true
  }
  catch (err: any) {
    if (!hasExistingModels) availableModels.value = []
    modelsError.value = err?.data?.statusMessage ?? err?.message ?? t('settings.ai.form.modelsLoadFailed')
    return false
  }
  finally {
    isLoadingModels.value = false
    isVerifying.value = false
  }
}

async function hideModel(modelId: string) {
  hiddenModelIds.value = new Set([...hiddenModelIds.value, modelId])
  try {
    await $fetch(`${apiRoot.value}/hidden-models`, {
      method: 'PUT',
      body: {
        provider: form.value.provider,
        modelId,
        hidden: true,
      },
      headers: useRequestHeaders(['cookie']),
    })
  }
  catch (err: any) {
    const next = new Set(hiddenModelIds.value)
    next.delete(modelId)
    hiddenModelIds.value = next
    toast.error(t('settings.ai.form.toasts.saveFailed'), {
      message: err?.data?.statusMessage ?? err?.message,
    })
  }
}

function setScopeAnalysis(modelId: string) {
  scopeAnalysisModelId.value = modelId
}

function setScopeChatbot(modelId: string) {
  scopeChatbotModelId.value = modelId
}

async function refreshModels() {
  const ok = await fetchModels({ includeHidden: true, verify: true, forceVerify: true })
  if (ok) {
    toast.success(t('settings.ai.form.modelsRefreshDone'), t('settings.ai.form.modelsRefreshDoneBody'))
  }
}

function scheduleFetchModels() {
  if (fetchDebounceTimer) clearTimeout(fetchDebounceTimer)
  fetchDebounceTimer = setTimeout(() => { fetchModels() }, 500)
}

watch(
  () => [form.value.provider, form.value.apiKey, form.value.baseUrl] as const,
  () => scheduleFetchModels(),
)

onMounted(async () => {
  if (isSaas.value) {
    await Promise.all([loadHiddenModels(), loadSaasScopes()])
  }
  if (!canFetchModels()) return

  if (isSaas.value) {
    await fetchModels({ cacheOnly: true })
    void fetchModels({ verify: true })
    verifyIntervalTimer = setInterval(() => {
      if (canFetchModels()) fetchModels({ verify: true })
    }, VERIFY_INTERVAL_MS)
  }
  else {
    await fetchModels()
  }
})

onUnmounted(() => {
  if (fetchDebounceTimer) clearTimeout(fetchDebounceTimer)
  if (verifyIntervalTimer) clearInterval(verifyIntervalTimer)
})

function pickModel(m: ModelInfo) {
  form.value.model = m.id
  form.value.inputPricePer1m = m.inputPricePer1m ?? form.value.inputPricePer1m
  form.value.outputPricePer1m = m.outputPricePer1m ?? form.value.outputPricePer1m
  if (!form.value.name || /^(GPT|Claude|Gemini|Llama|Mistral|New configuration)/i.test(form.value.name)) {
    form.value.name = m.label
  }
}

function pickProvider(key: string) {
  form.value.provider = key
  form.value.model = ''
  form.value.inputPricePer1m = null
  form.value.outputPricePer1m = null
  availableModels.value = []
  modelsError.value = null
  testResult.value = null
  if (isSaas.value) {
    scopeAnalysisModelId.value = ''
    scopeChatbotModelId.value = ''
    loadHiddenModels()
    loadSaasScopes()
  }
}

const canSave = computed(() => {
  if (isSaas.value) {
    if (!scopeAnalysisModelId.value && !scopeChatbotModelId.value) return false
    if (!isEdit.value && !form.value.apiKey) return false
    if (isCustomProvider.value && !form.value.baseUrl) return false
    return true
  }
  if (!form.value.name.trim()) return false
  if (!form.value.model.trim()) return false
  if (!isEdit.value && !form.value.apiKey) return false
  if (isCustomProvider.value && !form.value.baseUrl) return false
  return true
})

const canTest = computed(() => {
  if (!form.value.model.trim()) return false
  if (isCustomProvider.value && !form.value.baseUrl.trim()) return false
  if (form.value.apiKey.trim()) return true
  if (isEdit.value && props.config?.hasApiKey) return true
  return false
})

async function handleSave() {
  if (!canSave.value) return
  isSaving.value = true
  try {
    if (isSaas.value) {
      const body: Record<string, unknown> = {
        provider: form.value.provider,
        maxTokens: form.value.maxTokens,
        inputPricePer1m: form.value.inputPricePer1m,
        outputPricePer1m: form.value.outputPricePer1m,
      }
      if (scopeChatbotModelId.value) body.chatbotModelId = scopeChatbotModelId.value
      if (scopeAnalysisModelId.value) body.analysisModelId = scopeAnalysisModelId.value
      if (isCustomProvider.value) body.baseUrl = form.value.baseUrl
      if (form.value.apiKey) body.apiKey = form.value.apiKey
      if (isEdit.value && props.config) body.configId = props.config.id

      await $fetch(`${apiRoot.value}/apply-scopes`, {
        method: 'POST',
        body,
        headers: useRequestHeaders(['cookie']),
      })
      toast.success(t('settings.ai.form.toasts.added'), t('settings.ai.form.applyScopesSuccess'))
      emit('saved')
      return
    }

    const body: Record<string, unknown> = {
      name: form.value.name.trim(),
      provider: form.value.provider,
      model: form.value.model.trim(),
      maxTokens: form.value.maxTokens,
      inputPricePer1m: form.value.inputPricePer1m,
      outputPricePer1m: form.value.outputPricePer1m,
    }
    if (isCustomProvider.value) body.baseUrl = form.value.baseUrl
    if (form.value.apiKey) body.apiKey = form.value.apiKey

    if (isEdit.value && props.config) {
      await $fetch(`${props.apiBase}/${props.config.id}`, {
        method: 'PATCH',
        body,
        headers: useRequestHeaders(['cookie']),
      })
      toast.success(t('settings.ai.form.toasts.updated'), t('settings.ai.form.toasts.updatedBody', { name: form.value.name.trim() }))
    }
    else {
      body.isDefaultChatbot = form.value.isDefaultChatbot
      body.isDefaultAnalysis = form.value.isDefaultAnalysis
      await $fetch(props.apiBase, {
        method: 'POST',
        body,
        headers: useRequestHeaders(['cookie']),
      })
      toast.success(t('settings.ai.form.toasts.added'), t('settings.ai.form.toasts.addedBody', { name: form.value.name.trim() }))
    }
    emit('saved')
  }
  catch (err: any) {
    const message = err?.data?.statusMessage ?? err?.message ?? t('settings.ai.form.toasts.saveFailedDefault')
    toast.error(t('settings.ai.form.toasts.saveFailed'), { message })
  }
  finally {
    isSaving.value = false
  }
}

async function handleTest() {
  if (!canTest.value) return
  isTesting.value = true
  testResult.value = null
  try {
    const body: Record<string, unknown> = {
      provider: form.value.provider,
      model: form.value.model.trim(),
    }
    if (form.value.apiKey.trim()) body.apiKey = form.value.apiKey.trim()
    if (isCustomProvider.value && form.value.baseUrl.trim()) body.baseUrl = form.value.baseUrl.trim()
    if (isEdit.value && props.config) body.configId = props.config.id

    await $fetch(`${apiRoot.value}/test-connection`, {
      method: 'POST',
      body,
      headers: useRequestHeaders(['cookie']),
    })
    testResult.value = { success: true }
    toast.success(t('settings.ai.form.toasts.connectionWorks'), t('settings.ai.form.toasts.connectionWorksBody'))
  }
  catch (err: any) {
    const message = err?.data?.statusMessage ?? err?.message ?? t('settings.ai.form.toasts.testFailedDefault')
    testResult.value = { success: false, message }
    toast.error(t('settings.ai.form.toasts.testFailed'), { message })
  }
  finally {
    isTesting.value = false
  }
}

const badgeClass = (badge?: ModelInfo['badge']) => {
  switch (badge) {
    case 'recommended': return 'bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300 border-brand-200 dark:border-brand-800'
    case 'fast': return 'bg-success-50 text-success-700 dark:bg-success-950/50 dark:text-success-300 border-success-200 dark:border-success-800'
    case 'powerful': return 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200 dark:border-purple-800'
    case 'cheap': return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
    default: return 'hidden'
  }
}
const badgeLabel = (badge?: ModelInfo['badge']) => {
  switch (badge) {
    case 'recommended': return t('settings.ai.form.badges.recommended')
    case 'fast': return t('settings.ai.form.badges.fast')
    case 'powerful': return t('settings.ai.form.badges.powerful')
    case 'cheap': return t('settings.ai.form.badges.cheap')
    default: return ''
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl pb-32">
    <!-- Header -->
    <div class="mb-6">
      <NuxtLink
        :to="localePath(backToPath)"
        class="inline-flex items-center gap-1 text-xs font-medium text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200 transition-colors mb-3"
      >
        <ArrowLeft class="size-3.5" />
        {{ t('settings.ai.form.backToAi') }}
      </NuxtLink>
      <div class="flex items-center gap-2.5">
        <div class="flex size-9 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400">
          <Brain class="size-5" />
        </div>
        <div>
          <h1 class="text-lg font-semibold text-surface-900 dark:text-surface-50">
            {{ isEdit ? t('settings.ai.form.editTitle', { name: config?.name || t('settings.ai.form.editFallback') }) : t('settings.ai.form.addTitle') }}
          </h1>
          <p class="text-xs text-surface-500 dark:text-surface-400">
            {{ isEdit ? t('settings.ai.form.editSubtitle') : t('settings.ai.form.addSubtitle') }}
          </p>
        </div>
      </div>
    </div>

    <div class="space-y-5">
      <!-- 1. Provider -->
      <section class="rounded-2xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-5 sm:p-6">
        <header class="mb-4">
          <h2 class="text-sm font-semibold text-surface-900 dark:text-surface-100">{{ t('settings.ai.form.provider') }}</h2>
          <p class="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
            {{ t('settings.ai.form.providerHelp') }}
          </p>
        </header>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            v-for="(info, key) in providers ?? {}"
            :key="key"
            type="button"
            class="flex flex-col items-start gap-1 rounded-xl border px-3 py-2.5 text-left transition-colors cursor-pointer"
            :class="form.provider === key
              ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-950/30 ring-1 ring-brand-500/30'
              : 'border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 hover:border-brand-300 dark:hover:border-brand-700'"
            @click="pickProvider(String(key))"
          >
            <span class="text-sm font-semibold text-surface-900 dark:text-surface-100">{{ info.name }}</span>
            <span class="text-[11px] text-surface-500 dark:text-surface-400 line-clamp-2">{{ info.tagline }}</span>
          </button>
        </div>
      </section>

      <!-- 2. Connection (credentials first) -->
      <section class="rounded-2xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-5 sm:p-6">
        <header class="mb-4">
          <h2 class="text-sm font-semibold text-surface-900 dark:text-surface-100">{{ t('settings.ai.form.connection') }}</h2>
          <p class="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
            {{ t('settings.ai.form.connectionHelp') }}
          </p>
        </header>

        <div class="space-y-5">
          <!-- Base URL (custom only) -->
          <div v-if="isCustomProvider">
            <label class="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1.5">
              {{ t('settings.ai.form.baseUrl') }}
            </label>
            <input
              v-model="form.baseUrl"
              type="url"
              :placeholder="t('settings.ai.form.baseUrlPlaceholder')"
              class="w-full rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-100 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors font-mono"
            >
            <p class="mt-1 text-[11px] text-surface-500">
              {{ t('settings.ai.form.baseUrlHelp') }}
            </p>
          </div>

          <!-- API key -->
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <label class="text-xs font-medium text-surface-700 dark:text-surface-300">
                {{ t('settings.ai.form.apiKey') }}
                <span v-if="isEdit" class="ml-1 text-surface-400 font-normal">{{ t('settings.ai.form.apiKeyKeep') }}</span>
              </label>
              <a
                v-if="selectedProvider?.apiKeyUrl"
                :href="selectedProvider.apiKeyUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-1 text-[11px] text-brand-600 dark:text-brand-400 hover:underline"
              >
                {{ t('settings.ai.form.getKey') }} <ExternalLink class="size-3" />
              </a>
            </div>
            <div class="relative">
              <input
                v-model="form.apiKey"
                :type="showApiKey ? 'text' : 'password'"
                :placeholder="isEdit ? '••••••••••••' : t('settings.ai.form.apiKeyPlaceholder')"
                autocomplete="off"
                class="w-full rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 px-3 py-2 pr-10 text-sm text-surface-900 dark:text-surface-100 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors font-mono"
              >
              <button
                type="button"
                class="absolute inset-y-0 right-0 flex items-center px-3 text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 cursor-pointer"
                :title="showApiKey ? t('settings.ai.form.hideKey') : t('settings.ai.form.showKey')"
                @click="showApiKey = !showApiKey"
              >
                <Eye v-if="showApiKey" class="size-4" />
                <EyeOff v-else class="size-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- 3. Model (dynamic cards) -->
      <section v-if="selectedProvider" class="rounded-2xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-5 sm:p-6">
        <header class="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 class="text-sm font-semibold text-surface-900 dark:text-surface-100">{{ t('settings.ai.form.model') }}</h2>
            <p class="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
              {{ t('settings.ai.form.modelHelp') }}
            </p>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button
              v-if="canFetchModels()"
              type="button"
              class="inline-flex items-center gap-1 text-xs text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200 cursor-pointer disabled:opacity-50"
              :disabled="modelsBusy"
              @click="isSaas ? refreshModels() : fetchModels()"
            >
              <RefreshCw class="size-3" :class="modelsBusy ? 'animate-spin' : ''" />
              {{ t('settings.ai.form.modelsRefresh') }}
            </button>
            <a
              v-if="selectedProvider.modelsUrl"
              :href="selectedProvider.modelsUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1 text-xs text-brand-600 dark:text-brand-400 hover:underline"
            >
              {{ t('settings.ai.form.browseAll') }} <ExternalLink class="size-3" />
            </a>
          </div>
        </header>

        <p
          v-if="isSaas && lastVerifiedAt"
          class="text-[11px] text-surface-500 dark:text-surface-400 mb-3"
        >
          <Loader2 v-if="isVerifying" class="inline size-3 animate-spin mr-1" />
          {{ isVerifying ? t('settings.ai.form.modelsVerifying') : t('settings.ai.form.modelsVerifiedAt', { time: lastVerifiedAt.toLocaleTimeString() }) }}
        </p>

        <div v-if="modelsBusy && availableModels.length === 0" class="flex items-center justify-center py-8 gap-2 text-sm text-surface-500">
          <Loader2 class="size-4 animate-spin" />
          {{ isVerifying ? t('settings.ai.form.modelsVerifying') : t('settings.ai.form.modelsLoading') }}
        </div>

        <p v-else-if="!canFetchModels()" class="text-xs text-surface-500 dark:text-surface-400 py-4">
          {{ t('settings.ai.form.modelsEnterKey') }}
        </p>

        <p v-else-if="modelsError" class="text-xs text-danger-600 dark:text-danger-400 py-2 flex items-start gap-1.5">
          <AlertTriangle class="size-3.5 mt-px shrink-0" />
          {{ modelsError }}
        </p>

        <p v-else-if="isSaas && visibleModels.length === 0 && canFetchModels() && !modelsBusy" class="text-xs text-surface-500 dark:text-surface-400 py-4">
          {{ t('settings.ai.form.noWorkingModels') }}
        </p>

        <p v-else-if="availableModels.length === 0" class="text-xs text-surface-500 dark:text-surface-400 py-4">
          {{ t('settings.ai.form.modelsEmpty') }}
        </p>

        <!-- Tenant: simple selectable cards -->
        <div v-else-if="!isSaas" class="grid sm:grid-cols-2 gap-2">
          <button
            v-for="m in availableModels"
            :key="m.id"
            type="button"
            class="rounded-xl border px-3 py-3 text-left transition-colors cursor-pointer"
            :class="form.model === m.id
              ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-950/30 ring-1 ring-brand-500/30'
              : 'border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 hover:border-brand-300 dark:hover:border-brand-700'"
            @click="pickModel(m)"
          >
            <div class="flex items-start justify-between gap-2 mb-1">
              <span class="text-sm font-medium text-surface-900 dark:text-surface-100">{{ m.label }}</span>
              <span
                v-if="m.badge"
                class="inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px] font-medium shrink-0"
                :class="badgeClass(m.badge)"
              >
                <Star v-if="m.badge === 'recommended'" class="size-2.5" />
                <Zap v-else-if="m.badge === 'fast'" class="size-2.5" />
                {{ badgeLabel(m.badge) }}
              </span>
            </div>
            <p class="text-[11px] text-surface-500 dark:text-surface-400 line-clamp-2">{{ m.description }}</p>
            <div class="mt-2 text-[10px] text-surface-400">
              {{ t('settings.ai.form.pricingPer1mLine', { input: m.inputPricePer1m?.toFixed(2) ?? '—', output: m.outputPricePer1m?.toFixed(2) ?? '—' }) }}
            </div>
          </button>
        </div>

        <!-- SaaS: cards with hide, scope radios, verified badge -->
        <div v-else class="relative grid sm:grid-cols-2 gap-2">
          <div
            v-for="m in visibleModels"
            :key="m.id"
            class="relative rounded-xl border px-3 py-3 text-left transition-colors"
            :class="form.model === m.id
              ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-950/30 ring-1 ring-brand-500/30'
              : 'border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 hover:border-brand-300 dark:hover:border-brand-700'"
          >
            <button
              type="button"
              class="absolute top-2 right-2 p-1 rounded-md text-surface-400 hover:text-surface-600 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 cursor-pointer"
              :title="t('settings.ai.form.hideModel')"
              @click.stop="hideModel(m.id)"
            >
              <X class="size-3.5" />
            </button>

            <button
              type="button"
              class="w-full text-left cursor-pointer pr-6"
              @click="pickModel(m)"
            >
              <div class="flex items-start justify-between gap-2 mb-1">
                <span class="text-sm font-medium text-surface-900 dark:text-surface-100">{{ m.label }}</span>
                <span class="flex items-center gap-1 shrink-0">
                  <Check v-if="m.verified" class="size-3.5 text-success-500" :title="t('settings.ai.form.connectionVerified')" />
                  <span
                    v-if="m.badge"
                    class="inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px] font-medium"
                    :class="badgeClass(m.badge)"
                  >
                    <Star v-if="m.badge === 'recommended'" class="size-2.5" />
                    <Zap v-else-if="m.badge === 'fast'" class="size-2.5" />
                    {{ badgeLabel(m.badge) }}
                  </span>
                </span>
              </div>
              <p class="text-[11px] text-surface-500 dark:text-surface-400 line-clamp-2">{{ m.description }}</p>
              <div class="mt-2 text-[10px] text-surface-400">
                {{ t('settings.ai.form.pricingPer1mLine', { input: m.inputPricePer1m?.toFixed(2) ?? '—', output: m.outputPricePer1m?.toFixed(2) ?? '—' }) }}
              </div>
            </button>

            <div class="mt-3 pt-2 border-t border-surface-100 dark:border-surface-800 flex flex-col gap-1.5">
              <label class="flex items-center gap-2 text-[11px] text-surface-600 dark:text-surface-400 cursor-pointer">
                <input
                  type="radio"
                  name="scope-analysis"
                  class="size-3.5 text-warning-600 focus:ring-warning-500"
                  :checked="scopeAnalysisModelId === m.id"
                  @change="setScopeAnalysis(m.id)"
                >
                <Star class="size-3 text-warning-500 shrink-0" />
                <span>{{ t('settings.ai.form.scopeAnalysis') }}</span>
              </label>
              <label class="flex items-center gap-2 text-[11px] text-surface-600 dark:text-surface-400 cursor-pointer">
                <input
                  type="radio"
                  name="scope-chatbot"
                  class="size-3.5 text-brand-600 focus:ring-brand-500"
                  :checked="scopeChatbotModelId === m.id"
                  @change="setScopeChatbot(m.id)"
                >
                <Sparkles class="size-3 text-brand-500 shrink-0" />
                <span>{{ t('settings.ai.form.scopeChatbot') }}</span>
              </label>
            </div>
          </div>
        </div>

        <p
          v-if="isSaas"
          class="text-[10px] text-surface-400 mt-2"
        >
          {{ t('settings.ai.form.hiddenRestoredOnRefresh') }}
        </p>

        <p
          v-if="availableModels.some(m => m.pricingFromCatalog)"
          class="text-[10px] text-surface-400 mt-2"
        >
          {{ t('settings.ai.form.pricingEstimated') }}
        </p>

        <details class="mt-4">
          <summary class="text-xs text-surface-500 dark:text-surface-400 cursor-pointer hover:text-surface-700 dark:hover:text-surface-200 select-none inline-flex items-center gap-1">
            <ChevronDown class="size-3 transition-transform group-open:rotate-180" />
            {{ availableModels.length ? t('settings.ai.form.useDifferentId') : t('settings.ai.form.setModelId') }}
          </summary>
          <div class="mt-3">
            <input
              v-model="form.model"
              type="text"
              :placeholder="t('settings.ai.form.modelIdPlaceholder')"
              class="w-full rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-100 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors font-mono"
            >
            <p class="mt-1 text-[11px] text-surface-500">
              {{ t('settings.ai.form.modelIdHelp') }}
            </p>
          </div>
        </details>
      </section>

      <!-- 4. Display name (tenant only — SaaS uses model labels from scopes) -->
      <section v-if="!isSaas" class="rounded-2xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-5 sm:p-6">
        <div>
          <label class="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1.5">
            {{ t('settings.ai.form.displayName') }}
          </label>
          <input
            v-model="form.name"
            type="text"
            :placeholder="t('settings.ai.form.displayNamePlaceholder')"
            class="w-full rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-100 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
          >
          <p class="mt-1 text-[11px] text-surface-500">
            {{ t('settings.ai.form.displayNameHelp') }}
          </p>
        </div>
      </section>

      <!-- Defaults (tenant only — SaaS uses scope radios on cards) -->
      <section v-if="!isSaas && !isEdit && !isFirst" class="rounded-2xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-5 sm:p-6">
        <header class="mb-4">
          <h2 class="text-sm font-semibold text-surface-900 dark:text-surface-100">{{ t('settings.ai.form.useAsDefault') }}</h2>
          <p class="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
            {{ t('settings.ai.form.useAsDefaultHelp') }}
          </p>
        </header>
        <div class="space-y-2">
          <label class="flex items-start gap-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 px-4 py-3 cursor-pointer hover:border-brand-300 dark:hover:border-brand-700 transition-colors">
            <input
              v-model="form.isDefaultChatbot"
              type="checkbox"
              class="mt-0.5 size-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500"
            >
            <div class="flex-1">
              <div class="flex items-center gap-1.5 text-sm font-medium text-surface-900 dark:text-surface-100">
                <Sparkles class="size-3.5 text-brand-500" />
                {{ t('settings.ai.form.defaultChatbot') }}
              </div>
              <p class="text-[11px] text-surface-500 dark:text-surface-400 mt-0.5">
                {{ t('settings.ai.form.defaultChatbotHelp') }}
              </p>
            </div>
          </label>
          <label class="flex items-start gap-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 px-4 py-3 cursor-pointer hover:border-warning-300 dark:hover:border-warning-700 transition-colors">
            <input
              v-model="form.isDefaultAnalysis"
              type="checkbox"
              class="mt-0.5 size-4 rounded border-surface-300 text-warning-600 focus:ring-warning-500"
            >
            <div class="flex-1">
              <div class="flex items-center gap-1.5 text-sm font-medium text-surface-900 dark:text-surface-100">
                <Star class="size-3.5 text-warning-500" />
                {{ t('settings.ai.form.defaultAnalysis') }}
              </div>
              <p class="text-[11px] text-surface-500 dark:text-surface-400 mt-0.5">
                {{ t('settings.ai.form.defaultAnalysisHelp') }}
              </p>
            </div>
          </label>
        </div>
      </section>

      <p
        v-if="!isSaas && !isEdit && isFirst"
        class="rounded-xl border border-brand-200 dark:border-brand-900 bg-brand-50/70 dark:bg-brand-950/30 px-4 py-3 text-xs text-brand-700 dark:text-brand-300 flex items-start gap-2"
      >
        <Sparkles class="size-3.5 mt-0.5 shrink-0" />
        {{ t('settings.ai.form.firstModelHint') }}
      </p>

      <!-- Advanced -->
      <section class="rounded-2xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 overflow-hidden">
        <button
          type="button"
          class="w-full px-5 sm:px-6 py-4 flex items-center justify-between text-left cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors"
          @click="showAdvanced = !showAdvanced"
        >
          <div>
            <h2 class="text-sm font-semibold text-surface-900 dark:text-surface-100">{{ t('settings.ai.form.advanced') }}</h2>
            <p class="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
              {{ t('settings.ai.form.advancedHelp') }}
            </p>
          </div>
          <ChevronDown
            class="size-4 text-surface-400 transition-transform"
            :class="showAdvanced ? 'rotate-180' : ''"
          />
        </button>
        <div v-if="showAdvanced" class="border-t border-surface-200 dark:border-surface-800 px-5 sm:px-6 py-5 space-y-5">
          <div>
            <label class="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1.5">
              {{ t('settings.ai.form.maxOutputTokens') }}
            </label>
            <input
              v-model.number="form.maxTokens"
              type="number"
              min="256"
              max="200000"
              step="256"
              class="w-full rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors font-mono"
            >
            <p class="mt-1 text-[11px] text-surface-500">
              {{ t('settings.ai.form.maxOutputTokensHelp', { default: DEFAULT_MAX_TOKENS.toLocaleString() }) }}
            </p>
          </div>
          <div>
            <h3 class="text-xs font-medium text-surface-700 dark:text-surface-300 mb-2">
              {{ t('settings.ai.form.pricingTitle') }}
              <span class="ml-1 text-surface-400 font-normal">{{ t('settings.ai.form.pricingSubtitle') }}</span>
            </h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-[11px] font-medium text-surface-500 dark:text-surface-400 mb-1">{{ t('settings.ai.form.pricingInput') }}</label>
                <input
                  v-model.number="form.inputPricePer1m"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  class="w-full rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors font-mono"
                >
              </div>
              <div>
                <label class="block text-[11px] font-medium text-surface-500 dark:text-surface-400 mb-1">{{ t('settings.ai.form.pricingOutput') }}</label>
                <input
                  v-model.number="form.outputPricePer1m"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  class="w-full rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 px-3 py-2 text-sm text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors font-mono"
                >
              </div>
            </div>
          </div>
        </div>
      </section>

      <p class="text-[11px] text-surface-500 dark:text-surface-400 flex items-start gap-1.5">
        <KeyRound class="size-3 mt-0.5 shrink-0" />
        <span>{{ t('settings.ai.form.encryptedHint') }}</span>
      </p>
    </div>

    <!-- Sticky footer: Test + Save -->
    <div class="fixed inset-x-0 bottom-0 z-20 border-t border-surface-200 dark:border-surface-800 bg-white/90 dark:bg-surface-950/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 dark:supports-[backdrop-filter]:bg-surface-950/70">
      <div class="mx-auto max-w-3xl px-4 sm:px-6 py-3 flex items-center justify-between gap-2">
        <div class="flex items-center gap-2 min-w-0">
          <button
            type="button"
            :disabled="!canTest || isTesting"
            class="inline-flex items-center gap-1.5 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 px-3 py-2 text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
            @click="handleTest"
          >
            <Loader2 v-if="isTesting" class="size-4 animate-spin" />
            <Zap v-else class="size-4" />
            {{ isTesting ? t('settings.ai.form.testing') : t('settings.ai.form.testConnection') }}
          </button>
          <span
            v-if="testResult?.success"
            class="inline-flex items-center gap-1 text-xs text-success-600 dark:text-success-400 truncate"
          >
            <Check class="size-3.5 shrink-0" /> {{ t('settings.ai.form.connectionVerified') }}
          </span>
          <span
            v-else-if="testResult && !testResult.success"
            class="inline-flex items-start gap-1 text-xs text-danger-600 dark:text-danger-400 truncate"
          >
            <AlertTriangle class="size-3.5 shrink-0" /> {{ testResult.message }}
          </span>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <button
            type="button"
            class="rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 px-4 py-2 text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors cursor-pointer"
            @click="emit('cancel')"
          >
            {{ t('common.cancel') }}
          </button>
          <button
            type="button"
            :disabled="!canSave || isSaving"
            class="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            @click="handleSave"
          >
            <Loader2 v-if="isSaving" class="size-4 animate-spin" />
            <Save v-else class="size-4" />
            {{ isSaving ? t('settings.ai.form.saving') : (isSaas ? t('settings.ai.form.applyScopes') : (isEdit ? t('settings.ai.form.saveChanges') : t('settings.ai.form.addModel'))) }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
