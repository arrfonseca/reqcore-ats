<script setup lang="ts">
definePageMeta({
  layout: 'public',
})

const route = useRoute()
const { t, locale } = useI18n()

const token = computed(() => {
  const tok = route.query.token
  return typeof tok === 'string' ? tok : ''
})

const { data, error: fetchError, status: fetchStatus } = await useFetch('/api/public/interviews/respond', {
  query: { token },
  immediate: !!token.value,
})

const actionLabels = computed<Record<string, string>>(() => ({
  accepted: t('interview.respond.actions.accepted'),
  declined: t('interview.respond.actions.declined'),
  tentative: t('interview.respond.actions.tentative'),
}))

const actionVerbs = computed<Record<string, string>>(() => ({
  accepted: t('interview.respond.actionVerbs.accepted'),
  declined: t('interview.respond.actionVerbs.declined'),
  tentative: t('interview.respond.actionVerbs.tentative'),
}))

const responseLabels = computed<Record<string, string>>(() => ({
  accepted: t('interview.respond.responses.accepted'),
  declined: t('interview.respond.responses.declined'),
  tentative: t('interview.respond.responses.tentative'),
  pending: t('interview.respond.responses.pending'),
}))

const interviewTypeLabels = computed<Record<string, string>>(() => ({
  video: t('interview.respond.types.video'),
  phone: t('interview.respond.types.phone'),
  in_person: t('interview.respond.types.in_person'),
  technical: t('interview.respond.types.technical'),
  panel: t('interview.respond.types.panel'),
  take_home: t('interview.respond.types.take_home'),
}))

const actionColors: Record<string, string> = {
  accepted: 'bg-green-600 hover:bg-green-700',
  declined: 'bg-red-600 hover:bg-red-700',
  tentative: 'bg-yellow-600 hover:bg-yellow-700',
}

const confirming = ref(false)
const confirmed = ref(false)
const confirmError = ref('')

const interviewStatusTitle = computed(() => {
  const status = data.value?.interview.status
  if (status === 'cancelled') return t('interview.respond.cancelledTitle')
  if (status === 'completed') return t('interview.respond.completedTitle')
  return t('interview.respond.unavailableTitle')
})

