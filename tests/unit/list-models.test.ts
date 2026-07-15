import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { buildModelInfo, humanizeModelId, sortModelInfos } from '../../server/utils/ai/modelHints'
import {
  createPricingCatalogFromRaw,
  resolveModelPricing,
  resetPricingCatalogCache,
} from '../../server/utils/ai/modelPricing'

const mockCatalog = createPricingCatalogFromRaw(
  {
    'gpt-4.1-mini': {
      input_cost_per_token: 4e-7,
      output_cost_per_token: 1.6e-6,
      litellm_provider: 'openai',
      mode: 'chat',
    },
    'claude-sonnet-4-20250514': {
      input_cost_per_token: 3e-6,
      output_cost_per_token: 1.5e-5,
      litellm_provider: 'anthropic',
      mode: 'chat',
    },
    'gemini-2.5-flash': {
      input_cost_per_token: 3e-7,
      output_cost_per_token: 2.5e-6,
      litellm_provider: 'vertex_ai-language-models',
      mode: 'chat',
    },
  },
  [
    {
      id: 'anthropic',
      models: [
        {
          id: 'claude-opus-4-0',
          match: {
            or: [
              { starts_with: 'claude-opus-4-0' },
              { equals: 'claude-opus-4-20250514' },
            ],
          },
          prices: { input_mtok: 15, output_mtok: 75 },
        },
      ],
    },
  ],
  'bundled',
)

describe('modelHints', () => {
  it('humanizes model ids', () => {
    expect(humanizeModelId('gpt-4.1-mini')).toBe('Gpt 4.1 Mini')
    expect(humanizeModelId('models/gemini-2.5-flash')).toBe('Gemini 2.5 Flash')
  })

  it('merges known hints with catalog pricing', () => {
    const info = buildModelInfo('openai', 'gpt-4.1-mini', mockCatalog)
    expect(info.label).toBe('GPT-4.1 Mini')
    expect(info.description).toContain('Recommended')
    expect(info.inputPricePer1m).toBe(0.4)
    expect(info.outputPricePer1m).toBe(1.6)
    expect(info.badge).toBe('recommended')
    expect(info.pricingFromCatalog).toBe(true)
  })

  it('falls back to id for unknown models without pricing', () => {
    const info = buildModelInfo('openai_compatible', 'llama-3.1-8b', mockCatalog)
    expect(info.label).toBe('Llama 3.1 8b')
    expect(info.description).toBe('llama-3.1-8b')
    expect(info.inputPricePer1m).toBeUndefined()
    expect(info.pricingFromCatalog).toBeUndefined()
  })

  it('sorts recommended models before others', () => {
    const sorted = sortModelInfos([
      buildModelInfo('openai', 'gpt-4.1', mockCatalog),
      buildModelInfo('openai', 'gpt-4.1-mini', mockCatalog),
    ])
    expect(sorted[0]?.id).toBe('gpt-4.1-mini')
  })
})

describe('resolveModelPricing', () => {
  it('resolves LiteLLM exact match with per-1M conversion', () => {
    const pricing = resolveModelPricing('openai', 'gpt-4.1-mini', mockCatalog)
    expect(pricing.inputPricePer1m).toBe(0.4)
    expect(pricing.outputPricePer1m).toBe(1.6)
    expect(pricing.source).toBe('litellm')
  })

  it('resolves Google models via LiteLLM vertex provider', () => {
    const pricing = resolveModelPricing('google', 'gemini-2.5-flash', mockCatalog)
    expect(pricing.inputPricePer1m).toBe(0.3)
    expect(pricing.outputPricePer1m).toBe(2.5)
    expect(pricing.source).toBe('litellm')
  })

  it('falls back to genai-prices fuzzy match', () => {
    const pricing = resolveModelPricing('anthropic', 'claude-opus-4-20250514', mockCatalog)
    expect(pricing.inputPricePer1m).toBe(15)
    expect(pricing.outputPricePer1m).toBe(75)
    expect(pricing.source).toBe('genai-prices')
  })

  it('returns empty for unknown models', () => {
    const pricing = resolveModelPricing('openai', 'unknown-model-xyz', mockCatalog)
    expect(pricing.inputPricePer1m).toBeUndefined()
    expect(pricing.outputPricePer1m).toBeUndefined()
    expect(pricing.source).toBeUndefined()
  })
})

