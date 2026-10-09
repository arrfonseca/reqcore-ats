/**
 * Prompt and result rules for AI scoring.
 * Free of provider calls so tests can inspect the prompt and the insufficient branch.
 */
import { z } from 'zod'
import ptBR from '../../../i18n/locales/pt-BR.json'

/** All LLM-generated scoring text is produced in Brazilian Portuguese. */
export const SCORING_OUTPUT_LANGUAGE = 'Brazilian Portuguese (português do Brasil, pt-BR)'

export const INSUFFICIENT_JOB_DESCRIPTION_MESSAGE =
  'Os parâmetros da descrição da vaga são insuficientes e não permitem uma boa pontuação do candidato.'

const OUTPUT_LANGUAGE_RULES = `OUTPUT LANGUAGE — MANDATORY, NO EXCEPTIONS:
Write every free-text string in ${SCORING_OUTPUT_LANGUAGE}.
This includes Evidências, Pontos fortes, Lacunas, the summary, criterion names, and criterion descriptions.
The resume, cover letter, and notes may be in English or another language. Do not answer in that language. Translate the analysis into Brazilian Portuguese.
Quote a short excerpt from the candidate only when a direct phrase is needed, then explain that excerpt in Brazilian Portuguese.
English sentences, English bullet points, and mixed-language analysis are invalid output.
Qualificações, Experiência relevante, and Educação e certificações must each have Evidências, Pontos fortes, and Lacunas written in Brazilian Portuguese.`

const ptText = 'Texto em português do Brasil (pt-BR). Não escreva em inglês.'

const criterionEvaluationSchema = z.object({
  criterionKey: z.string(),
  maxScore: z.number().int().min(0),
  applicantScore: z.number().int().min(0),
  confidence: z.number().min(0).max(100).int(),
  evidence: z.string().describe(`Evidências. ${ptText} Se citar o currículo, a citação é curta e a explicação vem em seguida, em português.`),
  strengths: z.array(z.string()).describe(`Pontos fortes. Cada item é uma frase em português do Brasil. ${ptText}`),
  gaps: z.array(z.string()).describe(`Lacunas. Cada item é uma frase em português do Brasil. ${ptText}`),
})

export const scoringResponseSchema = z.object({
  insufficientJobDescription: z.boolean().describe(
    'true somente quando a descrição publicada não tem tarefas do dia a dia nem requisitos verificáveis para a ocupação. Nesse caso, evaluations fica vazio.',
  ),
  evaluations: z.array(criterionEvaluationSchema).describe(
    'Vazio quando insufficientJobDescription é true. Cada texto em português do Brasil.',
  ),
  summary: z.string().describe(
    `${ptText} Se a descrição for insuficiente, use exatamente: ${INSUFFICIENT_JOB_DESCRIPTION_MESSAGE}`,
  ),
})

export const generatedCriteriaSchema = z.object({
  criteria: z.array(z.object({
    key: z.string(),
    name: z.string().describe(`Nome do critério em português do Brasil. ${ptText}`),
    description: z.string().describe(`Descrição do critério em português do Brasil. ${ptText}`),
    category: z.enum(['technical', 'experience', 'soft_skills', 'education', 'culture', 'custom']),
    maxScore: z.number().int().min(1).max(10).describe('Always use 10'),
    suggestedWeight: z.number().int().min(10).max(100),
  })),
})

export type CriterionEvaluation = z.infer<typeof criterionEvaluationSchema>
export type ScoringResponse = z.infer<typeof scoringResponseSchema>

export interface CriterionDefinition {
  key: string
  name: string
  description: string | null
  category: string
  maxScore: number
  weight: number
}

export interface ScoringContext {
  iscoCategoryId?: string | null
  isTestDescription?: boolean
}

type IscoLocaleEntry = { label: string; description: string }

const iscoLabels = ptBR.scoring.isco as Record<string, IscoLocaleEntry>

/** Portuguese occupation label from the pt-BR locale, matching the job form. */
export function portugueseIscoLabel(id: string | null | undefined): string | null {
  if (!id) return null
  return iscoLabels[id]?.label ?? null
}

