/**
 * Fire-and-forget AI scoring for a single application.
 * Called when autoScoreOnApply is enabled on a job.
 * Silently skips if AI config, criteria, or resume are missing.
 */
import { eq, and } from 'drizzle-orm'
import {
  application, scoringCriterion,
  analysisRun, document,
} from '../../database/schema'
import { scoreApplication } from './scoring'
import type { CriterionDefinition } from './scoring'
import { persistApplicationScore } from './persistApplicationScore'
import type { SupportedProvider } from './provider'
import { loadEffectiveAiConfig } from './loadConfig'
import { extractResumeText } from '../resume-parser'

export async function autoScoreApplication(applicationId: string, orgId: string) {
  const app = await db.query.application.findFirst({
    where: and(eq(application.id, applicationId), eq(application.organizationId, orgId)),
    with: {
      candidate: { columns: { id: true, firstName: true, lastName: true } },
      job: {
        columns: {
          id: true,
          title: true,
          description: true,
          iscoCategoryId: true,
          isTestDescription: true,
        },
      },
    },
  })
  if (!app) return

  let config
  try {
    config = await loadEffectiveAiConfig(orgId, { purpose: 'analysis' })
  } catch {
    return
  }

  const criteria = await db.select().from(scoringCriterion)
    .where(and(
      eq(scoringCriterion.jobId, app.job.id),
      eq(scoringCriterion.organizationId, orgId),
    ))
  if (criteria.length === 0) return

  const docs = await db.select({ parsedContent: document.parsedContent, type: document.type })
    .from(document)
    .where(and(eq(document.candidateId, app.candidate.id), eq(document.organizationId, orgId)))

  const resumeDoc = docs.find(d => d.type === 'resume')
  const resumeText = extractResumeText(resumeDoc?.parsedContent)
  if (!resumeText) return

  if (!app.job.description) return

  const criteriaDefinitions: CriterionDefinition[] = criteria.map(c => ({
    key: c.key,
    name: c.name,
    description: c.description,
    category: c.category,
    maxScore: c.maxScore,
    weight: c.weight,
  }))

  const providerConfig = {
    provider: config.provider as SupportedProvider,
    model: config.model,
    apiKeyEncrypted: config.apiKeyEncrypted,
    baseUrl: config.baseUrl,
    maxTokens: config.maxTokens,
  }

  let result
  try {
    result = await scoreApplication(providerConfig, {
      jobTitle: app.job.title,
      jobDescription: app.job.description,
      iscoCategoryId: app.job.iscoCategoryId,
      isTestDescription: app.job.isTestDescription,
      criteria: criteriaDefinitions,
      resumeText,
      coverLetterText: app.coverLetterText,
      applicationNotes: app.notes,
    })
  } catch (err: any) {
    await db.insert(analysisRun).values({
      organizationId: orgId,
      applicationId,
      status: 'failed',
      provider: config.provider,
      model: config.model,
      criteriaSnapshot: criteriaDefinitions as any,
      errorMessage: err?.message ?? 'Unknown error',
    })
    return
  }

  await persistApplicationScore({
    orgId,
    applicationId,
    criteria: criteriaDefinitions,
    scoring: result.scoring,
    provider: config.provider,
    model: config.model,
    promptTokens: result.usage.promptTokens,
    completionTokens: result.usage.completionTokens,
  })
}
