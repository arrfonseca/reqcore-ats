<script setup lang="ts">
const { tenantPath, platformPath } = useTenantPaths()
/**
 * ChatbotSourcesPanel
 *
 * Right rail of the chatbot page. Lists every entity the assistant cited
 * during the current conversation, grouped by kind, with deep links into
 * the dashboard. Sources come from the shared composable's `sources` array,
 * which is populated by `source` SSE events from /api/chatbot/chat.
 *
 * The panel intentionally stays purely presentational — it never mutates
 * the source list, and silently disappears when there are no citations.
 */
import { Briefcase, User, FileText, ClipboardList, X, BookOpen } from 'lucide-vue-next'
import type { ChatbotSource, ChatbotSourceKind } from '~~/shared/chatbot'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const { sources } = useChatbot()
const { t } = useI18n()

const kindMeta = computed(() => ({
  job: { label: t('components.chatbotSourcesPanel.kinds.job'), icon: Briefcase },
  candidate: { label: t('components.chatbotSourcesPanel.kinds.candidate'), icon: User },
  application: { label: t('components.chatbotSourcesPanel.kinds.application'), icon: ClipboardList },
  document: { label: t('components.chatbotSourcesPanel.kinds.document'), icon: FileText },
  attachment: { label: t('components.chatbotSourcesPanel.kinds.attachment'), icon: FileText },
} satisfies Record<ChatbotSourceKind, { label: string; icon: unknown }>))

const grouped = computed(() => {
  const out: Record<ChatbotSourceKind, ChatbotSource[]> = {
    job: [], candidate: [], application: [], document: [], attachment: [],
  }
  for (const s of sources.value) out[s.kind].push(s)
  return out
})

function hrefFor(s: ChatbotSource): string | null {
  switch (s.kind) {
    case 'job': return tenantPath(`jobs/${s.entityId}`)
    case 'candidate': return tenantPath(`candidates/${s.entityId}`)
    case 'application': return tenantPath(`applications/${s.entityId}`)
    case 'document': return null
    case 'attachment': return null
  }
}
</script>

<template>
  <aside
    v-if="open"
    class="flex h-full w-80 shrink-0 flex-col border-l border-surface-200 dark:border-surface-800 bg-surface-50/60 dark:bg-surface-950/40"
  >
    <div class="flex h-14 shrink-0 items-center justify-between border-b border-surface-200 dark:border-surface-800 px-4">
      <div class="flex items-center gap-2">
        <BookOpen class="size-4 text-brand-500" />
        <h2 class="text-sm font-semibold text-surface-800 dark:text-surface-100">
          {{ t('components.chatbotSourcesPanel.title') }}
        </h2>
        <span
          v-if="sources.length"
          class="rounded-full bg-brand-100 dark:bg-brand-900/40 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700 dark:text-brand-300"
        >
          {{ sources.length }}
        </span>
      </div>
      <button
        class="inline-flex size-7 items-center justify-center rounded text-surface-500 hover:bg-surface-200 dark:hover:bg-surface-800 cursor-pointer border-0 bg-transparent"
        @click="emit('close')"
      >
        <X class="size-4" />
      </button>
    </div>

    <div class="flex-1 min-h-0 overflow-y-auto p-3 space-y-4">
      <div v-if="sources.length === 0" class="text-xs italic text-surface-500 px-2 py-4 text-center">
        {{ t('components.chatbotSourcesPanel.empty') }}
      </div>

      <template v-for="(items, kind) in grouped" :key="kind">
        <div v-if="items.length > 0">
          <div class="mb-2 flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-surface-500">
            <component :is="kindMeta[kind].icon" class="size-3" />
            {{ kindMeta[kind].label }}
            <span class="ml-auto rounded-full bg-surface-200 dark:bg-surface-800 px-1.5 text-[10px] text-surface-600 dark:text-surface-300">
              {{ items.length }}
            </span>
          </div>
          <ul class="space-y-1">
            <li v-for="s in items" :key="s.id">
              <NuxtLink
                v-if="hrefFor(s)"
                :to="hrefFor(s)!"
                class="flex items-start gap-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 px-2.5 py-2 text-sm hover:border-brand-300 dark:hover:border-brand-700 hover:bg-brand-50/40 dark:hover:bg-brand-950/20 transition-colors cursor-pointer"
              >
                <component :is="kindMeta[kind].icon" class="size-3.5 mt-0.5 shrink-0 text-brand-500" />
                <div class="min-w-0 flex-1">
                  <div class="truncate font-medium text-surface-800 dark:text-surface-100">
                    {{ s.label }}
                  </div>
                  <div v-if="s.detail" class="truncate text-xs text-surface-500 dark:text-surface-400">
                    {{ s.detail }}
                  </div>
                </div>
              </NuxtLink>
              <div
                v-else
                class="flex items-start gap-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 px-2.5 py-2 text-sm"
              >
                <component :is="kindMeta[kind].icon" class="size-3.5 mt-0.5 shrink-0 text-brand-500" />
                <div class="min-w-0 flex-1">
                  <div class="truncate font-medium text-surface-800 dark:text-surface-100">
                    {{ s.label }}
                  </div>
                  <div v-if="s.detail" class="truncate text-xs text-surface-500 dark:text-surface-400">
                    {{ s.detail }}
                  </div>
                </div>
              </div>
            </li>
          </ul>
        </div>
      </template>
    </div>
  </aside>
</template>
