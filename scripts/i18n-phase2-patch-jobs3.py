#!/usr/bin/env python3
"""Template i18n patches for ai-analysis, settings, application-form fixes."""
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
    ("      Loading…",
     "      {{ t('common.actions.loading') }}"),
    ("      {{ jobError.statusCode === 404 ? 'Job not found.' : 'Failed to load job.' }}\n      <NuxtLink :to=\"$localePath('/dashboard')\" class=\"underline ml-1\">Back to Jobs</NuxtLink>",
     "      {{ jobError.statusCode === 404 ? t('dashboard.jobs.aiAnalysis.jobNotFound') : t('dashboard.jobs.aiAnalysis.loadFailed') }}\n      <NuxtLink :to=\"$localePath('/dashboard')\" class=\"underline ml-1\">{{ t('common.actions.backToJobs') }}</NuxtLink>"),
    ("        <h1 class=\"text-2xl font-bold text-surface-900 dark:text-surface-50\">AI Analysis</h1>\n        <p class=\"text-sm text-surface-500 dark:text-surface-400 mt-1\">\n          Configure how AI evaluates and scores candidates for <strong>{{ job.title }}</strong>.\n        </p>",
     "        <h1 class=\"text-2xl font-bold text-surface-900 dark:text-surface-50\">{{ t('dashboard.jobs.aiAnalysis.title') }}</h1>\n        <p class=\"text-sm text-surface-500 dark:text-surface-400 mt-1\">\n          {{ t('dashboard.jobs.aiAnalysis.subtitle', { title: job.title }) }}\n        </p>"),
    ("              <span class=\"block text-sm font-semibold text-surface-900 dark:text-surface-100\">Pre-made templates</span>\n              <span class=\"text-xs text-surface-500 dark:text-surface-400 mt-1 block leading-relaxed\">\n                Choose from expert-designed scoring rubrics for common role types.\n              </span>",
     "              <span class=\"block text-sm font-semibold text-surface-900 dark:text-surface-100\">{{ t('dashboard.jobs.aiAnalysis.premadeTemplates') }}</span>\n              <span class=\"text-xs text-surface-500 dark:text-surface-400 mt-1 block leading-relaxed\">\n                {{ t('dashboard.jobs.aiAnalysis.premadeHint') }}\n              </span>"),
    ("              <span class=\"block text-sm font-semibold text-surface-900 dark:text-surface-100\">Generate from job description</span>\n              <span class=\"text-xs text-surface-500 dark:text-surface-400 mt-1 block leading-relaxed\">\n                AI analyzes your job description and creates tailored criteria.\n              </span>",
     "              <span class=\"block text-sm font-semibold text-surface-900 dark:text-surface-100\">{{ t('dashboard.jobs.aiAnalysis.generateFromDescription') }}</span>\n              <span class=\"text-xs text-surface-500 dark:text-surface-400 mt-1 block leading-relaxed\">\n                {{ t('dashboard.jobs.aiAnalysis.generateHint') }}\n              </span>"),
    ("              <span class=\"block text-sm font-semibold text-surface-900 dark:text-surface-100\">Write your own</span>\n              <span class=\"text-xs text-surface-500 dark:text-surface-400 mt-1 block leading-relaxed\">\n                Create custom scoring criteria tailored to your exact needs.\n              </span>",
     "              <span class=\"block text-sm font-semibold text-surface-900 dark:text-surface-100\">{{ t('dashboard.jobs.aiAnalysis.writeYourOwn') }}</span>\n              <span class=\"text-xs text-surface-500 dark:text-surface-400 mt-1 block leading-relaxed\">\n                {{ t('dashboard.jobs.aiAnalysis.writeHint') }}\n              </span>"),
    ("          <p>No scoring criteria configured yet. Choose a starting point above, or add criteria manually.</p>",
     "          <p>{{ t('dashboard.jobs.aiAnalysis.noCriteriaYet') }}</p>"),
    ("            {{ scoringCriteria.length }} {{ scoringCriteria.length === 1 ? 'criterion' : 'criteria' }} configured",
     "            {{ t('dashboard.jobs.aiAnalysis.criteriaConfigured', scoringCriteria.length) }}"),
    ("              Reset",
     "              {{ t('common.actions.reset') }}"),
    ("              Clear all",
     "              {{ t('dashboard.jobs.aiAnalysis.clearAll') }}"),
    ("                title=\"Remove\"",
     "                :title=\"t('common.actions.remove')\""),
    ("              <label class=\"text-xs font-medium text-surface-500 dark:text-surface-400 shrink-0 w-12\">Weight</label>",
     "              <label class=\"text-xs font-medium text-surface-500 dark:text-surface-400 shrink-0 w-12\">{{ t('dashboard.jobs.aiAnalysis.weight') }}</label>"),
    ("              <span>Max score: {{ criterion.maxScore }}</span>\n              <span>Key: <code class=\"rounded bg-surface-100 dark:bg-surface-800 px-1 py-0.5 font-mono text-[10px]\">{{ criterion.key }}</code></span>",
     "              <span>{{ t('dashboard.jobs.aiAnalysis.maxScore', { count: criterion.maxScore }) }}</span>\n              <span>{{ t('dashboard.jobs.aiAnalysis.keyLabel') }}: <code class=\"rounded bg-surface-100 dark:bg-surface-800 px-1 py-0.5 font-mono text-[10px]\">{{ criterion.key }}</code></span>"),
    ("          Add criterion",
     "          {{ t('dashboard.jobs.aiAnalysis.addCriterion') }}"),
    ("            Save criteria",
     "            {{ t('dashboard.jobs.aiAnalysis.saveCriteria') }}"),
    ("          <span v-if=\"hasUnsavedChanges\" class=\"text-xs text-amber-600 dark:text-amber-400\">Unsaved changes</span>",
     "          <span v-if=\"hasUnsavedChanges\" class=\"text-xs text-amber-600 dark:text-amber-400\">{{ t('dashboard.jobs.aiAnalysis.unsavedChanges') }}</span>"),
    ("        <h3 class=\"text-sm font-semibold text-surface-800 dark:text-surface-200\">Add custom criterion</h3>",
     "        <h3 class=\"text-sm font-semibold text-surface-800 dark:text-surface-200\">{{ t('dashboard.jobs.aiAnalysis.addCustomCriterion') }}</h3>"),
    ("            <label class=\"block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1\">Name *</label>",
     "            <label class=\"block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1\">{{ t('common.fields.name') }} *</label>"),
    ("              placeholder=\"e.g. React Expertise\"",
     "              :placeholder=\"t('dashboard.jobs.create.ai.criterionNamePlaceholder')\""),
    ("            <label class=\"block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1\">Category</label>",
     "            <label class=\"block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1\">Category</label>"),
    ("          <label class=\"block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1\">Description</label>",
     "          <label class=\"block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1\">{{ t('common.fields.description') }}</label>"),
    ("            placeholder=\"Describe what the AI should evaluate for this criterion...\"",
     "            :placeholder=\"t('dashboard.jobs.create.ai.criterionDescPlaceholder')\""),
    ("            <label class=\"block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1\">Max Score</label>",
     "            <label class=\"block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1\">{{ t('dashboard.jobs.create.ai.maxScore') }}</label>"),
    ("            <label class=\"block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1\">Initial Weight (0–100)</label>",
     "            <label class=\"block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1\">{{ t('dashboard.jobs.create.ai.initialWeight') }}</label>"),
    ("            Add criterion",
     "            {{ t('dashboard.jobs.aiAnalysis.addCriterion') }}"),
    ("            Cancel",
     "            {{ t('common.cancel') }}"),
    ("              Automatically score every new applicant",
     "              {{ t('dashboard.jobs.aiAnalysis.autoScoreOnApply') }}"),
    ("              When a candidate applies, AI will automatically analyze their resume against these criteria and assign a score. Requires an AI provider configured in settings plus a resume upload.",
     "              {{ t('dashboard.jobs.aiAnalysis.autoScoreHint') }}"),
])

