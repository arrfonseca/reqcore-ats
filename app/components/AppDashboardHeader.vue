<script setup lang="ts">
const { tenantPath, publicJobPath, platformPath } = useTenantPaths()
import {
  Plus, LogOut, Sun, Moon, ChevronDown, Menu, Briefcase, ChevronLeft, ArrowUpCircle, Eye, Shield,
} from 'lucide-vue-next'

const { t } = useI18n()
const localePath = useLocalePath()
const { isDark, toggle: toggleColorMode } = useColorMode()

const {
  activeJobId,
  activeJobTitle,
  activeJobStatus,
  activeJobPublicUrl,
  canViewPublicJob,
  getJobStatusLabel,
  jobTabs,
  jobStatusBadgeClasses,
  isActiveRoute,
  handleNewJobClick,
  toggleSidebar,
  showAtsNav,
} = useDashboardNav()

const {
  userName,
  userEmail,
  userInitials,
  isSigningOut,
  handleSignOut,
} = await useDashboardUser()

const { data: session } = await authClient.useSession(useFetch)
const { isSaasAdmin } = useSaasAdmin()
const route = useRoute()

const activeOrgId = computed(() => session.value?.session?.activeOrganizationId ?? null)

const showUserMenu = ref(false)
const userMenuRef = useTemplateRef<HTMLElement>('userMenuRoot')

function onClickOutsideUser(e: MouseEvent) {
  if (userMenuRef.value && !userMenuRef.value.contains(e.target as Node)) {
    showUserMenu.value = false
  }
}

watch(() => route.path, () => {
  showUserMenu.value = false
})

onMounted(() => document.addEventListener('click', onClickOutsideUser))
onUnmounted(() => document.removeEventListener('click', onClickOutsideUser))
</script>

