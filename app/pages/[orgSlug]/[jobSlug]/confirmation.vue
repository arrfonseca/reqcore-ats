<script setup lang="ts">
import { CheckCircle } from 'lucide-vue-next'

definePageMeta({
  layout: 'public-job',
  publicPageHeading: 'jobs.confirmation.pageHeading',
})

const route = useRoute()
const orgSlug = computed(() => route.params.orgSlug as string)
const jobSlug = computed(() => route.params.jobSlug as string)
const { t } = useI18n()
const { track } = useTrack()
const { publicBasePath } = useTenantPaths()

onMounted(() => track('application_confirmed', { slug: jobSlug.value }))

const { data: job } = useFetch(
  () => `/api/public/orgs/${orgSlug.value}/jobs/${jobSlug.value}`,
  { key: computed(() => `public-job-confirm-${orgSlug.value}-${jobSlug.value}`) },
)

const companyHomeUrl = useCompanyHomeUrl(computed(() => job.value?.companyWebsiteUrl))

useSeoMeta({
  title: t('jobs.confirmation.seoTitle'),
  robots: 'noindex, nofollow',
})
</script>

<template>
  <div class="text-center py-12">
    <div class="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-success-100 dark:bg-success-900">
      <CheckCircle class="size-8 text-success-600" />
    </div>

    <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-100 mb-2">
      {{ t('jobs.confirmation.title') }}
    </h1>

    <p class="text-surface-600 dark:text-surface-400 max-w-md mx-auto mb-2">
      {{ t('jobs.confirmation.thankYou') }}
      <template v-if="job">
        {{ t('jobs.confirmation.forPositionPrefix') }} <strong>{{ job.title }}</strong> {{ t('jobs.confirmation.forPositionSuffix') }}
      </template>.
    </p>

    <p class="text-sm text-surface-400 max-w-md mx-auto mb-8">
      {{ t('jobs.confirmation.body') }}
    </p>

    <div class="flex flex-col sm:flex-row items-center justify-center gap-3">
      <NuxtLink
        :to="publicBasePath()"
        class="inline-flex items-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
      >
        {{ t('jobs.confirmation.browseMore') }}
      </NuxtLink>
      <a
        :href="companyHomeUrl"
        class="inline-flex items-center rounded-lg border border-surface-300 dark:border-surface-700 px-4 py-2 text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
      >
        {{ t('common.actions.backToHome') }}
      </a>
    </div>
  </div>
</template>