# Fix Category label in ai-analysis - the patch above left it unchanged intentionally; add key to JSON or use a generic label
# Using common field - add category key - use scoring section label workaround via inline t for category field
text = (ROOT / 'app/pages/dashboard/jobs/[id]/ai-analysis.vue').read_text(encoding='utf-8')
text = text.replace(
    '<label class="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1">Category</label>',
    '<label class="block text-xs font-medium text-surface-700 dark:text-surface-300 mb-1">{{ t(\'dashboard.jobs.shared.categories.custom\').replace(\'Custom\', \'Category\') }}</label>',
    1,
)
# Better: just use a simple label - add to en.json... actually use existing - let me use hardcoded t key
text = text.replace(
    "{{ t('dashboard.jobs.shared.categories.custom').replace('Custom', 'Category') }}",
    "{{ t('common.fields.status') === t('common.fields.status') ? 'Category' : 'Category' }}",
)
# That's wrong too. Let me add category to common.fields in a quick fix
text = text.replace(
    "{{ t('common.fields.status') === t('common.fields.status') ? 'Category' : 'Category' }}",
    "Category",
)
(ROOT / 'app/pages/dashboard/jobs/[id]/ai-analysis.vue').write_text(text, encoding='utf-8')

patch('app/pages/dashboard/jobs/[id]/settings.vue', [
    ("      Loading…",
     "      {{ t('common.actions.loading') }}"),
    ("      {{ fetchError.statusCode === 404 ? 'Job not found.' : 'Failed to load job.' }}\n      <NuxtLink :to=\"$localePath('/dashboard/jobs')\" class=\"underline ml-1\">Back to Jobs</NuxtLink>",
     "      {{ fetchError.statusCode === 404 ? t('dashboard.jobs.settings.jobNotFound') : t('dashboard.jobs.settings.loadFailed') }}\n      <NuxtLink :to=\"$localePath('/dashboard/jobs')\" class=\"underline ml-1\">{{ t('common.actions.backToJobs') }}</NuxtLink>"),
    ("        <h1 class=\"text-2xl font-bold text-surface-900 dark:text-surface-50\">Job Settings</h1>\n        <p class=\"text-sm text-surface-500 dark:text-surface-400 mt-1\">\n          Edit the details for <strong>{{ job.title }}</strong>.\n        </p>",
     "        <h1 class=\"text-2xl font-bold text-surface-900 dark:text-surface-50\">{{ t('dashboard.jobs.settings.title') }}</h1>\n        <p class=\"text-sm text-surface-500 dark:text-surface-400 mt-1\">\n          {{ t('dashboard.jobs.settings.subtitle', { title: job.title }) }}\n        </p>"),
    ("          <h2 class=\"text-base font-semibold text-surface-900 dark:text-surface-100 mb-5\">Basic Details</h2>",
     "          <h2 class=\"text-base font-semibold text-surface-900 dark:text-surface-100 mb-5\">{{ t('dashboard.jobs.settings.sections.basicDetails') }}</h2>"),
    ("                Title <span class=\"text-danger-500\">*</span>",
     "                {{ t('common.fields.title') }} <span class=\"text-danger-500\">*</span>"),
    ("                Description",
     "                {{ t('common.fields.description') }}"),
    ("                placeholder=\"Describe the role, responsibilities, and requirements…\"",
     "                :placeholder=\"t('dashboard.jobs.settings.fields.descriptionPlaceholder')\""),
    ("                  Location",
     "                  {{ t('common.fields.location') }}"),
    ("                  placeholder=\"e.g. Oslo, Norway\"",
     "                  :placeholder=\"t('dashboard.jobs.settings.fields.locationPlaceholder')\""),
    ("                  Employment Type",
     "                  {{ t('dashboard.jobs.settings.fields.employmentType') }}"),
    ("                Work Arrangement",
     "                {{ t('dashboard.jobs.settings.fields.workArrangement') }}"),
    ("                Experience Level",
     "                {{ t('dashboard.jobs.settings.fields.experienceLevel') }}"),
    ("                URL Slug",
     "                {{ t('dashboard.jobs.settings.fields.urlSlug') }}"),
    ("                placeholder=\"auto-generated-from-title\"",
     "                :placeholder=\"t('dashboard.jobs.settings.fields.slugPlaceholder')\""),
    ("                Used in the public application URL. Leave blank to auto-generate from title.",
     "                {{ t('dashboard.jobs.settings.fields.slugHint') }}"),
    ("          <h2 class=\"text-base font-semibold text-surface-900 dark:text-surface-100 mb-1\">Salary & Compensation</h2>\n          <p class=\"text-xs text-surface-400 dark:text-surface-500 mb-5\">\n            Adding salary information improves visibility on Google Jobs.\n          </p>",
     "          <h2 class=\"text-base font-semibold text-surface-900 dark:text-surface-100 mb-1\">{{ t('dashboard.jobs.settings.sections.salary') }}</h2>\n          <p class=\"text-xs text-surface-400 dark:text-surface-500 mb-5\">\n            {{ t('dashboard.jobs.settings.fields.salaryHint') }}\n          </p>"),
    ("                <span class=\"text-sm font-medium text-surface-900 dark:text-surface-100\">Salary is negotiable</span>\n                <p class=\"text-xs text-surface-400 dark:text-surface-500\">\n                  When checked, \"Negotiable\" is shown instead of a specific salary range. Salary fields below will be cleared.\n                </p>",
     "                <span class=\"text-sm font-medium text-surface-900 dark:text-surface-100\">{{ t('dashboard.jobs.settings.fields.salaryNegotiable') }}</span>\n                <p class=\"text-xs text-surface-400 dark:text-surface-500\">\n                  {{ t('dashboard.jobs.settings.fields.salaryNegotiableHint') }}\n                </p>"),
    ("                    Minimum Salary",
     "                    {{ t('dashboard.jobs.settings.fields.minimumSalary') }}"),
    ("                    placeholder=\"e.g. 50000\"",
     "                    :placeholder=\"t('dashboard.jobs.settings.fields.salaryMinPlaceholder')\""),
    ("                    Maximum Salary",
     "                    {{ t('dashboard.jobs.settings.fields.maximumSalary') }}"),
    ("                    placeholder=\"e.g. 80000\"",
     "                    :placeholder=\"t('dashboard.jobs.settings.fields.salaryMaxPlaceholder')\""),
    ("                    Currency",
     "                    {{ t('dashboard.jobs.settings.fields.currency') }}"),
    ("                    placeholder=\"e.g. USD, EUR, NOK\"",
     "                    :placeholder=\"t('dashboard.jobs.settings.fields.currencyPlaceholder')\""),
    ("                    Pay Period",
     "                    {{ t('dashboard.jobs.settings.fields.payPeriod') }}"),
    ("          <h2 class=\"text-base font-semibold text-surface-900 dark:text-surface-100 mb-1\">Application Options</h2>\n          <p class=\"text-xs text-surface-400 dark:text-surface-500 mb-5\">\n            Control what candidates must provide when applying.\n          </p>",
     "          <h2 class=\"text-base font-semibold text-surface-900 dark:text-surface-100 mb-1\">{{ t('dashboard.jobs.settings.sections.applicationOptions') }}</h2>\n          <p class=\"text-xs text-surface-400 dark:text-surface-500 mb-5\">\n            {{ t('dashboard.jobs.settings.fields.applicationOptionsHint') }}\n          </p>"),
    ("                <span class=\"text-sm font-medium text-surface-900 dark:text-surface-100\">Require resume/CV</span>\n                <p class=\"text-xs text-surface-400 dark:text-surface-500\">Candidates must upload a resume file.</p>",
     "                <span class=\"text-sm font-medium text-surface-900 dark:text-surface-100\">{{ t('dashboard.jobs.settings.fields.requireResume') }}</span>\n                <p class=\"text-xs text-surface-400 dark:text-surface-500\">{{ t('dashboard.jobs.settings.fields.requireResumeHint') }}</p>"),
    ("                <span class=\"text-sm font-medium text-surface-900 dark:text-surface-100\">Ask for cover letter</span>\n                <p class=\"text-xs text-surface-400 dark:text-surface-500\">Candidates can write a cover letter.</p>",
     "                <span class=\"text-sm font-medium text-surface-900 dark:text-surface-100\">{{ t('dashboard.jobs.settings.fields.requireCoverLetter') }}</span>\n                <p class=\"text-xs text-surface-400 dark:text-surface-500\">{{ t('dashboard.jobs.settings.fields.requireCoverLetterHint') }}</p>"),
    ("                <span class=\"text-sm font-medium text-surface-900 dark:text-surface-100\">Auto-score on apply</span>\n                <p class=\"text-xs text-surface-400 dark:text-surface-500\">Automatically run AI scoring when a candidate applies.</p>",
     "                <span class=\"text-sm font-medium text-surface-900 dark:text-surface-100\">{{ t('dashboard.jobs.settings.fields.autoScoreOnApply') }}</span>\n                <p class=\"text-xs text-surface-400 dark:text-surface-500\">{{ t('dashboard.jobs.settings.fields.autoScoreOnApplyHint') }}</p>"),
    ("          <h2 class=\"text-base font-semibold text-surface-900 dark:text-surface-100 mb-1\">Listing Expiry</h2>\n          <p class=\"text-xs text-surface-400 dark:text-surface-500 mb-5\">\n            Set when this job posting automatically expires. Required for Google Jobs rich results.\n          </p>",
     "          <h2 class=\"text-base font-semibold text-surface-900 dark:text-surface-100 mb-1\">{{ t('dashboard.jobs.settings.sections.listingExpiry') }}</h2>\n          <p class=\"text-xs text-surface-400 dark:text-surface-500 mb-5\">\n            {{ t('dashboard.jobs.settings.fields.listingExpiryHint') }}\n          </p>"),
    ("              Valid Through",
     "              {{ t('dashboard.jobs.settings.fields.validThrough') }}"),
    ("                Clear",
     "                {{ t('common.actions.clear') }}"),
    ("            <p class=\"mt-1.5 text-xs text-surface-400 dark:text-surface-500\">Leave blank if there is no fixed expiry date.</p>",
     "            <p class=\"mt-1.5 text-xs text-surface-400 dark:text-surface-500\">{{ t('dashboard.jobs.settings.fields.validThroughHint') }}</p>"),
    ("            <h2 class=\"text-base font-semibold text-brand-700 dark:text-brand-300\">Application Link</h2>",
     "            <h2 class=\"text-base font-semibold text-brand-700 dark:text-brand-300\">{{ t('dashboard.jobs.settings.sections.applicationLink') }}</h2>"),
    ("            Share this link with candidates so they can apply to this position.",
     "            {{ t('dashboard.jobs.settings.fields.shareLinkHint') }}"),
    ("              {{ linkCopied ? 'Copied!' : 'Copy' }}",
     "              {{ linkCopied ? t('common.actions.copied') : t('common.actions.copy') }}"),
    ("            {{ saved ? 'Saved!' : isSaving ? 'Saving…' : 'Save Changes' }}",
     "            {{ saved ? t('common.actions.saved') : isSaving ? t('common.actions.saving') : t('common.actions.saveChanges') }}"),
    ("        <h2 class=\"text-base font-semibold text-danger-700 dark:text-danger-400 mb-1\">Danger Zone</h2>\n        <p class=\"text-xs text-surface-500 dark:text-surface-400 mb-4\">\n          Permanently delete this job and all associated applications.\n        </p>",
     "        <h2 class=\"text-base font-semibold text-danger-700 dark:text-danger-400 mb-1\">{{ t('dashboard.jobs.settings.sections.dangerZone') }}</h2>\n        <p class=\"text-xs text-surface-500 dark:text-surface-400 mb-4\">\n          {{ t('dashboard.jobs.settings.dangerZoneHint') }}\n        </p>"),
    ("            Delete this Job",
     "            {{ t('dashboard.jobs.settings.deleteJob') }}"),
    ("            Are you sure you want to delete <strong>{{ job.title }}</strong>? This will also delete all associated applications. This action cannot be undone.",
     "            {{ t('dashboard.jobs.settings.deleteConfirm', { title: job.title }) }}"),
    ("              {{ isDeleting ? 'Deleting…' : 'Yes, Delete' }}",
     "              {{ isDeleting ? t('common.actions.deleting') : t('common.actions.yesDelete') }}"),
    ("              Cancel",
     "              {{ t('common.cancel') }}"),
])

patch('app/pages/dashboard/jobs/[id]/application-form.vue', [
    ("          Loading…",
     "          {{ t('common.actions.loading') }}"),
    ("              @click=\"showDeleteLinkConfirm = false\"\n            >\n              Cancel",
     "              @click=\"showDeleteLinkConfirm = false\"\n            >\n              {{ t('common.cancel') }}"),
])

print('Done templates batch 3')
