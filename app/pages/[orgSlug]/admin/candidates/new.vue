<script setup lang="ts">
import { ArrowLeft } from 'lucide-vue-next'
import { z } from 'zod'

const { t } = useI18n()

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth', 'require-org'],
})

useSeoMeta({
  title: t('dashboard.candidates.new.seoTitle'),
  description: t('dashboard.candidates.new.seoDescription'),
})

const localePath = useLocalePath()
const { tenantPath, publicJobPath } = useTenantPaths()
const { createCandidate } = useCandidates()
const { track } = useTrack()

const form = ref({
  firstName: '',
  lastName: '',
  displayName: '',
  email: '',
  phone: '',
  gender: '' as '' | 'male' | 'female' | 'other' | 'prefer_not_to_say',
  dateOfBirth: '',
})

const isSubmitting = ref(false)
const errors = ref<Record<string, string>>({})
const submitError = ref<string | null>(null)

const formSchema = computed(() => z.object({
  firstName: z.string().min(1, t('dashboard.candidates.new.errors.firstNameRequired')).max(100),
  lastName: z.string().min(1, t('dashboard.candidates.new.errors.lastNameRequired')).max(100),
  displayName: z.string().max(200).optional(),
  email: z.string().min(1, t('dashboard.candidates.new.errors.emailRequired')).email(t('dashboard.candidates.new.errors.invalidEmail')).max(255),
  phone: z.string().max(50).optional(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, t('dashboard.candidates.new.errors.dateFormat'))
    .refine((v) => {
      const d = new Date(v)
      return !isNaN(d.getTime()) && d.getFullYear() >= 1900 && d <= new Date()
    }, t('dashboard.candidates.new.errors.pastDate'))
    .optional(),
}))

function validate(): boolean {
  const result = formSchema.value.safeParse({
    ...form.value,
    gender: form.value.gender || undefined,
    dateOfBirth: form.value.dateOfBirth || undefined,
    displayName: form.value.displayName || undefined,
  })
  if (!result.success) {
    errors.value = {}
    for (const issue of result.error.issues) {
      const field = issue.path[0]?.toString()
      if (field) errors.value[field] = issue.message
    }
    return false
  }
  errors.value = {}
  return true
}

