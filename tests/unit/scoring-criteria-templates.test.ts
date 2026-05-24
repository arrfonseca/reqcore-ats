import { describe, it, expect } from 'vitest'
import {
  ISCO_CATEGORIES,
  SCORING_TEMPLATES,
  SCORING_TEMPLATE_IDS,
  buildPremadeCriteriaMap,
  getScoringTemplate,
  getTemplatesForCategory,
  hasTemplatesForCategory,
  isValidScoringTemplateId,
} from '../../shared/scoring-criteria-templates'
import { generateCriteriaSchema } from '../../server/utils/schemas/scoring'

describe('scoring-criteria-templates registry', () => {
  it('has unique ISCO category ids', () => {
    const ids = ISCO_CATEGORIES.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toHaveLength(10)
  })

  it('references valid categoryId on every template', () => {
    const validCategoryIds = new Set([
      'universal',
      ...ISCO_CATEGORIES.map((c) => c.id),
    ])
    for (const template of SCORING_TEMPLATES) {
      expect(validCategoryIds.has(template.categoryId)).toBe(true)
    }
  })

  it('includes software_engineering with engineering-specific criterion names', () => {
    const dev = getScoringTemplate('software_engineering')
    expect(dev).toBeDefined()
    const names = dev!.criteria.map((c) => c.name)
    expect(names).toContain('Core Tech Stack Match')
    expect(names).toContain('System Design & Architecture')
    expect(names).toContain('Engineering Practices')
  })

  it('exposes developer template under science_engineering_it', () => {
    const templates = getTemplatesForCategory('science_engineering_it')
    expect(templates.some((t) => t.id === 'software_engineering')).toBe(true)
    expect(hasTemplatesForCategory('healthcare_medical')).toBe(false)
  })

  it('buildPremadeCriteriaMap includes all template ids', () => {
    const map = buildPremadeCriteriaMap()
    for (const id of SCORING_TEMPLATE_IDS) {
      expect(map[id]?.length).toBeGreaterThan(0)
    }
  })

  it('validates software_engineering as a template id', () => {
    expect(isValidScoringTemplateId('software_engineering')).toBe(true)
    expect(isValidScoringTemplateId('unknown')).toBe(false)
  })
})

describe('generateCriteriaSchema', () => {
  it('accepts software_engineering template', () => {
    const result = generateCriteriaSchema.safeParse({ template: 'software_engineering' })
    expect(result.success).toBe(true)
  })

  it('accepts legacy template ids', () => {
    for (const template of ['standard', 'technical', 'non_technical'] as const) {
      const result = generateCriteriaSchema.safeParse({ template })
      expect(result.success).toBe(true)
    }
  })
})
