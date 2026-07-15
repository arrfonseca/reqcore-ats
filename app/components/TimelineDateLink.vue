<script setup lang="ts">
const { tenantPath, platformPath } = useTenantPaths()
import { History } from 'lucide-vue-next'

const props = defineProps<{
  date: string | Date
}>()

const { t } = useI18n()
const localePath = useLocalePath()

const timelineUrl = computed(() => {
  const d = typeof props.date === 'string' ? props.date : props.date.toISOString()
  const dateKey = d.slice(0, 10)
  return tenantPath(`timeline?date=${dateKey}`)
})
</script>

<template>
  <NuxtLink
    :to="timelineUrl"
    class="group/tl inline-flex items-center gap-1 transition-colors hover:text-brand-600 dark:hover:text-brand-400"
    :title="t('common.timeline.viewInTimeline')"
  >
    <slot />
    <History class="size-3 opacity-0 group-hover/tl:opacity-60 transition-opacity shrink-0" />
  </NuxtLink>
</template>