<template>
  <header class="shrink-0 w-full">
    <!-- Primary header bar -->
    <div class="relative z-20 border-b border-surface-200/80 dark:border-surface-800/80 bg-white/80 dark:bg-surface-900/80 backdrop-blur-xl">
      <div class="flex h-14 items-center justify-between px-4 lg:px-6">
        <!-- Left: mobile hamburger -->
        <div class="flex items-center">
          <button
            class="inline-flex lg:hidden items-center justify-center size-8 rounded-lg text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 transition-all cursor-pointer border-0 bg-transparent"
            @click="toggleSidebar"
          >
            <Menu class="size-4" />
          </button>
        </div>

        <!-- Right: Nova Vaga, theme, user -->
        <div class="flex items-center gap-1 lg:gap-1.5">
          <button
            v-if="showAtsNav"
            class="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-1.5 text-[13px] font-semibold text-white shadow-sm shadow-brand-600/20 hover:bg-brand-700 hover:shadow-md hover:shadow-brand-600/25 active:bg-brand-800 transition-all duration-200 border-0 cursor-pointer"
            @click="handleNewJobClick"
          >
            <Plus class="size-3.5" />
            <span class="hidden sm:inline">{{ t('dashboard.actions.newJob') }}</span>
          </button>

          <button
            class="inline-flex items-center justify-center size-8 rounded-lg text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800 transition-all duration-200 cursor-pointer border-0 bg-transparent"
            :title="isDark ? t('common.theme.switchToLight') : t('common.theme.switchToDark')"
            @click="toggleColorMode"
          >
            <Sun v-if="isDark" class="size-4" />
            <Moon v-else class="size-4" />
          </button>

          <div class="hidden sm:block w-px h-6 bg-surface-200 dark:bg-surface-700 mx-0.5" />

          <div ref="userMenuRoot" class="relative">
            <button
              class="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface-100/80 dark:hover:bg-surface-800/60 transition-all duration-200 cursor-pointer border-0 bg-transparent"
              @click="showUserMenu = !showUserMenu"
            >
              <div class="flex items-center justify-center size-7 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white text-[11px] font-bold shadow-sm">
                {{ userInitials }}
              </div>
              <ChevronDown
                class="size-3 text-surface-400 transition-transform duration-200 hidden sm:block"
                :class="showUserMenu ? 'rotate-180' : ''"
              />
            </button>

            <Transition
              enter-active-class="transition duration-150 ease-out"
              enter-from-class="opacity-0 scale-95 -translate-y-1"
              enter-to-class="opacity-100 scale-100 translate-y-0"
              leave-active-class="transition duration-100 ease-in"
              leave-from-class="opacity-100 scale-100 translate-y-0"
              leave-to-class="opacity-0 scale-95 -translate-y-1"
            >
              <div
                v-if="showUserMenu"
                class="absolute right-0 top-[calc(100%+6px)] w-72 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 shadow-xl shadow-surface-900/8 dark:shadow-surface-950/30 overflow-hidden z-50"
              >
                <div class="px-4 py-3 border-b border-surface-100 dark:border-surface-800">
                  <div class="flex items-center gap-2">
                    <div class="text-sm font-semibold text-surface-900 dark:text-surface-100">{{ userName }}</div>
                    <span
                      v-if="isSaasAdmin"
                      class="inline-flex items-center rounded-full bg-brand-50 dark:bg-brand-950 px-2 py-0.5 text-[10px] font-semibold text-brand-700 dark:text-brand-400"
                    >
                      {{ t('dashboard.topBar.saasAdminBadge') }}
                    </span>
                  </div>
                  <div class="text-xs text-surface-500 dark:text-surface-400 truncate mt-0.5">{{ userEmail }}</div>
                </div>

                <div
                  v-if="isSaasAdmin && showAtsNav"
                  class="py-1 border-b border-surface-100 dark:border-surface-800"
                >
                  <NuxtLink
                    :to="platformPath('')"
                    class="flex items-center gap-2.5 px-4 py-2 text-sm text-brand-700 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/40 transition-colors no-underline font-medium"
                    @click="showUserMenu = false"
                  >
                    <Shield class="size-4" />
                    {{ t('dashboard.topBar.platformConsole') }}
                  </NuxtLink>
                </div>

                <SaasAdminUserMenu
                  :active-org-id="activeOrgId"
                  @close="showUserMenu = false"
                />

                <div v-if="isSaasAdmin" class="py-1 border-b border-surface-100 dark:border-surface-800">
                  <NuxtLink
                    :to="platformPath('updates')"
                    class="flex items-center gap-2.5 px-4 py-2 text-sm text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800 hover:text-surface-900 dark:hover:text-surface-100 transition-colors no-underline"
                    :class="isActiveRoute(platformPath('updates'), false) ? 'text-brand-600 dark:text-brand-400 font-medium' : ''"
                    @click="showUserMenu = false"
                  >
                    <ArrowUpCircle class="size-4" />
                    {{ t('dashboard.topBar.updates') }}
                  </NuxtLink>
                </div>

                <div class="py-1">
                  <button
                    class="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800 hover:text-surface-900 dark:hover:text-surface-100 transition-colors cursor-pointer border-0 bg-transparent text-left"
                    :disabled="isSigningOut"
                    @click="handleSignOut"
                  >
                    <LogOut class="size-4" />
                    {{ isSigningOut ? t('dashboard.topBar.signingOut') : t('dashboard.topBar.signOut') }}
                  </button>
                </div>
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </div>

    <!-- Job context sub-navigation bar -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
    >
      <div
        v-if="activeJobId"
        class="relative z-10 border-b border-surface-200/60 dark:border-surface-800/60 bg-surface-50/90 dark:bg-surface-950/90 backdrop-blur-lg"
      >
        <div class="flex items-center gap-2 sm:gap-4 px-3 sm:px-4 lg:px-6 h-10 overflow-x-auto scrollbar-none">
          <NuxtLink
            :to="tenantPath('jobs')"
            class="hidden sm:flex items-center gap-1 text-xs font-medium text-surface-400 dark:text-surface-500 hover:text-surface-600 dark:hover:text-surface-300 transition-colors no-underline shrink-0"
          >
            <ChevronLeft class="size-3.5" />
            {{ t('dashboard.actions.allJobs') }}
          </NuxtLink>

          <div class="hidden sm:block w-px h-4 bg-surface-200 dark:bg-surface-700 shrink-0" />

          <div class="hidden md:flex items-center gap-2 shrink-0 min-w-0">
            <Briefcase class="size-3.5 text-brand-500 shrink-0" />
            <span class="text-sm font-semibold text-surface-900 dark:text-surface-100 truncate max-w-48">
              {{ activeJobTitle }}
            </span>
            <span
              v-if="activeJobStatus"
              class="inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset"
              :class="jobStatusBadgeClasses[activeJobStatus] ?? 'bg-surface-50 text-surface-600 ring-surface-200'"
            >
              {{ getJobStatusLabel(activeJobStatus) }}
            </span>
            <NuxtLink
              v-if="canViewPublicJob && activeJobPublicUrl"
              :to="activeJobPublicUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex shrink-0 items-center gap-1 rounded-md border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 px-2 py-0.5 text-[10px] font-semibold text-surface-600 dark:text-surface-300 hover:text-brand-600 dark:hover:text-brand-400 hover:border-brand-300 dark:hover:border-brand-700 transition-colors no-underline"
            >
              <Eye class="size-3" />
              {{ t('dashboard.jobs.create.actions.viewJob') }}
            </NuxtLink>
          </div>

          <nav class="flex items-center gap-0.5 md:ml-2">
            <NuxtLink
              v-for="tab in jobTabs"
              :key="tab.to"
              :to="localePath(tab.to)"
              class="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200 no-underline whitespace-nowrap shrink-0"
              :class="isActiveRoute(tab.to, tab.exact)
                ? 'bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 shadow-sm'
                : 'text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 hover:bg-white/60 dark:hover:bg-surface-800/60'"
            >
              <component :is="tab.icon" class="size-3.5" />
              <span class="hidden sm:inline">{{ tab.label }}</span>
            </NuxtLink>
          </nav>

          <div class="ml-auto flex items-center gap-2 shrink-0">
            <div id="job-sub-nav-actions" class="flex items-center gap-2" />
          </div>
        </div>
      </div>
    </Transition>
  </header>
</template>

<style scoped>
.scrollbar-none {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-none::-webkit-scrollbar {
  display: none;
}
</style>
