<script setup lang="ts">
import { BRAND_LOGO_PATH } from '~~/shared/brand-logo'

const props = defineProps<{
  title?: string
}>()

const { t } = useI18n()
const displayTitle = computed(() => props.title ?? t('common.brand.name'))

defineOptions({ inheritAttrs: false })
</script>

<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 1080 1080"
    role="img"
    :aria-label="displayTitle"
    v-bind="$attrs"
  >
    <path
      :d="BRAND_LOGO_PATH"
      class="fill-[#0099cb] dark:fill-white"
    />
  </svg>
</template>
