<script setup lang="ts">
definePageMeta({
  layout: 'auth',
  middleware: ['guest'],
})

const { t } = useI18n()

useSeoMeta({
  title: t('auth.signIn.seoTitle'),
  description: t('auth.signIn.seoDescription'),
  robots: 'noindex, nofollow',
})
</script>

<template>
  <AuthSignInForm />
</template>
