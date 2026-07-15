<script setup lang="ts">
const props = withDefaults(defineProps<{
  variant?: 'auto' | 'light' | 'dark'
  orgSlug?: string | null
  title?: string
  /** When true, always show platform logo (SaaS console) */
  platform?: boolean
}>(), {
  variant: 'auto',
  orgSlug: null,
  platform: false,
})

const { t } = useI18n()
const { branding, resolveLogoUrl } = useOrgBranding({ orgSlug: () => props.orgSlug })

const logoUrl = computed(() => {
  if (props.platform) return null
  return resolveLogoUrl(props.variant)
})

const displayTitle = computed(() => {
  if (props.title) return props.title
  if (branding.value.hasOrgLogo && branding.value.orgName) return branding.value.orgName
  return t('common.brand.name')
})

const showFallback = computed(() => !logoUrl.value)

defineOptions({ inheritAttrs: false })
</script>

<template>
  <ReqcoreLogo
    v-if="showFallback"
    :title="displayTitle"
    v-bind="$attrs"
  />
  <img
    v-else
    :src="logoUrl!"
    :alt="displayTitle"
    class="object-contain"
    v-bind="$attrs"
  >
</template>
