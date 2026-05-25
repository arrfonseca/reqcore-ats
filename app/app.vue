<script setup lang="ts">
const i18nHead = useLocaleHead({
  seo: true,
})

useHead(() => ({
  htmlAttrs: i18nHead.value.htmlAttrs,
  link: i18nHead.value.link,
  meta: i18nHead.value.meta,
}))

// Blocking inline script to apply dark mode before first paint (prevents white
// flash). The nonce attribute is required by the nonce-based CSP set in
// server/middleware/csp.ts — without it the script would be blocked by the
// Content Security Policy (CSP).
const _nonce = import.meta.server ? (useRequestEvent()?.context?.nonce ?? '') : ''
useHead({
  script: [
    {
      key: 'dark-mode-init',
      innerHTML: '(function(){try{var s=localStorage.getItem("reqcore-color-mode");var m=s||"light";document.documentElement.classList.toggle("dark",m==="dark");document.documentElement.style.colorScheme=m}catch(e){}})()',
      tagPosition: 'head',
      ...(_nonce ? { nonce: _nonce } : {}),
    },
  ],
})

</script>

<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
