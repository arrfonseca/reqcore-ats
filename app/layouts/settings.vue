<script setup lang="ts">
</script>

<template>
  <AppDashboardShell>
    <div class="flex flex-1 flex-col lg:flex-row min-w-0 min-h-0 overflow-hidden">
      <!-- Desktop settings sidebar -->
      <div class="hidden lg:block shrink-0 h-full overflow-y-auto">
        <SettingsSidebar />
      </div>
      <!-- Mobile settings nav -->
      <div class="lg:hidden shrink-0">
        <SettingsMobileNav />
      </div>
      <!-- Page content -->
      <main class="flex-1 min-w-0 min-h-0 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <slot />
      </main>
    </div>
  </AppDashboardShell>
</template>
