import { describe, it, expect, vi, beforeEach } from 'vitest'

const tenantFindFirst = vi.fn()
const aiConfigFindFirst = vi.fn()
const platformFindFirst = vi.fn()
const getTenantAiPolicyMock = vi.fn()

vi.mock('../../server/utils/ai/tenantAiPolicy', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../server/utils/ai/tenantAiPolicy')>()
  return {
    ...actual,
    getTenantAiPolicy: (...args: unknown[]) => getTenantAiPolicyMock(...args),
  }
})

vi.mock('../../server/database/schema', () => ({
  aiConfig: {
    id: 'id',
    organizationId: 'organizationId',
    isDefaultChatbot: 'isDefaultChatbot',
    isDefaultAnalysis: 'isDefaultAnalysis',
  },
  platformAiConfig: {
    id: 'id',
    isActive: 'isActive',
    isDefaultChatbot: 'isDefaultChatbot',
    isDefaultAnalysis: 'isDefaultAnalysis',
  },
}))

const platformRow = {
  id: 'plat-1',
  name: 'Platform GPT',
  provider: 'openai',
  model: 'gpt-4.1-mini',
  apiKeyEncrypted: 'enc-key',
  baseUrl: null,
  maxTokens: 4096,
  inputPricePer1m: '1.00',
  outputPricePer1m: '2.00',
}

const tenantRow = {
  id: 'tenant-1',
  name: 'Tenant GPT',
  provider: 'openai',
  model: 'gpt-4o-mini',
  apiKeyEncrypted: 'enc-key',
  baseUrl: null,
  maxTokens: 4096,
  inputPricePer1m: '0.50',
  outputPricePer1m: '1.00',
}

describe('loadEffectiveAiConfig', () => {
  beforeEach(() => {
    tenantFindFirst.mockReset()
    aiConfigFindFirst.mockReset()
    platformFindFirst.mockReset()
    getTenantAiPolicyMock.mockReset()

    vi.stubGlobal('createError', (opts: { statusCode: number, statusMessage: string }) => {
      const err = new Error(opts.statusMessage) as Error & { statusCode: number }
      err.statusCode = opts.statusCode
      throw err
    })

    vi.stubGlobal('db', {
      query: {
        tenantAiSettings: { findFirst: tenantFindFirst },
        aiConfig: { findFirst: aiConfigFindFirst },
        platformAiConfig: { findFirst: platformFindFirst },
      },
    })
  })

  it('uses platform default analysis config when allowOwnLlm is false', async () => {
    getTenantAiPolicyMock.mockResolvedValue({ allowOwnLlm: false })
    platformFindFirst.mockResolvedValueOnce(platformRow)

    const { loadEffectiveAiConfig } = await import('../../server/utils/ai/loadConfig')
    const cfg = await loadEffectiveAiConfig('org-1', { purpose: 'analysis' })

    expect(cfg.source).toBe('platform')
    expect(cfg.model).toBe('gpt-4.1-mini')
    expect(aiConfigFindFirst).not.toHaveBeenCalled()
  })

  it('uses tenant default when allowOwnLlm is true', async () => {
    getTenantAiPolicyMock.mockResolvedValue({ allowOwnLlm: true })
    aiConfigFindFirst.mockResolvedValueOnce(tenantRow)

    const { loadEffectiveAiConfig } = await import('../../server/utils/ai/loadConfig')
    const cfg = await loadEffectiveAiConfig('org-1', { purpose: 'analysis' })

    expect(cfg.source).toBe('tenant')
    expect(cfg.model).toBe('gpt-4o-mini')
  })

  it('rejects preferId for platform-managed tenants', async () => {
    getTenantAiPolicyMock.mockResolvedValue({ allowOwnLlm: false })

    const { loadEffectiveAiConfig } = await import('../../server/utils/ai/loadConfig')
    await expect(
      loadEffectiveAiConfig('org-1', { purpose: 'analysis', preferId: 'some-id' }),
    ).rejects.toMatchObject({ statusCode: 422 })
  })

  it('throws 422 when platform has no active config', async () => {
    getTenantAiPolicyMock.mockResolvedValue({ allowOwnLlm: false })
    platformFindFirst.mockResolvedValue(undefined)

    const { loadEffectiveAiConfig } = await import('../../server/utils/ai/loadConfig')
    await expect(
      loadEffectiveAiConfig('org-1', { purpose: 'chatbot' }),
    ).rejects.toMatchObject({ statusCode: 422 })
  })
})
