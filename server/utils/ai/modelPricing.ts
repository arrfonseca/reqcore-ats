import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { SupportedProvider } from './provider'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '../../data/model-pricing')

export const LITELLM_PRICING_URL =
  'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json'
export const GENAI_PRICES_URL =
  'https://raw.githubusercontent.com/pydantic/genai-prices/main/prices/data_slim.json'

const CACHE_TTL_MS = 6 * 60 * 60 * 1000
const FETCH_TIMEOUT_MS = 15_000

export interface LiteLLMEntry {
  input_cost_per_token?: number
  output_cost_per_token?: number
  litellm_provider?: string
}

export type LiteLLMCatalog = Record<string, LiteLLMEntry>

export interface GenaiMatchRule {
  equals?: string
  starts_with?: string
  contains?: string
  or?: GenaiMatchRule[]
}

export interface GenaiModelEntry {
  id: string
  match?: GenaiMatchRule
  prices?: unknown
}

export interface GenaiProviderBlock {
  id: string
  models?: GenaiModelEntry[]
}

export interface PricingCatalog {
  litellm: LiteLLMCatalog
  genai: GenaiProviderBlock[]
  source: 'remote' | 'bundled'
}

export interface ResolvedModelPricing {
  inputPricePer1m?: number
  outputPricePer1m?: number
  source?: 'litellm' | 'genai-prices'
}

const LITELLM_PROVIDER_MAP: Record<SupportedProvider, readonly string[]> = {
  openai: ['openai'],
  anthropic: ['anthropic'],
  google: ['vertex_ai-language-models', 'gemini', 'google'],
  openai_compatible: [],
}

const GENAI_PROVIDER_ID: Record<SupportedProvider, string | null> = {
  openai: 'openai',
  anthropic: 'anthropic',
  google: 'google',
  openai_compatible: null,
}

let catalogCache: { catalog: PricingCatalog, expiresAt: number } | null = null

function loadBundledLitellm(): LiteLLMCatalog {
  const raw = readFileSync(join(DATA_DIR, 'litellm.json'), 'utf-8')
  return JSON.parse(raw) as LiteLLMCatalog
}

function loadBundledGenai(): GenaiProviderBlock[] {
  const raw = readFileSync(join(DATA_DIR, 'genai-prices.json'), 'utf-8')
  return JSON.parse(raw) as GenaiProviderBlock[]
}

function trimLitellmCatalog(raw: Record<string, unknown>): LiteLLMCatalog {
  const out: LiteLLMCatalog = {}
  for (const [key, val] of Object.entries(raw)) {
    if (key === 'sample_spec' || typeof val !== 'object' || val === null) continue
    const entry = val as LiteLLMEntry & { mode?: string }
    if (entry.mode && entry.mode !== 'chat') continue
    if (entry.input_cost_per_token == null || entry.output_cost_per_token == null) continue
    out[key] = {
      input_cost_per_token: entry.input_cost_per_token,
      output_cost_per_token: entry.output_cost_per_token,
      litellm_provider: entry.litellm_provider,
    }
  }
  return out
}

async function fetchRemoteJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)
  return response.json() as Promise<T>
}

export function createPricingCatalogFromRaw(
  litellmRaw: Record<string, unknown>,
  genaiRaw: GenaiProviderBlock[],
  source: 'remote' | 'bundled',
): PricingCatalog {
  const providerIds = new Set(['openai', 'anthropic', 'google'])
  return {
    litellm: trimLitellmCatalog(litellmRaw),
    genai: genaiRaw.filter(p => providerIds.has(p.id)),
    source,
  }
}

async function loadRemoteCatalog(): Promise<PricingCatalog> {
  const [litellmRaw, genaiRaw] = await Promise.all([
    fetchRemoteJson<Record<string, unknown>>(LITELLM_PRICING_URL),
    fetchRemoteJson<GenaiProviderBlock[]>(GENAI_PRICES_URL),
  ])
  return createPricingCatalogFromRaw(litellmRaw, genaiRaw, 'remote')
}

function loadBundledCatalog(): PricingCatalog {
  return createPricingCatalogFromRaw(
    loadBundledLitellm() as unknown as Record<string, unknown>,
    loadBundledGenai(),
    'bundled',
  )
}

