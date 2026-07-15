import { locationSearchQuerySchema } from '../../utils/schemas/locationSearch'
import { searchStandardLocations } from '../../utils/location/nominatim'

/**
 * GET /api/locations/search?q=londrina&country=br
 * Proxies OpenStreetMap Nominatim for standardized city/region/country labels.
 * Requires authentication (dashboard job forms).
 */
export default defineEventHandler(async (event) => {
  await requirePermission(event, { job: ['read'] })

  const query = await getValidatedQuery(event, locationSearchQuerySchema.parse)

  const results = await searchStandardLocations(query.q, {
    countryBias: query.country,
    limit: 8,
  })

  return { results }
})
