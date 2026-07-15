#!/usr/bin/env python3
"""Extended create keys + new.vue template i18n + pipeline cleanup."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

EXTENDED = {
    "title": "New Job",
    "sections": {
        "location": "Location",
        "details": "Details",
        "description": "Description",
    },
    "fields": {
        "officeLocation": "Office location",
        "workplaceType": "Workplace type",
        "aboutTheRole": "About the role",
        "remoteStatus": "Remote status",
        "nameRequired": "Name *",
    },
    "helpers": {
        "charactersLeft": "80 characters left. No special characters.",
        "minCharacters": "Minimum 700 characters recommended.",
    },
    "applicationForm": {
        "customizeTitle": "Customize your application form",
        "customizeHint": "Configure which fields candidates see when they apply. Locked fields are always collected and cannot be turned off.",
        "personalInformation": "Personal information",
        "firstName": "First name",
        "lastName": "Last name",
        "phone": "Phone",
        "mandatory": "Mandatory",
        "optional": "Optional",
        "documents": "Documents",
        "resumeCv": "Resume / CV",
        "resumeFormats": "PDF, DOC, or DOCX up to 10 MB",
        "coverLetter": "Cover letter",
        "coverLetterFormats": "Free-text field, max 10,000 characters",
        "required": "Required",
        "off": "Off",
        "screeningQuestions": "Screening questions",
        "questionsAdded": "{count} question added | {count} questions added",
        "noScreeningQuestions": "No screening questions added yet.",
        "addQuestion": "Add a question",
        "optionsCount": "{count} options",
        "moveUp": "Move up",
        "moveDown": "Move down",
    },
    "ai": {
        "title": "AI Candidate Scoring",
        "intro": "Define the criteria that AI will use to evaluate and rank candidates. Adjust weights to prioritize what matters most.",
        "notConfiguredHint": "To use AI-powered scoring, you need to configure an AI provider first. You can still define criteria manually and set up AI later.",
        "goToAiSettingsLink": "Go to AI settings",
        "requiresAiSetup": "Requires AI provider setup",
        "maxScoreLabel": "Max score: {score}",
        "keyLabel": "Key:",
        "remove": "Remove",
        "optionalStep": "Scoring criteria are optional. You can skip this step and add them later from job settings.",
        "configureAiProvider": "Configure an AI provider",
        "configureAiProviderHint": "to enable automatic scoring.",
    },
    "publish": {
        "liveTitle": "Your job is live!",
        "directApplicationLink": "Direct application link",
        "distributeTitle": "Distribute to job boards",
        "directOutreach": "Direct outreach",
        "creating": "Creating...",
        "customJobBoard": "Custom job board",
        "sourceTrackingPrefix": "Track performance in the",
        "sourceTrackingLink": "Source Tracking dashboard",
        "readyTitle": "Ready to go?",
        "jobSummary": "Job summary",
        "afterPublishing": "After publishing",
    },
    "tips": {
        "step1": {
            "commonTitles": {"title": "Use common job titles", "body": "Advertise for just one job e.g. 'Nurse', not 'nurses'."},
            "officeLocation": {"title": "Office location", "body": "Use a location to attract the most appropriate candidates. Some job boards require a location."},
            "formatDescription": {"title": "Format description", "body": "Format into sections and lists to improve readability."},
        },
        "step2": {
            "keepShort": {"title": "Keep it short", "body": "Too many questions can deter candidates. Stick to 3–5 essential questions."},
            "resumeMatters": {"title": "Resume matters", "body": "Requiring a resume enables AI scoring and makes it easier to evaluate candidates at scale."},
            "standardFields": {"title": "Standard fields", "body": "Name, email, and phone are always collected. Phone is optional for candidates by default."},
        },
        "step3": {
            "startTemplate": {"title": "Start with a template", "body": "Pre-made criteria cover the most common evaluation patterns. You can always customize them after."},
            "adjustWeights": {"title": "Adjust weights", "body": "Use the sliders to prioritize what matters most. Higher weight = more influence on the final score."},
            "aiSetupRequired": {"title": "AI setup required", "body": "To use AI-generated criteria or automatic scoring, configure your AI provider in settings."},
        },
        "step4": {
            "publishWhenReady": {"title": "Publish when ready", "body": "Publishing makes the job visible to candidates. You can unpublish at any time from the job settings."},
            "useTrackingLinks": {"title": "Use tracking links", "body": "Create a unique link for each platform (LinkedIn, Indeed, etc.) to see where your best applicants come from."},
            "oneLinkPerChannel": {"title": "One link per channel", "body": "Each tracking link counts clicks and applications separately so you can compare which channels work best."},
            "draftsPrivate": {"title": "Drafts are private", "body": "Draft jobs are only visible to your team. Candidates cannot see or apply to draft jobs."},
        },
    },
}

EXTENDED_PT = {
    "title": "Nova vaga",
    "sections": {
        "location": "Local",
        "details": "Detalhes",
        "description": "Descrição",
    },
    "fields": {
        "officeLocation": "Local do escritório",
        "workplaceType": "Tipo de local de trabalho",
        "aboutTheRole": "Sobre a função",
        "remoteStatus": "Status remoto",
        "nameRequired": "Nome *",
    },
    "helpers": {
        "charactersLeft": "80 caracteres restantes. Sem caracteres especiais.",
        "minCharacters": "Recomendado mínimo de 700 caracteres.",
    },
    "applicationForm": {
        "customizeTitle": "Personalize seu formulário de candidatura",
        "customizeHint": "Configure quais campos os candidatos veem ao se candidatar. Campos bloqueados são sempre coletados e não podem ser desativados.",
        "personalInformation": "Informações pessoais",
        "firstName": "Nome",
        "lastName": "Sobrenome",
        "phone": "Telefone",
        "mandatory": "Obrigatório",
        "optional": "Opcional",
        "documents": "Documentos",
        "resumeCv": "Currículo / CV",
        "resumeFormats": "PDF, DOC ou DOCX até 10 MB",
        "coverLetter": "Carta de apresentação",
        "coverLetterFormats": "Campo de texto livre, máximo de 10.000 caracteres",
        "required": "Obrigatório",
        "off": "Desativado",
        "screeningQuestions": "Perguntas de triagem",
        "questionsAdded": "{count} pergunta adicionada | {count} perguntas adicionadas",
        "noScreeningQuestions": "Nenhuma pergunta de triagem adicionada ainda.",
        "addQuestion": "Adicionar pergunta",
        "optionsCount": "{count} opções",
        "moveUp": "Mover para cima",
        "moveDown": "Mover para baixo",
    },
    "ai": {
        "title": "Pontuação de candidatos por IA",
        "intro": "Defina os critérios que a IA usará para avaliar e classificar candidatos. Ajuste os pesos para priorizar o que mais importa.",
        "notConfiguredHint": "Para usar pontuação por IA, configure um provedor de IA primeiro. Você ainda pode definir critérios manualmente e configurar a IA depois.",
        "goToAiSettingsLink": "Ir para configurações de IA",
        "requiresAiSetup": "Requer configuração de provedor de IA",
        "maxScoreLabel": "Pontuação máxima: {score}",
        "keyLabel": "Chave:",
        "remove": "Remover",
        "optionalStep": "Critérios de pontuação são opcionais. Você pode pular esta etapa e adicioná-los depois nas configurações da vaga.",
        "configureAiProvider": "Configure um provedor de IA",
        "configureAiProviderHint": "para habilitar pontuação automática.",
    },
    "publish": {
        "liveTitle": "Sua vaga está ativa!",
        "directApplicationLink": "Link direto de candidatura",
        "distributeTitle": "Distribuir em portais de vagas",
        "directOutreach": "Divulgação direta",
        "creating": "Criando...",
        "customJobBoard": "Portal personalizado",
        "sourceTrackingPrefix": "Acompanhe o desempenho no",
        "sourceTrackingLink": "painel de rastreamento de origem",
        "readyTitle": "Pronto para publicar?",
        "jobSummary": "Resumo da vaga",
        "afterPublishing": "Após publicar",
    },
    "tips": {
        "step1": {
            "commonTitles": {"title": "Use títulos comuns de vaga", "body": "Anuncie apenas uma vaga, ex.: 'Enfermeiro', não 'enfermeiros'."},
            "officeLocation": {"title": "Local do escritório", "body": "Use um local para atrair os candidatos mais adequados. Alguns portais exigem localização."},
            "formatDescription": {"title": "Formate a descrição", "body": "Organize em seções e listas para melhorar a legibilidade."},
        },
        "step2": {
            "keepShort": {"title": "Mantenha curto", "body": "Perguntas demais podem afastar candidatos. Fique com 3–5 perguntas essenciais."},
            "resumeMatters": {"title": "Currículo importa", "body": "Exigir currículo habilita pontuação por IA e facilita avaliar candidatos em escala."},
            "standardFields": {"title": "Campos padrão", "body": "Nome, e-mail e telefone são sempre coletados. Telefone é opcional para candidatos por padrão."},
        },
        "step3": {
            "startTemplate": {"title": "Comece com um modelo", "body": "Critérios prontos cobrem os padrões de avaliação mais comuns. Você sempre pode personalizá-los depois."},
            "adjustWeights": {"title": "Ajuste os pesos", "body": "Use os controles deslizantes para priorizar o que mais importa. Peso maior = mais influência na pontuação final."},
            "aiSetupRequired": {"title": "Configuração de IA necessária", "body": "Para usar critérios gerados por IA ou pontuação automática, configure seu provedor de IA nas configurações."},
        },
        "step4": {
            "publishWhenReady": {"title": "Publique quando estiver pronto", "body": "Publicar torna a vaga visível para candidatos. Você pode despublicar a qualquer momento nas configurações da vaga."},
            "useTrackingLinks": {"title": "Use links de rastreamento", "body": "Crie um link único para cada plataforma (LinkedIn, Indeed, etc.) para ver de onde vêm seus melhores candidatos."},
            "oneLinkPerChannel": {"title": "Um link por canal", "body": "Cada link de rastreamento conta cliques e candidaturas separadamente para comparar quais canais funcionam melhor."},
            "draftsPrivate": {"title": "Rascunhos são privados", "body": "Vagas em rascunho são visíveis apenas para sua equipe. Candidatos não podem ver ou se candidatar a rascunhos."},
        },
    },
}


def deep_merge(base, extra):
    for k, v in extra.items():
        if k in base and isinstance(base[k], dict) and isinstance(v, dict):
            deep_merge(base[k], v)
        else:
            base[k] = v


def merge_locales():
    for locale, extra in [('en', EXTENDED), ('pt-BR', EXTENDED_PT)]:
        path = ROOT / f'i18n/locales/{locale}.json'
        data = json.loads(path.read_text(encoding='utf-8'))
        deep_merge(data['dashboard']['jobs']['create'], extra)
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('Merged extended create keys')


def patch_new():
    p = ROOT / 'app/pages/dashboard/jobs/new.vue'
    text = p.read_text(encoding='utf-8')
    script_add = """
