<script setup lang="ts">
import { Eye } from 'lucide-vue-next'
import { usePreviewReadOnly } from '~/composables/usePreviewReadOnly'

const { t } = useI18n()
const { data: session } = await authClient.useSession(useFetch)

const config = useRuntimeConfig()
const { activeOrg } = useCurrentOrg()
const { isUpsellOpen, closeUpsell } = usePreviewReadOnly()
const { sidebarOpen, closeSidebar } = useDashboardNav()

const isDemo = computed(() => {
  const slug = config.public.demoOrgSlug
  return slug && activeOrg.value?.slug === slug
})

const isDemoAccount = computed(() => session.value?.user?.email === 'demo@reqcore.com')
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-surface-50 dark:bg-surface-950">
    <!-- Desktop sidebar -->
    <div class="hidden lg:block shrink-0 h-full">
      <AppSidebar />
    </div>

    <!-- Mobile sidebar overlay -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="sidebarOpen"
          class="fixed inset-0 z-40 bg-surface-900/50 backdrop-blur-sm lg:hidden"
          @click="closeSidebar"
        />
      </Transition>
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="-translate-x-full"
        enter-to-class="translate-x-0"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="translate-x-0"
        leave-to-class="-translate-x-full"
      >
        <div
          v-if="sidebarOpen"
          class="fixed inset-y-0 left-0 z-50 lg:hidden"
        >
          <AppSidebar mobile @close="closeSidebar" />
        </div>
      </Transition>
    </Teleport>

    <!-- Content column -->
    <div class="flex flex-1 flex-col min-w-0 min-h-0">
      <AppDashboardHeader />
      <SaasImpersonationBanner />
      <AppToasts />
      <PreviewUpsellModal v-if="isUpsellOpen" @close="closeUpsell" />
      <ClientOnly>
        <DemoUpsellBanner v-if="isDemoAccount" />
      </ClientOnly>

      <div class="flex flex-1 flex-col min-h-0 overflow-hidden">
        <!-- Demo mode banner -->
        <div
          v-if="isDemo"
          class="mx-4 mt-4 sm:mx-6 lg:mx-8 flex max-w-5xl items-center gap-3 rounded-lg border border-brand-200 dark:border-brand-900 bg-brand-50 dark:bg-brand-950/40 px-4 py-2.5 text-sm text-brand-700 dark:text-brand-300 shrink-0"
        >
          <Eye class="size-4 shrink-0" />
          <span>
            <strong>{{ t('dashboard.demo.liveDemo') }}</strong> — {{ t('dashboard.demo.description') }}
            <a
              href="https://github.com/reqcore-inc/reqcore#quick-start"
              target="_blank"
              rel="noopener noreferrer"
              class="ml-1 font-semibold underline decoration-brand-400/40 underline-offset-2 hover:decoration-brand-400"
            >{{ t('dashboard.demo.deployOwnFreeInstance') }}</a>
          </span>
        </div>

        <slot />
      </div>
    </div>
  </div>
</template>
