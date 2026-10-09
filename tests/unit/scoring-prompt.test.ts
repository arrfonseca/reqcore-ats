import { describe, expect, it } from 'vitest'
import ptBR from '../../i18n/locales/pt-BR.json'
import {
  INSUFFICIENT_JOB_DESCRIPTION_MESSAGE,
  buildGenerateCriteriaMessages,
  buildScoreApplicationMessages,
  resolveStoredScoring,
  type CriterionDefinition,
} from '../../server/utils/ai/scoringPrompt'

const criteria: CriterionDefinition[] = [
  {
    key: 'core_tech_stack',
    name: 'Core Tech Stack Match',
    description: 'TypeScript, system design, and engineering practices.',
    category: 'technical',
    maxScore: 10,
    weight: 100,
  },
]

const baseParams = {
  jobTitle: 'Operador de Caixa',
  jobDescription: 'Atender clientes no caixa e organizar o troco.',
  criteria,
  resumeText: 'Cashier at a supermarket for two years.',
}

describe('scoring prompt language and job context', () => {
  it('puts the Portuguese occupation label and the test flag in the scoring prompt', () => {
    const { system, prompt } = buildScoreApplicationMessages({
      ...baseParams,
      iscoCategoryId: 'sales_customer_service',
      isTestDescription: true,
    })
    const label = ptBR.scoring.isco.sales_customer_service.label

    expect(prompt).toContain('OCCUPATION_ID: sales_customer_service')
    expect(prompt).toContain(`OCCUPATION_LABEL: ${label}`)
    expect(prompt).toContain('TEST_DESCRIPTION: true')
    expect(prompt).toContain(baseParams.jobDescription)
    expect(system).toContain('português do Brasil')
    expect(system).toContain('Evidências')
    expect(system).toContain('Pontos fortes')
    expect(system).toContain('Lacunas')
    expect(system).toContain(INSUFFICIENT_JOB_DESCRIPTION_MESSAGE)
    expect(prompt).toContain('Responda somente em português do Brasil')
    expect(system).toContain('Do not add a software, TypeScript, or Reqcore-platform baseline')
  })

  it('tells criteria generation to follow the occupation and stay in Portuguese', () => {
    const { system, prompt } = buildGenerateCriteriaMessages(
      'Repositor',
      'Abastecer prateleiras no turno da tarde.',
      { iscoCategoryId: 'services_hospitality_tourism', isTestDescription: true },
    )

    expect(prompt).toContain('OCCUPATION_LABEL: Serviços, hotelaria e turismo')
    expect(prompt).toContain('TEST_DESCRIPTION: true')
    expect(prompt).toContain('português do Brasil')
    expect(system).toContain('Do not discard it as a sample')
  })

  it('clears the composite score when the description is insufficient', () => {
    const resolved = resolveStoredScoring({
      insufficientJobDescription: true,
      evaluations: [{
        criterionKey: 'core_tech_stack',
        maxScore: 10,
        applicantScore: 8,
        confidence: 70,
        evidence: 'Worked with TypeScript.',
        strengths: ['Strong stack'],
        gaps: [],
      }],
      summary: 'Strong software candidate.',
    }, criteria)

    expect(resolved.status).toBe('partial')
    expect(resolved.compositeScore).toBeNull()
    expect(resolved.evaluations).toEqual([])
    expect(resolved.summary).toBe(INSUFFICIENT_JOB_DESCRIPTION_MESSAGE)
    expect(resolved.errorMessage).toBe(INSUFFICIENT_JOB_DESCRIPTION_MESSAGE)
  })

  it('clamps a sufficient score to the criterion maximum', () => {
    const resolved = resolveStoredScoring({
      insufficientJobDescription: false,
      evaluations: [{
        criterionKey: 'core_tech_stack',
        maxScore: 10,
        applicantScore: 15,
        confidence: 80,
        evidence: 'Atendeu clientes no caixa por dois anos.',
        strengths: ['Experiência direta no caixa'],
        gaps: ['Não cita escala 6x1'],
      }],
      summary: 'Candidato alinhado às tarefas do caixa.',
    }, criteria)

    expect(resolved.status).toBe('completed')
    expect(resolved.evaluations[0]?.applicantScore).toBe(10)
    expect(resolved.compositeScore).toBe(100)
    expect(resolved.errorMessage).toBeNull()
  })
})