async function handleSubmit() {
  submitError.value = null
  if (!validate()) return

  isSubmitting.value = true
  try {
    await createCandidate({
      firstName: form.value.firstName,
      lastName: form.value.lastName,
      displayName: form.value.displayName || undefined,
      email: form.value.email,
      phone: form.value.phone || undefined,
      gender: (form.value.gender as 'male' | 'female' | 'other' | 'prefer_not_to_say') || undefined,
      dateOfBirth: form.value.dateOfBirth || undefined,
    })
    track('candidate_added')
    await navigateTo(tenantPath('candidates'))
  } catch (err: any) {
    const message = err.data?.statusMessage ?? t('dashboard.candidates.new.errors.generic')
    if (err.statusCode === 409 || err.data?.statusCode === 409) {
      errors.value.email = message
    } else {
      submitError.value = message
    }
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <NuxtLink
      :to="$tenantPath('candidates')"
      class="inline-flex items-center gap-1 text-sm text-surface-500 dark:text-surface-400 hover:text-surface-700 dark:hover:text-surface-200 mb-6 transition-colors"
    >
      <ArrowLeft class="size-4" />
      {{ t('dashboard.candidates.new.backToCandidates') }}
    </NuxtLink>

    <h1 class="text-2xl font-bold text-surface-900 dark:text-surface-100 mb-6">{{ t('dashboard.candidates.new.title') }}</h1>

    <div
      v-if="submitError"
      class="rounded-lg border border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-950 p-3 text-sm text-danger-700 dark:text-danger-400 mb-4"
    >
      {{ submitError }}
    </div>

    <form class="space-y-5" @submit.prevent="handleSubmit">
      <div>
        <label for="firstName" class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
          {{ t('dashboard.candidates.new.firstName') }} <span class="text-danger-500">*</span>
        </label>
        <input
          id="firstName"
          v-model="form.firstName"
          type="text"
          :placeholder="t('dashboard.candidates.new.placeholders.firstName')"
          class="w-full rounded-lg border px-3 py-2 text-sm text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
          :class="errors.firstName ? 'border-danger-300' : 'border-surface-300 dark:border-surface-700'"
        />
        <p v-if="errors.firstName" class="mt-1 text-xs text-danger-600 dark:text-danger-400">{{ errors.firstName }}</p>
      </div>

      <div>
        <label for="lastName" class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
          {{ t('dashboard.candidates.new.lastName') }} <span class="text-danger-500">*</span>
        </label>
        <input
          id="lastName"
          v-model="form.lastName"
          type="text"
          :placeholder="t('dashboard.candidates.new.placeholders.lastName')"
          class="w-full rounded-lg border px-3 py-2 text-sm text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
          :class="errors.lastName ? 'border-danger-300' : 'border-surface-300 dark:border-surface-700'"
        />
        <p v-if="errors.lastName" class="mt-1 text-xs text-danger-600 dark:text-danger-400">{{ errors.lastName }}</p>
      </div>

      <div>
        <label for="displayName" class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
          {{ t('dashboard.candidates.new.displayName') }}
          <span class="ml-1 text-xs font-normal text-surface-400">{{ t('dashboard.candidates.new.displayNameHint') }}</span>
        </label>
        <input
          id="displayName"
          v-model="form.displayName"
          type="text"
          :placeholder="t('dashboard.candidates.new.placeholders.displayName')"
          class="w-full rounded-lg border border-surface-300 dark:border-surface-700 px-3 py-2 text-sm text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
        />
        <p v-if="errors.displayName" class="mt-1 text-xs text-danger-600 dark:text-danger-400">{{ errors.displayName }}</p>
      </div>

      <div>
        <label for="email" class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
          {{ t('dashboard.candidates.new.email') }} <span class="text-danger-500">*</span>
        </label>
        <input
          id="email"
          v-model="form.email"
          type="email"
          :placeholder="t('dashboard.candidates.new.placeholders.email')"
          class="w-full rounded-lg border px-3 py-2 text-sm text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
          :class="errors.email ? 'border-danger-300' : 'border-surface-300 dark:border-surface-700'"
        />
        <p v-if="errors.email" class="mt-1 text-xs text-danger-600 dark:text-danger-400">{{ errors.email }}</p>
      </div>

      <div>
        <label for="phone" class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
          {{ t('dashboard.candidates.new.phone') }}
        </label>
        <input
          id="phone"
          v-model="form.phone"
          type="tel"
          :placeholder="t('dashboard.candidates.new.placeholders.phone')"
          class="w-full rounded-lg border border-surface-300 dark:border-surface-700 px-3 py-2 text-sm text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
        />
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label for="gender" class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
            {{ t('dashboard.candidates.new.gender') }}
          </label>
          <select
            id="gender"
            v-model="form.gender"
            class="w-full rounded-lg border border-surface-300 dark:border-surface-700 px-3 py-2 text-sm text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
          >
            <option value="">{{ t('dashboard.candidates.new.notSpecified') }}</option>
            <option value="male">{{ t('dashboard.candidates.filters.male') }}</option>
            <option value="female">{{ t('dashboard.candidates.filters.female') }}</option>
            <option value="other">{{ t('dashboard.candidates.filters.other') }}</option>
            <option value="prefer_not_to_say">{{ t('dashboard.candidates.filters.preferNotToSay') }}</option>
          </select>
        </div>

        <div>
          <label for="dateOfBirth" class="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
            {{ t('dashboard.candidates.new.dateOfBirth') }}
          </label>
          <input
            id="dateOfBirth"
            v-model="form.dateOfBirth"
            type="date"
            :max="new Date().toISOString().split('T')[0]"
            class="w-full rounded-lg border px-3 py-2 text-sm text-surface-900 dark:text-surface-100 bg-white dark:bg-surface-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-colors"
            :class="errors.dateOfBirth ? 'border-danger-300' : 'border-surface-300 dark:border-surface-700'"
          />
          <p v-if="errors.dateOfBirth" class="mt-1 text-xs text-danger-600 dark:text-danger-400">{{ errors.dateOfBirth }}</p>
        </div>
      </div>

      <div class="flex items-center gap-3 pt-2">
        <button
          type="submit"
          :disabled="isSubmitting"
          class="inline-flex items-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {{ isSubmitting ? t('dashboard.candidates.new.adding') : t('dashboard.candidates.new.title') }}
        </button>
        <NuxtLink
          :to="$tenantPath('candidates')"
          class="rounded-lg border border-surface-300 dark:border-surface-700 px-4 py-2 text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
        >
          {{ t('dashboard.candidates.new.cancel') }}
        </NuxtLink>
      </div>
    </form>
  </div>
</template>
