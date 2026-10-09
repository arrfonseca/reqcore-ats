/**
 * AI Scoring Engine
 *
 * Evaluates candidates against the published job text and the selected occupation.
 * All free-text output is Brazilian Portuguese.
 */
import { buildPremadeCriteriaMap } from '~~/shared/scoring-criteria-templates'
import { generateStructuredOutput, type ProviderConfig } from './provider'
import {
  buildGenerateCriteriaMessages,
  buildScoreApplicationMessages,
  generatedCriteriaSchema,
  resolveStoredScoring,
  scoringResponseSchema,
  type CriterionDefinition,
  type ScoringContext,
  type ScoringResponse,
} from './scoringPrompt'

export {
  computeCompositeScore,
  INSUFFICIENT_JOB_DESCRIPTION_MESSAGE,
  portugueseIscoLabel,
  resolveStoredScoring,
  SCORING_OUTPUT_LANGUAGE,
} from './scoringPrompt'
export type { CriterionDefinition, CriterionEvaluation, ScoringResponse } from './scoringPrompt'

export const PREMADE_CRITERIA: Record<string, CriterionDefinition[]> =
  buildPremadeCriteriaMap()

/**
 * Use AI to generate scoring criteria from a job description.
 * Criteria follow the occupation and the written posting, in Brazilian Portuguese.
 */
export async function generateCriteriaFromDescription(
  config: ProviderConfig,
  jobTitle: string,
  jobDescription: string,
  context?: ScoringContext,
): Promise<CriterionDefinition[]> {
  const messages = buildGenerateCriteriaMessages(jobTitle, jobDescription, context)
  const result = await generateStructuredOutput(config, {
    system: messages.system,
    prompt: messages.prompt,
    schema: generatedCriteriaSchema,
    schemaName: 'GeneratedCriteria',
    schemaDescription: 'Critérios de pontuação em português do Brasil, derivados da descrição publicada e da ocupação',
  })

  return result.object.criteria.map(c => ({
    key: c.key,
    name: c.name,
    description: c.description,
    category: c.category,
    maxScore: c.maxScore,
    weight: c.suggestedWeight,
  }))
}

/**
 * Score a single application against the job's published text.
 * Returns Portuguese evaluations, or an insufficient-description result with no scores.
 */
export async function scoreApplication(
  config: ProviderConfig,
  params: {
    jobTitle: string
    jobDescription: string
    criteria: CriterionDefinition[]
    resumeText: string
    coverLetterText?: string | null
    applicationNotes?: string | null
  } & ScoringContext,
): Promise<{
  scoring: ScoringResponse
  outcome: ReturnType<typeof resolveStoredScoring>
  usage: { promptTokens: number; completionTokens: number }
}> {
  const messages = buildScoreApplicationMessages(params)
  const result = await generateStructuredOutput(config, {
    system: messages.system,
    prompt: messages.prompt,
    schema: scoringResponseSchema,
    schemaName: 'CandidateScoring',
    schemaDescription: 'Avaliação do candidato em português do Brasil: Evidências, Pontos fortes e Lacunas',
  })

  const outcome = resolveStoredScoring(result.object, params.criteria)

  return {
    scoring: {
      insufficientJobDescription: outcome.status === 'partial',
      evaluations: outcome.evaluations,
      summary: outcome.summary,
    },
    outcome,
    usage: result.usage,
  }
}
