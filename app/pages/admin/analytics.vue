<script setup lang="ts">
definePageMeta({
  layout: 'saas',
  middleware: ['auth', 'require-saas-admin'],
})

const localePath = useLocalePath()
const { platformPath } = useTenantPaths()
await navigateTo(platformPath(''), { replace: true })
</script>
