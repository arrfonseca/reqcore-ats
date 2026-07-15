type PlatformAiConfigRow = {
  id: string
  name: string
  provider: string
  model: string
  baseUrl: string | null
  maxTokens: number
  inputPricePer1m: string | null
  outputPricePer1m: string | null
  isDefaultChatbot: boolean
  isDefaultAnalysis: boolean
  apiKeyEncrypted: string | null
  createdAt?: Date
  updatedAt?: Date
}

export function serializePlatformAiConfig(row: PlatformAiConfigRow) {
  const { apiKeyEncrypted, inputPricePer1m, outputPricePer1m, ...rest } = row
  return {
    ...rest,
    inputPricePer1m: inputPricePer1m != null ? Number(inputPricePer1m) : null,
    outputPricePer1m: outputPricePer1m != null ? Number(outputPricePer1m) : null,
    hasApiKey: Boolean(apiKeyEncrypted),
  }
}

export const platformAiConfigColumns = {
  id: true,
  name: true,
  provider: true,
  model: true,
  baseUrl: true,
  maxTokens: true,
  inputPricePer1m: true,
  outputPricePer1m: true,
  isDefaultChatbot: true,
  isDefaultAnalysis: true,
  apiKeyEncrypted: true,
  createdAt: true,
  updatedAt: true,
} as const
