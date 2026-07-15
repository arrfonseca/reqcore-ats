<script setup lang="ts">
import { Loader2, AlertTriangle } from 'lucide-vue-next'

definePageMeta({
  layout: 'saas',
  middleware: ['auth', 'require-saas-admin'],
})

const { t } = useI18n()
const localePath = useLocalePath()
const { platformPath } = useTenantPaths()
const route = useRoute()

const API_BASE = '/api/saas/platform-ai/configs'
const id = computed(() => String(route.params.id))

useSeoMeta({
  title: t('settings.ai.detail.seoTitle'),
  description: t('settings.ai.detail.seoDescription'),
})

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

interface ProviderInfo {
  name: string
  tagline: string
  modelsUrl: string
  apiKeyUrl: string
  signupUrl?: string
  supportsBaseUrl: boolean
  defaultModel: string
}

const PROVIDERS_URL = '/api/saas/platform-ai/providers'

const { data: configsData, status: configsStatus, error: configsError } = useFetch<AiConfigRow[]>(API_BASE, {
  key: 'platform-ai-configs',
  headers: useRequestHeaders(['cookie']),
  default: () => [],
})

const { data: providers, status: providersStatus, error: providersError } = useFetch<Record<string, ProviderInfo>>(PROVIDERS_URL, {
  key: 'platform-ai-providers',
  headers: useRequestHeaders(['cookie']),
})

const config = computed<AiConfigRow | null>(() =>
  (configsData.value ?? []).find(c => c.id === id.value) ?? null,
)

const isReady = computed(() =>
  configsStatus.value !== 'pending'
  && providersStatus.value !== 'pending'
  && !!providers.value,
)
const notFound = computed(() => isReady.value && !config.value)
const loadFailed = computed(() => configsError.value || providersError.value)

async function onSaved() {
  await refreshNuxtData(['platform-ai-configs'])
  await navigateTo(platformPath('ai'))
}

function onCancel() {
  navigateTo(platformPath('ai'))
}
</script>

<template>
  <div>
    <div
      v-if="loadFailed"
      class="mx-auto max-w-2xl rounded-xl border border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950 p-5 text-sm text-danger-700 dark:text-danger-400"
    >
      {{ t('common.errors.generic') }}
    </div>

    <div v-else-if="!isReady" class="flex items-center justify-center py-12">
      <Loader2 class="size-6 animate-spin text-surface-400" />
    </div>

    <div
      v-else-if="notFound"
      class="mx-auto max-w-2xl rounded-xl border border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950 p-5 text-sm text-danger-700 dark:text-danger-400 flex items-start gap-3"
    >
      <AlertTriangle class="size-5 shrink-0 mt-0.5" />
      <div>
        <p class="font-semibold mb-1">{{ t('settings.ai.detail.notFoundTitle') }}</p>
        <p class="mb-3">{{ t('settings.ai.detail.notFoundBody') }}</p>
        <NuxtLink
          :to="platformPath('ai')"
          class="inline-flex items-center gap-1.5 rounded-lg bg-danger-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-danger-700 transition-colors no-underline"
        >
          {{ t('settings.ai.detail.backToAi') }}
        </NuxtLink>
      </div>
    </div>

    <AiConfigForm
      v-else
      variant="saas"
      :config="config"
      :providers="providers ?? null"
      :is-first="false"
      :api-base="API_BASE"
      @saved="onSaved"
      @cancel="onCancel"
    />
  </div>
</template>
