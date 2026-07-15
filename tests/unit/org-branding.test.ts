import { describe, it, expect } from 'vitest'
import {
  ALLOWED_LOGO_MIME_TYPES,
  MAX_LOGO_FILE_SIZE,
  MIME_TO_LOGO_EXTENSION,
  buildLogoStorageKey,
  logoVariantSchema,
} from '../../server/utils/schemas/branding'
import {
  buildPublicLogoUrl,
  keysToPublicUrls,
} from '../../server/utils/orgBranding'

describe('org branding schemas', () => {
  it('allows expected logo MIME types', () => {
    expect(ALLOWED_LOGO_MIME_TYPES).toContain('image/png')
    expect(ALLOWED_LOGO_MIME_TYPES).toContain('image/gif')
    expect(ALLOWED_LOGO_MIME_TYPES).toContain('image/jpeg')
    expect(ALLOWED_LOGO_MIME_TYPES).toContain('image/svg+xml')
  })

  it('limits logo size to 2 MB', () => {
    expect(MAX_LOGO_FILE_SIZE).toBe(2 * 1024 * 1024)
  })

  it('maps MIME types to extensions', () => {
    expect(MIME_TO_LOGO_EXTENSION['image/png']).toBe('png')
    expect(MIME_TO_LOGO_EXTENSION['image/svg+xml']).toBe('svg')
  })

  it('builds storage keys under org branding prefix', () => {
    expect(buildLogoStorageKey('org-123', 'light', 'png')).toBe('org-123/branding/logo-light.png')
    expect(buildLogoStorageKey('org-123', 'dark', 'svg')).toBe('org-123/branding/logo-dark.svg')
  })

  it('validates logo variant enum', () => {
    expect(logoVariantSchema.parse('light')).toBe('light')
    expect(logoVariantSchema.parse('dark')).toBe('dark')
    expect(() => logoVariantSchema.parse('auto')).toThrow()
  })
})

describe('org branding URL helpers', () => {
  it('builds public logo proxy URLs', () => {
    expect(buildPublicLogoUrl('acme-corp', 'light')).toBe('/api/public/orgs/acme-corp/branding/logo/light')
    expect(buildPublicLogoUrl('my org', 'dark')).toBe('/api/public/orgs/my%20org/branding/logo/dark')
  })

  it('converts S3 keys to public URLs when present', () => {
    expect(keysToPublicUrls('acme', { logoLightKey: 'k1', logoDarkKey: null })).toEqual({
      logoLightUrl: '/api/public/orgs/acme/branding/logo/light',
      logoDarkUrl: null,
    })
    expect(keysToPublicUrls('acme', { logoLightKey: null, logoDarkKey: null })).toEqual({
      logoLightUrl: null,
      logoDarkUrl: null,
    })
  })
})
