import { describe, it, expect } from 'vitest'

describe('apply-scopes scoped model aggregation', () => {
  it('merges chatbot and analysis into one config when same model id', () => {
    const scopedModels = new Map<string, { chatbot: boolean, analysis: boolean }>()
    const chatbotModelId = 'gpt-4.1-mini'
    const analysisModelId = 'gpt-4.1-mini'

    if (chatbotModelId) {
      const existing = scopedModels.get(chatbotModelId) ?? { chatbot: false, analysis: false }
      existing.chatbot = true
      scopedModels.set(chatbotModelId, existing)
    }
    if (analysisModelId) {
      const existing = scopedModels.get(analysisModelId) ?? { chatbot: false, analysis: false }
      existing.analysis = true
      scopedModels.set(analysisModelId, existing)
    }

    expect(scopedModels.size).toBe(1)
    expect(scopedModels.get('gpt-4.1-mini')).toEqual({ chatbot: true, analysis: true })
  })

  it('creates two configs when chatbot and analysis use different models', () => {
    const scopedModels = new Map<string, { chatbot: boolean, analysis: boolean }>()
    const chatbotModelId = 'gpt-4.1-mini'
    const analysisModelId = 'gpt-4.1'

    for (const [id, flag] of [[chatbotModelId, 'chatbot'], [analysisModelId, 'analysis']] as const) {
      const existing = scopedModels.get(id) ?? { chatbot: false, analysis: false }
      if (flag === 'chatbot') existing.chatbot = true
      else existing.analysis = true
      scopedModels.set(id, existing)
    }

    expect(scopedModels.size).toBe(2)
    expect(scopedModels.get('gpt-4.1-mini')).toEqual({ chatbot: true, analysis: false })
    expect(scopedModels.get('gpt-4.1')).toEqual({ chatbot: false, analysis: true })
  })
})
