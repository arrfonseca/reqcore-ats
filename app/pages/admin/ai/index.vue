<script setup lang="ts">
import {
  Brain, Plus, Loader2, AlertTriangle, Sparkles, BarChart3, Star,
  Pencil, Trash2, Zap, Check, KeyRound, Server, Search, X, Building2,
} from 'lucide-vue-next'

definePageMeta({
  layout: 'saas',
  middleware: ['auth', 'require-saas-admin'],
})

const { t } = useI18n()
const localePath = useLocalePath()
const { platformPath } = useTenantPaths()
const toast = useToast()

useSeoMeta({
  title: t('dashboard.saas.nav.ai'),
  description: t('dashboard.saas.aiPageHint'),
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

interface DelegatedTenant {
  organizationId: string
  name: string
  slug: string
}

interface TenantSearchRow {
  id: string
  name: string
  slug: string
}

const { data: configsData, refresh: refreshConfigs, status: configsStatus } = useFetch<AiConfigRow[]>(API_BASE, {
  key: 'platform-ai-configs',
  headers: useRequestHeaders(['cookie']),
  default: () => [],
})

const { data: providers } = useFetch<Record<string, ProviderInfo>>('/api/saas/platform-ai/providers', {
  key: 'platform-ai-providers',
  headers: useRequestHeaders(['cookie']),
})

const { data: delegationsData, refresh: refreshDelegations, status: delegationsStatus } = useFetch<{ data: DelegatedTenant[] }>(
  '/api/saas/platform-ai/delegations',
  {
    key: 'platform-ai-delegations',
    headers: useRequestHeaders(['cookie']),
    default: () => ({ data: [] }),
  },
)

const configs = computed(() => configsData.value ?? [])
const delegated = computed(() => delegationsData.value?.data ?? [])
const isLoadingConfigs = computed(() => configsStatus.value === 'pending' && configs.value.length === 0)
const isLoadingDelegations = computed(() => delegationsStatus.value === 'pending')

const delegatedIds = computed(() => new Set(delegated.value.map(d => d.organizationId)))

// ── Config actions ──
const togglingDefaultId = ref<string | null>(null)
const togglingPurpose = ref<'chatbot' | 'analysis' | null>(null)

async function setDefault(c: AiConfigRow, purpose: 'chatbot' | 'analysis') {
  togglingDefaultId.value = c.id
  togglingPurpose.value = purpose
  try {
    await $fetch(`${API_BASE}/${c.id}/set-default`, {
      method: 'POST',
      body: { purposes: [purpose] },
      headers: useRequestHeaders(['cookie']),
    })
    toast.success(
      t('settings.ai.toasts.setDefaultTitle', { purpose: t(`settings.ai.purposes.${purpose}`) }),
      t('settings.ai.toasts.setDefaultBody', { name: c.name }),
    )
    await refreshConfigs()
  }
  catch (err: any) {
    const message = err?.data?.statusMessage ?? t('settings.ai.toasts.setDefaultFailed')
    toast.error(t('settings.ai.toasts.setDefaultFailedTitle'), { message })
  }
  finally {
    togglingDefaultId.value = null
    togglingPurpose.value = null
  }
}

const testingId = ref<string | null>(null)
const testResults = ref<Record<string, { success: boolean, message?: string }>>({})

async function testConnection(c: AiConfigRow) {
  testingId.value = c.id
  delete testResults.value[c.id]
  try {
    await $fetch(`${API_BASE}/${c.id}/test-connection`, {
      method: 'POST',
      headers: useRequestHeaders(['cookie']),
    })
    testResults.value = { ...testResults.value, [c.id]: { success: true } }
    toast.success(t('settings.ai.toasts.connectionWorks'), t('settings.ai.toasts.connectionWorksBody', { name: c.name }))
  }
  catch (err: any) {
    const message = err?.data?.statusMessage ?? t('settings.ai.toasts.testFailedDefault')
    testResults.value = { ...testResults.value, [c.id]: { success: false, message } }
    toast.error(t('settings.ai.toasts.testFailed'), { message })
  }
  finally {
    testingId.value = null
  }
}

const deletingId = ref<string | null>(null)

async function deleteConfig(c: AiConfigRow) {
  if (!confirm(t('settings.ai.deleteConfirm', { name: c.name }))) return
  deletingId.value = c.id
  try {
    await $fetch(`${API_BASE}/${c.id}`, {
      method: 'DELETE',
      headers: useRequestHeaders(['cookie']),
    })
    toast.success(t('settings.ai.toasts.deleted'), t('settings.ai.toasts.deletedBody', { name: c.name }))
    await refreshConfigs()
  }
  catch (err: any) {
    const message = err?.data?.statusMessage ?? t('settings.ai.toasts.deleteFailedDefault')
    toast.error(t('settings.ai.toasts.deleteFailed'), { message })
  }
  finally {
    deletingId.value = null
  }
}

function providerLabel(key: string): string {
  return providers.value?.[key]?.name ?? key
}

function formatPrice(p: number | null): string {
  if (p == null) return '—'
  return `$${p.toFixed(2)}`
}

// ── Delegation search ──
const companySearch = ref('')
const searchResults = ref<TenantSearchRow[]>([])
const isSearching = ref(false)
let searchTimer: ReturnType<typeof setTimeout> | null = null

watch(companySearch, (val) => {
  if (searchTimer) clearTimeout(searchTimer)
  if (!val.trim()) {
    searchResults.value = []
    return
  }
  searchTimer = setTimeout(() => searchCompanies(val.trim()), 250)
})

async function searchCompanies(query: string) {
  isSearching.value = true
  try {
    const res = await $fetch<{ data: TenantSearchRow[] }>('/api/saas/tenants', {
      query: { search: query, limit: 20, page: 1 },
      headers: useRequestHeaders(['cookie']),
    })
    searchResults.value = (res.data ?? []).filter(org => !delegatedIds.value.has(org.id))
  }
  catch {
    searchResults.value = []
  }
  finally {
    isSearching.value = false
  }
}

const pendingDelegate = ref<TenantSearchRow | null>(null)
const isDelegating = ref(false)
const removingId = ref<string | null>(null)

function selectCompany(org: TenantSearchRow) {
  pendingDelegate.value = org
}

async function confirmDelegate() {
  if (!pendingDelegate.value) return
  isDelegating.value = true
  try {
    await $fetch(`/api/saas/platform-ai/tenants/${pendingDelegate.value.id}`, {
      method: 'PATCH',
      body: { allowOwnLlm: true },
      headers: useRequestHeaders(['cookie']),
    })
    toast.success(
      t('dashboard.saas.delegateAdded'),
      t('dashboard.saas.delegateAddedBody', { name: pendingDelegate.value.name }),
    )
    companySearch.value = ''
    searchResults.value = []
    pendingDelegate.value = null
    await refreshDelegations()
  }
  catch (err: any) {
    const message = err?.data?.statusMessage ?? t('common.actions.retry')
    toast.error(t('dashboard.saas.delegateAdded'), { message })
  }
  finally {
    isDelegating.value = false
  }
}

async function removeDelegation(org: DelegatedTenant) {
  removingId.value = org.organizationId
  try {
    await $fetch(`/api/saas/platform-ai/tenants/${org.organizationId}`, {
      method: 'PATCH',
      body: { allowOwnLlm: false },
      headers: useRequestHeaders(['cookie']),
    })
    toast.success(
      t('dashboard.saas.delegateRemoved'),
      t('dashboard.saas.delegateRemovedBody', { name: org.name }),
    )
    await refreshDelegations()
  }
  catch (err: any) {
    const message = err?.data?.statusMessage ?? t('common.actions.retry')
    toast.error(t('dashboard.saas.delegateRemoved'), { message })
  }
  finally {
    removingId.value = null
  }
}
</script>

<template>
  <div class="mx-auto max-w-4xl space-y-10">
    <!-- Global AI credentials -->
    <section>
      <div class="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 class="text-xl font-semibold text-surface-900 dark:text-surface-100">
            {{ t('dashboard.saas.nav.ai') }}
          </h1>
          <p class="text-sm text-surface-500 dark:text-surface-400 mt-1">
            {{ t('dashboard.saas.aiPageHint') }}
          </p>
        </div>
        <NuxtLink
          :to="platformPath('ai/new')"
          class="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 transition-colors no-underline"
        >
          <Plus class="size-4" />
          {{ t('settings.ai.addModel') }}
        </NuxtLink>
      </div>

      <div v-if="isLoadingConfigs" class="rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-8 text-center text-sm text-surface-500">
        <Loader2 class="size-5 animate-spin mx-auto mb-2 text-surface-400" />
        {{ t('settings.ai.loading') }}
      </div>

      <div
        v-else-if="configs.length === 0"
        class="rounded-2xl border border-dashed border-surface-300 dark:border-surface-700 bg-white dark:bg-surface-900 p-10 text-center"
      >
        <div class="mx-auto flex size-12 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 mb-3">
          <Brain class="size-6" />
        </div>
        <h2 class="text-base font-semibold text-surface-900 dark:text-surface-100">{{ t('settings.ai.emptyTitle') }}</h2>
        <p class="mt-1 mb-4 text-sm text-surface-500 dark:text-surface-400">
          {{ t('settings.ai.emptyDescription') }}
        </p>
        <NuxtLink
          :to="platformPath('ai/new')"
          class="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors no-underline"
        >
          <Plus class="size-4" />
          {{ t('settings.ai.addFirstModel') }}
        </NuxtLink>
      </div>

      <ul v-else class="space-y-3">
        <li
          v-for="c in configs"
          :key="c.id"
          class="rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 overflow-hidden"
        >
          <div class="px-5 py-4 flex flex-col sm:flex-row sm:items-start gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <h3 class="text-base font-semibold text-surface-900 dark:text-surface-100 truncate">{{ c.name }}</h3>
                <span class="inline-flex items-center gap-1 rounded-full border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 px-2 py-0.5 text-[11px] font-medium text-surface-700 dark:text-surface-300">
                  {{ providerLabel(c.provider) }}
                </span>
                <span
                  v-if="c.isDefaultChatbot"
                  class="inline-flex items-center gap-1 rounded-full border border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-950/50 px-2 py-0.5 text-[11px] font-medium text-brand-700 dark:text-brand-300"
                >
                  <Sparkles class="size-3" /> {{ t('settings.ai.chatbotDefault') }}
                </span>
                <span
                  v-if="c.isDefaultAnalysis"
                  class="inline-flex items-center gap-1 rounded-full border border-warning-200 dark:border-warning-800 bg-warning-50 dark:bg-warning-950/50 px-2 py-0.5 text-[11px] font-medium text-warning-700 dark:text-warning-300"
                >
                  <Star class="size-3" /> {{ t('settings.ai.analysisDefault') }}
                </span>
                <span
                  v-if="!c.hasApiKey"
                  class="inline-flex items-center gap-1 rounded-full border border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950/50 px-2 py-0.5 text-[11px] font-medium text-danger-700 dark:text-danger-300"
                >
                  <AlertTriangle class="size-3" /> {{ t('settings.ai.missingApiKey') }}
                </span>
              </div>
              <div class="mt-1 flex items-center gap-2 flex-wrap text-xs text-surface-500">
                <span class="font-mono">{{ c.model }}</span>
                <span v-if="c.baseUrl" class="inline-flex items-center gap-1">
                  <Server class="size-3" />
                  <span class="font-mono truncate max-w-[260px]" :title="c.baseUrl">{{ c.baseUrl }}</span>
                </span>
                <span class="inline-flex items-center gap-1">
                  <BarChart3 class="size-3" />
                  {{ t('settings.ai.pricingInOut', { input: formatPrice(c.inputPricePer1m), output: formatPrice(c.outputPricePer1m) }) }}
                </span>
              </div>
              <div v-if="testResults[c.id]" class="mt-2">
                <span
                  v-if="testResults[c.id]?.success"
                  class="inline-flex items-center gap-1 text-[11px] text-success-600 dark:text-success-400"
                >
                  <Check class="size-3" /> {{ t('settings.ai.connectionVerified') }}
                </span>
                <span
                  v-else
                  class="inline-flex items-start gap-1 text-[11px] text-danger-600 dark:text-danger-400"
                >
                  <AlertTriangle class="size-3 mt-px" /> {{ testResults[c.id]?.message }}
                </span>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-1.5 shrink-0">
              <button
                v-if="!c.isDefaultChatbot"
                :disabled="!c.hasApiKey || (togglingDefaultId === c.id && togglingPurpose === 'chatbot')"
                class="inline-flex items-center gap-1 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 px-2.5 py-1.5 text-xs font-medium text-surface-700 dark:text-surface-300 hover:border-brand-300 dark:hover:border-brand-700 hover:text-brand-700 dark:hover:text-brand-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                @click="setDefault(c, 'chatbot')"
              >
                <Loader2 v-if="togglingDefaultId === c.id && togglingPurpose === 'chatbot'" class="size-3.5 animate-spin" />
                <Sparkles v-else class="size-3.5" />
                {{ t('settings.ai.useForChatbot') }}
              </button>

              <button
                v-if="!c.isDefaultAnalysis"
                :disabled="!c.hasApiKey || (togglingDefaultId === c.id && togglingPurpose === 'analysis')"
                class="inline-flex items-center gap-1 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 px-2.5 py-1.5 text-xs font-medium text-surface-700 dark:text-surface-300 hover:border-warning-300 dark:hover:border-warning-700 hover:text-warning-700 dark:hover:text-warning-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                @click="setDefault(c, 'analysis')"
              >
                <Loader2 v-if="togglingDefaultId === c.id && togglingPurpose === 'analysis'" class="size-3.5 animate-spin" />
                <Star v-else class="size-3.5" />
                {{ t('settings.ai.useForAnalysis') }}
              </button>

              <button
                :disabled="testingId === c.id || !c.hasApiKey"
                class="inline-flex items-center gap-1 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 px-2.5 py-1.5 text-xs font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                @click="testConnection(c)"
              >
                <Loader2 v-if="testingId === c.id" class="size-3.5 animate-spin" />
                <Zap v-else class="size-3.5" />
                {{ t('settings.ai.test') }}
              </button>

              <NuxtLink
                :to="platformPath(`ai/${c.id}`)"
                class="inline-flex items-center gap-1 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 px-2.5 py-1.5 text-xs font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors no-underline"
              >
                <Pencil class="size-3.5" />
                {{ t('settings.ai.edit') }}
              </NuxtLink>

              <button
                :disabled="deletingId === c.id"
                class="inline-flex items-center gap-1 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 px-2.5 py-1.5 text-xs font-medium text-danger-600 dark:text-danger-400 hover:border-danger-300 dark:hover:border-danger-700 hover:bg-danger-50 dark:hover:bg-danger-950/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                @click="deleteConfig(c)"
              >
                <Loader2 v-if="deletingId === c.id" class="size-3.5 animate-spin" />
                <Trash2 v-else class="size-3.5" />
              </button>
            </div>
          </div>
        </li>
      </ul>

      <p v-if="configs.length > 0" class="mt-4 text-xs text-surface-500 dark:text-surface-400 flex items-start gap-1.5">
        <KeyRound class="size-3.5 mt-0.5 shrink-0" />
        <span>{{ t('settings.ai.footerHint') }}</span>
      </p>
    </section>

    <!-- Delegation -->
    <section class="rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 overflow-hidden">
      <div class="px-5 py-4 border-b border-surface-200 dark:border-surface-800">
        <h2 class="text-base font-semibold text-surface-900 dark:text-surface-100">
          {{ t('dashboard.saas.delegatedAis') }}
        </h2>
        <p class="text-sm text-surface-500 dark:text-surface-400 mt-0.5">
          {{ t('dashboard.saas.aiDelegateHint') }}
        </p>
        <p class="text-xs text-surface-500 dark:text-surface-400 mt-2">
          {{ t('dashboard.saas.globalAiDefaultHint') }}
        </p>
      </div>

      <div class="px-5 py-4 border-b border-surface-200 dark:border-surface-800">
        <div class="relative max-w-md">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-surface-400" />
          <input
            v-model="companySearch"
            type="search"
            :placeholder="t('dashboard.saas.searchCompaniesToDelegate')"
            class="w-full rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 pl-9 pr-3 py-2 text-sm"
          />
        </div>

        <div v-if="isSearching" class="mt-3 flex items-center gap-2 text-sm text-surface-500">
          <Loader2 class="size-4 animate-spin" />
          {{ t('common.actions.loading') }}
        </div>
        <ul v-else-if="searchResults.length > 0" class="mt-3 rounded-lg border border-surface-200 dark:border-surface-700 divide-y divide-surface-100 dark:divide-surface-800 overflow-hidden">
          <li v-for="org in searchResults" :key="org.id">
            <button
              type="button"
              class="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors cursor-pointer"
              @click="selectCompany(org)"
            >
              <Building2 class="size-4 text-surface-400 shrink-0" />
              <div class="min-w-0">
                <div class="text-sm font-medium text-surface-900 dark:text-surface-100 truncate">{{ org.name }}</div>
                <div class="text-xs text-surface-400 truncate">{{ org.slug }}</div>
              </div>
            </button>
          </li>
        </ul>
        <p v-else-if="companySearch.trim() && !isSearching" class="mt-3 text-sm text-surface-500">
          {{ t('dashboard.saas.noSearchResults') }}
        </p>
      </div>

      <div v-if="isLoadingDelegations" class="px-5 py-8 flex justify-center">
        <Loader2 class="size-5 animate-spin text-surface-400" />
      </div>
      <p v-else-if="delegated.length === 0" class="px-5 py-6 text-sm text-surface-500">
        {{ t('dashboard.saas.noDelegatedCompanies') }}
      </p>
      <ul v-else class="divide-y divide-surface-100 dark:divide-surface-800">
        <li
          v-for="org in delegated"
          :key="org.organizationId"
          class="flex items-center gap-3 px-5 py-3"
        >
          <Building2 class="size-4 text-surface-400 shrink-0" />
          <div class="min-w-0 flex-1">
            <div class="text-sm font-medium text-surface-900 dark:text-surface-100 truncate">{{ org.name }}</div>
            <div class="text-xs text-surface-400 truncate">{{ org.slug }}</div>
          </div>
          <button
            type="button"
            :title="t('dashboard.saas.removeDelegation')"
            :disabled="removingId === org.organizationId"
            class="shrink-0 rounded-lg p-1.5 text-surface-400 hover:text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-950/30 transition-colors disabled:opacity-50 cursor-pointer"
            @click="removeDelegation(org)"
          >
            <Loader2 v-if="removingId === org.organizationId" class="size-4 animate-spin" />
            <X v-else class="size-4" />
          </button>
        </li>
      </ul>
    </section>

    <SaasConfirmModal
      v-if="pendingDelegate"
      :title="t('dashboard.saas.confirmDelegateTitle')"
      :body="t('dashboard.saas.confirmDelegateBody', { name: pendingDelegate.name })"
      :confirm-label="t('dashboard.saas.confirmDelegate')"
      :loading="isDelegating"
      @confirm="confirmDelegate"
      @cancel="pendingDelegate = null"
    />
  </div>
</template>
