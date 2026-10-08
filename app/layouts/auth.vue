<script setup lang="ts">
import { Sun, Moon } from 'lucide-vue-next'
const { isDark, toggle: toggleColorMode } = useColorMode()
const { t } = useI18n()
const { branding } = useOrgBranding()

const brandName = computed(() => {
  if (branding.value.orgName) {
    return branding.value.orgName
  }
  return t('common.brand.name')
})

const brandTagline = computed(() => {
  const subtitle = branding.value.brandSubtitle?.trim()
  if (subtitle) return subtitle
  return t('auth.tagline')
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950 p-4 relative">
    <div class="absolute right-4 top-4 z-10 flex items-center gap-2">
      <ClientOnly>
        <button
          class="inline-flex items-center justify-center size-8 rounded-lg text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 transition-all duration-200 cursor-pointer border-0 bg-transparent"
          :title="isDark ? t('common.theme.switchToLight') : t('common.theme.switchToDark')"
          @click="toggleColorMode"
        >
          <Sun v-if="isDark" class="size-4" />
          <Moon v-else class="size-4" />
        </button>
        <template #fallback>
          <div class="size-8" aria-hidden="true" />
        </template>
      </ClientOnly>
    </div>
    <div class="w-full max-w-[540px] bg-white dark:bg-surface-900 rounded-lg shadow-sm dark:shadow-none dark:border dark:border-surface-800 p-8">
      <div class="text-center mb-8">
        <div class="flex justify-center mb-3">
          <OrgBrandedLogo class="w-[100px] h-auto max-w-[180px]" />
        </div>
        <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-100">{{ brandName }}</h1>
        <p v-if="brandTagline" class="text-sm text-surface-500 dark:text-surface-400 mt-1">{{ brandTagline }}</p>
      </div>
      <slot />
    </div>
  </div>
</template>
