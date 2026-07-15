#!/usr/bin/env python3
"""new.vue i18n - script + key templates."""
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
P = ROOT / 'app/pages/dashboard/jobs/new.vue'

def patch(repls):
    text = P.read_text(encoding='utf-8')
    for old, new in repls:
        if old not in text:
            raise SystemExit(f'MISSING: {old[:100]!r}')
        text = text.replace(old, new, 1)
    P.write_text(text, encoding='utf-8')
    print(f'Patched new.vue ({len(repls)} replacements)')

patch([
    ("definePageMeta({\n  layout: 'dashboard',\n  middleware: ['auth', 'require-org'],\n})\n\nuseSeoMeta({\n  title: 'Create Job — Reqcore',\n  description: 'Create a new job posting',\n})",
     "const { t } = useI18n()\n\ndefinePageMeta({\n  layout: 'dashboard',\n  middleware: ['auth', 'require-org'],\n})\n\nuseSeoMeta({\n  title: t('dashboard.jobs.create.seoTitle'),\n  description: t('dashboard.jobs.create.seoDescription'),\n})"),
    ("const steps = [\n  { id: 1, title: 'Job details', description: 'Tell applicants about this role.' },\n  { id: 2, title: 'Application form', description: 'Design the application form.' },\n  { id: 3, title: 'AI scoring criteria', description: 'Define how AI evaluates candidates.' },\n  { id: 4, title: 'Publish & distribute', description: 'Go live and share across job boards.' },\n]",
     "const steps = computed(() => [\n  { id: 1, title: t('dashboard.jobs.create.steps.details.title'), description: t('dashboard.jobs.create.steps.details.description') },\n  { id: 2, title: t('dashboard.jobs.create.steps.applicationForm.title'), description: t('dashboard.jobs.create.steps.applicationForm.description') },\n  { id: 3, title: t('dashboard.jobs.create.steps.aiScoring.title'), description: t('dashboard.jobs.create.steps.aiScoring.description') },\n  { id: 4, title: t('dashboard.jobs.create.steps.publish.title'), description: t('dashboard.jobs.create.steps.publish.description') },\n])"),
    ("const categoryLabels: Record<string, string> = {\n  technical: 'Qualifications',\n  experience: 'Experience',\n  soft_skills: 'Soft Skills',\n  education: 'Education',\n  culture: 'Culture',\n  custom: 'Custom',\n}",
     "const categoryLabels = computed<Record<string, string>>(() => ({\n  technical: t('dashboard.jobs.shared.categories.technical'),\n  experience: t('dashboard.jobs.shared.categories.experience'),\n  soft_skills: t('dashboard.jobs.shared.categories.soft_skills'),\n  education: t('dashboard.jobs.shared.categories.education'),\n  culture: t('dashboard.jobs.shared.categories.culture'),\n  custom: t('dashboard.jobs.shared.categories.custom'),\n}))"),
    ("    toast.error('Failed to load template', { message: 'Unknown or empty template.' })",
     "    toast.error(t('dashboard.jobs.create.errors.loadTemplateFailed'), { message: t('dashboard.jobs.create.errors.unknownTemplate') })"),
    ("    toast.warning('Job title required', 'Add a job title in Step 1 first so AI can generate relevant criteria.')",
     "    toast.warning(t('dashboard.jobs.create.errors.jobTitleRequired'), t('dashboard.jobs.create.errors.jobTitleRequiredHint'))"),
    ("    toast.warning('Job description required', 'Add a job description in Step 1 first so AI can generate relevant criteria.')",
     "    toast.warning(t('dashboard.jobs.create.errors.jobDescriptionRequired'), t('dashboard.jobs.create.errors.jobDescriptionRequiredHint'))"),
    ("    toast.success('Criteria generated', `${scoringCriteria.value.length} scoring criteria created from job description.`)",
     "    toast.success(t('dashboard.jobs.create.errors.criteriaGenerated'), t('dashboard.jobs.create.errors.criteriaGeneratedHint', scoringCriteria.value.length))"),
    ("        title: 'AI provider not configured',\n        message: 'Set up your AI provider and model before generating criteria.',\n        link: { label: 'Go to AI Settings', href: '/dashboard/settings/ai' },",
     "        title: t('dashboard.jobs.create.errors.aiNotConfigured'),\n        message: t('dashboard.jobs.create.errors.aiNotConfiguredHint'),\n        link: { label: t('common.actions.goToAiSettings'), href: '/dashboard/settings/ai' },"),
    ("      toast.error('Failed to generate criteria', {\n        message: 'Could not generate criteria. Make sure your AI provider is configured in Settings → AI, then try again.',",
     "      toast.error(t('dashboard.jobs.create.errors.generateCriteriaFailed'), {\n        message: t('dashboard.jobs.create.errors.generateCriteriaFailedHint'),"),
    ("    toast.warning('Duplicate criterion', `A criterion with key \"${f.key}\" already exists.`)",
     "    toast.warning(t('dashboard.jobs.create.errors.duplicateCriterion'), t('dashboard.jobs.create.errors.duplicateCriterionHint', { key: f.key }))"),
    ("      title: 'AI integration not set up',\n      message: 'To use AI-powered candidate scoring, configure your AI provider in Settings → AI. You can still add criteria manually.',\n      link: { label: 'Go to AI Settings', href: '/dashboard/settings/ai' },",
     "      title: t('dashboard.jobs.create.errors.aiIntegrationNotSetup'),\n      message: t('dashboard.jobs.create.errors.aiIntegrationNotSetupHint'),\n      link: { label: t('common.actions.goToAiSettings'), href: '/dashboard/settings/ai' },"),
    ("    toast.error(`Failed to create tracking link for ${channelName}`)",
     "    toast.error(t('dashboard.jobs.create.errors.trackingLinkFailed', { channel: channelName }))"),
    ("    toast.warning('Duplicate board', `A custom link for \"${name}\" already exists.`)",
     "    toast.warning(t('dashboard.jobs.create.errors.duplicateBoard'), t('dashboard.jobs.create.errors.duplicateBoardHint', { name }))"),
    ("    toast.error(`Failed to create tracking link for \"${name}\"`)",
     "    toast.error(t('dashboard.jobs.create.errors.trackingLinkFailed', { channel: name }))"),
    ("  title: z\n    .string()\n    .min(1, 'Title is required')\n    .max(200, 'Title must be 200 characters or less'),",
     "  title: z\n    .string()\n    .min(1, t('dashboard.jobs.create.errors.titleRequired'))\n    .max(200, t('dashboard.jobs.create.errors.titleMax')),"),
    ("    toast.error('Failed to create job', {\n      message: statusMessage,",
     "    toast.error(t('dashboard.jobs.create.errors.createJobFailed'), {\n      message: statusMessage || t('dashboard.jobs.create.errors.createJobFailedHint'),"),
    ("const typeOptions = [\n  { value: 'full_time', label: 'Full-time' },\n  { value: 'part_time', label: 'Part-time' },\n  { value: 'contract', label: 'Contract' },\n  { value: 'internship', label: 'Internship' },\n]",
     "const typeOptions = computed(() => [\n  { value: 'full_time', label: t('jobs.shared.types.full_time') },\n  { value: 'part_time', label: t('jobs.shared.types.part_time') },\n  { value: 'contract', label: t('jobs.shared.types.contract') },\n  { value: 'internship', label: t('jobs.shared.types.internship') },\n])"),
    ("const questionTypeLabels: Record<QuestionType, string> = {\n  short_text: 'Short Text',\n  long_text: 'Long Text',\n  single_select: 'Single Select',\n  multi_select: 'Multi Select',\n  number: 'Number',\n  date: 'Date',\n  url: 'URL',\n  checkbox: 'Checkbox',\n  file_upload: 'File Upload',\n}",
     "const questionTypeLabels = computed<Record<string, string>>(() => ({\n  short_text: t('dashboard.jobs.shared.questionTypes.short_text'),\n  long_text: t('dashboard.jobs.shared.questionTypes.long_text'),\n  single_select: t('dashboard.jobs.shared.questionTypes.single_select'),\n  multi_select: t('dashboard.jobs.shared.questionTypes.multi_select'),\n  number: t('dashboard.jobs.shared.questionTypes.number'),\n  date: t('dashboard.jobs.shared.questionTypes.date'),\n  url: t('dashboard.jobs.shared.questionTypes.url'),\n  checkbox: t('dashboard.jobs.shared.questionTypes.checkbox'),\n  file_upload: t('dashboard.jobs.shared.questionTypes.file_upload'),\n}))"),
])
