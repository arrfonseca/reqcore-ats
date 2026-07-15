import { describe, it, expect, vi, beforeEach } from 'vitest'

const findFirstMock = vi.fn()

vi.mock('../../server/database/schema', () => ({
  tenantAiSettings: { organizationId: 'organizationId', allowOwnLlm: 'allowOwnLlm' },
}))

describe('getTenantAiPolicy', () => {
  beforeEach(() => {
    findFirstMock.mockReset()
    vi.stubGlobal('db', {
      query: {
        tenantAiSettings: { findFirst: findFirstMock },
      },
    })
    vi.stubGlobal('createError', (opts: { statusCode: number, statusMessage: string }) => {
      const err = new Error(opts.statusMessage) as Error & { statusCode: number }
      err.statusCode = opts.statusCode
      throw err
    })
  })

  it('defaults allowOwnLlm to false when no row exists', async () => {
    findFirstMock.mockResolvedValue(undefined)
    const { getTenantAiPolicy } = await import('../../server/utils/ai/tenantAiPolicy')
    await expect(getTenantAiPolicy('org-1')).resolves.toEqual({ allowOwnLlm: false })
  })

  it('returns stored allowOwnLlm when row exists', async () => {
    findFirstMock.mockResolvedValue({ allowOwnLlm: true })
    const { getTenantAiPolicy } = await import('../../server/utils/ai/tenantAiPolicy')
    await expect(getTenantAiPolicy('org-1')).resolves.toEqual({ allowOwnLlm: true })
  })
})

describe('requireTenantOwnLlm', () => {
  beforeEach(() => {
    findFirstMock.mockReset()
    vi.stubGlobal('db', {
      query: {
        tenantAiSettings: { findFirst: findFirstMock },
      },
    })
    vi.stubGlobal('createError', (opts: { statusCode: number, statusMessage: string }) => {
      const err = new Error(opts.statusMessage) as Error & { statusCode: number }
      err.statusCode = opts.statusCode
      throw err
    })
  })

  it('throws 403 when allowOwnLlm is false', async () => {
    findFirstMock.mockResolvedValue({ allowOwnLlm: false })
    const { requireTenantOwnLlm } = await import('../../server/utils/ai/tenantAiPolicy')
    await expect(requireTenantOwnLlm('org-1')).rejects.toMatchObject({ statusCode: 403 })
  })

  it('passes when allowOwnLlm is true', async () => {
    findFirstMock.mockResolvedValue({ allowOwnLlm: true })
    const { requireTenantOwnLlm } = await import('../../server/utils/ai/tenantAiPolicy')
    await expect(requireTenantOwnLlm('org-1')).resolves.toBeUndefined()
  })
})
