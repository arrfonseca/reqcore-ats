/** Portuguese labels for scoring criterion categories (internal / API use). */
const CATEGORY_LABELS_PT: Record<string, string> = {
  technical: 'Qualificações',
  experience: 'Experiência',
  soft_skills: 'Competências comportamentais',
  education: 'Educação',
  culture: 'Cultura',
  custom: 'Personalizado',
}

export function getScoringCategoryLabelPt(category: string | null | undefined): string | null {
  if (!category) return null
  return CATEGORY_LABELS_PT[category] ?? category
}
