<script setup lang="ts">
const { t } = useI18n()

const emit = defineEmits<{
  select: [templateId: string]
}>()

const {
  iscoCategories,
  universalTemplates,
  templatesForCategory,
  hasTemplatesForCategory,
  comingSoonLabel,
  sectionUniversal,
  sectionIsco,
} = useScoringCriteriaTemplates()

const selectedCategoryId = ref<string | null>(null)
const selectedTemplateId = ref<string | null>(null)

const categoryTemplates = computed(() => {
  if (!selectedCategoryId.value) return []
  return templatesForCategory(selectedCategoryId.value)
})

function selectUniversal(templateId: string) {
  selectedCategoryId.value = null
  selectedTemplateId.value = templateId
  emit('select', templateId)
}

function selectCategory(categoryId: string) {
  selectedCategoryId.value = categoryId
  selectedTemplateId.value = null
}

function selectCategoryTemplate(templateId: string) {
  selectedTemplateId.value = templateId
  emit('select', templateId)
}
</script>

<template>
  <div class="space-y-6">
    <!-- Universal rubrics -->
    <div>
      <h4 class="text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400 mb-3">
        {{ sectionUniversal }}
      </h4>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          v-for="tmpl in universalTemplates"
          :key="tmpl.id"
          type="button"
          class="p-4 rounded-lg border text-left transition-all"
          :class="selectedTemplateId === tmpl.id && !selectedCategoryId
            ? 'border-brand-400 dark:border-brand-600 bg-brand-50 dark:bg-brand-950/30'
            : 'border-surface-200 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-800/50'"
          @click="selectUniversal(tmpl.id)"
        >
          <span class="block text-sm font-medium text-surface-900 dark:text-surface-100">{{ tmpl.label }}</span>
          <span class="text-xs text-surface-500 dark:text-surface-400 mt-0.5 block">{{ tmpl.description }}</span>
          <span class="text-[10px] text-surface-400 mt-1 block">
            {{ tmpl.criteria.length }} {{ tmpl.criteria.length === 1 ? t('scoring.criterion') : t('scoring.criteria') }}
          </span>
        </button>
      </div>
    </div>

    <!-- ISCO occupation categories -->
    <div>
      <h4 class="text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400 mb-3">
        {{ sectionIsco }}
      </h4>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        <button
          v-for="cat in iscoCategories"
          :key="cat.id"
          type="button"
          class="p-3 rounded-lg border text-left transition-all"
          :class="selectedCategoryId === cat.id
            ? 'border-brand-400 dark:border-brand-600 bg-brand-50/50 dark:bg-brand-950/20'
            : 'border-surface-200 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-800/50'"
          @click="selectCategory(cat.id)"
        >
          <span class="block text-sm font-medium text-surface-900 dark:text-surface-100 leading-snug">{{ cat.label }}</span>
          <span
            v-if="cat.description"
            class="text-[11px] text-surface-500 dark:text-surface-400 mt-0.5 line-clamp-2"
          >{{ cat.description }}</span>
        </button>
      </div>

      <!-- Sub-templates for selected category -->
      <div v-if="selectedCategoryId" class="mt-4 pl-1">
        <div v-if="hasTemplatesForCategory(selectedCategoryId)" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            v-for="tmpl in categoryTemplates"
            :key="tmpl.id"
            type="button"
            class="p-4 rounded-lg border text-left transition-all"
            :class="selectedTemplateId === tmpl.id
              ? 'border-brand-400 dark:border-brand-600 bg-brand-50 dark:bg-brand-950/30'
              : 'border-surface-200 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-800/50'"
            @click="selectCategoryTemplate(tmpl.id)"
          >
            <span class="block text-sm font-medium text-surface-900 dark:text-surface-100">{{ tmpl.label }}</span>
            <span class="text-xs text-surface-500 dark:text-surface-400 mt-0.5 block">{{ tmpl.description }}</span>
            <span class="text-[10px] text-surface-400 mt-1 block">
              {{ tmpl.criteria.length }} {{ tmpl.criteria.length === 1 ? t('scoring.criterion') : t('scoring.criteria') }}
            </span>
          </button>
        </div>
        <p
          v-else
          class="text-sm text-surface-500 dark:text-surface-400 py-3 px-4 rounded-lg border border-dashed border-surface-200 dark:border-surface-700"
        >
          {{ comingSoonLabel }}
        </p>
      </div>
    </div>
  </div>
</template>
