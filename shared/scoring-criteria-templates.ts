/**
 * Scoring criteria templates — single source of truth for premade rubrics.
 * Organized by ISCO-style occupation categories with universal fallbacks.
 */

export type CriterionCategory =
  | 'technical'
  | 'experience'
  | 'soft_skills'
  | 'education'
  | 'culture'
  | 'custom'

export interface ScoringCriterionTemplate {
  key: string
  name: string
  description: string
  category: CriterionCategory
  maxScore: number
  weight: number
}

export interface IscoCategory {
  id: string
  label: string
  description?: string
}

export type ScoringTemplateCategoryId = 'universal' | string

export interface ScoringCriteriaTemplate {
  /** Stable API key (used in generateCriteriaSchema and PREMADE_CRITERIA) */
  id: string
  categoryId: ScoringTemplateCategoryId
  label: string
  description: string
  criteria: ScoringCriterionTemplate[]
}

/** All premade template ids accepted by the API */
export const SCORING_TEMPLATE_IDS = [
  'standard',
  'technical',
  'non_technical',
  'software_engineering',
] as const

export type ScoringTemplateId = (typeof SCORING_TEMPLATE_IDS)[number]

export const ISCO_CATEGORIES: IscoCategory[] = [
  {
    id: 'executive_management',
    label: 'Executive & Management',
    description: 'Leadership, directors, and senior management roles.',
  },
  {
    id: 'science_engineering_it',
    label: 'Science, Engineering & IT',
    description: 'Software, engineering, research, and technical roles.',
  },
  {
    id: 'healthcare_medical',
    label: 'Healthcare & Medical Services',
    description: 'Clinical, nursing, and allied health professions.',
  },
  {
    id: 'legal_finance_business',
    label: 'Legal, Finance & Business',
    description: 'Legal, accounting, consulting, and corporate functions.',
  },
  {
    id: 'education_arts',
    label: 'Education & Arts',
    description: 'Teaching, creative, cultural, and academic roles.',
  },
  {
    id: 'sales_customer_service',
    label: 'Sales & Customer Service',
    description: 'Revenue, account management, and customer-facing roles.',
  },
  {
    id: 'administration_operations',
    label: 'Administration & Operations',
    description: 'Office support, coordination, and operational roles.',
  },
  {
    id: 'services_hospitality_tourism',
    label: 'Services, Hospitality & Tourism',
    description: 'Hospitality, personal services, and tourism.',
  },
  {
    id: 'agriculture_trades_manufacturing',
    label: 'Agriculture, Trades & Manufacturing',
    description: 'Production, skilled trades, and agricultural work.',
  },
  {
    id: 'other_lifecycle',
    label: 'Retired, Student & Unemployed',
    description: 'Non-employed or transitional candidate profiles.',
  },
]

const STANDARD_CRITERIA: ScoringCriterionTemplate[] = [
  {
    key: 'technical_skills',
    name: 'Qualifications',
    description:
      'Evaluate the candidate\'s skills, tools, and experience mentioned in their resume against the job requirements.',
    category: 'technical',
    maxScore: 10,
    weight: 50,
  },
  {
    key: 'relevant_experience',
    name: 'Relevant Experience',
    description:
      'Assess years and quality of experience directly relevant to the role. Consider industry, company size, and scope of responsibilities.',
    category: 'experience',
    maxScore: 10,
    weight: 50,
  },
  {
    key: 'education_fit',
    name: 'Education & Certifications',
    description:
      'Evaluate educational background and professional certifications relevant to the position requirements.',
    category: 'education',
    maxScore: 10,
    weight: 30,
  },
]

const ROLE_SPECIFIC_CRITERIA: ScoringCriterionTemplate[] = [
  {
    key: 'core_tech_stack',
    name: 'Core Qualifications Match',
    description:
      'How well the candidate\'s skills and experience match the primary requirements for this role.',
    category: 'technical',
    maxScore: 10,
    weight: 70,
  },
  {
    key: 'system_design',
    name: 'Problem Solving & Scope',
    description:
      'Evidence of handling complex responsibilities, sound judgment, and decision-making at the level required for the role.',
    category: 'technical',
    maxScore: 10,
    weight: 50,
  },
  {
    key: 'engineering_practices',
    name: 'Professional Practices',
    description:
      'Quality standards, collaboration, documentation, and repeatable ways of working relevant to the role.',
    category: 'technical',
    maxScore: 10,
    weight: 40,
  },
  {
    key: 'relevant_experience',
    name: 'Relevant Experience',
    description:
      'Years and depth of experience in similar roles, projects, or domains.',
    category: 'experience',
    maxScore: 10,
    weight: 50,
  },
  {
    key: 'leadership_collab',
    name: 'Leadership & Collaboration',
    description:
      'Evidence of mentoring, leadership, cross-team collaboration, and communication skills.',
    category: 'soft_skills',
    maxScore: 10,
    weight: 30,
  },
]

