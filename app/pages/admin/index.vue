<script setup lang="ts">
import { Loader2, AlertCircle, Building2, Coins, DollarSign } from 'lucide-vue-next'

definePageMeta({
  layout: 'saas',
  middleware: ['auth', 'require-saas-admin'],
})

const { t } = useI18n()

useSeoMeta({
  title: t('dashboard.saas.seoTitle'),
  description: t('dashboard.saas.seoDescription'),
})

const days = ref(30)

const { data, pending, error, refresh } = await useFetch('/api/saas/analytics/dashboard', {
  headers: useRequestHeaders(['cookie']),
  query: computed(() => ({ days: days.value })),
})

type ChartSeries = {
  key: string
  label: string
  color: string
  values: number[]
  total: number
}

const chartSeries = computed<ChartSeries[]>(() => {
  if (!data.value) return []
  const daily = data.value.daily
  const totals = data.value.totals
  return [
    { key: 'visits', label: t('dashboard.saas.metrics.visits'), color: 'bg-blue-500', values: daily.map(d => d.visits), total: totals.visits },
    { key: 'candidates', label: t('dashboard.saas.metrics.candidates'), color: 'bg-violet-500', values: daily.map(d => d.candidates), total: totals.candidates },
    { key: 'resumesProcessed', label: t('dashboard.saas.metrics.resumesProcessed'), color: 'bg-teal-500', values: daily.map(d => d.resumesProcessed), total: totals.resumesProcessed },
    { key: 'aiAnalyses', label: t('dashboard.saas.metrics.aiAnalyses'), color: 'bg-amber-500', values: daily.map(d => d.aiAnalyses), total: totals.aiAnalyses },
    { key: 'chatbotSessions', label: t('dashboard.saas.metrics.chatbotSessions'), color: 'bg-pink-500', values: daily.map(d => d.chatbotSessions), total: totals.chatbotSessions },
    { key: 'candidatesApproved', label: t('dashboard.saas.metrics.candidatesApproved'), color: 'bg-green-600', values: daily.map(d => d.candidatesApproved), total: totals.candidatesApproved },
  ]
})

const tokenSeries = computed(() => {
  if (!data.value) return null
  const daily = data.value.daily
  const totals = data.value.totals
  return {
    prompt: daily.map(d => d.promptTokens),
    completion: daily.map(d => d.completionTokens),
    cost: daily.map(d => d.aiCostUsd),
    totalPrompt: totals.promptTokens,
    totalCompletion: totals.completionTokens,
    totalCost: totals.aiCostUsd,
  }
})

const maxChartValue = computed(() => {
  const all = chartSeries.value.flatMap(s => s.values)
  return Math.max(...all, 1)
})

const maxTokenValue = computed(() => {
  if (!tokenSeries.value) return 1
  const all = tokenSeries.value.prompt.map((p, i) => p + (tokenSeries.value!.completion[i] ?? 0))
  return Math.max(...all, 1)
})

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function formatUsd(n: number | null): string {
  if (n == null) return '—'
  if (n < 0.01) return '< $0.01'
  return `$${n.toFixed(2)}`
}

