<script setup lang="ts">
import { Globe, Loader2, CheckCircle2, AlertCircle, Trash2, RefreshCw } from 'lucide-vue-next'

const { t } = useI18n()

definePageMeta({})

useSeoMeta({
  title: t('settings.domain.seoTitle'),
  description: t('settings.domain.seoDescription'),
})

const { activeOrg } = useCurrentOrg()
const { allowed: canUpdateOrg } = usePermission({ organization: ['update'] })
const { tenantPath, publicBasePath, platformOrigin } = useTenantPaths()
const { track } = useTrack()

const hostnameInput = ref('')
const isSaving = ref(false)
const isVerifying = ref(false)
const isRemoving = ref(false)
const saveError = ref('')
const verifyMessage = ref('')
const verifySuccess = ref(false)

const { data, refresh, pending } = await useFetch('/api/org-settings/custom-domain')

const domain = computed(() => data.value?.domain ?? null)
const cnameTarget = computed(() => data.value?.cnameTarget ?? 'custom.reqcore.com')

watch(domain, (d) => {
  if (d?.hostname) hostnameInput.value = d.hostname
}, { immediate: true })

const statusLabel = computed(() => {
  const status = domain.value?.status
  if (status === 'verified') return t('settings.domain.statusVerified')
  if (status === 'pending') return t('settings.domain.statusPending')
  if (status === 'disabled') return t('settings.domain.statusDisabled')
  return t('settings.domain.statusNone')
})

const canonicalPublicUrl = computed(() => {
  const slug = activeOrg.value?.slug
  if (!slug) return ''
  return `${platformOrigin()}/${slug}`
})

const canonicalAdminUrl = computed(() => {
  const slug = activeOrg.value?.slug
  if (!slug) return ''
  return `${platformOrigin()}/${slug}/admin`
})

async function handleSave() {
  if (!canUpdateOrg.value) return
  saveError.value = ''
  isSaving.value = true
  try {
    await $fetch('/api/org-settings/custom-domain', {
      method: 'PATCH',
      body: { hostname: hostnameInput.value.trim() },
    })
    track('custom_domain_saved')
    await refresh()
  }
  catch (err: unknown) {
    saveError.value = err instanceof Error ? err.message : t('settings.domain.errors.saveFailed')
  }
  finally {
    isSaving.value = false
  }
}

async function handleVerify() {
  if (!canUpdateOrg.value) return
  verifyMessage.value = ''
  verifySuccess.value = false
  isVerifying.value = true
  try {
    const result = await $fetch<{
      verified: boolean
      cnameOk: boolean
      txtOk: boolean
      expectedCname: string
    }>('/api/org-settings/custom-domain/verify', { method: 'POST' })
    if (result.verified) {
      verifySuccess.value = true
      verifyMessage.value = t('settings.domain.verifySuccess')
      await refresh()
    }
    else {
      verifyMessage.value = t('settings.domain.verifyFailed', {
        cname: result.expectedCname,
        cnameOk: result.cnameOk ? '✓' : '✗',
        txtOk: result.txtOk ? '✓' : '✗',
      })
    }
  }
  catch (err: unknown) {
    verifyMessage.value = err instanceof Error ? err.message : t('settings.domain.errors.verifyFailed')
  }
  finally {
    isVerifying.value = false
  }
}

