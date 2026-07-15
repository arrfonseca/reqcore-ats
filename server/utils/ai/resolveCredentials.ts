import { and, eq } from 'drizzle-orm'
import { aiConfig, platformAiConfig } from '../../database/schema'
import { decrypt } from '../encryption'
import type { SupportedProvider } from './provider'

export interface ResolvedAiCredentials {
  apiKey: string
  baseUrl: string | null
  provider: SupportedProvider
}

export async function resolveTenantAiCredentials(params: {
  provider: SupportedProvider
  orgId: string
  apiKey?: string
  baseUrl?: string | null
  configId?: string
}): Promise<ResolvedAiCredentials> {
  let apiKey = params.apiKey?.trim() ?? ''
  let baseUrl = params.baseUrl ?? null
  let provider = params.provider

  if (params.configId) {
    const config = await db.query.aiConfig.findFirst({
      where: and(eq(aiConfig.id, params.configId), eq(aiConfig.organizationId, params.orgId)),
      columns: { apiKeyEncrypted: true, baseUrl: true, provider: true },
    })
    if (!config) {
      throw createError({ statusCode: 404, statusMessage: 'AI configuration not found.' })
    }
    provider = config.provider as SupportedProvider
    if (!apiKey && config.apiKeyEncrypted) {
      apiKey = decrypt(config.apiKeyEncrypted, env.BETTER_AUTH_SECRET) ?? ''
    }
    if (baseUrl == null || baseUrl === '') {
      baseUrl = config.baseUrl
    }
  }

  if (!apiKey) {
    throw createError({ statusCode: 400, statusMessage: 'API key is required.' })
  }

  if (provider === 'openai_compatible' && !baseUrl) {
    throw createError({ statusCode: 400, statusMessage: 'Base URL is required for OpenAI-compatible providers.' })
  }

  return { apiKey, baseUrl, provider }
}

export async function resolvePlatformAiCredentials(params: {
  provider: SupportedProvider
  apiKey?: string
  baseUrl?: string | null
  configId?: string
}): Promise<ResolvedAiCredentials> {
  let apiKey = params.apiKey?.trim() ?? ''
  let baseUrl = params.baseUrl ?? null
  let provider = params.provider

  if (params.configId) {
    const config = await db.query.platformAiConfig.findFirst({
      where: eq(platformAiConfig.id, params.configId),
      columns: { apiKeyEncrypted: true, baseUrl: true, provider: true },
    })
    if (!config) {
      throw createError({ statusCode: 404, statusMessage: 'AI configuration not found.' })
    }
    provider = config.provider as SupportedProvider
    if (!apiKey && config.apiKeyEncrypted) {
      apiKey = decrypt(config.apiKeyEncrypted, env.BETTER_AUTH_SECRET) ?? ''
    }
    if (baseUrl == null || baseUrl === '') {
      baseUrl = config.baseUrl
    }
  }

  if (!apiKey) {
    throw createError({ statusCode: 400, statusMessage: 'API key is required.' })
  }

  if (provider === 'openai_compatible' && !baseUrl) {
    throw createError({ statusCode: 400, statusMessage: 'Base URL is required for OpenAI-compatible providers.' })
  }

  return { apiKey, baseUrl, provider }
}
