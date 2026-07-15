<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'require-saas-admin'],
})
</script>

<template>
  <NuxtPage />
</template>