async function handleRemove() {
  if (!canUpdateOrg.value) return
  isRemoving.value = true
  try {
    await $fetch('/api/org-settings/custom-domain', { method: 'DELETE' })
    hostnameInput.value = ''
    await refresh()
  }
  finally {
    isRemoving.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <div class="mb-6">
      <h1 class="text-lg font-semibold text-surface-900 dark:text-surface-50">
        {{ t('settings.domain.title') }}
      </h1>
      <p class="text-sm text-surface-500 dark:text-surface-400 mt-0.5">
        {{ t('settings.domain.subtitle') }}
      </p>
    </div>

    <section class="rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 overflow-hidden mb-6">
      <div class="px-4 sm:px-6 py-5 border-b border-surface-200 dark:border-surface-800">
        <div class="flex items-center gap-3">
          <div class="flex items-center justify-center size-10 shrink-0 rounded-lg bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400">
            <Globe class="size-5" />
          </div>
          <div>
            <h2 class="text-base font-semibold text-surface-900 dark:text-surface-100">{{ t('settings.domain.canonicalTitle') }}</h2>
            <p class="text-sm text-surface-500 dark:text-surface-400">{{ t('settings.domain.canonicalSubtitle') }}</p>
          </div>
        </div>
      </div>
      <div class="px-4 sm:px-6 py-5 space-y-3 text-sm">
        <div>
          <span class="text-surface-500 dark:text-surface-400">{{ t('settings.domain.publicUrl') }}</span>
          <a :href="canonicalPublicUrl" target="_blank" rel="noopener" class="block font-mono text-brand-600 dark:text-brand-400 hover:underline">{{ canonicalPublicUrl }}</a>
        </div>
        <div>
          <span class="text-surface-500 dark:text-surface-400">{{ t('settings.domain.adminUrl') }}</span>
          <a :href="canonicalAdminUrl" target="_blank" rel="noopener" class="block font-mono text-brand-600 dark:text-brand-400 hover:underline">{{ canonicalAdminUrl }}</a>
        </div>
      </div>
    </section>

    <section class="rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 overflow-hidden">
      <div class="px-4 sm:px-6 py-5 border-b border-surface-200 dark:border-surface-800 flex items-center justify-between gap-3">
        <div>
          <h2 class="text-base font-semibold text-surface-900 dark:text-surface-100">{{ t('settings.domain.customTitle') }}</h2>
          <p class="text-sm text-surface-500 dark:text-surface-400">{{ t('settings.domain.customSubtitle') }}</p>
        </div>
        <span
          v-if="domain"
          class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
          :class="domain.status === 'verified'
            ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300'
            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'"
        >
          {{ statusLabel }}
        </span>
      </div>

      <div class="px-4 sm:px-6 py-5 space-y-5">
        <div>
          <label for="custom-hostname" class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
            {{ t('settings.domain.hostnameLabel') }}
          </label>
          <input
            id="custom-hostname"
            v-model="hostnameInput"
            type="text"
            :disabled="!canUpdateOrg || pending"
            placeholder="vagas.example.com"
            class="w-full rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 px-3 py-2 text-sm font-mono text-surface-900 dark:text-surface-100 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors disabled:opacity-60"
          />
        </div>

        <div v-if="domain" class="rounded-lg bg-surface-50 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700 p-4 text-sm space-y-3">
          <p class="font-medium text-surface-800 dark:text-surface-200">{{ t('settings.domain.dnsInstructions') }}</p>
          <div>
            <p class="text-surface-500 dark:text-surface-400 mb-1">CNAME</p>
            <code class="block text-xs font-mono bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded px-2 py-1.5">{{ domain.hostname }} → {{ cnameTarget }}</code>
          </div>
          <div>
            <p class="text-surface-500 dark:text-surface-400 mb-1">TXT (optional)</p>
            <code class="block text-xs font-mono bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded px-2 py-1.5 break-all">_reqcore-verify.{{ domain.hostname }} → reqcore-verify={{ domain.verificationToken }}</code>
          </div>
        </div>

        <p v-if="saveError" class="text-sm text-red-600 dark:text-red-400">{{ saveError }}</p>
        <p v-if="verifyMessage" class="text-sm" :class="verifySuccess ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'">
          {{ verifyMessage }}
        </p>

        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            :disabled="!canUpdateOrg || isSaving || !hostnameInput.trim()"
            class="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
            @click="handleSave"
          >
            <Loader2 v-if="isSaving" class="size-4 animate-spin" />
            {{ t('settings.domain.save') }}
          </button>
          <button
            v-if="domain"
            type="button"
            :disabled="!canUpdateOrg || isVerifying"
            class="inline-flex items-center gap-2 rounded-lg border border-surface-200 dark:border-surface-700 px-4 py-2 text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 disabled:opacity-50 transition-colors"
            @click="handleVerify"
          >
            <RefreshCw v-if="isVerifying" class="size-4 animate-spin" />
            <CheckCircle2 v-else class="size-4" />
            {{ t('settings.domain.verify') }}
          </button>
          <button
            v-if="domain"
            type="button"
            :disabled="!canUpdateOrg || isRemoving"
            class="inline-flex items-center gap-2 rounded-lg border border-red-200 dark:border-red-900 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50 transition-colors"
            @click="handleRemove"
          >
            <Trash2 v-if="!isRemoving" class="size-4" />
            <Loader2 v-else class="size-4 animate-spin" />
            {{ t('settings.domain.remove') }}
          </button>
        </div>
      </div>
    </section>
  </div>
</template>
