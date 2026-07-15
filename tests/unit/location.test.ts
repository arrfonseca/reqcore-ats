import { describe, expect, it } from 'vitest'
import {
  brazilStateToUf,
  formatStandardLocation,
  parseLocationLabel,
  standardLocationFromAddress,
} from '../../shared/location'

describe('formatStandardLocation', () => {
  it('formats Brazilian city with UF', () => {
    expect(formatStandardLocation({
      city: 'Londrina',
      stateCode: 'PR',
      countryCode: 'BR',
    })).toBe('Londrina, PR, Brasil')
  })

  it('parses stored label', () => {
    expect(parseLocationLabel('Londrina, PR, Brasil')).toEqual({
      city: 'Londrina',
      region: 'PR',
      country: 'Brasil',
    })
  })
})

describe('brazilStateToUf', () => {
  it('maps Paraná to PR', () => {
    expect(brazilStateToUf('Paraná')).toBe('PR')
  })
})

describe('standardLocationFromAddress', () => {
  it('normalizes city result with ISO3166-2', () => {
    const result = standardLocationFromAddress({
      city: 'Londrina',
      state: 'Paraná',
      country: 'Brasil',
      countryCode: 'br',
      iso3166Level4: 'BR-PR',
    })
    expect(result?.label).toBe('Londrina, PR, Brasil')
    expect(result?.stateCode).toBe('PR')
    expect(result?.countryCode).toBe('BR')
  })
})
