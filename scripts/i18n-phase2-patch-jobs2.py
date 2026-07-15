#!/usr/bin/env python3
"""Apply Phase 2 i18n patches to ai-analysis, settings, pipeline, new job pages."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

def patch(path: str, replacements: list[tuple[str, str]]) -> None:
    p = ROOT / path
    text = p.read_text(encoding='utf-8')
    for old, new in replacements:
        if old not in text:
            raise SystemExit(f"MISSING in {path}: {old[:120]!r}")
        text = text.replace(old, new, 1)
    p.write_text(text, encoding='utf-8')
    print(f"Patched {path} ({len(replacements)} replacements)")

patch('app/pages/dashboard/jobs/[id]/ai-analysis.vue', [
    ("definePageMeta({\n  layout: 'dashboard',\n  middleware: ['auth', 'require-org'],\n})\n\nconst route = useRoute()",
     "const { t } = useI18n()\n\ndefinePageMeta({\n  layout: 'dashboard',\n  middleware: ['auth', 'require-org'],\n})\n\nconst route = useRoute()"),
    ("useSeoMeta({\n  title: computed(() =>\n    job.value ? `AI Analysis — ${job.value.title} — Reqcore` : 'AI Analysis — Reqcore',\n  ),",
     "useSeoMeta({\n  title: computed(() =>\n    job.value\n      ? t('dashboard.jobs.aiAnalysis.seoTitle', { title: job.value.title })\n      : t('dashboard.jobs.aiAnalysis.seoTitleFallback'),\n  ),"),
    ("const categoryLabels: Record<string, string> = {\n  technical: 'Qualifications',",
     "const categoryLabels = computed<Record<string, string>>(() => ({\n  technical: t('dashboard.jobs.shared.categories.technical'),"),
    ("  experience: 'Experience',",
     "  experience: t('dashboard.jobs.shared.categories.experience'),"),
    ("  soft_skills: 'Soft Skills',",
     "  soft_skills: t('dashboard.jobs.shared.categories.soft_skills'),"),
    ("  education: 'Education',",
     "  education: t('dashboard.jobs.shared.categories.education'),"),
    ("  culture: 'Culture',",
     "  culture: t('dashboard.jobs.shared.categories.culture'),"),
    ("  custom: 'Custom',\n}",
     "  custom: t('dashboard.jobs.shared.categories.custom'),\n}))"),
    ("    toast.success('Auto-score setting updated')",
     "    toast.success(t('dashboard.jobs.aiAnalysis.toasts.autoScoreUpdated'))"),
    ("    toast.error('Failed to update setting', { message: err?.data?.statusMessage })",
     "    toast.error(t('dashboard.jobs.aiAnalysis.toasts.updateSettingFailed'), { message: err?.data?.statusMessage })"),
    ("    toast.error('Failed to load template', { message: 'Unknown or empty template.' })",
     "    toast.error(t('dashboard.jobs.aiAnalysis.toasts.loadTemplateFailed'), { message: t('dashboard.jobs.aiAnalysis.toasts.unknownTemplate') })"),
    ("    toast.warning('Job description required', 'Add a job description first so AI can generate relevant criteria.')",
     "    toast.warning(t('dashboard.jobs.aiAnalysis.toasts.jobDescriptionRequired'), t('dashboard.jobs.aiAnalysis.toasts.jobDescriptionRequiredHint'))"),
    ("    toast.success('Criteria generated', `${scoringCriteria.value.length} scoring criteria created from job description.`)",
     "    toast.success(t('dashboard.jobs.aiAnalysis.toasts.criteriaGenerated'), t('dashboard.jobs.aiAnalysis.toasts.criteriaGeneratedHint', scoringCriteria.value.length))"),
    ("        title: 'AI provider not configured',\n        message: 'Set up your AI provider and model before generating criteria.',\n        link: { label: 'Go to AI Settings', href: '/dashboard/settings/ai' },",
     "        title: t('dashboard.jobs.aiAnalysis.toasts.aiNotConfigured'),\n        message: t('dashboard.jobs.aiAnalysis.toasts.aiNotConfiguredHint'),\n        link: { label: t('common.actions.goToAiSettings'), href: '/dashboard/settings/ai' },"),
    ("      toast.error('Failed to generate criteria', { message: statusMessage })",
     "      toast.error(t('dashboard.jobs.aiAnalysis.toasts.generateFailed'), { message: statusMessage })"),
    ("    toast.warning('Duplicate criterion', `A criterion with key \"${f.key}\" already exists.`)",
     "    toast.warning(t('dashboard.jobs.aiAnalysis.toasts.duplicateCriterion'), t('dashboard.jobs.aiAnalysis.toasts.duplicateCriterionHint', { key: f.key }))"),
    ("    toast.success('Criteria saved', `${scoringCriteria.value.length} scoring criteria updated.`)",
     "    toast.success(t('dashboard.jobs.aiAnalysis.toasts.criteriaSaved'), t('dashboard.jobs.aiAnalysis.toasts.criteriaSavedHint', scoringCriteria.value.length))"),
    ("    toast.error('Failed to save criteria', { message: err?.data?.statusMessage })",
     "    toast.error(t('dashboard.jobs.aiAnalysis.toasts.saveFailed'), { message: err?.data?.statusMessage })"),
])

patch('app/pages/dashboard/jobs/[id]/settings.vue', [
    ("definePageMeta({\n  layout: 'dashboard',\n  middleware: ['auth', 'require-org'],\n})\n\nconst route = useRoute()",
     "const { t } = useI18n()\n\ndefinePageMeta({\n  layout: 'dashboard',\n  middleware: ['auth', 'require-org'],\n})\n\nconst route = useRoute()"),
    ("useSeoMeta({\n  title: computed(() =>\n    job.value ? `Settings — ${job.value.title} — Reqcore` : 'Job Settings — Reqcore',\n  ),\n})",
     "useSeoMeta({\n  title: computed(() =>\n    job.value\n      ? t('dashboard.jobs.settings.seoTitle', { title: job.value.title })\n      : t('dashboard.jobs.settings.seoTitleFallback'),\n  ),\n})"),
    ("  title: z.string().min(1, 'Title is required').max(200),",
     "  title: z.string().min(1, t('dashboard.jobs.settings.errors.titleRequired')).max(200),"),
    ("    toast.error('Failed to save changes', { message: err.data?.statusMessage, statusCode: err.data?.statusCode })",
     "    toast.error(t('dashboard.jobs.settings.errors.saveFailed'), { message: err.data?.statusMessage, statusCode: err.data?.statusCode })"),
    ("    toast.error('Failed to delete job', { message: err.data?.statusMessage, statusCode: err.data?.statusCode })",
     "    toast.error(t('dashboard.jobs.settings.errors.deleteFailed'), { message: err.data?.statusMessage, statusCode: err.data?.statusCode })"),
    ("const typeOptions = [\n  { value: 'full_time', label: 'Full-time' },\n  { value: 'part_time', label: 'Part-time' },\n  { value: 'contract', label: 'Contract' },\n  { value: 'internship', label: 'Internship' },\n]",
     "const typeOptions = computed(() => [\n  { value: 'full_time', label: t('jobs.shared.types.full_time') },\n  { value: 'part_time', label: t('jobs.shared.types.part_time') },\n  { value: 'contract', label: t('jobs.shared.types.contract') },\n  { value: 'internship', label: t('jobs.shared.types.internship') },\n])"),
    ("const remoteOptions = [\n  { value: '', label: 'Not specified' },\n  { value: 'remote', label: 'Remote' },\n  { value: 'hybrid', label: 'Hybrid' },\n  { value: 'onsite', label: 'On-site' },\n]",
     "const remoteOptions = computed(() => [\n  { value: '', label: t('dashboard.jobs.shared.notSpecified') },\n  { value: 'remote', label: t('dashboard.jobs.shared.remote.remote') },\n  { value: 'hybrid', label: t('dashboard.jobs.shared.remote.hybrid') },\n  { value: 'onsite', label: t('dashboard.jobs.shared.remote.onsite') },\n])"),
    ("const experienceLevelOptions = [\n  { value: '', label: 'Not specified' },\n  { value: 'junior', label: 'Junior' },\n  { value: 'mid', label: 'Mid-level' },\n  { value: 'senior', label: 'Senior' },\n  { value: 'lead', label: 'Lead' },\n]",
     "const experienceLevelOptions = computed(() => [\n  { value: '', label: t('dashboard.jobs.shared.notSpecified') },\n  { value: 'junior', label: t('dashboard.jobs.shared.experience.junior') },\n  { value: 'mid', label: t('dashboard.jobs.shared.midLevel') },\n  { value: 'senior', label: t('dashboard.jobs.shared.experience.senior') },\n  { value: 'lead', label: t('dashboard.jobs.shared.experience.lead') },\n])"),
    ("const salaryUnitOptions = [\n  { value: '', label: 'Not specified' },\n  { value: 'YEAR', label: 'Per year' },\n  { value: 'MONTH', label: 'Per month' },\n  { value: 'HOUR', label: 'Per hour' },\n]",
     "const salaryUnitOptions = computed(() => [\n  { value: '', label: t('dashboard.jobs.shared.notSpecified') },\n  { value: 'YEAR', label: t('dashboard.jobs.shared.perYear') },\n  { value: 'MONTH', label: t('dashboard.jobs.shared.perMonth') },\n  { value: 'HOUR', label: t('dashboard.jobs.shared.perHour') },\n])"),
])

print('Done ai-analysis script + settings script partial')
