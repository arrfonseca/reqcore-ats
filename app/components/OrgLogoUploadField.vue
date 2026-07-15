<script setup lang="ts">
import { Upload, Trash2, Loader2, ImageIcon } from 'lucide-vue-next'

const props = defineProps<{
  variant: 'light' | 'dark'
  logoUrl: string | null
  disabled?: boolean
}>()

const emit = defineEmits<{
  uploaded: []
  removed: []
}>()

const { t } = useI18n()

const fileInputRef = useTemplateRef<HTMLInputElement>('fileInput')
const isUploading = ref(false)
const isRemoving = ref(false)
const error = ref('')

const ACCEPT = '.png,.gif,.jpg,.jpeg,.svg,image/png,image/gif,image/jpeg,image/svg+xml'

function openPicker() {
  if (props.disabled || isUploading.value) return
  fileInputRef.value?.click()
}

async function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  isUploading.value = true
  error.value = ''

  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('variant', props.variant)

    await $fetch('/api/org-settings/branding/logo', {
      method: 'POST',
      body: formData,
    })
    emit('uploaded')
  }
  catch (err: unknown) {
    error.value = err instanceof Error ? err.message : t('settings.organization.logoUploadFailed')
  }
  finally {
    isUploading.value = false
  }
}

async function removeLogo() {
  if (props.disabled || isRemoving.value || !props.logoUrl) return

  isRemoving.value = true
  error.value = ''

  try {
    await $fetch('/api/org-settings/branding/logo', {
      method: 'DELETE',
      body: { variant: props.variant },
    })
    emit('removed')
  }
  catch (err: unknown) {
    error.value = err instanceof Error ? err.message : t('settings.organization.logoRemoveFailed')
  }
  finally {
    isRemoving.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <label class="text-sm font-medium text-surface-700 dark:text-surface-300">
      {{ variant === 'light' ? t('settings.organization.logoLight') : t('settings.organization.logoDark') }}
    </label>
    <p class="text-xs text-surface-500 dark:text-surface-400">
      {{ t('settings.organization.logoFormats') }}
    </p>

    <div
      class="flex items-center gap-4 rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50 p-4"
    >
      <div
        class="flex size-20 shrink-0 items-center justify-center rounded-md border border-dashed border-surface-300 dark:border-surface-600 overflow-hidden"
        :class="variant === 'dark' ? 'bg-black' : 'bg-white dark:bg-surface-900'"
      >
        <img
          v-if="logoUrl"
          :src="logoUrl"
          :alt="variant === 'light' ? t('settings.organization.logoLight') : t('settings.organization.logoDark')"
          class="max-h-full max-w-full object-contain p-1"
        >
        <ImageIcon
          v-else
          class="size-8 text-surface-400"
        />
      </div>

      <div class="flex flex-col gap-2 min-w-0">
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 px-3 py-1.5 text-sm font-medium text-surface-700 dark:text-surface-200 hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="disabled || isUploading || isRemoving"
            @click="openPicker"
          >
            <Loader2 v-if="isUploading" class="size-4 animate-spin" />
            <Upload v-else class="size-4" />
            {{ logoUrl ? t('settings.organization.logoReplace') : t('settings.organization.logoUpload') }}
          </button>
          <button
            v-if="logoUrl"
            type="button"
            class="inline-flex items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-900/50 bg-white dark:bg-surface-800 px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="disabled || isUploading || isRemoving"
            @click="removeLogo"
          >
            <Loader2 v-if="isRemoving" class="size-4 animate-spin" />
            <Trash2 v-else class="size-4" />
            {{ t('settings.organization.logoRemove') }}
          </button>
        </div>
      </div>

      <input
        ref="fileInput"
        type="file"
        class="hidden"
        :accept="ACCEPT"
        @change="onFileChange"
      >
    </div>

    <p v-if="error" class="text-xs text-red-600 dark:text-red-400">
      {{ error }}
    </p>
  </div>
</template>
