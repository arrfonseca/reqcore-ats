import { describe, it, expect, vi, beforeEach } from 'vitest'

const verifyResults = [
  { modelId: 'gpt-4.1-mini', ok: true },
  { modelId: 'chatgpt-image-latest', ok: false, error: 'not a chat model' },
]

vi.mock('../../server/utils/ai/probeModel', () => ({
  verifyProviderModels: vi.fn(async () => verifyResults),
  getHiddenModelIds: vi.fn(async () => new Set(['hidden-model'])),
}))

vi.mock('../../server/utils/ai/listModels', () => ({
  listProviderModels: vi.fn(async () => [
    { id: 'gpt-4.1-mini', label: 'GPT-4.1 Mini', description: 'test' },
    { id: 'chatgpt-image-latest', label: 'Image', description: 'test' },
    { id: 'hidden-model', label: 'Hidden', description: 'test' },
  ]),
  ensureModelInList: vi.fn((models: { id: string }[]) => models),
}))

vi.mock('../../server/utils/ai/modelPricing', () => ({
  getPricingCatalog: vi.fn(async () => ({ litellm: {}, genai: [], source: 'bundled' })),
}))

vi.mock('../../server/utils/ai/resolveCredentials', () => ({
  resolvePlatformAiCredentials: vi.fn(async () => ({
    apiKey: 'sk-test',
    baseUrl: null,
    provider: 'openai',
  })),
}))

vi.mock('../../server/utils/requirePlatformPermission', () => ({
  requirePlatformPermission: vi.fn(),
}))

vi.mock('../../server/utils/rateLimit', () => ({
  createRateLimiter: () => async () => {},
}))

describe('saas platform-ai models.post verification filter', () => {
  beforeEach(() => {
    vi.stubGlobal('defineEventHandler', (fn: unknown) => fn)
    vi.stubGlobal('readValidatedBody', async (_e: unknown, parse: (b: unknown) => unknown) =>
      parse({ provider: 'openai', verify: true }),
    )
    vi.stubGlobal('createError', (opts: { statusCode: number, statusMessage: string }) => {
      const err = new Error(opts.statusMessage) as Error & { statusCode: number }
      err.statusCode = opts.statusCode
      throw err
    })
    vi.stubGlobal('db', { query: { platformAiConfig: { findFirst: vi.fn(async () => null) } } })
  })

  it('returns only verified models and excludes hidden', async () => {
    const handler = (await import('../../server/api/saas/platform-ai/models.post')).default as (
      event: unknown,
    ) => Promise<{ models: { id: string, verified?: boolean }[] }>

    const result = await handler({})
    expect(result.models.map(m => m.id)).toEqual(['gpt-4.1-mini'])
    expect(result.models[0]?.verified).toBe(true)
  })
})

describe('getHiddenModelIds filter logic', () => {
  it('filters hidden ids from model list', async () => {
    const hidden = new Set(['hidden-model'])
    const models = [
      { id: 'gpt-4.1-mini' },
      { id: 'hidden-model' },
    ]
    const ensureIds = new Set<string>()
    const filtered = models.filter(m => !hidden.has(m.id) || ensureIds.has(m.id))
    expect(filtered.map(m => m.id)).toEqual(['gpt-4.1-mini'])
  })
})

describe('applyPlatformAiScopesSchema', () => {
  it('accepts chatbot and analysis model ids', async () => {
    const { applyPlatformAiScopesSchema } = await import('../../server/utils/schemas/scoring')
    const result = applyPlatformAiScopesSchema.safeParse({
      provider: 'openai',
      apiKey: 'sk-test',
      chatbotModelId: 'gpt-4.1-mini',
      analysisModelId: 'gpt-4.1',
    })
    expect(result.success).toBe(true)
  })
})
