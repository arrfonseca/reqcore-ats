/** Normalize a stored company website URL for use in href attributes. */
export function resolveCompanyHomeUrl(
  companyWebsiteUrl: string | null | undefined,
  fallbackUrl: string,
): string {
  const raw = companyWebsiteUrl?.trim()
  if (!raw) return fallbackUrl
  if (/^https?:\/\//i.test(raw)) return raw
  return `https://${raw}`
}

/** Org company website when configured, otherwise the global marketing site. */
export function useCompanyHomeUrl(companyWebsiteUrl?: MaybeRef<string | null | undefined>) {
  const config = useRuntimeConfig()
  return computed(() =>
    resolveCompanyHomeUrl(unref(companyWebsiteUrl), config.public.marketingUrl as string),
  )
}
