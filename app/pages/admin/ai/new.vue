<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next'

definePageMeta({
  layout: 'saas',
  middleware: ['auth', 'require-saas-admin'],
})

const { t } = useI18n()
const localePath = useLocalePath()
const { platformPath } = useTenantPaths()

useSeoMeta({
  title: t('settings.ai.new.seoTitle'),
  description: t('settings.ai.new.seoDescription'),
})

const API_BASE = '/api/saas/platform-ai/configs'

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

const isReady = computed(() =>
  configsStatus.value !== 'pending'
  && providersStatus.value !== 'pending'
  && !!providers.value,
)
const loadFailed = computed(() => configsError.value || providersError.value)
const isFirst = computed(() => (configsData.value ?? []).length === 0)

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

    <AiConfigForm
      v-else
      :config="null"
      :providers="providers ?? null"
      :is-first="isFirst"
      variant="saas"
      :api-base="API_BASE"
      @saved="onSaved"
      @cancel="onCancel"
    />
  </div>
</template>
