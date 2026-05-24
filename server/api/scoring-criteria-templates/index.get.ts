import {
  ISCO_CATEGORIES,
  SCORING_TEMPLATES,
} from '~~/shared/scoring-criteria-templates'

/**
 * GET /api/scoring-criteria-templates
 * Returns ISCO categories and template metadata (no full criteria bodies).
 */
export default defineEventHandler(async (event) => {
  await requirePermission(event, { scoring: ['read'] })

  return {
    categories: ISCO_CATEGORIES,
    templates: SCORING_TEMPLATES.map((t) => ({
      id: t.id,
      categoryId: t.categoryId,
      label: t.label,
      description: t.description,
      criteriaCount: t.criteria.length,
    })),
  }
})