/** Load pricing catalogs — remote with in-memory cache, falling back to bundled snapshots. */
export async function getPricingCatalog(): Promise<PricingCatalog> {
  const now = Date.now()
  if (catalogCache && catalogCache.expiresAt > now) {
    return catalogCache.catalog
  }

  try {
    const catalog = await loadRemoteCatalog()
    catalogCache = { catalog, expiresAt: now + CACHE_TTL_MS }
    return catalog
  }
  catch {
    const catalog = loadBundledCatalog()
    catalogCache = { catalog, expiresAt: now + CACHE_TTL_MS }
    return catalog
  }
}

/** Test helper — reset in-memory cache between tests. */
export function resetPricingCatalogCache(): void {
  catalogCache = null
}

function perTokenToPer1M(costPerToken: number): number {
  return Math.round(costPerToken * 1_000_000 * 1_000_000) / 1_000_000
}

function extractMtokValue(value: unknown): number | undefined {
  if (typeof value === 'number') return value
  if (value && typeof value === 'object' && 'base' in value) {
    const base = (value as { base?: number }).base
    return typeof base === 'number' ? base : undefined
  }
  return undefined
}

function extractGenaiPrices(pricesField: unknown): { input?: number, output?: number } {
  if (!pricesField) return {}
  if (Array.isArray(pricesField)) {
    const first = pricesField[0] as { prices?: unknown } | undefined
    return extractGenaiPrices(first?.prices ?? first)
  }
  if (typeof pricesField !== 'object') return {}
  const p = pricesField as Record<string, unknown>
  return {
    input: extractMtokValue(p.input_mtok),
    output: extractMtokValue(p.output_mtok),
  }
}

function matchesModelId(modelId: string, rule: GenaiMatchRule): boolean {
  if (rule.or?.length) return rule.or.some(r => matchesModelId(modelId, r))
  if (rule.equals !== undefined) return modelId === rule.equals
  if (rule.starts_with !== undefined) return modelId.startsWith(rule.starts_with)
  if (rule.contains !== undefined) return modelId.includes(rule.contains)
  return false
}

function resolveFromLitellm(
  provider: SupportedProvider,
  modelId: string,
  catalog: PricingCatalog,
): ResolvedModelPricing | null {
  const allowedProviders = LITELLM_PROVIDER_MAP[provider]
  if (!allowedProviders.length) return null

  const tryEntry = (key: string, entry: LiteLLMEntry): ResolvedModelPricing | null => {
    if (!entry.litellm_provider || !allowedProviders.includes(entry.litellm_provider)) return null
    if (entry.input_cost_per_token == null || entry.output_cost_per_token == null) return null
    return {
      inputPricePer1m: perTokenToPer1M(entry.input_cost_per_token),
      outputPricePer1m: perTokenToPer1M(entry.output_cost_per_token),
      source: 'litellm',
    }
  }

  const exact = catalog.litellm[modelId]
  if (exact) {
    const resolved = tryEntry(modelId, exact)
    if (resolved) return resolved
  }

  for (const [key, entry] of Object.entries(catalog.litellm)) {
    if (key === modelId) continue
    const suffixMatch = key.endsWith(`/${modelId}`) || key.endsWith(`:${modelId}`)
    if (key === modelId || suffixMatch) {
      const resolved = tryEntry(key, entry)
      if (resolved) return resolved
    }
  }

  return null
}

function resolveFromGenai(
  provider: SupportedProvider,
  modelId: string,
  catalog: PricingCatalog,
): ResolvedModelPricing | null {
  const providerId = GENAI_PROVIDER_ID[provider]
  if (!providerId) return null

  const block = catalog.genai.find(p => p.id === providerId)
  if (!block?.models?.length) return null

  for (const model of block.models) {
    const rule = model.match ?? { equals: model.id }
    if (!matchesModelId(modelId, rule)) continue
    const { input, output } = extractGenaiPrices(model.prices)
    if (input == null && output == null) continue
    return {
      inputPricePer1m: input,
      outputPricePer1m: output,
      source: 'genai-prices',
    }
  }

  return null
}

export function resolveModelPricing(
  provider: SupportedProvider,
  modelId: string,
  catalog: PricingCatalog,
): ResolvedModelPricing {
  return resolveFromLitellm(provider, modelId, catalog)
    ?? resolveFromGenai(provider, modelId, catalog)
    ?? {}
}
