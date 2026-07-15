import type { ModelInfo, SupportedProvider } from './provider'
import { buildModelInfo, sortModelInfos } from './modelHints'
import { getPricingCatalog, type PricingCatalog } from './modelPricing'

const FETCH_TIMEOUT_MS = 10_000

function assertSafeBaseUrl(baseUrl: string): string {
  const parsed = new URL(baseUrl)
  if (parsed.hostname === '169.254.169.254' || parsed.hostname === 'metadata.google.internal') {
    throw createError({ statusCode: 400, statusMessage: 'URL must not target internal metadata endpoints.' })
  }
  return baseUrl.replace(/\/+$/, '')
}

async function fetchJson<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw createError({
      statusCode: 422,
      statusMessage: `Provider returned ${response.status}${body ? `: ${body.slice(0, 200)}` : ''}`,
    })
  }
  return response.json() as Promise<T>
}

function isOpenAiChatModel(id: string): boolean {
  const lower = id.toLowerCase()
  if (lower.includes('embed')) return false
  if (lower.includes('whisper')) return false
  if (lower.includes('tts')) return false
  if (lower.includes('dall-e') || lower.includes('dalle')) return false
  if (lower.includes('moderation')) return false
  if (lower.includes('-image')) return false
  if (lower.includes('vision')) return false
  if (lower.includes('audio')) return false
  if (lower.includes('realtime')) return false
  if (lower.includes('search')) return false
  if (lower.includes('codex')) return false
  if (lower.startsWith('gpt-')) return true
  if (lower.startsWith('chatgpt-')) return true
  if (/^o\d/.test(lower)) return true
  return false
}

export { isOpenAiChatModel }

function isAnthropicChatModel(id: string): boolean {
  return id.toLowerCase().includes('claude')
}

async function listOpenAiModels(
  apiKey: string,
  catalog: PricingCatalog,
  baseUrl?: string | null,
): Promise<ModelInfo[]> {
  const root = baseUrl ? assertSafeBaseUrl(baseUrl) : 'https://api.openai.com/v1'
  const data = await fetchJson<{ data?: { id: string }[] }>(`${root}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  const ids = (data.data ?? [])
    .map(m => m.id)
    .filter(isOpenAiChatModel)
  return sortModelInfos(ids.map(id => buildModelInfo('openai', id, catalog)))
}

async function listAnthropicModels(
  apiKey: string,
  catalog: PricingCatalog,
  baseUrl?: string | null,
): Promise<ModelInfo[]> {
  const root = baseUrl ? assertSafeBaseUrl(baseUrl) : 'https://api.anthropic.com/v1'
  const data = await fetchJson<{ data?: { id: string, display_name?: string }[] }>(`${root}/models`, {
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
  })
  const models = (data.data ?? []).filter(m => isAnthropicChatModel(m.id))
  return sortModelInfos(models.map(m => buildModelInfo('anthropic', m.id, catalog, m.display_name)))
}

async function listGoogleModels(
  apiKey: string,
  catalog: PricingCatalog,
  baseUrl?: string | null,
): Promise<ModelInfo[]> {
  const root = baseUrl ? assertSafeBaseUrl(baseUrl) : 'https://generativelanguage.googleapis.com/v1beta'
  const data = await fetchJson<{
    models?: { name: string, displayName?: string, supportedGenerationMethods?: string[] }[]
  }>(`${root}/models?key=${encodeURIComponent(apiKey)}`, {})
  const models = (data.models ?? []).filter(m =>
    (m.supportedGenerationMethods ?? []).includes('generateContent'),
  )
  return sortModelInfos(models.map((m) => {
    const id = m.name.replace(/^models\//, '')
    return buildModelInfo('google', id, catalog, m.displayName)
  }))
}

async function listCompatibleModels(
  apiKey: string,
  catalog: PricingCatalog,
  baseUrl: string,
): Promise<ModelInfo[]> {
  const root = assertSafeBaseUrl(baseUrl)
  const data = await fetchJson<{ data?: { id: string }[] }>(`${root}/models`, {
    headers: { Authorization: `Bearer ${apiKey || 'no-key'}` },
  })
  const ids = (data.data ?? []).map(m => m.id).filter(Boolean)
  return sortModelInfos(ids.map(id => buildModelInfo('openai_compatible', id, catalog)))
}

/**
 * Fetch available models from the provider API and enrich with catalog pricing + UI hints.
 */
export async function listProviderModels(
  provider: SupportedProvider,
  apiKey: string,
  baseUrl?: string | null,
  catalog?: PricingCatalog,
): Promise<ModelInfo[]> {
  const pricingCatalog = catalog ?? await getPricingCatalog()

  switch (provider) {
    case 'openai':
      return listOpenAiModels(apiKey, pricingCatalog, baseUrl)
    case 'anthropic':
      return listAnthropicModels(apiKey, pricingCatalog, baseUrl)
    case 'google':
      return listGoogleModels(apiKey, pricingCatalog, baseUrl)
    case 'openai_compatible':
      if (!baseUrl) {
        throw createError({ statusCode: 400, statusMessage: 'Base URL is required for OpenAI-compatible providers.' })
      }
      return listCompatibleModels(apiKey, pricingCatalog, baseUrl)
    default:
      throw createError({ statusCode: 400, statusMessage: `Unsupported provider: ${provider}` })
  }
}

/** Ensure a saved model id appears in the list even if the provider API omits it. */
export function ensureModelInList(
  models: ModelInfo[],
  provider: SupportedProvider,
  modelId: string,
  catalog: PricingCatalog,
): ModelInfo[] {
  if (!modelId || models.some(m => m.id === modelId)) return models
  return sortModelInfos([buildModelInfo(provider, modelId, catalog), ...models])
}