function occupationBlock(iscoCategoryId?: string | null): string {
  const label = portugueseIscoLabel(iscoCategoryId)
  return [
    'OCCUPATION_ID: ' + (iscoCategoryId || 'none'),
    'OCCUPATION_LABEL: ' + (label || 'não informada'),
  ].join('\n')
}

function testDescriptionBlock(isTestDescription?: boolean): string {
  const flag = isTestDescription ? 'true' : 'false'
  const rule = isTestDescription
    ? 'This posting is marked as a test or example. Score the written text as the real job. Do not discard it as a sample and do not substitute another role.'
    : 'This posting is not marked as a test. Score the written text as the real job.'
  return `TEST_DESCRIPTION: ${flag}\n${rule}`
}

const SCORING_RULES = `IMPORTANT RULES:
- ${OUTPUT_LANGUAGE_RULES}
- Score ONLY requirements written in the published job description. That text is the only requirement list.
- Do not add a software, TypeScript, or Reqcore-platform baseline. Do not assume programming, frameworks, or an IT hiring bar.
- If a saved criterion still talks about tech stack, system design, or engineering practices, reinterpret it through the occupation and the written job text. Ignore template wording that the description does not ask for.
- Match the occupation. Sales (Vendas e atendimento ao cliente), services (Serviços, hotelaria e turismo), administration (Administração e operações), and trades (Agricultura, ofícios e manufatura) are judged on daily tasks, public contact, schedule, physical work, and basic schooling when the text asks for those.
- Long experience and technical courses count only when the text marks them as required.
- Items under "desejável, mas não excludente" are noted in the analysis. They are not knock-outs and must not by themselves drive a low score.
- Score only from evidence in the resume, cover letter, and notes.
- If information for a criterion is missing, give a low score and note it in Lacunas.
- Be fair and consistent. Do not use name, gender, age, or background as a signal.
- Confidence reflects how much relevant information was available (0–100).
- Each strength and gap is one specific statement in Brazilian Portuguese.
- applicantScore must not exceed maxScore for each criterion.
- When the description does not contain enough concrete parameters for that occupation (no daily tasks and no checkable requirements), set insufficientJobDescription to true, leave evaluations empty, and set summary to exactly: ${INSUFFICIENT_JOB_DESCRIPTION_MESSAGE}
- When TEST_DESCRIPTION is true, still score the written text. Do not discard it as a sample and do not substitute another role.
- Close by checking that Evidências, Pontos fortes, Lacunas, and the summary are in Brazilian Portuguese. If any sentence came out in another language, rewrite it in Portuguese before returning.`

export function buildScoreApplicationMessages(params: {
  jobTitle: string
  jobDescription: string
  criteria: CriterionDefinition[]
  resumeText: string
  coverLetterText?: string | null
  applicationNotes?: string | null
} & ScoringContext): { system: string; prompt: string } {
  const criteriaBlock = params.criteria
    .map((c, i) => `${i + 1}. **${c.name}** (key: "${c.key}", max: ${c.maxScore})\n   ${c.description ?? 'No description provided.'}`)
    .join('\n\n')

  const candidateInfo = [
    `RESUME:\n${params.resumeText}`,
    params.coverLetterText ? `\nCOVER LETTER:\n${params.coverLetterText}` : '',
    params.applicationNotes ? `\nAPPLICATION NOTES:\n${params.applicationNotes}` : '',
  ].filter(Boolean).join('\n')

  return {
    system: `You are an expert, unbiased candidate evaluator for an applicant tracking system used in Brazil.
Your task is to evaluate a candidate against the published job text for the selected occupation.

${OUTPUT_LANGUAGE_RULES}

${SCORING_RULES}`,
    prompt: `JOB TITLE: ${params.jobTitle}

${occupationBlock(params.iscoCategoryId)}

${testDescriptionBlock(params.isTestDescription)}

PUBLISHED JOB DESCRIPTION (the only requirement list):
${params.jobDescription}

SCORING CRITERIA (reinterpret through the occupation and the published text; do not import an IT baseline):
${criteriaBlock}

CANDIDATE MATERIALS:
${candidateInfo}

Evaluate this candidate against each criterion.
Responda somente em português do Brasil. Evidências, Pontos fortes, Lacunas e o resumo têm de estar em português do Brasil, mesmo que o currículo esteja em outro idioma.`,
  }
}

