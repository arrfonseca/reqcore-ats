/**
 * Replace stored criterion scores with one scoring run.
 * An insufficient job description clears the previous analysis.
 */
import { eq, and } from 'drizzle-orm'
import { application, criterionScore, analysisRun } from '../../database/schema'
import {
  resolveStoredScoring,
  type CriterionDefinition,
  type ScoringResponse,
} from './scoringPrompt'

export async function persistApplicationScore(params: {
  orgId: string
  applicationId: string
  criteria: CriterionDefinition[]
  scoring: ScoringResponse
  provider: string
  model: string
  promptTokens: number
  completionTokens: number
  scoredById?: string | null
}) {
  const outcome = resolveStoredScoring(params.scoring, params.criteria)

  const scoreValues = outcome.evaluations.map(evaluation => ({
    organizationId: params.orgId,
    applicationId: params.applicationId,
    criterionKey: evaluation.criterionKey,
    maxScore: evaluation.maxScore,
    applicantScore: evaluation.applicantScore,
    confidence: evaluation.confidence,
    evidence: evaluation.evidence,
    strengths: evaluation.strengths,
    gaps: evaluation.gaps,
  }))

  const [run] = await db.transaction(async (tx) => {
    await tx.delete(criterionScore)
      .where(and(
        eq(criterionScore.applicationId, params.applicationId),
        eq(criterionScore.organizationId, params.orgId),
      ))

    if (scoreValues.length > 0) {
      await tx.insert(criterionScore).values(scoreValues)
    }

    await tx.update(application)
      .set({ score: outcome.compositeScore, updatedAt: new Date() })
      .where(eq(application.id, params.applicationId))

    return tx.insert(analysisRun).values({
      organizationId: params.orgId,
      applicationId: params.applicationId,
      status: outcome.status,
      provider: params.provider,
      model: params.model,
      criteriaSnapshot: params.criteria as any,
      compositeScore: outcome.compositeScore,
      promptTokens: params.promptTokens,
      completionTokens: params.completionTokens,
      errorMessage: outcome.errorMessage,
      ...(params.scoredById ? { scoredById: params.scoredById } : {}),
    }).returning()
  })

  return {
    ...outcome,
    analysisRunId: run!.id,
  }
}