function formatDay(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function barHeight(value: number, max: number): string {
  const pct = Math.max(4, Math.round((value / max) * 100))
  return `${pct}%`
}

watch(days, () => refresh())
</script>

<template>
  <div class="mx-auto max-w-6xl">
    <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
      <div>
        <h1 class="text-xl font-semibold text-surface-900 dark:text-surface-100">
          {{ t('dashboard.saas.dashboardTitle') }}
        </h1>
        <p class="text-sm text-surface-500 dark:text-surface-400 mt-1">
          {{ t('dashboard.saas.dashboardSubtitle') }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <label class="text-xs text-surface-500">{{ t('dashboard.saas.period') }}</label>
        <select
          v-model.number="days"
          class="rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 px-3 py-1.5 text-sm"
        >
          <option :value="7">7 {{ t('dashboard.saas.days') }}</option>
          <option :value="30">30 {{ t('dashboard.saas.days') }}</option>
          <option :value="90">90 {{ t('dashboard.saas.days') }}</option>
        </select>
      </div>
    </div>

    <div v-if="pending" class="py-16 flex justify-center">
      <Loader2 class="size-6 animate-spin text-surface-400" />
    </div>

    <div
      v-else-if="error"
      class="rounded-xl border border-danger-200 dark:border-danger-900 bg-danger-50 dark:bg-danger-950/40 p-4 text-sm text-danger-700 dark:text-danger-400 flex items-center gap-2"
    >
      <AlertCircle class="size-4 shrink-0" />
      {{ t('dashboard.saas.dashboardLoadFailed') }}
    </div>

    <template v-else-if="data">
      <!-- Summary cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div class="rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-4">
          <div class="flex items-center gap-2 text-surface-500 dark:text-surface-400 text-xs mb-2">
            <Building2 class="size-3.5" />
            {{ t('dashboard.saas.totalTenants') }}
          </div>
          <div class="text-2xl font-bold">{{ formatNumber(data.totals.tenants) }}</div>
        </div>
        <div class="rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-4">
          <div class="flex items-center gap-2 text-surface-500 dark:text-surface-400 text-xs mb-2">
            <Coins class="size-3.5" />
            {{ t('dashboard.saas.metrics.aiTokens') }}
          </div>
          <div class="text-2xl font-bold">{{ formatNumber(data.totals.promptTokens + data.totals.completionTokens) }}</div>
        </div>
        <div class="rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-4">
          <div class="flex items-center gap-2 text-surface-500 dark:text-surface-400 text-xs mb-2">
            <DollarSign class="size-3.5" />
            {{ t('dashboard.saas.metrics.aiCost') }}
          </div>
          <div class="text-2xl font-bold">{{ formatUsd(data.totals.aiCostUsd) }}</div>
        </div>
        <div class="rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-4">
          <div class="flex items-center gap-2 text-surface-500 dark:text-surface-400 text-xs mb-2">
            <DollarSign class="size-3.5" />
            {{ t('dashboard.saas.metrics.revenue') }}
          </div>
          <div class="text-2xl font-bold">{{ formatUsd(data.totals.revenueUsd) }}</div>
          <p class="text-[10px] text-surface-400 mt-1">{{ t('dashboard.saas.revenuePending') }}</p>
        </div>
      </div>

      <!-- Usage bar charts -->
      <div class="space-y-6">
        <section
          v-for="series in chartSeries"
          :key="series.key"
          class="rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-5"
        >
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-sm font-semibold text-surface-900 dark:text-surface-100">{{ series.label }}</h2>
            <span class="text-lg font-bold text-surface-900 dark:text-surface-100">{{ formatNumber(series.total) }}</span>
          </div>
          <div class="flex items-end gap-0.5 h-28 overflow-x-auto pb-1">
            <div
              v-for="(value, idx) in series.values"
              :key="idx"
              class="flex-1 min-w-[6px] max-w-3 group relative"
            >
              <div
                class="w-full rounded-t transition-all"
                :class="series.color"
                :style="{ height: barHeight(value, maxChartValue) }"
              />
              <span class="sr-only">{{ formatDay(data.daily[idx]!.date) }}: {{ value }}</span>
            </div>
          </div>
          <div class="flex justify-between text-[10px] text-surface-400 mt-2">
            <span>{{ formatDay(data.daily[0]!.date) }}</span>
            <span>{{ formatDay(data.daily[data.daily.length - 1]!.date) }}</span>
          </div>
        </section>

        <!-- AI tokens chart -->
        <section
          v-if="tokenSeries"
          class="rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-5"
        >
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-sm font-semibold text-surface-900 dark:text-surface-100">{{ t('dashboard.saas.metrics.aiTokensDaily') }}</h2>
            <span class="text-xs text-surface-500">
              {{ formatNumber(tokenSeries.totalPrompt + tokenSeries.totalCompletion) }} {{ t('dashboard.saas.metrics.total') }}
            </span>
          </div>
          <div class="flex items-end gap-0.5 h-28 overflow-x-auto pb-1">
            <div
              v-for="(_, idx) in tokenSeries.prompt"
              :key="idx"
              class="flex-1 min-w-[6px] max-w-3 flex flex-col justify-end gap-px"
            >
              <div
                class="w-full bg-brand-500 rounded-t"
                :style="{ height: barHeight(tokenSeries.prompt[idx]! + tokenSeries.completion[idx]!, maxTokenValue) }"
              />
            </div>
          </div>
          <div class="flex justify-between text-[10px] text-surface-400 mt-2">
            <span>{{ formatDay(data.daily[0]!.date) }}</span>
            <span>{{ formatDay(data.daily[data.daily.length - 1]!.date) }}</span>
          </div>
        </section>
      </div>
    </template>
  </div>
</template>
