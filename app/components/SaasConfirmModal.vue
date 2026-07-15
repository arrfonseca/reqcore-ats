<script setup lang="ts">
import { X } from 'lucide-vue-next'

const props = defineProps<{
  title: string
  body: string
  confirmLabel?: string
  cancelLabel?: string
  loading?: boolean
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const { t } = useI18n()

const confirmText = computed(() => props.confirmLabel ?? t('common.actions.save'))
const cancelText = computed(() => props.cancelLabel ?? t('common.cancel'))
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/50" @click="emit('cancel')" />

      <div class="relative w-full max-w-md rounded-xl border border-surface-200 bg-white shadow-xl dark:border-surface-800 dark:bg-surface-900">
        <div class="flex items-center justify-between border-b border-surface-200 px-5 py-4 dark:border-surface-800">
          <h3 class="text-lg font-semibold text-surface-900 dark:text-surface-50">{{ title }}</h3>
          <button
            type="button"
            class="cursor-pointer text-surface-400 transition-colors hover:text-surface-600 dark:hover:text-surface-200"
            @click="emit('cancel')"
          >
            <X class="size-5" />
          </button>
        </div>

        <div class="px-5 py-5">
          <p class="text-sm text-surface-600 dark:text-surface-300">{{ body }}</p>
        </div>

        <div class="flex justify-end gap-2 border-t border-surface-200 px-5 py-4 dark:border-surface-800">
          <button
            type="button"
            class="rounded-lg border border-surface-200 px-4 py-2 text-sm font-medium text-surface-700 hover:bg-surface-50 dark:border-surface-700 dark:text-surface-300 dark:hover:bg-surface-800 cursor-pointer"
            :disabled="loading"
            @click="emit('cancel')"
          >
            {{ cancelText }}
          </button>
          <button
            type="button"
            class="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 cursor-pointer"
            :disabled="loading"
            @click="emit('confirm')"
          >
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
