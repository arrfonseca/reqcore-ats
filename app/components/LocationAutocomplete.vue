<script setup lang="ts">
import { MapPin } from 'lucide-vue-next'
import type { StandardLocation } from '~~/shared/location'

const props = withDefaults(defineProps<{
  modelValue: string
  id?: string
  placeholder?: string
  disabled?: boolean
  /** ISO 3166-1 alpha-2 bias for search (default: br) */
  countryBias?: string
  inputClass?: string
}>(), {
  countryBias: 'br',
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  select: [location: StandardLocation]
}>()

const { t } = useI18n()

const inputId = computed(() => props.id ?? 'location-autocomplete')
const inputValue = ref(props.modelValue)
const isOpen = ref(false)
const activeIndex = ref(-1)
const rootRef = ref<HTMLElement | null>(null)
const suggestions = ref<StandardLocation[]>([])
const isLoading = ref(false)

watch(() => props.modelValue, (val) => {
  if (val !== inputValue.value) inputValue.value = val
})

const debouncedQuery = ref('')
let debounceTimer: ReturnType<typeof setTimeout>

watch(inputValue, (val) => {
  emit('update:modelValue', val)
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debouncedQuery.value = val.trim()
    if (debouncedQuery.value.length >= 2) {
      isOpen.value = true
      activeIndex.value = -1
    } else {
      isOpen.value = false
      suggestions.value = []
    }
  }, 300)
})

watch(debouncedQuery, async (q) => {
  if (q.length < 2) {
    suggestions.value = []
    return
  }
  isLoading.value = true
  try {
    const res = await $fetch<{ results: StandardLocation[] }>('/api/locations/search', {
      query: { q, country: props.countryBias },
    })
    suggestions.value = res.results
  } catch {
    suggestions.value = []
  } finally {
    isLoading.value = false
  }
})

const showDropdown = computed(() => isOpen.value && debouncedQuery.value.length >= 2 && !props.disabled)

function selectSuggestion(item: StandardLocation) {
  inputValue.value = item.label
  emit('update:modelValue', item.label)
  emit('select', item)
  isOpen.value = false
  activeIndex.value = -1
}

function onInputFocus() {
  if (inputValue.value.trim().length >= 2) isOpen.value = true
}

function onInputBlur() {
  window.setTimeout(() => {
    isOpen.value = false
  }, 150)
}

function onKeydown(event: KeyboardEvent) {
  if (!showDropdown.value || suggestions.value.length === 0) return

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    activeIndex.value = Math.min(activeIndex.value + 1, suggestions.value.length - 1)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    activeIndex.value = Math.max(activeIndex.value - 1, 0)
  } else if (event.key === 'Enter' && activeIndex.value >= 0) {
    event.preventDefault()
    const item = suggestions.value[activeIndex.value]
    if (item) selectSuggestion(item)
  } else if (event.key === 'Escape') {
    isOpen.value = false
  }
}

onMounted(() => {
  const onClickOutside = (e: MouseEvent) => {
    if (rootRef.value && !rootRef.value.contains(e.target as Node)) {
      isOpen.value = false
    }
  }
  document.addEventListener('click', onClickOutside)
  onUnmounted(() => document.removeEventListener('click', onClickOutside))
})

const defaultInputClass = 'w-full rounded-lg border px-3 py-2.5 text-sm text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors border-surface-300 dark:border-surface-700'
</script>

<template>
  <div ref="rootRef" class="relative">
    <div class="relative">
      <MapPin class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-surface-400" />
      <input
        :id="inputId"
        v-model="inputValue"
        type="text"
        role="combobox"
        :aria-expanded="showDropdown"
        aria-autocomplete="list"
        :aria-controls="`${inputId}-listbox`"
        :placeholder="placeholder ?? t('components.locationAutocomplete.placeholder')"
        :disabled="disabled"
        :class="[inputClass ?? defaultInputClass, 'pl-10']"
        autocomplete="off"
        @focus="onInputFocus"
        @blur="onInputBlur"
        @keydown="onKeydown"
      >
    </div>

    <ul
      v-if="showDropdown"
      :id="`${inputId}-listbox`"
      role="listbox"
      class="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-surface-200 bg-white py-1 shadow-lg dark:border-surface-700 dark:bg-surface-900"
    >
      <li v-if="isLoading" class="px-3 py-2 text-sm text-surface-500">
        {{ t('components.locationAutocomplete.searching') }}
      </li>
      <li
        v-else-if="suggestions.length === 0"
        class="px-3 py-2 text-sm text-surface-500"
      >
        {{ t('components.locationAutocomplete.noResults') }}
      </li>
      <li
        v-for="(item, index) in suggestions"
        :key="item.label"
        role="option"
        :aria-selected="index === activeIndex"
      >
        <button
          type="button"
          class="flex w-full items-start gap-2 px-3 py-2 text-left text-sm transition-colors"
          :class="index === activeIndex
            ? 'bg-brand-50 text-brand-900 dark:bg-brand-950/50 dark:text-brand-100'
            : 'text-surface-800 hover:bg-surface-50 dark:text-surface-200 dark:hover:bg-surface-800'"
          @mousedown.prevent="selectSuggestion(item)"
        >
          <MapPin class="mt-0.5 size-4 shrink-0 text-surface-400" />
          <span>{{ item.label }}</span>
        </button>
      </li>
    </ul>

    <p class="mt-1.5 text-xs text-surface-500">
      {{ t('components.locationAutocomplete.helper') }}
    </p>
  </div>
</template>
