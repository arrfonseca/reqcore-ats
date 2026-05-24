import {
  ISCO_CATEGORIES,
  SCORING_TEMPLATES,
  getScoringTemplate,
  getTemplatesForCategory,
  getUniversalTemplates,
  hasTemplatesForCategory,
  type ScoringCriterionTemplate,
  type ScoringCriteriaTemplate,
  type ScoringTemplateId,
} from '~~/shared/scoring-criteria-templates'

export type ScoringCriterionDraft = ScoringCriterionTemplate

/**
 * Premade scoring rubrics organized by ISCO occupation categories.
 */
export function useScoringCriteriaTemplates() {
  const { t } = useI18n()

  const iscoCategories = computed(() =>
    ISCO_CATEGORIES.map((cat) => ({
      ...cat,
      label: t(`scoring.isco.${cat.id}.label`, cat.label),
      description: cat.description
        ? t(`scoring.isco.${cat.id}.description`, cat.description)
        : undefined,
    })),
  )

  function resolveTemplateLabel(template: ScoringCriteriaTemplate): string {
    const key = template.id === 'non_technical' ? 'general' : template.id
    if (template.categoryId === 'universal') {
      return t(`scoring.templates.universal.${key}.label`, template.label)
    }
    if (template.id === 'software_engineering') {
      return t('scoring.templates.software_engineering.label', template.label)
    }
    return template.label
  }

  function resolveTemplateDescription(template: ScoringCriteriaTemplate): string {
    const key = template.id === 'non_technical' ? 'general' : template.id
    if (template.categoryId === 'universal') {
      return t(`scoring.templates.universal.${key}.description`, template.description)
    }
    if (template.id === 'software_engineering') {
      return t('scoring.templates.software_engineering.description', template.description)
    }
    return template.description
  }

  const universalTemplates = computed(() =>
    getUniversalTemplates().map((tmpl) => ({
      ...tmpl,
      label: resolveTemplateLabel(tmpl),
      description: resolveTemplateDescription(tmpl),
    })),
  )

  function templatesForCategory(categoryId: string) {
    return getTemplatesForCategory(categoryId).map((tmpl) => ({
      ...tmpl,
      label: resolveTemplateLabel(tmpl),
      description: resolveTemplateDescription(tmpl),
    }))
  }

  function getCriteria(templateId: ScoringTemplateId | string): ScoringCriterionDraft[] {
    const template = getScoringTemplate(templateId)
    if (!template) return []
    return structuredClone(template.criteria)
  }

  const templateList = computed(() =>
    SCORING_TEMPLATES.map((tmpl) => ({
      ...tmpl,
      label: resolveTemplateLabel(tmpl),
      description: resolveTemplateDescription(tmpl),
    })),
  )

  return {
    iscoCategories,
    universalTemplates,
    templateList,
    templatesForCategory,
    hasTemplatesForCategory,
    getCriteria,
    getScoringTemplate,
    comingSoonLabel: computed(() => t('scoring.comingSoon')),
    sectionUniversal: computed(() => t('scoring.sections.universal')),
    sectionIsco: computed(() => t('scoring.sections.isco')),
  }
}
