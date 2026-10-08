<script setup lang="ts">
import { Server, ArrowRight, Sparkles } from 'lucide-vue-next'

const { t } = useI18n()
</script>

<template>
  <Teleport to="body">
    <div class="fixed bottom-4 left-4 right-4 z-50 sm:right-auto sm:w-[300px]">
      <div
        class="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-surface-900 via-surface-900 to-brand-950/80 shadow-2xl backdrop-blur-xl dark:from-surface-950 dark:via-surface-950 dark:to-brand-950/90"
      >
        <!-- Accent line -->
        <div class="h-[2px] bg-gradient-to-r from-brand-400 via-accent-400 to-brand-500" />

        <!-- Ambient glow -->
        <div class="pointer-events-none absolute -top-20 -right-20 size-40 rounded-full bg-brand-500/8 blur-3xl" />

        <div class="relative p-4">
          <!-- Header -->
          <div class="flex items-center gap-2.5">
            <div class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 shadow-lg shadow-brand-500/25">
              <Sparkles class="size-4 text-white" />
            </div>
            <div class="min-w-0">
              <p class="truncate text-[13px] font-semibold text-white">
                {{ t('components.demoUpsell.title') }}
              </p>
              <p class="truncate text-[11px] text-white/40">
                {{ t('components.demoUpsell.subtitle') }}
              </p>
            </div>
          </div>

          <div class="mt-3.5">
            <a
              href="https://github.com/reqcore-inc/reqcore"
              target="_blank"
              rel="noopener noreferrer"
              class="group flex items-center gap-2 whitespace-nowrap rounded-xl border border-white/[0.06] bg-white/[0.04] px-3 py-2.5 transition-all hover:border-accent-400/30 hover:bg-accent-500/10 hover:shadow-md hover:shadow-accent-500/5 active:scale-[0.97]"
            >
              <Server class="size-4 text-accent-400 transition-colors group-hover:text-accent-300" />
              <span class="text-[12px] font-semibold text-white/70 transition-colors group-hover:text-white">{{ t('components.demoUpsell.selfHost') }}</span>
              <ArrowRight class="ml-auto size-3 text-white/20 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
            </a>
          </div>

          <p class="mt-2.5 truncate text-center text-[10px] text-white/25">
            {{ t('components.demoUpsell.footer') }}
          </p>
        </div>
      </div>
    </div>
  </Teleport>
</template>