const CRITERIA_RULES = `Rules:
- Create 4–6 criteria a recruiter can check from a resume
- Avoid criteria that introduce bias (age, gender, ethnicity, disability)
- Follow the published description and the occupation. Do not produce a generic IT or software-engineering rubric
- Do not add TypeScript, a tech stack, system design, or a Reqcore-platform baseline unless the job text requires them
- Sales, services, administration, and trades criteria should cover daily tasks, public contact, schedule, physical work, and basic schooling when the text asks for those
- Long experience and technical courses are criteria only when the text marks them as required
- Treat "desejável, mas não excludente" as optional notes, not knockout criteria
- ${OUTPUT_LANGUAGE_RULES}
- Each key must be unique, lowercase, and use underscores (e.g. "atendimento_ao_publico")
- Set suggestedWeight higher for more critical criteria (10–100 scale)
- When TEST_DESCRIPTION is true, generate criteria from this written text. Do not discard it as a sample and do not substitute another role`

export function buildGenerateCriteriaMessages(
  jobTitle: string,
  jobDescription: string,
  context?: ScoringContext,
): { system: string; prompt: string } {
  return {
    system: `You are an expert HR analyst creating objective candidate evaluation criteria for jobs in Brazil.
Analyze the published job description and create 4–6 measurable scoring criteria.

${CRITERIA_RULES}`,
    prompt: `JOB TITLE: ${jobTitle}

${occupationBlock(context?.iscoCategoryId)}

${testDescriptionBlock(context?.isTestDescription)}

PUBLISHED JOB DESCRIPTION (the only requirement list):
${jobDescription}

Write criterion names and descriptions in Brazilian Portuguese (português do Brasil).`,
  }
}

export interface ResolvedScoring {
  status: 'completed' | 'partial'
  compositeScore: number | null
  evaluations: CriterionEvaluation[]
  summary: string
  errorMessage: string | null
}

/**
 * Apply the insufficient-description rule and clamp scores.
 * An insufficient result drops every evaluation and clears the composite score.
 */
export function resolveStoredScoring(
  scoring: ScoringResponse,
  criteria: CriterionDefinition[],
): ResolvedScoring {
  if (scoring.insufficientJobDescription) {
    return {
      status: 'partial',
      compositeScore: null,
      evaluations: [],
      summary: INSUFFICIENT_JOB_DESCRIPTION_MESSAGE,
      errorMessage: INSUFFICIENT_JOB_DESCRIPTION_MESSAGE,
    }
  }

  const evaluations = scoring.evaluations.map(evaluation => ({
    ...evaluation,
    applicantScore: Math.min(evaluation.applicantScore, evaluation.maxScore),
  }))

  return {
    status: 'completed',
    compositeScore: computeCompositeScore(criteria, evaluations),
    evaluations,
    summary: scoring.summary,
    errorMessage: null,
  }
}

/**
 * Compute a weighted composite score (0–100) from individual criterion scores.
 */
export function computeCompositeScore(
  criteria: CriterionDefinition[],
  evaluations: CriterionEvaluation[],
): number {
  let totalWeightedScore = 0
  let totalWeight = 0

  for (const criterion of criteria) {
    const evaluation = evaluations.find(e => e.criterionKey === criterion.key)
    if (!evaluation || evaluation.maxScore === 0) continue

    const normalizedScore = (evaluation.applicantScore / evaluation.maxScore) * 100
    totalWeightedScore += normalizedScore * criterion.weight
    totalWeight += criterion.weight
  }

  if (totalWeight === 0) return 0
  return Math.round(totalWeightedScore / totalWeight)
}
