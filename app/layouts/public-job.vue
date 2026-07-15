<script setup lang="ts">
const route = useRoute()
const { t } = useI18n()
const { branding } = useOrgBranding()

const pageHeadingKey = computed(
  () => (route.meta.publicPageHeading as string | undefined) ?? 'jobs.detail.pageHeading',
)

const brandName = computed(() => {
  if (branding.value.hasOrgLogo && branding.value.orgName) {
    return branding.value.orgName
  }
  return t(pageHeadingKey.value)
})
</script>

<template>
  <div class="min-h-screen bg-surface-50 dark:bg-surface-950">
    <header class="flex flex-col items-center gap-[0.3rem] px-4 pt-4 pb-6">
      <div class="w-full max-w-[210px]">
        <OrgBrandedLogo class="w-full h-auto" :title="brandName" />
      </div>
      <p class="text-[15px] font-bold text-surface-900 dark:text-surface-100 tracking-tight text-center">
        {{ brandName }}
      </p>
    </header>

    <main class="mx-auto max-w-3xl px-4 sm:px-6 pb-12">
      <slot />
    </main>
  </div>
</template>
