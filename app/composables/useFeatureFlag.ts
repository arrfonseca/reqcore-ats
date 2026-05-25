import {
  FEATURE_FLAGS,
  parseFlagOverride,
  type FeatureFlagKey,
  type FeatureFlagValue,
} from '~~/shared/feature-flags'

/**
 * Reactive feature flag composable.
 *
 * Resolution order (highest → lowest priority):
 *   1. URL query string  e.g.  ?ff_chatbot-experience=true
 *   2. Env var override  (FEATURE_FLAG_<KEY> via runtimeConfig)
 *   3. Registry default  from `shared/feature-flags.ts`
 */
export function useFeatureFlag<K extends FeatureFlagKey>(
  flagKey: K,
): Ref<FeatureFlagValue<K>> {
  const def = FEATURE_FLAGS[flagKey]
  const flag = ref(def.defaultValue) as Ref<FeatureFlagValue<K>>

  if (import.meta.client) {
    const urlValue = new URLSearchParams(window.location.search).get(`ff_${flagKey}`)
    const parsed = parseFlagOverride(flagKey, urlValue)
    if (parsed !== undefined) {
      flag.value = parsed as FeatureFlagValue<K>
      return flag
    }
  }

  const overrides = (useRuntimeConfig().public.featureFlagOverrides ?? {}) as
    Partial<Record<FeatureFlagKey, boolean | string>>
  if (overrides[flagKey] !== undefined) {
    flag.value = overrides[flagKey] as FeatureFlagValue<K>
  }

  return flag
}

export function useFeatureFlagEnabled(flagKey: FeatureFlagKey): Ref<boolean> {
  const value = useFeatureFlag(flagKey)
  return computed(() => {
    const v: unknown = value.value
    return v === true || (typeof v === 'string' && v.length > 0)
  })
}
