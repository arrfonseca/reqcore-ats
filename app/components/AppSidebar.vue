<script setup lang="ts">
import { Server, Sparkles, ChevronDown, X, Shield } from 'lucide-vue-next'

const props = defineProps<{
  mobile?: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useI18n()
const localePath = useLocalePath()

const { navItems, isActiveRoute, isDemo, showPlatformNav } = useDashboardNav()
const { branding } = useOrgBranding()

const sidebarLogoTitle = computed(() => {
  if (showPlatformNav.value) return t('dashboard.brand.title')
  if (branding.value.orgName) return branding.value.orgName
  return t('dashboard.brand.title')
})

const sidebarTagline = computed(() => {
  if (showPlatformNav.value) return t('dashboard.brand.title')
  const subtitle = branding.value.brandSubtitle?.trim()
  if (subtitle) return subtitle
  return t('dashboard.brand.title')
})

const showGetStartedMenu = ref(false)
const getStartedMenuRef = useTemplateRef<HTMLElement>('getStartedMenuRoot')

function onClickOutsideGetStarted(e: MouseEvent) {
  if (getStartedMenuRef.value && !getStartedMenuRef.value.contains(e.target as Node)) {
    showGetStartedMenu.value = false
  }
}

function onNavClick() {
  if (props.mobile) {
    emit('close')
  }
}

onMounted(() => document.addEventListener('click', onClickOutsideGetStarted))
onUnmounted(() => document.removeEventListener('click', onClickOutsideGetStarted))
</script>

<template>
  <aside
    class="flex h-full w-60 min-w-60 flex-col border-r border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 overflow-y-auto overscroll-contain"
  >
    <!-- Header: Logo + app name -->
    <div class="relative px-[15px] pt-5 pb-4">
      <button
        v-if="mobile"
        class="absolute right-[15px] top-5 inline-flex items-center justify-center size-8 rounded-lg text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 transition-all cursor-pointer border-0 bg-transparent"
        @click="emit('close')"
      >
        <X class="size-4" />
      </button>
      <div class="flex flex-col items-center gap-2">
        <OrgBrandedLogo
          class="w-full h-auto max-w-[180px]"
          :platform="showPlatformNav"
          :title="sidebarLogoTitle"
        />
        <span class="text-[15px] font-bold text-surface-900 dark:text-surface-100 tracking-tight text-center">
          {{ sidebarTagline }}
        </span>
        <div
          v-if="showPlatformNav"
          class="flex flex-col items-center gap-1"
        >
          <div class="flex items-center gap-1.5 rounded-full bg-brand-50 dark:bg-brand-950/50 px-2.5 py-1 text-[11px] font-semibold text-brand-700 dark:text-brand-400">
            <Shield class="size-3 shrink-0" />
            {{ t('dashboard.saas.consoleTitle') }}
          </div>
          <p class="text-[10px] text-center text-surface-500 dark:text-surface-400 px-2 leading-snug">
            {{ t('dashboard.saas.platformScopeHint') }}
          </p>
        </div>
      </div>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 px-3 pb-3">
      <div class="flex flex-col gap-0.5">
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="localePath(item.to)"
          class="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all no-underline"
          :class="isActiveRoute(item.to, item.exact)
            ? 'bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 font-medium'
            : 'text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800/60 hover:text-surface-900 dark:hover:text-surface-100'"
          @click="onNavClick"
        >
          <div
            class="flex items-center justify-center size-8 rounded-md transition-colors shrink-0"
            :class="isActiveRoute(item.to, item.exact)
              ? 'bg-brand-100 dark:bg-brand-900/50 text-brand-600 dark:text-brand-400'
              : 'bg-surface-100 dark:bg-surface-800 text-surface-400 dark:text-surface-500 group-hover:text-surface-600 dark:group-hover:text-surface-300'"
          >
            <component :is="item.icon" class="size-4" />
          </div>
          <span class="truncate">{{ item.label }}</span>
          <span
            v-if="item.comingSoon"
            class="ml-auto inline-flex items-center rounded-full bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 text-[9px] font-semibold leading-none text-amber-700 dark:text-amber-400 ring-1 ring-inset ring-amber-200/60 dark:ring-amber-800/40"
          >
            {{ t('dashboard.topBar.soon') }}
          </span>
        </NuxtLink>
      </div>
    </nav>

    <!-- Footer: demo CTA + org switcher -->
    <div class="mt-auto border-t border-surface-200 dark:border-surface-800 px-3 py-4 space-y-3">
      <!-- Get Started CTA (demo mode only) -->
      <div v-if="isDemo" ref="getStartedMenuRoot" class="relative">
        <button
          class="group flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-brand-600 to-violet-600 px-3 py-2 text-[13px] font-semibold text-white shadow-md shadow-brand-600/25 hover:shadow-lg hover:shadow-brand-600/30 transition-all cursor-pointer border-0"
          @click="showGetStartedMenu = !showGetStartedMenu"
        >
          <Sparkles class="size-3.5 transition-transform duration-300 group-hover:rotate-12" />
          {{ t('dashboard.topBar.getStarted') }}
          <ChevronDown
            class="size-3 opacity-70 transition-transform duration-200"
            :class="showGetStartedMenu ? 'rotate-180' : ''"
          />
        </button>

        <Transition
          enter-active-class="transition duration-150 ease-out"
          enter-from-class="opacity-0 scale-95 translate-y-1"
          enter-to-class="opacity-100 scale-100 translate-y-0"
          leave-active-class="transition duration-100 ease-in"
          leave-from-class="opacity-100 scale-100 translate-y-0"
          leave-to-class="opacity-0 scale-95 translate-y-1"
        >
          <div
            v-if="showGetStartedMenu"
            class="absolute bottom-full left-0 right-0 mb-2 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 shadow-xl shadow-surface-900/8 dark:shadow-surface-950/30 overflow-hidden"
          >
            <div class="px-4 py-3 border-b border-surface-100 dark:border-surface-800">
              <p class="text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                {{ t('dashboard.topBar.chooseSetup') }}
              </p>
            </div>
            <div class="p-2 space-y-1">
              <a
                href="https://github.com/reqcore-inc/reqcore#quick-start"
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-surface-50 dark:hover:bg-surface-800/60 no-underline group/item"
              >
                <div class="flex items-center justify-center size-8 rounded-lg bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 shrink-0 mt-0.5">
                  <Server class="size-4" />
                </div>
                <div>
                  <div class="text-sm font-semibold text-surface-900 dark:text-surface-100 group-hover/item:text-surface-700 dark:group-hover/item:text-surface-200 transition-colors">
                    {{ t('dashboard.topBar.selfHost') }}
                  </div>
                  <div class="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                    {{ t('dashboard.topBar.selfHostDescription') }}
                  </div>
                </div>
              </a>
            </div>
          </div>
        </Transition>
      </div>

      <OrgSwitcher v-if="!showPlatformNav" />
      <SaasCreateTenantLink v-else />
    </div>
  </aside>
</template>
