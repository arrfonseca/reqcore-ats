import {
  standardLocationFromAddress,
  type StandardLocation,
} from '~~/shared/location'

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search'
const USER_AGENT = 'Reqcore-HR/1.0 (location autocomplete; self-hosted)'

/** Place types suitable for job office location */
const ALLOWED_PLACE_TYPES = new Set([
  'city',
  'town',
  'village',
  'municipality',
  'administrative',
])

type NominatimAddress = {
  city?: string
  town?: string
  village?: string
  municipality?: string
  county?: string
  state?: string
  country?: string
  country_code?: string
  'ISO3166-2-lvl4'?: string
  'ISO3166-2-lvl3'?: string
}

type NominatimResult = {
  place_id: number
  lat: string
  lon: string
  type?: string
  class?: string
  display_name?: string
  address?: NominatimAddress
}

let lastRequestAt = 0

async function throttleNominatim(): Promise<void> {
  const now = Date.now()
  const wait = Math.max(0, 1100 - (now - lastRequestAt))
  if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait))
  lastRequestAt = Date.now()
}

export function nominatimResultToStandard(item: NominatimResult): StandardLocation | null {
  const addr = item.address
  if (!addr) return null

  return standardLocationFromAddress(
    {
      city: addr.city,
      town: addr.town,
      village: addr.village,
      municipality: addr.municipality,
      county: addr.county,
      state: addr.state,
      country: addr.country,
      countryCode: addr.country_code,
      iso3166Level4: addr['ISO3166-2-lvl4'],
      iso3166Level3: addr['ISO3166-2-lvl3'],
    },
    {
      latitude: Number.parseFloat(item.lat),
      longitude: Number.parseFloat(item.lon),
    },
  )
}

export async function searchStandardLocations(
  query: string,
  options?: { countryBias?: string; limit?: number },
): Promise<StandardLocation[]> {
  const q = query.trim()
  if (q.length < 2) return []

  await throttleNominatim()

  const params = new URLSearchParams({
    q,
    format: 'json',
    addressdetails: '1',
    limit: String(options?.limit ?? 8),
    'accept-language': 'pt-BR,pt,en',
  })

  if (options?.countryBias) {
    params.set('countrycodes', options.countryBias.toLowerCase())
  }

  const response = await fetch(`${NOMINATIM_BASE}?${params}`, {
    headers: { 'User-Agent': USER_AGENT },
  })

  if (!response.ok) {
    throw createError({
      statusCode: 502,
      statusMessage: 'Location search is temporarily unavailable',
    })
  }

  const data = (await response.json()) as NominatimResult[]
  const seen = new Set<string>()
  const results: StandardLocation[] = []

  for (const item of data) {
    if (item.type && !ALLOWED_PLACE_TYPES.has(item.type)) continue
    const standard = nominatimResultToStandard(item)
    if (!standard || seen.has(standard.label)) continue
    seen.add(standard.label)
    results.push(standard)
  }

  return results
}
