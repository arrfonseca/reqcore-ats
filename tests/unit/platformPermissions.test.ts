import { describe, expect, it } from 'vitest'
import { checkPlatformPermission } from '../../shared/platformPermissions'

describe('checkPlatformPermission', () => {
  it('grants saas_owner tenant list', () => {
    expect(checkPlatformPermission('saas_owner', { tenant: ['list'] })).toBe(true)
  })

  it('denies unknown actions', () => {
    expect(checkPlatformPermission('saas_owner', { tenant: ['delete'] as ['list'] })).toBe(false)
  })
})
