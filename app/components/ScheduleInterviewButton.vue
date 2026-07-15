<script setup lang="ts">
import { Calendar, ExternalLink } from 'lucide-vue-next'
import {
  resolveScheduleInterviewAction,
  type InterviewActionSource,
  type ScheduleInterviewActionMode,
} from '~/utils/scheduleInterviewAction'

const props = withDefaults(defineProps<{
  applicationId: string
  /** Optional preloaded interviews — preferred over the internal fetch when provided */
  interviews?: InterviewActionSource[] | null
  variant?: 'pill' | 'compact' | 'default'
}>(), {
  interviews: null,
  variant: 'pill',
})

const emit = defineEmits<{
  schedule: []
}>()

const { t } = useI18n()
const { tenantPath } = useTenantPaths()

const { data: fetched, refresh } = useFetch<{ data: InterviewActionSource[] }>(
  '/api/interviews',
  {
    key: computed(() => `interviews-by-app-${props.applicationId}`),
    query: computed(() => ({
      applicationId: props.applicationId,
      limit: 50,
    })),
    headers: useRequestHeaders(['cookie']),
    watch: [() => props.applicationId],
  },
)

const sourceInterviews = computed<InterviewActionSource[]>(() => {
  if (props.interviews) return props.interviews
  return fetched.value?.data ?? []
})

const action = computed(() => resolveScheduleInterviewAction(sourceInterviews.value))

const label = computed(() => {
  switch (action.value.mode) {
    case 'scheduled':
      return t('dashboard.interviews.scheduleAction.scheduled')
    case 'schedule_new':
      return t('dashboard.interviews.scheduleAction.scheduleNew')
    default:
      return t('dashboard.interviews.scheduleAction.schedule')
  }
})

const variantClass = computed(() => {
  if (props.variant === 'compact') {
    return 'rounded-lg px-2.5 py-1.5 text-xs sm:text-sm'
  }
  if (props.variant === 'default') {
    return 'rounded-lg px-3.5 py-2 text-xs font-semibold'
  }
  return 'rounded-full px-3.5 py-1.5 text-sm'
})

const modeClass = computed(() => {
  const mode: ScheduleInterviewActionMode = action.value.mode
  if (mode === 'scheduled') {
    return 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/60'
  }
  if (mode === 'schedule_new') {
    return 'border-amber-300 bg-amber-50/80 text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200 dark:hover:bg-amber-950/50'
  }
  // schedule — yellow glow when nothing is actively booked
  return [
    'border-amber-400 bg-amber-100 text-amber-950',
    'shadow-[0_0_0_1px_rgba(251,191,36,0.55),0_0_16px_rgba(245,158,11,0.55)]',
    'hover:bg-amber-200 hover:shadow-[0_0_0_1px_rgba(245,158,11,0.7),0_0_22px_rgba(245,158,11,0.65)]',
    'dark:border-amber-500 dark:bg-amber-400/20 dark:text-amber-100',
    'dark:shadow-[0_0_0_1px_rgba(245,158,11,0.45),0_0_18px_rgba(245,158,11,0.4)]',
    'animate-[schedule-glow_2.4s_ease-in-out_infinite]',
  ].join(' ')
})

defineExpose({ refresh })
</script>

<template>
  <NuxtLink
    v-if="action.mode === 'scheduled' && action.interviewId"
    :to="tenantPath(`interviews/${action.interviewId}`)"
    class="inline-flex cursor-pointer items-center gap-1.5 border font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
    :class="[variantClass, modeClass]"
  >
    <Calendar class="size-3.5 shrink-0" />
    <span>{{ label }}</span>
    <ExternalLink class="size-3 shrink-0 opacity-70" />
  </NuxtLink>

  <button
    v-else
    type="button"
    class="inline-flex cursor-pointer items-center gap-1.5 border font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
    :class="[variantClass, modeClass]"
    :title="label"
    @click="emit('schedule')"
  >
    <Calendar class="size-3.5 shrink-0" />
    <span>{{ label }}</span>
  </button>
</template>

<style scoped>
@keyframes schedule-glow {
  0%,
  100% {
    box-shadow:
      0 0 0 1px rgba(251, 191, 36, 0.55),
      0 0 12px rgba(245, 158, 11, 0.45);
  }
  50% {
    box-shadow:
      0 0 0 1px rgba(245, 158, 11, 0.8),
      0 0 22px rgba(245, 158, 11, 0.7);
  }
}
</style>
