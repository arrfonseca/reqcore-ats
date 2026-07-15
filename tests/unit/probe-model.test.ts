import { describe, it, expect, vi, beforeEach } from 'vitest'

const generateTextMock = vi.fn()
const selectMock = vi.fn()
const fromMock = vi.fn()
const whereMock = vi.fn()

vi.mock('ai', () => ({
  generateText: (...args: unknown[]) => generateTextMock(...args),
}))

vi.mock('../../server/utils/encryption', () => ({
  encrypt: (key: string) => `enc:${key}`,
}))

vi.mock('../../server/utils/ai/provider', () => ({
  createLanguageModel: vi.fn(() => ({ modelId: 'mock-model' })),
}))

vi.mock('../../server/database/schema', () => ({
  platformAiModelVerification: {
    modelId: 'model_id',
    provider: 'provider',
    baseUrl: 'base_url',
    ok: 'ok',
    errorMessage: 'error_message',
    verifiedAt: 'verified_at',
  },
  platformAiHiddenModel: {},
}))

vi.stubGlobal('env', { BETTER_AUTH_SECRET: 'test-secret' })
vi.stubGlobal('db', {
  select: selectMock,
  insert: vi.fn(() => ({
    values: vi.fn(() => ({
      onConflictDoUpdate: vi.fn(async () => {}),
    })),
  })),
  query: {
    platformAiHiddenModel: { findMany: vi.fn(async () => []) },
  },
})

describe('probeModelConnection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    generateTextMock.mockResolvedValue({ text: 'ok' })
    selectMock.mockReturnValue({ from: fromMock })
    fromMock.mockReturnValue({ where: whereMock })
    whereMock.mockResolvedValue([])
  })

  it('uses generateText without JSON schema', async () => {
    const { probeModelConnection } = await import('../../server/utils/ai/probeModel')

    await probeModelConnection({
      provider: 'openai',
      model: 'gpt-4.1-mini',
      apiKeyEncrypted: 'enc:sk-test',
      maxTokens: 10,
    })

    expect(generateTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: 'Reply with exactly: ok',
        maxTokens: 10,
        temperature: 0,
      }),
    )
    const call = generateTextMock.mock.calls[0]![0] as Record<string, unknown>
    expect(call).not.toHaveProperty('schema')
  })
})

describe('verifyProviderModels batch cache', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    generateTextMock.mockResolvedValue({ text: 'ok' })
    selectMock.mockReturnValue({ from: fromMock })
    fromMock.mockReturnValue({ where: whereMock })
    whereMock.mockResolvedValue([
      {
        modelId: 'gpt-4.1-mini',
        ok: true,
        errorMessage: null,
        verifiedAt: new Date(),
      },
    ])
  })

  it('uses one batch cache query and skips live probe for cached models', async () => {
    const { verifyProviderModels } = await import('../../server/utils/ai/probeModel')

    const results = await verifyProviderModels(
      'openai',
      'sk-test',
      ['gpt-4.1-mini', 'gpt-4.1'],
      null,
      { cacheOnly: true },
    )

    expect(whereMock).toHaveBeenCalledTimes(1)
    expect(generateTextMock).not.toHaveBeenCalled()
    expect(results).toEqual([{ modelId: 'gpt-4.1-mini', ok: true, error: undefined }])
  })

  it('live-probes only uncached model ids', async () => {
    const { verifyProviderModels } = await import('../../server/utils/ai/probeModel')

    const results = await verifyProviderModels(
      'openai',
      'sk-test',
      ['gpt-4.1-mini', 'gpt-4.1'],
      null,
    )

    expect(whereMock).toHaveBeenCalledTimes(1)
    expect(generateTextMock).toHaveBeenCalledTimes(1)
    expect(results).toHaveLength(2)
    expect(results.find(r => r.modelId === 'gpt-4.1-mini')?.ok).toBe(true)
    expect(results.find(r => r.modelId === 'gpt-4.1')?.ok).toBe(true)
  })
})
