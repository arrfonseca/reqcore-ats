import type { ModelInfo, SupportedProvider } from './provider'
import type { PricingCatalog } from './modelPricing'
import { resolveModelPricing } from './modelPricing'

type ModelHint = Pick<ModelInfo, 'label' | 'description' | 'badge'>

/** Curated metadata for well-known models — labels, descriptions, badges only (no pricing). */
export const MODEL_HINTS: Record<SupportedProvider, Record<string, ModelHint>> = {
  openai: {
    'gpt-4.1': { label: 'GPT-4.1', description: 'Flagship model — highest accuracy for complex reasoning.', badge: 'powerful' },
    'gpt-4.1-mini': { label: 'GPT-4.1 Mini', description: 'Best balance of price, speed and quality. Recommended default.', badge: 'recommended' },
    'gpt-4.1-nano': { label: 'GPT-4.1 Nano', description: 'Fastest and cheapest GPT-4.1. Great for high-volume scoring.', badge: 'cheap' },
    'gpt-4o': { label: 'GPT-4o', description: 'Multimodal flagship from the GPT-4o family.' },
    'gpt-4o-mini': { label: 'GPT-4o Mini', description: 'Older small model — keep for cost compatibility.' },
    'o3': { label: 'o3', description: 'Reasoning model — slow but excellent at multi-step problems.' },
    'o4-mini': { label: 'o4 Mini', description: 'Smaller reasoning model — good price/quality for scoring.' },
  },
  anthropic: {
    'claude-opus-4-20250514': { label: 'Claude Opus 4', description: 'Anthropic\'s most capable model. Best for the toughest analyses.', badge: 'powerful' },
    'claude-sonnet-4-20250514': { label: 'Claude Sonnet 4', description: 'The sweet spot — strong reasoning at a sensible price.', badge: 'recommended' },
    'claude-3-5-haiku-20241022': { label: 'Claude 3.5 Haiku', description: 'Fast and inexpensive. Great for chat and quick scoring.', badge: 'fast' },
  },
  google: {
    'gemini-2.5-pro': { label: 'Gemini 2.5 Pro', description: 'Google\'s top model — strong at reasoning and long contexts.', badge: 'powerful' },
    'gemini-2.5-flash': { label: 'Gemini 2.5 Flash', description: 'Excellent quality at a very low price. Recommended default.', badge: 'recommended' },
    'gemini-2.0-flash': { label: 'Gemini 2.0 Flash', description: 'Previous-gen fast model. Still solid and very cheap.', badge: 'cheap' },
    'gemini-2.0-flash-lite': { label: 'Gemini 2.0 Flash Lite', description: 'Cheapest Gemini option for high-volume light tasks.', badge: 'cheap' },
  },
  openai_compatible: {},
}

export function getModelHint(provider: SupportedProvider, modelId: string): ModelHint | undefined {
  return MODEL_HINTS[provider]?.[modelId]
}

export function humanizeModelId(id: string): string {
  return id
    .replace(/^models\//, '')
    .split(/[-_]/g)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function buildModelInfo(
  provider: SupportedProvider,
  id: string,
  catalog: PricingCatalog,
  displayName?: string,
): ModelInfo {
  const hint = getModelHint(provider, id)
  const pricing = resolveModelPricing(provider, id, catalog)
  return {
    id,
    label: hint?.label ?? displayName ?? humanizeModelId(id),
    description: hint?.description ?? id,
    inputPricePer1m: pricing.inputPricePer1m,
    outputPricePer1m: pricing.outputPricePer1m,
    badge: hint?.badge,
    ...(pricing.source ? { pricingFromCatalog: true } : {}),
  }
}

/** @deprecated Use buildModelInfo with a pricing catalog. */
export function mergeModelHint(
  provider: SupportedProvider,
  id: string,
  displayName?: string,
): ModelInfo {
  const hint = getModelHint(provider, id)
  return {
    id,
    label: hint?.label ?? displayName ?? humanizeModelId(id),
    description: hint?.description ?? id,
    badge: hint?.badge,
  }
}

const BADGE_ORDER: Record<NonNullable<ModelInfo['badge']>, number> = {
  recommended: 0,
  fast: 1,
  powerful: 2,
  cheap: 3,
}

export function sortModelInfos(models: ModelInfo[]): ModelInfo[] {
  return [...models].sort((a, b) => {
    const aBadge = a.badge != null ? BADGE_ORDER[a.badge] : 99
    const bBadge = b.badge != null ? BADGE_ORDER[b.badge] : 99
    if (aBadge !== bBadge) return aBadge - bBadge
    return a.label.localeCompare(b.label)
  })
}