describe('listProviderModels filtering', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    resetPricingCatalogCache()
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.stubGlobal('fetch', originalFetch)
    vi.restoreAllMocks()
    resetPricingCatalogCache()
  })

  it('filters OpenAI models to chat/reasoning ids only', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({
      data: [
        { id: 'gpt-4.1-mini' },
        { id: 'text-embedding-3-small' },
        { id: 'whisper-1' },
        { id: 'o3' },
      ],
    }), { status: 200 }))

    const { listProviderModels } = await import('../../server/utils/ai/listModels')
    const models = await listProviderModels('openai', 'sk-test', null, mockCatalog)
    expect(models.map(m => m.id)).toEqual(['gpt-4.1-mini', 'o3'])
    expect(models[0]?.inputPricePer1m).toBe(0.4)
  })

  it('normalizes Google model ids and filters by generateContent', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({
      models: [
        { name: 'models/gemini-2.5-flash', displayName: 'Gemini 2.5 Flash', supportedGenerationMethods: ['generateContent'] },
        { name: 'models/embedding-001', supportedGenerationMethods: ['embedContent'] },
      ],
    }), { status: 200 }))

    const { listProviderModels } = await import('../../server/utils/ai/listModels')
    const models = await listProviderModels('google', 'key-test', null, mockCatalog)
    expect(models).toHaveLength(1)
    expect(models[0]?.id).toBe('gemini-2.5-flash')
    expect(models[0]?.label).toBe('Gemini 2.5 Flash')
    expect(models[0]?.inputPricePer1m).toBe(0.3)
  })

  it('lists all ids from OpenAI-compatible endpoints', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({
      data: [{ id: 'llama-3.1-8b' }, { id: 'mistral-7b' }],
    }), { status: 200 }))

    const { listProviderModels } = await import('../../server/utils/ai/listModels')
    const models = await listProviderModels('openai_compatible', 'local', 'http://localhost:11434/v1', mockCatalog)
    expect(models.map(m => m.id)).toEqual(['llama-3.1-8b', 'mistral-7b'])
    expect(models[0]?.inputPricePer1m).toBeUndefined()
  })

  it('falls back to bundled catalog when remote fetch fails', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('network error'))

    const { getPricingCatalog } = await import('../../server/utils/ai/modelPricing')
    const catalog = await getPricingCatalog()
    expect(catalog.source).toBe('bundled')
    expect(Object.keys(catalog.litellm).length).toBeGreaterThan(0)
    expect(catalog.genai.length).toBeGreaterThan(0)
  })
})

describe('listAiModelsSchema', () => {
  it('accepts configId without apiKey for edit-mode listing', async () => {
    const { listAiModelsSchema } = await import('../../server/utils/schemas/scoring')
    const result = listAiModelsSchema.safeParse({
      provider: 'openai',
      configId: 'cfg_123',
    })
    expect(result.success).toBe(true)
  })

  it('accepts verify and includeHidden for SaaS listing', async () => {
    const { listAiModelsSchema } = await import('../../server/utils/schemas/scoring')
    const result = listAiModelsSchema.safeParse({
      provider: 'openai',
      verify: true,
      includeHidden: true,
      forceVerify: true,
      ensureModelIds: ['gpt-4.1-mini'],
    })
    expect(result.success).toBe(true)
  })
})

describe('isOpenAiChatModel', () => {
  it('excludes image, vision, audio, and other non-chat ids', async () => {
    const { isOpenAiChatModel } = await import('../../server/utils/ai/listModels')
    expect(isOpenAiChatModel('gpt-4.1-mini')).toBe(true)
    expect(isOpenAiChatModel('chatgpt-image-latest')).toBe(false)
    expect(isOpenAiChatModel('gpt-4-vision-preview')).toBe(false)
    expect(isOpenAiChatModel('gpt-4o-audio-preview')).toBe(false)
    expect(isOpenAiChatModel('gpt-4o-realtime-preview')).toBe(false)
    expect(isOpenAiChatModel('gpt-4o-search-preview')).toBe(false)
    expect(isOpenAiChatModel('codex-mini-latest')).toBe(false)
  })
})
