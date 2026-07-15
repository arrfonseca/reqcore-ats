/**
 * Standard job location labels for ATS / job-board interoperability.
 * Display format: "City, State/Region, Country" (e.g. "Londrina, PR, Brasil").
 */

export type StandardLocation = {
  /** Canonical display value stored on the job record */
  label: string
  city?: string
  stateCode?: string
  stateName?: string
  countryCode?: string
  countryName?: string
  latitude?: number
  longitude?: number
}

/** Brazilian state name (PT) → UF */
export const BRAZIL_STATE_TO_UF: Record<string, string> = {
  Acre: 'AC',
  Alagoas: 'AL',
  Amapá: 'AP',
  Amazonas: 'AM',
  Bahia: 'BA',
  Ceará: 'CE',
  'Distrito Federal': 'DF',
  'Espírito Santo': 'ES',
  Goiás: 'GO',
  Maranhão: 'MA',
  'Mato Grosso': 'MT',
  'Mato Grosso do Sul': 'MS',
  'Minas Gerais': 'MG',
  Pará: 'PA',
  Paraíba: 'PB',
  Paraná: 'PR',
  Pernambuco: 'PE',
  Piauí: 'PI',
  'Rio de Janeiro': 'RJ',
  'Rio Grande do Norte': 'RN',
  'Rio Grande do Sul': 'RS',
  Rondônia: 'RO',
  Roraima: 'RR',
  'Santa Catarina': 'SC',
  'São Paulo': 'SP',
  Sergipe: 'SE',
  Tocantins: 'TO',
}

export function brazilStateToUf(stateName: string | undefined): string | undefined {
  if (!stateName) return undefined
  const trimmed = stateName.trim()
  return BRAZIL_STATE_TO_UF[trimmed] ?? (trimmed.length === 2 ? trimmed.toUpperCase() : undefined)
}

export function countryDisplayName(countryCode: string | undefined, fallback?: string): string {
  if (!countryCode) return fallback?.trim() || ''
  const code = countryCode.toUpperCase()
  if (code === 'BR') return 'Brasil'
  return fallback?.trim() || code
}

export function formatStandardLocation(parts: {
  city?: string
  stateCode?: string
  stateName?: string
  countryCode?: string
  countryName?: string
}): string {
  const city = parts.city?.trim()
  const state = parts.stateCode?.trim() || parts.stateName?.trim()
  const country = parts.countryName?.trim()
    || countryDisplayName(parts.countryCode, parts.countryName)

  return [city, state, country].filter(Boolean).join(', ')
}

/** Parse a stored label back into parts (best-effort for SEO / exports). */
export function parseLocationLabel(label: string): {
  city?: string
  region?: string
  country?: string
} {
  const trimmed = label.trim()
  if (!trimmed) return {}
  const parts = trimmed.split(',').map(p => p.trim()).filter(Boolean)
  if (parts.length === 1) return { city: parts[0] }
  if (parts.length === 2) return { city: parts[0], region: parts[1] }
  return {
    city: parts[0],
    region: parts[1],
    country: parts.slice(2).join(', '),
  }
}

export type LocationAddressParts = {
  city?: string
  town?: string
  village?: string
  municipality?: string
  county?: string
  state?: string
  country?: string
  countryCode?: string
  iso3166Level4?: string
  iso3166Level3?: string
}

export function cityFromAddressParts(parts: LocationAddressParts): string | undefined {
  return (
    parts.city
    || parts.town
    || parts.village
    || parts.municipality
    || parts.county
  )?.trim()
}

export function stateCodeFromAddressParts(parts: LocationAddressParts): string | undefined {
  const iso = parts.iso3166Level4 || parts.iso3166Level3
  if (iso?.includes('-')) {
    const code = iso.split('-')[1]
    if (code) return code
  }
  const cc = parts.countryCode?.toUpperCase()
  if (cc === 'BR') return brazilStateToUf(parts.state)
  return parts.state?.trim() || undefined
}

export function standardLocationFromAddress(
  parts: LocationAddressParts,
  coordinates?: { latitude: number, longitude: number },
): StandardLocation | null {
  const city = cityFromAddressParts(parts)
  if (!city) return null

  const countryCode = parts.countryCode?.toUpperCase()
  const stateCode = stateCodeFromAddressParts(parts)
  const countryName = countryDisplayName(countryCode, parts.country)

  const label = formatStandardLocation({
    city,
    stateCode,
    stateName: parts.state,
    countryCode,
    countryName,
  })

  if (!label) return null

  return {
    label,
    city,
    stateCode,
    stateName: parts.state,
    countryCode,
    countryName,
    latitude: coordinates?.latitude,
    longitude: coordinates?.longitude,
  }
}
