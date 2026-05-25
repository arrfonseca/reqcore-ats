import type { H3Event } from 'h3'
import {
  FEATURE_FLAGS,
  flagEnvVarName,
  parseFlagOverride,
  type FeatureFlagKey,
  type FeatureFlagValue,
} from '../../shared/feature-flags'

/**
 * Resolve a feature flag on the server.
 *
 * Resolution order (matches `useFeatureFlag` on the client):
 *   1. Env var override   FEATURE_FLAG_<KEY>           (self-hoster force)
 *   2. Registry default
 */
export async function resolveServerFeatureFlag<K extends FeatureFlagKey>(
  key: K,
  _options: {
    distinctId: string
    groups?: Record<string, string>
  },
): Promise<FeatureFlagValue<K>> {
  const def = FEATURE_FLAGS[key]

  const envOverride = parseFlagOverride(key, process.env[flagEnvVarName(key)])
  if (envOverride !== undefined) return envOverride as FeatureFlagValue<K>

  return def.defaultValue as FeatureFlagValue<K>
}

export async function isServerFeatureEnabled(
  key: FeatureFlagKey,
  options: { distinctId: string; groups?: Record<string, string> },
): Promise<boolean> {
  const value = (await resolveServerFeatureFlag(key, options)) as
    | boolean
    | string
  return value === true || (typeof value === 'string' && value.length > 0)
}

export async function resolveFeatureFlagForEvent<K extends FeatureFlagKey>(
  _event: H3Event,
  key: K,
  session: { userId?: string; organizationId?: string } | null,
): Promise<FeatureFlagValue<K>> {
  const envOverride = parseFlagOverride(key, process.env[flagEnvVarName(key)])
  if (envOverride !== undefined) return envOverride as FeatureFlagValue<K>

  if (!session?.userId) {
    return FEATURE_FLAGS[key].defaultValue as FeatureFlagValue<K>
  }

  return resolveServerFeatureFlag(key, {
    distinctId: session.userId,
    groups: session.organizationId
      ? { organization: session.organizationId }
      : undefined,
  })
}