const GENERAL_CRITERIA: ScoringCriterionTemplate[] = [
  {
    key: 'relevant_experience',
    name: 'Relevant Experience',
    description:
      'Depth and breadth of experience directly applicable to the role responsibilities.',
    category: 'experience',
    maxScore: 10,
    weight: 60,
  },
  {
    key: 'communication',
    name: 'Communication Skills',
    description:
      'Evidence of written and verbal communication ability from resume quality, cover letter, and described accomplishments.',
    category: 'soft_skills',
    maxScore: 10,
    weight: 50,
  },
  {
    key: 'domain_knowledge',
    name: 'Domain Knowledge',
    description:
      'Relevant industry or domain expertise that demonstrates understanding of the business context.',
    category: 'experience',
    maxScore: 10,
    weight: 40,
  },
  {
    key: 'education_fit',
    name: 'Education & Certifications',
    description:
      'Educational background and certifications relevant to the position.',
    category: 'education',
    maxScore: 10,
    weight: 30,
  },
  {
    key: 'culture_fit',
    name: 'Culture & Values Alignment',
    description:
      'Indicators of alignment with company values, work style, and team culture based on career trajectory and interests.',
    category: 'culture',
    maxScore: 10,
    weight: 30,
  },
]

const SOFTWARE_ENGINEERING_CRITERIA: ScoringCriterionTemplate[] = [
  {
    key: 'core_tech_stack',
    name: 'Core Tech Stack Match',
    description:
      'How well the candidate\'s technical skills match the primary technologies required for this role.',
    category: 'technical',
    maxScore: 10,
    weight: 70,
  },
  {
    key: 'system_design',
    name: 'System Design & Architecture',
    description:
      'Evidence of system design experience, scalability thinking, and architectural decision-making.',
    category: 'technical',
    maxScore: 10,
    weight: 50,
  },
  {
    key: 'engineering_practices',
    name: 'Engineering Practices',
    description:
      'Testing, CI/CD, code review, documentation, and software development lifecycle experience.',
    category: 'technical',
    maxScore: 10,
    weight: 40,
  },
  {
    key: 'relevant_experience',
    name: 'Relevant Experience',
    description:
      'Years and depth of experience in similar engineering roles, projects, or domains.',
    category: 'experience',
    maxScore: 10,
    weight: 50,
  },
  {
    key: 'leadership_collab',
    name: 'Leadership & Collaboration',
    description:
      'Evidence of mentoring, tech leadership, cross-team collaboration, and communication skills.',
    category: 'soft_skills',
    maxScore: 10,
    weight: 30,
  },
]

export const SCORING_TEMPLATES: ScoringCriteriaTemplate[] = [
  {
    id: 'standard',
    categoryId: 'universal',
    label: 'Standard',
    description: '3 balanced criteria for any role',
    criteria: STANDARD_CRITERIA,
  },
  {
    id: 'non_technical',
    categoryId: 'universal',
    label: 'General',
    description: '5 criteria for business and operations roles',
    criteria: GENERAL_CRITERIA,
  },
  {
    id: 'technical',
    categoryId: 'universal',
    label: 'Role-specific',
    description: '5 criteria focused on specialized role requirements',
    criteria: ROLE_SPECIFIC_CRITERIA,
  },
  {
    id: 'software_engineering',
    categoryId: 'science_engineering_it',
    label: 'Software & Engineering',
    description: '5 criteria for developer and engineering hiring',
    criteria: SOFTWARE_ENGINEERING_CRITERIA,
  },
]

/** Lookup map for API and server scoring (keys are template ids) */
export function buildPremadeCriteriaMap(): Record<string, ScoringCriterionTemplate[]> {
  return Object.fromEntries(SCORING_TEMPLATES.map((t) => [t.id, t.criteria]))
}

export function getScoringTemplate(id: string): ScoringCriteriaTemplate | undefined {
  return SCORING_TEMPLATES.find((t) => t.id === id)
}

export function getTemplatesForCategory(categoryId: string): ScoringCriteriaTemplate[] {
  return SCORING_TEMPLATES.filter((t) => t.categoryId === categoryId)
}

export function getUniversalTemplates(): ScoringCriteriaTemplate[] {
  return getTemplatesForCategory('universal')
}

export function hasTemplatesForCategory(categoryId: string): boolean {
  return getTemplatesForCategory(categoryId).length > 0
}

export function isValidScoringTemplateId(id: string): id is ScoringTemplateId {
  return (SCORING_TEMPLATE_IDS as readonly string[]).includes(id)
}
