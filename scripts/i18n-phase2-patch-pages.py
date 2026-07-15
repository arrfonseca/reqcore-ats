#!/usr/bin/env python3
"""Apply Phase 2 i18n patches to dashboard Vue pages."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

def patch(path: str, replacements: list[tuple[str, str]]) -> None:
    p = ROOT / path
    text = p.read_text(encoding='utf-8')
    for old, new in replacements:
        if old not in text:
            raise SystemExit(f"MISSING in {path}: {old[:80]!r}")
        text = text.replace(old, new, 1)
    p.write_text(text, encoding='utf-8')
    print(f"Patched {path}")

# ── dashboard/index.vue ──
patch('app/pages/dashboard/index.vue', [
    ("definePageMeta({\n  layout: 'dashboard',\n  middleware: ['auth', 'require-org'],\n})\n\nuseSeoMeta({\n  title: 'Dashboard — Reqcore',\n  description: 'Centro de comando para recrutamento e seleção',\n})",
     "const { t } = useI18n()\n\ndefinePageMeta({\n  layout: 'dashboard',\n  middleware: ['auth', 'require-org'],\n})\n\nuseSeoMeta({\n  title: t('dashboard.home.seoTitle'),\n  description: t('dashboard.home.seoDescription'),\n})"),
    ("const stageConfig = [\n  { key: 'new', label: 'New',",
     "const stageConfig = computed(() => [\n  { key: 'new', label: t('common.stages.new'),"),
    ("  { key: 'screening', label: 'Screening',",
     "  { key: 'screening', label: t('common.stages.screening'),"),
    ("  { key: 'interview', label: 'Interview',",
     "  { key: 'interview', label: t('common.stages.interview'),"),
    ("  { key: 'offer', label: 'Offer',",
     "  { key: 'offer', label: t('common.stages.offer'),"),
    ("  { key: 'hired', label: 'Hired',",
     "  { key: 'hired', label: t('common.stages.hired'),"),
    ("  { key: 'rejected', label: 'Rejected',",
     "  { key: 'rejected', label: t('common.stages.rejected'),"),
    ("] as const\n\nconst stageCountKeys",
     "])\n\nconst stageCountKeys"),
    ("const interviewTypeLabels: Record<string, string> = {\n  phone: 'Phone',\n  video: 'Video',\n  in_person: 'In-person',\n  panel: 'Panel',\n  technical: 'Technical',\n  take_home: 'Take-home',\n}",
     "const interviewTypeLabels = computed<Record<string, string>>(() => ({\n  phone: t('dashboard.home.interviewTypes.phone'),\n  video: t('dashboard.home.interviewTypes.video'),\n  in_person: t('dashboard.home.interviewTypes.in_person'),\n  panel: t('dashboard.home.interviewTypes.panel'),\n  technical: t('dashboard.home.interviewTypes.technical'),\n  take_home: t('dashboard.home.interviewTypes.take_home'),\n}))"),
    ("  if (diffDays === 0) {\n    if (diffHours <= 0) return 'Now'\n    return `In ${diffHours}h`\n  }\n  if (diffDays === 1) return 'Tomorrow'",
     "  if (diffDays === 0) {\n    if (diffHours <= 0) return t('common.relativeTime.now')\n    return t('common.relativeTime.inHours', { count: diffHours })\n  }\n  if (diffDays === 1) return t('timeline.tomorrow')"),
    ("  if (diffDays < 7) return `In ${diffDays} days`",
     "  if (diffDays < 7) return t('common.relativeTime.inDays', { count: diffDays })"),
    ("  if (diffMins < 1) return 'Just now'\n  if (diffMins < 60) return `${diffMins}m ago`\n  if (diffHours < 24) return `${diffHours}h ago`\n  if (diffDays < 7) return `${diffDays}d ago`",
     "  if (diffMins < 1) return t('common.relativeTime.justNow')\n  if (diffMins < 60) return t('common.relativeTime.minutesAgo', { count: diffMins })\n  if (diffHours < 24) return t('common.relativeTime.hoursAgo', { count: diffHours })\n  if (diffDays < 7) return t('common.relativeTime.daysAgo', { count: diffDays })"),
    ("      <span>Failed to load dashboard.</span>\n      <button class=\"underline ml-auto font-medium cursor-pointer\" @click=\"refresh()\">Retry</button>",
     "      <span>{{ t('dashboard.home.failed') }}</span>\n      <button class=\"underline ml-auto font-medium cursor-pointer\" @click=\"refresh()\">{{ t('common.actions.retry') }}</button>"),
    ("          Bem-vindo ao RH do <br>Armarinho São José",
     "          {{ t('dashboard.home.emptyTitle') }}"),
    ("          Esse é seu centro de comando para recrutamento e seleção. Crie sua primeira vaga para começar o processo de seleção.",
     "          {{ t('dashboard.home.emptyDescription') }}"),
    ("          Criar Sua Primeira Vaga",
     "          {{ t('dashboard.home.createFirstJob') }}"),
    ("          <h1 class=\"text-xl sm:text-2xl font-bold text-surface-900 dark:text-surface-50 tracking-tight\">Dashboard</h1>",
     "          <h1 class=\"text-xl sm:text-2xl font-bold text-surface-900 dark:text-surface-50 tracking-tight\">{{ t('dashboard.home.title') }}</h1>"),
    ("          New Job",
     "          {{ t('dashboard.home.newJob') }}"),
    ("            <span class=\"block mt-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-surface-400 dark:text-surface-500\">Open Jobs</span>\n            <p class=\"text-[11px] text-surface-300 dark:text-surface-600 mt-1\">\n              {{ jobsByStatus.draft }} draft{{ jobsByStatus.draft === 1 ? '' : 's' }}",
     "            <span class=\"block mt-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-surface-400 dark:text-surface-500\">{{ t('dashboard.home.stats.openJobs') }}</span>\n            <p class=\"text-[11px] text-surface-300 dark:text-surface-600 mt-1\">\n              {{ t('dashboard.home.stats.draftCount', jobsByStatus.draft) }}"),
    ("            <span class=\"block mt-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-surface-400 dark:text-surface-500\">Candidates</span>\n            <p class=\"text-[11px] text-surface-300 dark:text-surface-600 mt-1\">Talent pool</p>",
     "            <span class=\"block mt-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-surface-400 dark:text-surface-500\">{{ t('dashboard.home.stats.candidates') }}</span>\n            <p class=\"text-[11px] text-surface-300 dark:text-surface-600 mt-1\">{{ t('dashboard.home.stats.talentPool') }}</p>"),
    ("            <span class=\"block mt-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-surface-400 dark:text-surface-500\">Applications</span>\n            <p class=\"text-[11px] text-surface-300 dark:text-surface-600 mt-1\">Total received</p>",
     "            <span class=\"block mt-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-surface-400 dark:text-surface-500\">{{ t('dashboard.home.stats.applications') }}</span>\n            <p class=\"text-[11px] text-surface-300 dark:text-surface-600 mt-1\">{{ t('dashboard.home.stats.totalReceived') }}</p>"),
    ("            <span class=\"block mt-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-surface-400 dark:text-surface-500\">To Review</span>\n            <p class=\"text-[11px] mt-1\" :class=\"counts.newApplications > 0 ? 'text-warning-500 dark:text-warning-500 font-medium' : 'text-surface-300 dark:text-surface-600'\">\n              {{ counts.newApplications > 0 ? 'Needs attention' : 'All reviewed' }}",
     "            <span class=\"block mt-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-surface-400 dark:text-surface-500\">{{ t('dashboard.home.stats.toReview') }}</span>\n            <p class=\"text-[11px] mt-1\" :class=\"counts.newApplications > 0 ? 'text-warning-500 dark:text-warning-500 font-medium' : 'text-surface-300 dark:text-surface-600'\">\n              {{ counts.newApplications > 0 ? t('dashboard.home.stats.needsAttention') : t('dashboard.home.stats.allReviewed') }}"),
    ("                <h2 class=\"text-sm font-semibold text-surface-900 dark:text-surface-100\">Hiring Pipeline</h2>",
     "                <h2 class=\"text-sm font-semibold text-surface-900 dark:text-surface-100\">{{ t('dashboard.home.pipeline.title') }}</h2>"),
    ("                All jobs",
     "                {{ t('dashboard.home.pipeline.allJobs') }}"),
    ("              <p class=\"text-sm font-medium text-surface-500 dark:text-surface-400 mb-1\">No open jobs</p>\n              <p class=\"text-xs text-surface-400 dark:text-surface-500 mb-4\">Create your first job to see the pipeline</p>",
     "              <p class=\"text-sm font-medium text-surface-500 dark:text-surface-400 mb-1\">{{ t('dashboard.home.pipeline.noOpenJobs') }}</p>\n              <p class=\"text-xs text-surface-400 dark:text-surface-500 mb-4\">{{ t('dashboard.home.pipeline.noOpenJobsHint') }}</p>"),
    ("                Create one",
     "                {{ t('dashboard.home.pipeline.createOne') }}"),
    ("                    {{ j.applicationCount }} total",
     "                    {{ t('dashboard.home.pipeline.total', { count: j.applicationCount }) }}"),
    ("                <h2 class=\"text-sm font-semibold text-surface-900 dark:text-surface-100\">Recent Applications</h2>",
     "                <h2 class=\"text-sm font-semibold text-surface-900 dark:text-surface-100\">{{ t('dashboard.home.recentApplications.title') }}</h2>"),
    ("                View all",
     "                {{ t('dashboard.home.recentApplications.viewAll') }}"),
    ("              <p class=\"text-sm font-medium text-surface-500 dark:text-surface-400\">No applications yet</p>",
     "              <p class=\"text-sm font-medium text-surface-500 dark:text-surface-400\">{{ t('dashboard.home.recentApplications.empty') }}</p>"),
    ("                      {{ app.status }}",
     "                      {{ t(`common.stages.${app.status}`) }}"),
    ("                <h2 class=\"text-sm font-semibold text-surface-900 dark:text-surface-100\">Upcoming Interviews</h2>",
     "                <h2 class=\"text-sm font-semibold text-surface-900 dark:text-surface-100\">{{ t('dashboard.home.upcomingInterviews.title') }}</h2>"),
    ("                All\n                <ArrowRight",
     "                {{ t('dashboard.home.upcomingInterviews.all') }}\n                <ArrowRight"),
    ("              <p class=\"text-sm font-medium text-surface-500 dark:text-surface-400 mb-0.5\">No upcoming interviews</p>\n              <p class=\"text-xs text-surface-400 dark:text-surface-500\">Next 7 days</p>",
     "              <p class=\"text-sm font-medium text-surface-500 dark:text-surface-400 mb-0.5\">{{ t('dashboard.home.upcomingInterviews.empty') }}</p>\n              <p class=\"text-xs text-surface-400 dark:text-surface-500\">{{ t('dashboard.home.upcomingInterviews.next7Days') }}</p>"),
    ("                    Google Calendar",
     "                    {{ t('common.googleCalendar') }}"),
    ("              <h2 class=\"text-sm font-semibold text-surface-900 dark:text-surface-100\">Quick Actions</h2>",
     "              <h2 class=\"text-sm font-semibold text-surface-900 dark:text-surface-100\">{{ t('dashboard.home.quickActions.title') }}</h2>"),
    ("                Create new job",
     "                {{ t('dashboard.home.quickActions.createJob') }}"),
    ("                Add candidate",
     "                {{ t('dashboard.home.quickActions.addCandidate') }}"),
    ("                Review applications",
     "                {{ t('dashboard.home.quickActions.reviewApplications') }}"),
    ("                View interviews",
     "                {{ t('dashboard.home.quickActions.viewInterviews') }}"),
])

print('Done dashboard/index.vue')
