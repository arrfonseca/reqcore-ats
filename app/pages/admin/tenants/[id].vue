<script setup lang="ts">
import { Building2, Loader2, LogIn, Pause, Play, Archive } from 'lucide-vue-next'

definePageMeta({
  layout: 'saas',
  middleware: ['auth', 'require-saas-admin'],
})

const { t } = useI18n()
const localePath = useLocalePath()
const { platformPath } = useTenantPaths()
const route = useRoute()
const tenantId = computed(() => route.params.id as string)

const { switchOrgAsSaasAdmin } = useSaasAdmin()

const { data, pending, error, refresh } = await useFetch<{
  tenant: Record<string, unknown>
  subscription: Record<string, unknown>
  aiSettings: { allowOwnLlm: boolean }
}>(() => `/api/saas/tenants/${tenantId.value}`, {
  headers: useRequestHeaders(['cookie']),
})

const form = reactive({
  name: '',
  slug: '',
  legalName: '',
  taxId: '',
  phone: '',
  street: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'BR',
})

watch(data, (d) => {
  if (!d?.tenant) return
  const t = d.tenant
  form.name = String(t.name ?? '')
  form.slug = String(t.slug ?? '')
  form.legalName = String(t.legalName ?? '')
  form.taxId = String(t.taxId ?? '')
  form.phone = String(t.phone ?? '')
  form.street = String(t.street ?? '')
  form.city = String(t.city ?? '')
  form.state = String(t.state ?? '')
  form.postalCode = String(t.postalCode ?? '')
  form.country = String(t.country ?? 'BR')
}, { immediate: true })

const isSaving = ref(false)
const actionError = ref('')

async function saveProfile() {
  isSaving.value = true
  actionError.value = ''
  try {
    await $fetch(`/api/saas/tenants/${tenantId.value}`, {
      method: 'PATCH',
      body: { ...form },
    })
    await refresh()
  }
  catch (e: any) {
    actionError.value = e?.data?.statusMessage ?? t('common.errors.generic')
  }
  finally {
    isSaving.value = false
  }
}

async function runAction(action: 'suspend' | 'enable' | 'archive') {
  actionError.value = ''
  try {
    await $fetch(`/api/saas/tenants/${tenantId.value}/${action}`, { method: 'POST' })
    await refresh()
  }
  catch (e: any) {
    actionError.value = e?.data?.statusMessage ?? t('common.errors.generic')
  }
}

async function toggleDelegate() {
  const allow = !data.value?.aiSettings?.allowOwnLlm
  await $fetch(`/api/saas/platform-ai/tenants/${tenantId.value}`, {
    method: 'PATCH',
    body: { allowOwnLlm: allow },
  })
  await refresh()
}
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <NuxtLink :to="platformPath('tenants')" class="text-sm text-brand-600 hover:underline no-underline">
      ← {{ t('dashboard.saas.backToTenants') }}
    </NuxtLink>

    <div v-if="pending" class="py-12 flex justify-center">
      <Loader2 class="size-6 animate-spin text-surface-400" />
    </div>
    <p v-else-if="error" class="text-danger-500 text-sm mt-4">{{ t('common.errors.generic') }}</p>

    <template v-else-if="data?.tenant">
      <div class="flex flex-wrap items-start justify-between gap-4 mt-4">
        <div class="flex items-center gap-3">
          <Building2 class="size-8 text-brand-600" />
          <div>
            <h1 class="text-xl font-semibold text-surface-900 dark:text-surface-100">{{ data.tenant.name }}</h1>
            <p class="text-sm text-surface-500">{{ data.tenant.slug }} · {{ data.tenant.status }}</p>
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 border-0 cursor-pointer"
            @click="switchOrgAsSaasAdmin(tenantId)"
          >
            <LogIn class="size-4" />
            {{ t('dashboard.saas.openTenant') }}
          </button>
          <button
            v-if="data.tenant.status === 'active'"
            type="button"
            class="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 cursor-pointer"
            @click="runAction('suspend')"
          >
            <Pause class="size-4" />
            {{ t('dashboard.saas.suspend') }}
          </button>
          <button
            v-else-if="data.tenant.status === 'suspended'"
            type="button"
            class="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm border-surface-200 cursor-pointer"
            @click="runAction('enable')"
          >
            <Play class="size-4" />
            {{ t('dashboard.saas.enable') }}
          </button>
          <button
            v-if="data.tenant.status !== 'archived'"
            type="button"
            class="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm border-danger-200 text-danger-600 cursor-pointer"
            @click="runAction('archive')"
          >
            <Archive class="size-4" />
            {{ t('dashboard.saas.archive') }}
          </button>
        </div>
      </div>

      <p v-if="actionError" class="mt-3 text-sm text-danger-500">{{ actionError }}</p>

      <section class="mt-8 rounded-xl border border-surface-200 dark:border-surface-800 p-5 bg-white dark:bg-surface-900">
        <h2 class="text-sm font-semibold mb-4">{{ t('dashboard.saas.tenantProfile') }}</h2>
        <div class="grid gap-3 sm:grid-cols-2">
          <label class="block text-xs font-medium text-surface-500">{{ t('settings.organization.orgName') }}
            <input v-model="form.name" class="mt-1 w-full rounded-lg border border-surface-200 dark:border-surface-700 px-3 py-2 text-sm" />
          </label>
          <label class="block text-xs font-medium text-surface-500">CNPJ
            <input v-model="form.taxId" class="mt-1 w-full rounded-lg border border-surface-200 dark:border-surface-700 px-3 py-2 text-sm" />
          </label>
          <label class="block text-xs font-medium text-surface-500 sm:col-span-2">{{ t('dashboard.saas.legalName') }}
            <input v-model="form.legalName" class="mt-1 w-full rounded-lg border border-surface-200 dark:border-surface-700 px-3 py-2 text-sm" />
          </label>
          <label class="block text-xs font-medium text-surface-500">{{ t('dashboard.saas.phone') }}
            <input v-model="form.phone" class="mt-1 w-full rounded-lg border border-surface-200 dark:border-surface-700 px-3 py-2 text-sm" />
          </label>
          <label class="block text-xs font-medium text-surface-500">{{ t('dashboard.saas.country') }}
            <input v-model="form.country" maxlength="2" class="mt-1 w-full rounded-lg border border-surface-200 dark:border-surface-700 px-3 py-2 text-sm" />
          </label>
        </div>
        <button
          type="button"
          class="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white border-0 cursor-pointer disabled:opacity-50"
          :disabled="isSaving"
          @click="saveProfile"
        >
          {{ t('common.actions.save') }}
        </button>
      </section>

      <section class="mt-4 rounded-xl border border-surface-200 dark:border-surface-800 p-5 bg-white dark:bg-surface-900">
        <h2 class="text-sm font-semibold">{{ t('dashboard.saas.aiDelegate') }}</h2>
        <p class="text-xs text-surface-500 mt-1">{{ t('dashboard.saas.aiDelegateHint') }}</p>
        <label class="mt-3 flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            :checked="data.aiSettings?.allowOwnLlm"
            class="rounded border-surface-300"
            @change="toggleDelegate"
          />
          {{ t('dashboard.saas.allowOwnLlm') }}
        </label>
      </section>
    </template>
  </div>
</template>
