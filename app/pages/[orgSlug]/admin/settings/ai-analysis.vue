<script setup lang="ts">
import { Brain, BarChart3, Settings, ChevronRight, Plus } from 'lucide-vue-next'

const { t } = useI18n()
const localePath = useLocalePath()
const { tenantPath, publicJobPath } = useTenantPaths()

definePageMeta({
  middleware: ['require-own-llm-ai-analysis'],
})

useSeoMeta({
  title: t('settings.aiAnalysis.seoTitle'),
  description: t('settings.aiAnalysis.seoDescription'),
})

const { analysis, chatbot, formatPurposeLabel, isAnalysisConfigured } = useEffectiveAi()
const { allowed: canManageAi } = usePermission({ scoring: ['create'] })
</script>

<template>
  <div class="mx-auto max-w-4xl">
    <div class="mb-6 flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h1 class="text-lg font-semibold text-surface-900 dark:text-surface-50">
          {{ t('settings.aiAnalysis.title') }}
        </h1>
        <p class="text-sm text-surface-500 dark:text-surface-400 mt-0.5">
          {{ t('settings.aiAnalysis.delegatedSubtitle') }}
        </p>
      </div>
      <NuxtLink
        v-if="canManageAi"
        :to="tenantPath('settings/ai/new')"
        class="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 transition-colors no-underline"
      >
        <Plus class="size-4" />
        {{ t('settings.ai.addModel') }}
      </NuxtLink>
    </div>

    <!-- Active models summary -->
    <div class="mb-6 rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-5">
      <div class="flex items-center gap-2.5 mb-4">
        <div class="flex size-8 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-950/40">
          <Brain class="size-4 text-brand-600 dark:text-brand-400" />
        </div>
        <h2 class="text-sm font-semibold text-surface-900 dark:text-surface-100">
          {{ t('settings.aiAnalysis.activeModels') }}
        </h2>
      </div>
      <dl class="grid gap-3 sm:grid-cols-2 text-sm">
        <div class="rounded-lg bg-surface-50 dark:bg-surface-800/50 px-3 py-2.5 border border-surface-100 dark:border-surface-700/50">
          <dt class="text-[11px] uppercase tracking-wide text-surface-500">{{ t('settings.aiAnalysis.analysisModel') }}</dt>
          <dd class="font-medium text-surface-800 dark:text-surface-100 truncate mt-0.5">
            {{ formatPurposeLabel(analysis) }}
          </dd>
        </div>
        <div class="rounded-lg bg-surface-50 dark:bg-surface-800/50 px-3 py-2.5 border border-surface-100 dark:border-surface-700/50">
          <dt class="text-[11px] uppercase tracking-wide text-surface-500">{{ t('settings.aiAnalysis.chatbotModel') }}</dt>
          <dd class="font-medium text-surface-800 dark:text-surface-100 truncate mt-0.5">
            {{ formatPurposeLabel(chatbot) }}
          </dd>
        </div>
      </dl>
      <p v-if="!isAnalysisConfigured" class="mt-3 text-sm text-amber-700 dark:text-amber-400">
        {{ t('settings.aiAnalysis.delegatedNotConfigured') }}
      </p>
    </div>

    <!-- Manage models -->
    <NuxtLink
      :to="tenantPath('settings/ai')"
      class="mb-6 flex items-center justify-between rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-4 no-underline hover:border-brand-300 dark:hover:border-brand-700 transition-colors group"
    >
      <div class="flex items-center gap-3">
        <div class="flex size-9 items-center justify-center rounded-lg bg-surface-100 dark:bg-surface-800">
          <Settings class="size-4 text-surface-500 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors" />
        </div>
        <div>
          <p class="text-sm font-medium text-surface-900 dark:text-surface-100">
            {{ t('settings.aiAnalysis.manageModels') }}
          </p>
          <p class="text-xs text-surface-500">{{ t('settings.aiAnalysis.manageModelsHint') }}</p>
        </div>
      </div>
      <ChevronRight class="size-4 text-surface-400 group-hover:text-brand-500 transition-colors" />
    </NuxtLink>

    <!-- Usage dashboard -->
    <NuxtLink
      :to="tenantPath('ai-analysis')"
      class="flex items-center justify-between rounded-xl border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 p-4 no-underline hover:border-brand-300 dark:hover:border-brand-700 transition-colors group"
    >
      <div class="flex items-center gap-3">
        <div class="flex size-9 items-center justify-center rounded-lg bg-surface-100 dark:bg-surface-800">
          <BarChart3 class="size-4 text-surface-500 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors" />
        </div>
        <div>
          <p class="text-sm font-medium text-surface-900 dark:text-surface-100">
            {{ t('settings.aiAnalysis.usageDashboard') }}
          </p>
          <p class="text-xs text-surface-500">{{ t('settings.aiAnalysis.usageDashboardHint') }}</p>
        </div>
      </div>
      <ChevronRight class="size-4 text-surface-400 group-hover:text-brand-500 transition-colors" />
    </NuxtLink>
  </div>
</template>
