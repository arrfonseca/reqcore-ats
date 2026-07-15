import { generateText } from 'ai'
import { and, eq, inArray } from 'drizzle-orm'
import { platformAiHiddenModel, platformAiModelVerification } from '../../database/schema'
import { encrypt } from '../encryption'
import { createLanguageModel, type ProviderConfig, type SupportedProvider } from './provider'

const PROBE_MAX_TOKENS = 10
const PROBE_TIMEOUT_MS = 8_000
const VERIFY_CONCURRENCY = 10
const CACHE_OK_TTL_MS = 24 * 60 * 60 * 1000
const CACHE_FAIL_TTL_MS = 60 * 60 * 1000

export interface ModelVerifyResult {
  modelId: string
  ok: boolean
  error?: string
}

export interface VerifyProviderModelsOptions {
  force?: boolean
  /** When true, return cached results only — no live probes (fast path). */
  cacheOnly?: boolean
}

function baseUrlKey(baseUrl?: string | null): string {
  return baseUrl ?? ''
}

/** Lightweight connectivity check — plain text, no JSON schema. */
export async function probeModelConnection(config: ProviderConfig): Promise<void> {
  const model = createLanguageModel({ ...config, maxTokens: PROBE_MAX_TOKENS })
  await generateText({
    model,
    prompt: 'Reply with exactly: ok',
    maxTokens: PROBE_MAX_TOKENS,
    temperature: 0,
    abortSignal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
  })
}

export async function probeModelWithPlainKey(
  provider: SupportedProvider,
  model: string,
  apiKey: string,
  baseUrl?: string | null,
): Promise<void> {
  await probeModelConnection({
    provider,
    model,
    apiKeyEncrypted: encrypt(apiKey, env.BETTER_AUTH_SECRET),
    baseUrl,
    maxTokens: PROBE_MAX_TOKENS,
  })
}

function cacheEntryFromRow(row: {
  modelId: string
  ok: boolean
  errorMessage: string | null
  verifiedAt: Date
}): ModelVerifyResult | null {
  const age = Date.now() - row.verifiedAt.getTime()
  const ttl = row.ok ? CACHE_OK_TTL_MS : CACHE_FAIL_TTL_MS
  if (age > ttl) return null
  return { modelId: row.modelId, ok: row.ok, error: row.errorMessage ?? undefined }
}

/** Single-query cache lookup for all candidate model ids. */
async function getCachedVerificationsBatch(
  provider: SupportedProvider,
  modelIds: string[],
  baseUrl?: string | null,
): Promise<Map<string, ModelVerifyResult>> {
  const map = new Map<string, ModelVerifyResult>()
  if (modelIds.length === 0) return map

  const rows = await db
    .select({
      modelId: platformAiModelVerification.modelId,
      ok: platformAiModelVerification.ok,
      errorMessage: platformAiModelVerification.errorMessage,
      verifiedAt: platformAiModelVerification.verifiedAt,
    })
    .from(platformAiModelVerification)
    .where(and(
      eq(platformAiModelVerification.provider, provider),
      eq(platformAiModelVerification.baseUrl, baseUrlKey(baseUrl)),
      inArray(platformAiModelVerification.modelId, modelIds),
    ))

  for (const row of rows) {
    const entry = cacheEntryFromRow(row)
    if (entry) map.set(row.modelId, entry)
  }
  return map
}

async function upsertVerification(
  provider: SupportedProvider,
  modelId: string,
  baseUrl: string,
  ok: boolean,
  error?: string,
): Promise<void> {
  const now = new Date()
  await db.insert(platformAiModelVerification)
    .values({
      provider,
      modelId,
      baseUrl,
      ok,
      errorMessage: error ?? null,
      verifiedAt: now,
    })
    .onConflictDoUpdate({
      target: [
        platformAiModelVerification.provider,
        platformAiModelVerification.modelId,
        platformAiModelVerification.baseUrl,
      ],
      set: {
        ok,
        errorMessage: error ?? null,
        verifiedAt: now,
      },
    })
}

async function probeOneModelWithEncryptedKey(
  provider: SupportedProvider,
  modelId: string,
  apiKeyEncrypted: string,
  baseUrl?: string | null,
): Promise<ModelVerifyResult> {
  try {
    await probeModelConnection({
      provider,
      model: modelId,
      apiKeyEncrypted,
      baseUrl,
      maxTokens: PROBE_MAX_TOKENS,
    })
    await upsertVerification(provider, modelId, baseUrlKey(baseUrl), true)
    return { modelId, ok: true }
  }
  catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    await upsertVerification(provider, modelId, baseUrlKey(baseUrl), false, message.slice(0, 500))
    return { modelId, ok: false, error: message }
  }
}

/** Batch-verify models with concurrency limit; uses a single DB read for cache. */
export async function verifyProviderModels(
  provider: SupportedProvider,
  apiKey: string,
  modelIds: string[],
  baseUrl?: string | null,
  options?: VerifyProviderModelsOptions,
): Promise<ModelVerifyResult[]> {
  const force = options?.force === true
  const cacheOnly = options?.cacheOnly === true

  const cacheMap = force
    ? new Map<string, ModelVerifyResult>()
    : await getCachedVerificationsBatch(provider, modelIds, baseUrl)

  const results: ModelVerifyResult[] = []
  const toProbe: string[] = []

  for (const modelId of modelIds) {
    const cached = cacheMap.get(modelId)
    if (cached) {
      results.push(cached)
    }
    else if (!cacheOnly) {
      toProbe.push(modelId)
    }
  }

  if (toProbe.length === 0) return results

  const apiKeyEncrypted = encrypt(apiKey, env.BETTER_AUTH_SECRET)
  const queue = [...toProbe]

  async function worker() {
    while (queue.length > 0) {
      const modelId = queue.shift()
      if (!modelId) break
      results.push(await probeOneModelWithEncryptedKey(provider, modelId, apiKeyEncrypted, baseUrl))
    }
  }

  const workers = Array.from(
    { length: Math.min(VERIFY_CONCURRENCY, toProbe.length) },
    () => worker(),
  )
  await Promise.all(workers)
  return results
}

/** Return model ids hidden by the SaaS Owner for a provider. */
export async function getHiddenModelIds(provider: SupportedProvider): Promise<Set<string>> {
  const rows = await db.query.platformAiHiddenModel.findMany({
    where: eq(platformAiHiddenModel.provider, provider),
    columns: { modelId: true },
  })
  return new Set(rows.map(r => r.modelId))
}
