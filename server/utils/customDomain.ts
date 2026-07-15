import { promises as dns } from 'node:dns'
import { normalizeHostname } from '~~/shared/tenant-routing'

export function getCustomDomainCnameTarget(): string {
  return process.env.NUXT_PUBLIC_CUSTOM_DOMAIN_CNAME_TARGET
    || process.env.CUSTOM_DOMAIN_CNAME_TARGET
    || 'custom.reqcore.com'
}

export function normalizeCustomHostname(input: string): string | null {
  const raw = input.trim().toLowerCase()
  if (!raw) return null
  try {
    const withProto = raw.includes('://') ? raw : `https://${raw}`
    const host = normalizeHostname(new URL(withProto).host)
    if (!host || host.includes('/')) return null
    if (host === 'localhost' || host.endsWith('.localhost')) return null
    return host
  }
  catch {
    const host = normalizeHostname(raw.split('/')[0])
    return host || null
  }
}

export function isPlatformHostname(hostname: string): boolean {
  const platformHost = process.env.NUXT_PUBLIC_PLATFORM_HOST
    || (process.env.NUXT_PUBLIC_SITE_URL ? new URL(process.env.NUXT_PUBLIC_SITE_URL).host : null)
    || 'reqcore.com'
  const normalized = normalizeHostname(platformHost)
  return !!normalized && hostname === normalized
}

export async function verifyCustomDomainDns(hostname: string, verificationToken: string): Promise<{
  verified: boolean
  cnameOk: boolean
  txtOk: boolean
  expectedCname: string
}> {
  const expectedCname = getCustomDomainCnameTarget()
  let cnameOk = false
  let txtOk = false

  try {
    const cnames = await dns.resolveCname(hostname)
    cnameOk = cnames.some(c => normalizeHostname(c) === normalizeHostname(expectedCname))
  }
  catch {
    try {
      const records = await dns.resolve4(hostname)
      const targetIps = await dns.resolve4(expectedCname).catch(() => [] as string[])
      cnameOk = records.some(ip => targetIps.includes(ip))
    }
    catch {
      cnameOk = false
    }
  }

  try {
    const txtRecords = await dns.resolveTxt(`_reqcore-verify.${hostname}`)
    const flat = txtRecords.map(parts => parts.join('')).join('')
    txtOk = flat.includes(`reqcore-verify=${verificationToken}`)
  }
  catch {
    txtOk = false
  }

  return {
    verified: cnameOk || txtOk,
    cnameOk,
    txtOk,
    expectedCname,
  }
}

export function generateVerificationToken(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 24)
}
