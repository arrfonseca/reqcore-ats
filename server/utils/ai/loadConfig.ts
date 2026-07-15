/**
 * Resolve the AI configuration to use for a given purpose.
 *
 * `loadEffectiveAiConfig` branches on tenant policy:
 *   - allowOwnLlm → org `ai_config`
 *   - !allowOwnLlm → global `platform_ai_config`
 */
import { and, eq } from 'drizzle-orm'
import { aiConfig, platformAiConfig } from '../../database/schema'
import { getTenantAiPolicy } from './tenantAiPolicy'

export type AiConfigPurpose = 'chatbot' | 'analysis'
export type EffectiveAiConfigSource = 'tenant' | 'platform'

export interface EffectiveAiConfig {
  id: string
  source: EffectiveAiConfigSource
  name: string
  provider: string
  model: string
  apiKeyEncrypted: string
  baseUrl: string | null
  maxTokens: number
  inputPricePer1m: number | null
  outputPricePer1m: number | null
}

type ConfigRow = {
  id: string
  name: string
  provider: string
  model: string
  apiKeyEncrypted: string | null
  baseUrl: string | null
  maxTokens: number
  inputPricePer1m: string | null
  outputPricePer1m: string | null
}

function normalizeRow(row: ConfigRow, source: EffectiveAiConfigSource): EffectiveAiConfig {
  if (!row.apiKeyEncrypted) {
    throw createError({
      statusCode: 422,
      statusMessage: source === 'platform'
        ? 'Platform AI is not fully configured. Ask your platform administrator to set an API key.'
        : 'AI configuration has no API key. Update it in Settings → AI.',
    })
  }
  return {
    id: row.id,
    source,
    name: row.name,
    provider: row.provider,
    model: row.model,
    apiKeyEncrypted: row.apiKeyEncrypted,
    baseUrl: row.baseUrl,
    maxTokens: row.maxTokens,
    inputPricePer1m: row.inputPricePer1m != null ? Number(row.inputPricePer1m) : null,
    outputPricePer1m: row.outputPricePer1m != null ? Number(row.outputPricePer1m) : null,
  }
}

function purposeErrorMessage(purpose: AiConfigPurpose, source: EffectiveAiConfigSource): string {
  if (source === 'platform') {
    return purpose === 'chatbot'
      ? 'Platform chatbot AI is not configured. Contact your platform administrator.'
      : 'Platform analysis AI is not configured. Contact your platform administrator.'
  }
  return purpose === 'chatbot'
    ? 'No AI provider configured. Add one in Settings → AI to enable the assistant.'
    : 'No AI provider configured. Add one in Settings → AI to enable candidate analysis.'
}

async function loadTenantAiConfig(
  orgId: string,
  purpose: AiConfigPurpose,
  preferId?: string | null,
): Promise<EffectiveAiConfig> {
  if (preferId) {
    const found = await db.query.aiConfig.findFirst({
      where: and(eq(aiConfig.id, preferId), eq(aiConfig.organizationId, orgId)),
    })
    if (found) return normalizeRow(found, 'tenant')
  }

  const defaultCol = purpose === 'chatbot' ? aiConfig.isDefaultChatbot : aiConfig.isDefaultAnalysis
  const def = await db.query.aiConfig.findFirst({
    where: and(eq(aiConfig.organizationId, orgId), eq(defaultCol, true)),
  })
  if (def) return normalizeRow(def, 'tenant')

  const any = await db.query.aiConfig.findFirst({
    where: eq(aiConfig.organizationId, orgId),
  })
  if (any) return normalizeRow(any, 'tenant')

  throw createError({ statusCode: 422, statusMessage: purposeErrorMessage(purpose, 'tenant') })
}

async function loadPlatformAiConfig(
  purpose: AiConfigPurpose,
): Promise<EffectiveAiConfig> {
  const defaultCol = purpose === 'chatbot'
    ? platformAiConfig.isDefaultChatbot
    : platformAiConfig.isDefaultAnalysis

  const def = await db.query.platformAiConfig.findFirst({
    where: and(eq(platformAiConfig.isActive, true), eq(defaultCol, true)),
  })
  if (def) return normalizeRow(def, 'platform')

  const any = await db.query.platformAiConfig.findFirst({
    where: eq(platformAiConfig.isActive, true),
  })
  if (any) return normalizeRow(any, 'platform')

  throw createError({ statusCode: 422, statusMessage: purposeErrorMessage(purpose, 'platform') })
}

/** Resolve tenant or platform AI config based on org policy. */
export async function loadEffectiveAiConfig(
  orgId: string,
  opts: { purpose: AiConfigPurpose, preferId?: string | null },
): Promise<EffectiveAiConfig> {
  const { allowOwnLlm } = await getTenantAiPolicy(orgId)

  if (!allowOwnLlm) {
    if (opts.preferId) {
      throw createError({
        statusCode: 422,
        statusMessage: 'Model overrides are not available when AI is managed by the platform.',
      })
    }
    return loadPlatformAiConfig(opts.purpose)
  }

  return loadTenantAiConfig(orgId, opts.purpose, opts.preferId)
}

/** @deprecated Use loadEffectiveAiConfig — kept for gradual migration. */
export async function loadAiConfig(
  orgId: string,
  opts: { purpose: AiConfigPurpose, preferId?: string | null },
) {
  const effective = await loadEffectiveAiConfig(orgId, opts)
  return {
    id: effective.id,
    organizationId: orgId,
    name: effective.name,
    provider: effective.provider,
    model: effective.model,
    apiKeyEncrypted: effective.apiKeyEncrypted,
    baseUrl: effective.baseUrl,
    maxTokens: effective.maxTokens,
    inputPricePer1m: effective.inputPricePer1m != null ? String(effective.inputPricePer1m) : null,
    outputPricePer1m: effective.outputPricePer1m != null ? String(effective.outputPricePer1m) : null,
    isDefaultChatbot: opts.purpose === 'chatbot',
    isDefaultAnalysis: opts.purpose === 'analysis',
  }
}

/** Public summary for UI (no secrets). */
export async function getEffectiveAiSummary(orgId: string) {
  const { allowOwnLlm } = await getTenantAiPolicy(orgId)

  async function summaryFor(purpose: AiConfigPurpose) {
    try {
      const cfg = await loadEffectiveAiConfig(orgId, { purpose })
      return {
        configured: true,
        source: cfg.source,
        provider: cfg.provider,
        model: cfg.model,
        name: cfg.name,
      }
    }
    catch {
      return {
        configured: false,
        source: allowOwnLlm ? 'tenant' as const : 'platform' as const,
        provider: null,
        model: null,
        name: null,
      }
    }
  }

  const [analysis, chatbot] = await Promise.all([
    summaryFor('analysis'),
    summaryFor('chatbot'),
  ])

  return { allowOwnLlm, analysis, chatbot }
}
