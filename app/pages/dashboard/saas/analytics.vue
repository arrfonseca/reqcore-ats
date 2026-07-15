<script setup lang="ts">
definePageMeta({
  layout: 'saas',
  middleware: ['auth', 'require-saas-admin'],
})

const localePath = useLocalePath()
await navigateTo(localePath('/dashboard/saas'), { replace: true })
</script>
