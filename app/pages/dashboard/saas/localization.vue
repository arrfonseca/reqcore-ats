<script setup lang="ts">
definePageMeta({ layout: 'saas', middleware: ['auth', 'require-saas-admin'] })
const { t } = useI18n()
const { data, pending, refresh } = await useFetch('/api/saas/localization', { headers: useRequestHeaders(['cookie']) })

const edit = reactive({
  countryCode: 'BR',
  nameDisplayFormat: 'first_last' as 'first_last' | 'last_first',
  dateFormat: 'dmy' as 'mdy' | 'dmy' | 'ymd',
  defaultLanguage: 'pt-BR',
})

watch(data, (d) => {
  const br = d?.locales?.find((l: { countryCode: string }) => l.countryCode === 'BR')
  if (br) {
    edit.countryCode = br.countryCode
    edit.nameDisplayFormat = br.nameDisplayFormat
    edit.dateFormat = br.dateFormat
    edit.defaultLanguage = br.defaultLanguage
  }
}, { immediate: true })

async function save() {
  await $fetch('/api/saas/localization', { method: 'PUT', body: { ...edit } })
  await refresh()
}
</script>

<template>
  <div class="max-w-lg">
    <h1 class="text-xl font-semibold">{{ t('dashboard.saas.nav.localization') }}</h1>
    <p class="text-sm text-surface-500 mt-1">{{ t('dashboard.saas.localizationHint') }}</p>
    <div v-if="pending" class="py-8">{{ t('common.actions.loading') }}</div>
    <form v-else class="mt-6 space-y-3" @submit.prevent="save">
      <label class="block text-sm">
        {{ t('dashboard.saas.country') }}
        <input v-model="edit.countryCode" maxlength="2" class="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
      </label>
      <label class="block text-sm">
        {{ t('settings.localization.nameFormat') }}
        <select v-model="edit.nameDisplayFormat" class="mt-1 w-full rounded-lg border px-3 py-2 text-sm">
          <option value="first_last">{{ t('settings.localization.firstLast') }}</option>
          <option value="last_first">{{ t('settings.localization.lastFirst') }}</option>
        </select>
      </label>
      <label class="block text-sm">
        {{ t('settings.localization.dateFormat') }}
        <select v-model="edit.dateFormat" class="mt-1 w-full rounded-lg border px-3 py-2 text-sm">
          <option value="mdy">MDY</option>
          <option value="dmy">DMY</option>
          <option value="ymd">YMD</option>
        </select>
      </label>
      <button type="submit" class="rounded-lg bg-brand-600 text-white px-4 py-2 text-sm border-0 cursor-pointer">
        {{ t('common.actions.save') }}
      </button>
    </form>
  </div>
</template>