const experienceOptions = computed(() => [
  { value: 'junior', label: t('dashboard.jobs.shared.experience.junior') },
  { value: 'mid', label: t('dashboard.jobs.shared.experience.mid') },
  { value: 'senior', label: t('dashboard.jobs.shared.experience.senior') },
  { value: 'lead', label: t('dashboard.jobs.shared.experience.lead') },
])

const remoteOptions = computed(() => [
  { value: undefined, label: t('dashboard.jobs.shared.notSpecified') },
  { value: 'remote', label: t('dashboard.jobs.shared.remote.remote') },
  { value: 'hybrid', label: t('dashboard.jobs.shared.remote.hybrid') },
  { value: 'onsite', label: t('dashboard.jobs.shared.remote.onsite') },
])
"""
    marker = "const questionTypeLabels = computed"
    if 'experienceOptions' not in text and marker in text:
        text = text.replace(marker, script_add + marker, 1)

    repls = [
        ("          Back to Jobs", "          {{ t('common.actions.backToJobs') }}"),
        ("        <h1 class=\"text-3xl font-bold text-surface-900 dark:text-surface-100\">New Job</h1>", "        <h1 class=\"text-3xl font-bold text-surface-900 dark:text-surface-100\">{{ t('dashboard.jobs.create.title') }}</h1>"),
        ("          Save draft", "          {{ t('dashboard.jobs.create.actions.saveDraft') }}"),
        ("          Save & continue", "          {{ t('dashboard.jobs.create.actions.saveContinue') }}"),
        (">Job title and department<", ">{{ t('dashboard.jobs.create.sections.jobTitleDepartment') }}<"),
        ("                    Job title <span", "                    {{ t('dashboard.jobs.create.fields.jobTitle') }} <span"),
        ("placeholder=\"e.g. Senior Frontend Engineer\"", ":placeholder=\"t('dashboard.jobs.create.placeholders.jobTitle')\""),
        ("                  <p v-else class=\"mt-1.5 text-xs text-surface-500\">80 characters left. No special characters.</p>", "                  <p v-else class=\"mt-1.5 text-xs text-surface-500\">{{ t('dashboard.jobs.create.helpers.charactersLeft') }}</p>"),
        (">Location<", ">{{ t('dashboard.jobs.create.sections.location') }}<"),
        ("                      Office location", "                      {{ t('dashboard.jobs.create.fields.officeLocation') }}"),
        ("placeholder=\"e.g. New York, NY 10019, United States\"", ":placeholder=\"t('dashboard.jobs.create.placeholders.location')\""),
        ("                      Workplace type", "                      {{ t('dashboard.jobs.create.fields.workplaceType') }}"),
        (">Details<", ">{{ t('dashboard.jobs.create.sections.details') }}<"),
        (">Experience level<", ">{{ t('dashboard.jobs.create.fields.experienceLevel') }}<"),
        ("                      <option value=\"junior\">Junior</option>\n                      <option value=\"mid\">Mid-level</option>\n                      <option value=\"senior\">Senior</option>\n                      <option value=\"lead\">Lead</option>", "                      <option v-for=\"opt in experienceOptions\" :key=\"opt.value\" :value=\"opt.value\">{{ opt.label }}</option>"),
        (">Remote status<", ">{{ t('dashboard.jobs.create.fields.remoteStatus') }}<"),
        ("                      <option :value=\"undefined\">Not specified</option>\n                      <option value=\"remote\">Remote</option>\n                      <option value=\"hybrid\">Hybrid</option>\n                      <option value=\"onsite\">On-site</option>", "                      <option v-for=\"opt in remoteOptions\" :key=\"String(opt.value)\" :value=\"opt.value\">{{ opt.label }}</option>"),
        (">Description<", ">{{ t('dashboard.jobs.create.sections.description') }}<"),
        ("                    About the role", "                    {{ t('dashboard.jobs.create.fields.aboutTheRole') }}"),
        ("                    placeholder=\"Describe the role, responsibilities, and requirements…\"", "                    :placeholder=\"t('dashboard.jobs.create.placeholders.description')\""),
        ("                  <p class=\"mt-2 text-xs text-surface-500\">Minimum 700 characters recommended.</p>", "                  <p class=\"mt-2 text-xs text-surface-500\">{{ t('dashboard.jobs.create.helpers.minCharacters') }}</p>"),
        (">Customize your application form<", ">{{ t('dashboard.jobs.create.applicationForm.customizeTitle') }}<"),
        ("                  Configure which fields candidates see when they apply. Locked fields are always collected and cannot be turned off.", "                  {{ t('dashboard.jobs.create.applicationForm.customizeHint') }}"),
        (">Personal information<", ">{{ t('dashboard.jobs.create.applicationForm.personalInformation') }}<"),
        (">First name<", ">{{ t('dashboard.jobs.create.applicationForm.firstName') }}<"),
        (">Last name<", ">{{ t('dashboard.jobs.create.applicationForm.lastName') }}<"),
        (">Email<", ">{{ t('common.fields.email') }}<"),
        (">Phone<", ">{{ t('dashboard.jobs.create.applicationForm.phone') }}<"),
        ("                      Mandatory", "                      {{ t('dashboard.jobs.create.applicationForm.mandatory') }}"),
        ("                      Optional", "                      {{ t('dashboard.jobs.create.applicationForm.optional') }}"),
        (">Documents<", ">{{ t('dashboard.jobs.create.applicationForm.documents') }}<"),
        (">Resume / CV<", ">{{ t('dashboard.jobs.create.applicationForm.resumeCv') }}<"),
        ("                      <p class=\"text-xs text-surface-400 dark:text-surface-500 mt-1 ml-6\">PDF, DOC, or DOCX up to 10 MB</p>", "                      <p class=\"text-xs text-surface-400 dark:text-surface-500 mt-1 ml-6\">{{ t('dashboard.jobs.create.applicationForm.resumeFormats') }}</p>"),
        (">Cover letter<", ">{{ t('dashboard.jobs.create.applicationForm.coverLetter') }}<"),
        ("                      <p class=\"text-xs text-surface-400 dark:text-surface-500 mt-1 ml-6\">Free-text field, max 10,000 characters</p>", "                      <p class=\"text-xs text-surface-400 dark:text-surface-500 mt-1 ml-6\">{{ t('dashboard.jobs.create.applicationForm.coverLetterFormats') }}</p>"),
        ("                        Required", "                        {{ t('dashboard.jobs.create.applicationForm.required') }}"),
        ("                        Off", "                        {{ t('dashboard.jobs.create.applicationForm.off') }}"),
        (">Screening questions<", ">{{ t('dashboard.jobs.create.applicationForm.screeningQuestions') }}<"),
        ("                    {{ applicationForm.questions.length }} {{ applicationForm.questions.length === 1 ? 'question' : 'questions' }} added", "                    {{ t('dashboard.jobs.create.applicationForm.questionsAdded', applicationForm.questions.length) }}"),
        ("                  <button class=\"ml-2 underline\" @click=\"questionActionError = null\">Dismiss</button>", "                  <button class=\"ml-2 underline\" @click=\"questionActionError = null\">{{ t('common.actions.dismiss') }}</button>"),
        ("                          Required", "                          {{ t('dashboard.jobs.create.applicationForm.required') }}"),
        ("                          Optional", "                          {{ t('dashboard.jobs.create.applicationForm.optional') }}"),
        ("                          &middot; {{ q.options.length }} options", "                          &middot; {{ t('dashboard.jobs.create.applicationForm.optionsCount', q.options.length) }}"),
        ("                        title=\"Move up\"", ":title=\"t('dashboard.jobs.create.applicationForm.moveUp')\""),
        ("                        title=\"Move down\"", ":title=\"t('dashboard.jobs.create.applicationForm.moveDown')\""),
        ("                        title=\"Edit\"", ":title=\"t('common.actions.edit')\""),
        ("                        title=\"Delete\"", ":title=\"t('common.actions.delete')\""),
        ("                  No screening questions added yet.", "                  {{ t('dashboard.jobs.create.applicationForm.noScreeningQuestions') }}"),
        ("                    Add a question", "                    {{ t('dashboard.jobs.create.applicationForm.addQuestion') }}"),
        ("                  AI Candidate Scoring", "                  {{ t('dashboard.jobs.create.ai.title') }}"),
        ("                  Define the criteria that AI will use to evaluate and rank candidates. Adjust weights to prioritize what matters most.", "                  {{ t('dashboard.jobs.create.ai.intro') }}"),
        ("                    <p class=\"text-sm font-semibold text-amber-800 dark:text-amber-200\">AI provider not configured</p>", "                    <p class=\"text-sm font-semibold text-amber-800 dark:text-amber-200\">{{ t('dashboard.jobs.create.errors.aiNotConfigured') }}</p>"),
        ("                      To use AI-powered scoring, you need to configure an AI provider first. You can still define criteria manually and set up AI later.", "                      {{ t('dashboard.jobs.create.ai.notConfiguredHint') }}"),
        ("                      Go to AI settings", "                      {{ t('dashboard.jobs.create.ai.goToAiSettingsLink') }}"),
        (">Pre-made templates<", ">{{ t('dashboard.jobs.create.ai.premadeTemplates') }}<"),
        ("                      Choose from expert-designed scoring rubrics for common role types.", "                      {{ t('dashboard.jobs.create.ai.premadeHint') }}"),
        (">Generate from job description<", ">{{ t('dashboard.jobs.create.ai.generateFromDescription') }}<"),
        ("                      AI analyzes your job description and creates tailored criteria.", "                      {{ t('dashboard.jobs.create.ai.generateHint') }}"),
        ("                      Requires AI provider setup", "                      {{ t('dashboard.jobs.create.ai.requiresAiSetup') }}"),
        (">Write your own<", ">{{ t('dashboard.jobs.create.ai.writeYourOwn') }}<"),
        ("                      Create custom scoring criteria tailored to your exact needs.", "                      {{ t('dashboard.jobs.create.ai.writeHint') }}"),
        ("                    {{ scoringCriteria.length }} {{ scoringCriteria.length === 1 ? 'criterion' : 'criteria' }} configured", "                    {{ t('dashboard.jobs.create.ai.criteriaConfigured', scoringCriteria.length) }}"),
        ("                    Clear all", "                    {{ t('dashboard.jobs.create.ai.clearAll') }}"),
        ("                        title=\"Remove\"", ":title=\"t('dashboard.jobs.create.ai.remove')\""),
        (">Weight<", ">{{ t('dashboard.jobs.create.ai.weight') }}<"),
        ("                      <span>Max score: {{ criterion.maxScore }}</span>", "                      <span>{{ t('dashboard.jobs.create.ai.maxScoreLabel', { score: criterion.maxScore }) }}</span>"),
        ("                      <span>Key: <code", "                      <span>{{ t('dashboard.jobs.create.ai.keyLabel') }} <code"),
        ("                  Add criterion", "                  {{ t('dashboard.jobs.create.ai.addCriterion') }}"),
        (">Add custom criterion<", ">{{ t('dashboard.jobs.create.ai.addCustomCriterion') }}<"),
        (">Name *<", ">{{ t('dashboard.jobs.create.fields.nameRequired') }}<"),
        ("                      placeholder=\"e.g. React Expertise\"", ":placeholder=\"t('dashboard.jobs.create.ai.criterionNamePlaceholder')\""),
        (">Category<", ">{{ t('common.fields.category') }}<"),
        (">Description<", ">{{ t('common.fields.description') }}<"),
        ("                    placeholder=\"Describe what the AI should evaluate for this criterion...\"", ":placeholder=\"t('dashboard.jobs.create.ai.criterionDescPlaceholder')\""),
        (">Max Score<", ">{{ t('dashboard.jobs.create.ai.maxScore') }}<"),
        (">Initial Weight (0–100)<", ">{{ t('dashboard.jobs.create.ai.initialWeight') }}<"),
        (">Tips<", ">{{ t('dashboard.jobs.create.tips.title') }}<"),
    ]
    applied = 0
    for old, new in repls:
        if old not in text:
            print('SKIP new.vue:', old[:50])
            continue
        text = text.replace(old, new, 1)
        applied += 1
    p.write_text(text, encoding='utf-8')
    print(f'new.vue template: {applied} replacements')


def patch_pipeline():
    p = ROOT / 'app/pages/dashboard/jobs/[id]/index.vue'
    text = p.read_text(encoding='utf-8')
    repls = [
        ("                        {{ currentSummary.score }} pts", "                        {{ t('dashboard.jobs.shared.pts', { count: currentSummary.score }) }}"),
        ("                        {{ currentSummary.status }}", "                        {{ formatStatusLabel(currentSummary.status) }}"),
        ("                              <label class=\"block text-[11px] font-medium text-surface-500 dark:text-surface-400 mb-1\">Title</label>", "                              <label class=\"block text-[11px] font-medium text-surface-500 dark:text-surface-400 mb-1\">{{ t('common.fields.title') }}</label>"),
        ("                              <label class=\"block text-[11px] font-medium text-surface-500 dark:text-surface-400 mb-1\">Type</label>", "                              <label class=\"block text-[11px] font-medium text-surface-500 dark:text-surface-400 mb-1\">{{ t('dashboard.jobs.pipeline.interviews.type') }}</label>"),
        ("                                <option value=\"video\">Video Call</option>\n                                <option value=\"phone\">Phone</option>\n                                <option value=\"in_person\">In Person</option>\n                                <option value=\"technical\">Assessment</option>\n                                <option value=\"panel\">Panel</option>\n                                <option value=\"take_home\">Take Home</option>", "                                <option v-for=\"(label, key) in interviewTypeLabels\" :key=\"key\" :value=\"key\">{{ label }}</option>"),
        ("                              <label class=\"block text-[11px] font-medium text-surface-500 dark:text-surface-400 mb-1\">Location / Link</label>", "                              <label class=\"block text-[11px] font-medium text-surface-500 dark:text-surface-400 mb-1\">{{ t('dashboard.jobs.pipeline.interviews.locationLink') }}</label>"),
        ("                              <label class=\"block text-[11px] font-medium text-surface-500 dark:text-surface-400 mb-1\">Notes</label>", "                              <label class=\"block text-[11px] font-medium text-surface-500 dark:text-surface-400 mb-1\">{{ t('common.fields.notes') }}</label>"),
        ("                              <label class=\"block text-[11px] font-medium text-surface-500 dark:text-surface-400 mb-1.5\">Interviewers</label>", "                              <label class=\"block text-[11px] font-medium text-surface-500 dark:text-surface-400 mb-1.5\">{{ t('dashboard.jobs.pipeline.interviews.interviewers') }}</label>"),
        ("                  Timeline", "                  {{ t('dashboard.jobs.pipeline.tabs.timeline') }}"),
        ("                  Loading timeline…", "                  {{ t('dashboard.candidates.sidebar.loadingTimeline') }}"),
        ("                    Retry", "                    {{ t('common.actions.retry') }}"),
        ("                            <span class=\"inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium leading-none bg-accent-100 text-accent-700 dark:bg-accent-900/60 dark:text-accent-300\">{{ item.metadata.score }} pts</span>", "                            <span class=\"inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium leading-none bg-accent-100 text-accent-700 dark:bg-accent-900/60 dark:text-accent-300\">{{ t('dashboard.jobs.shared.pts', { count: item.metadata.score }) }}</span>"),
    ]
    for old, new in repls:
        if old not in text:
            print('SKIP pipeline:', old[:50])
            continue
        text = text.replace(old, new, 1)
    p.write_text(text, encoding='utf-8')
    print('pipeline cleanup done')


if __name__ == '__main__':
    merge_locales()
    patch_new()
    patch_pipeline()
    for f in ['i18n/locales/en.json', 'i18n/locales/pt-BR.json']:
        json.loads((ROOT / f).read_text(encoding='utf-8'))
    print('JSON valid')
