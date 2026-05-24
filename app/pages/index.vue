<script setup lang="ts">
definePageMeta({
  layout: 'auth',
  middleware: ['guest'],
})

useSeoMeta({
  title: 'Sign In — Reqcore',
  description: 'Sign in to your Reqcore account',
  robots: 'noindex, nofollow',
})
</script>

<template>
  <AuthSignInForm />
</template>