async function confirmResponse() {
  if (!token.value) return
  confirming.value = true
  confirmError.value = ''

  try {
    await $fetch('/api/public/interviews/respond', {
      method: 'POST',
      body: { token: token.value },
    })
    confirmed.value = true
  }
  catch (err: unknown) {
    const message = err && typeof err === 'object' && 'data' in err
      ? (err as { data?: { statusMessage?: string } }).data?.statusMessage
      : undefined
    confirmError.value = message || t('interview.respond.confirmError')
  }
  finally {
    confirming.value = false
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(locale.value, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString(locale.value, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

useHead({
  title: computed(() => t('interview.respond.seoTitle')),
})
</script>

<template>
  <div class="max-w-lg mx-auto py-12">
    <!-- No token -->
    <div v-if="!token" class="text-center">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
        <span class="text-2xl">⚠</span>
      </div>
      <h1 class="text-xl font-semibold text-surface-900 dark:text-surface-100 mb-2">
        {{ t('interview.respond.invalidLinkTitle') }}
      </h1>
      <p class="text-surface-500">
        {{ t('interview.respond.invalidLinkDescription') }}
      </p>
    </div>

    <!-- Loading -->
    <div v-else-if="fetchStatus === 'pending'" class="text-center py-12">
      <div class="animate-spin inline-block w-8 h-8 border-2 border-surface-300 border-t-blue-600 rounded-full mb-4" />
      <p class="text-surface-500">
        {{ t('interview.respond.loading') }}
      </p>
    </div>

    <!-- Error fetching -->
    <div v-else-if="fetchError" class="text-center">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
        <span class="text-2xl">⚠</span>
      </div>
      <h1 class="text-xl font-semibold text-surface-900 dark:text-surface-100 mb-2">
        {{ fetchError.statusCode === 400 ? t('interview.respond.linkExpiredTitle') : t('interview.respond.errorTitle') }}
      </h1>
      <p class="text-surface-500">
        {{ fetchError.statusCode === 400
          ? t('interview.respond.linkExpiredDescription')
          : t('interview.respond.loadFailedDescription')
        }}
      </p>
    </div>

    <!-- Confirmed successfully -->
    <div v-else-if="confirmed" class="text-center">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
           :class="data?.action === 'accepted' ? 'bg-green-100 dark:bg-green-900/30' : data?.action === 'declined' ? 'bg-red-100 dark:bg-red-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'">
        <span class="text-2xl">
          {{ data?.action === 'accepted' ? '✓' : data?.action === 'declined' ? '✗' : '?' }}
        </span>
      </div>
      <h1 class="text-xl font-semibold text-surface-900 dark:text-surface-100 mb-2">
        {{ t('interview.respond.responseRecorded') }}
      </h1>
      <p class="text-surface-500 mb-6">
        <template v-if="data?.action === 'accepted'">
          {{ t('interview.respond.acceptedMessage') }}
        </template>
        <template v-else-if="data?.action === 'declined'">
          {{ t('interview.respond.declinedMessage') }}
        </template>
        <template v-else>
          {{ t('interview.respond.tentativeMessage') }}
        </template>
      </p>
    </div>

    <!-- Interview details + confirm action -->
    <div v-else-if="data">
      <!-- Already responded -->
      <div v-if="data.interview.candidateResponse !== 'pending'" class="text-center">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4">
          <span class="text-2xl">ℹ</span>
        </div>
        <h1 class="text-xl font-semibold text-surface-900 dark:text-surface-100 mb-2">
          {{ t('interview.respond.alreadyRespondedTitle') }}
        </h1>
        <p class="text-surface-500">
          {{ t('interview.respond.alreadyRespondedDescription', {
            response: responseLabels[data.interview.candidateResponse]?.toLowerCase() ?? t('interview.respond.respondedFallback'),
          }) }}
        </p>
      </div>

      <!-- Interview is no longer scheduled -->
      <div v-else-if="data.interview.status !== 'scheduled'" class="text-center">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-surface-100 dark:bg-surface-800 mb-4">
          <span class="text-2xl">ℹ</span>
        </div>
        <h1 class="text-xl font-semibold text-surface-900 dark:text-surface-100 mb-2">
          {{ interviewStatusTitle }}
        </h1>
        <p class="text-surface-500">
          {{ t('interview.respond.unavailableDescription') }}
        </p>
      </div>

      <!-- Ready to respond -->
      <div v-else>
        <h1 class="text-xl font-semibold text-surface-900 dark:text-surface-100 mb-6 text-center">
          {{ t('interview.respond.invitationTitle') }}
        </h1>

        <!-- Interview details card -->
        <div class="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-xl p-6 mb-6">
          <h2 class="text-lg font-semibold text-surface-900 dark:text-surface-100 mb-4">
            {{ data.interview.title }}
          </h2>

          <dl class="space-y-3 text-sm">
            <div v-if="data.organizationName" class="flex justify-between">
              <dt class="text-surface-500">
                {{ t('interview.respond.organization') }}
              </dt>
              <dd class="text-surface-900 dark:text-surface-100 font-medium">
                {{ data.organizationName }}
              </dd>
            </div>
            <div v-if="data.jobTitle" class="flex justify-between">
              <dt class="text-surface-500">
                {{ t('interview.respond.position') }}
              </dt>
              <dd class="text-surface-900 dark:text-surface-100 font-medium">
                {{ data.jobTitle }}
              </dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-surface-500">
                {{ t('interview.respond.date') }}
              </dt>
              <dd class="text-surface-900 dark:text-surface-100 font-medium">
                {{ formatDate(data.interview.scheduledAt) }}
              </dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-surface-500">
                {{ t('interview.respond.time') }}
              </dt>
              <dd class="text-surface-900 dark:text-surface-100 font-medium">
                {{ formatTime(data.interview.scheduledAt) }}
              </dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-surface-500">
                {{ t('interview.respond.duration') }}
              </dt>
              <dd class="text-surface-900 dark:text-surface-100 font-medium">
                {{ t('interview.respond.durationMinutes', { count: data.interview.duration }) }}
              </dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-surface-500">
                {{ t('interview.respond.type') }}
              </dt>
              <dd class="text-surface-900 dark:text-surface-100 font-medium">
                {{ interviewTypeLabels[data.interview.type] ?? data.interview.type }}
              </dd>
            </div>
            <div v-if="data.interview.location" class="flex justify-between">
              <dt class="text-surface-500">
                {{ t('interview.respond.location') }}
              </dt>
              <dd class="text-surface-900 dark:text-surface-100 font-medium break-all">
                {{ data.interview.location }}
              </dd>
            </div>
          </dl>
        </div>

        <!-- Confirm action -->
        <div class="text-center">
          <p class="text-sm text-surface-500 mb-4">
            {{ t('interview.respond.aboutToAction', { action: actionVerbs[data.action] ?? data.action }) }}
          </p>

          <div v-if="confirmError" class="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
            {{ confirmError }}
          </div>

          <button
            :disabled="confirming"
            :class="actionColors[data.action]"
            class="w-full text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            @click="confirmResponse"
          >
            <span v-if="confirming">{{ t('interview.respond.processing') }}</span>
            <span v-else>{{ t('interview.respond.confirmAction', { action: actionLabels[data.action] }) }}</span>
          </button>

          <p class="text-xs text-surface-400 mt-4">
            {{ t('interview.respond.confirmHint') }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
