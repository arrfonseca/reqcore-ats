/**
 * Email localization — server-safe message catalogs for transactional emails
 * and built-in interview system templates.
 *
 * Adding a language:
 * 1. Add the locale code to SUPPORTED_EMAIL_LOCALES
 * 2. Add a messages file entry in EMAIL_MESSAGES
 * 3. Prefer org defaultLanguage / Accept-Language / explicit locale when sending
 */

export const DEFAULT_EMAIL_LOCALE = 'pt-BR' as const
export const SUPPORTED_EMAIL_LOCALES = ['pt-BR', 'en'] as const
export type EmailLocale = (typeof SUPPORTED_EMAIL_LOCALES)[number]

export interface SystemTemplate {
  id: string
  name: string
  description: string
  subject: string
  body: string
}

export interface EmailMessages {
  common: {
    productTagline: string
    sentByFooter: string
    toBeConfirmed: string
  }
  verification: {
    subject: string
    title: string
    body: string
    cta: string
    ignore: string
    textTitle: string
    textBody: string
  }
  passwordReset: {
    subject: string
    title: string
    body: string
    cta: string
    ignore: string
    textTitle: string
    textBody: string
  }
  invitation: {
    subject: string
    htmlTitle: string
    heading: string
    body: string
    bodyCta: string
    cta: string
    expires: string
    textTitle: string
    textBody: string
    textAccept: string
    textExpires: string
    textIgnore: string
  }
  interviewInvite: {
    canYouMakeIt: string
    accept: string
    maybe: string
    decline: string
    sentByVia: string
    respondHeading: string
    textAccept: string
    textMaybe: string
    textDecline: string
  }
  interviewerNotify: {
    subject: string
    title: string
    intro: string
    candidateLabel: string
    jobLabel: string
    dateLabel: string
    timeLabel: string
    durationLabel: string
    durationValue: string
    typeLabel: string
    locationLabel: string
    calendarHint: string
    sentByVia: string
  }
  interviewTypes: Record<string, string>
  systemTemplates: SystemTemplate[]
}

function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    return key in vars ? String(vars[key]) : match
  })
}

export function resolveEmailLocale(input?: string | null): EmailLocale {
  if (!input) return DEFAULT_EMAIL_LOCALE
  const normalized = input.trim()
  if ((SUPPORTED_EMAIL_LOCALES as readonly string[]).includes(normalized)) {
    return normalized as EmailLocale
  }
  const lower = normalized.toLowerCase()
  if (lower.startsWith('pt')) return 'pt-BR'
  if (lower.startsWith('en')) return 'en'
  return DEFAULT_EMAIL_LOCALE
}

export function getEmailMessages(locale?: string | null): EmailMessages {
  const resolved = resolveEmailLocale(locale)
  return EMAIL_MESSAGES[resolved] ?? EMAIL_MESSAGES[DEFAULT_EMAIL_LOCALE]
}

export function te(locale: string | null | undefined, path: string, vars?: Record<string, string | number>): string {
  const messages = getEmailMessages(locale) as unknown as Record<string, unknown>
  const parts = path.split('.')
  let current: unknown = messages
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return path
    current = (current as Record<string, unknown>)[part]
  }
  if (typeof current !== 'string') return path
  return vars ? interpolate(current, vars) : current
}

export function getSystemTemplates(locale?: string | null): SystemTemplate[] {
  return getEmailMessages(locale).systemTemplates
}

const EN: EmailMessages = {
  common: {
    productTagline: 'Recruitment and selection system',
    sentByFooter: 'Sent by {brand}',
    toBeConfirmed: 'To be confirmed',
  },
  verification: {
    subject: 'Verify your email address — {brand}',
    title: 'Verify your email',
    body: 'Click the button below to verify your email address and activate your account.',
    cta: 'Verify Email',
    ignore: "If you didn't create an account, you can safely ignore this email.",
    textTitle: 'Verify your email address',
    textBody: 'Click the link below to verify your email and activate your {brand} account:',
  },
  passwordReset: {
    subject: 'Reset your password — {brand}',
    title: 'Reset your password',
    body: 'Click the button below to reset your password. This link will expire shortly.',
    cta: 'Reset Password',
    ignore: "If you didn't request a password reset, you can safely ignore this email.",
    textTitle: 'Reset your password',
    textBody: 'Click the link below to reset your {brand} password:',
  },
  invitation: {
    subject: "You're invited to join {organizationName} on {brand}",
    htmlTitle: "You're invited to {organizationName}",
    heading: "You've been invited",
    body: '<strong>{inviterName}</strong> has invited you to join <strong>{organizationName}</strong> as a <strong>{role}</strong>.',
    bodyCta: "Click the button below to accept the invitation. You'll need to sign in or create an account first.",
    cta: 'Accept Invitation',
    expires: "This invitation expires in 48 hours. If you didn't expect this email, you can safely ignore it.",
    textTitle: "You've been invited to join {organizationName}",
    textBody: '{inviterName} has invited you to join {organizationName} as a {role}.',
    textAccept: 'Accept the invitation by visiting the link below:',
    textExpires: 'This invitation expires in 48 hours.',
    textIgnore: "If you didn't expect this email, you can safely ignore it.",
  },
  interviewInvite: {
    canYouMakeIt: 'Can you make it?',
    accept: 'Accept',
    maybe: 'Maybe',
    decline: 'Decline',
    sentByVia: 'Sent by {organizationName} via {brand}',
    respondHeading: 'Respond to this invitation:',
    textAccept: 'Accept',
    textMaybe: 'Maybe',
    textDecline: 'Decline',
  },
  interviewerNotify: {
    subject: 'Interview scheduled: {candidateName} — {jobTitle}',
    title: 'You are scheduled to interview',
    intro: 'You have been added as an interviewer for the following interview at {organizationName}.',
    candidateLabel: 'Candidate',
    jobLabel: 'Position',
    dateLabel: 'Date',
    timeLabel: 'Time',
    durationLabel: 'Duration',
    durationValue: '{n} minutes',
    typeLabel: 'Type',
    locationLabel: 'Location / link',
    calendarHint: 'A calendar invite (.ics) is attached so you can add this to your calendar.',
    sentByVia: 'Sent by {organizationName} via {brand}',
  },
  interviewTypes: {
    video: 'Video Call',
    phone: 'Phone Call',
    in_person: 'In Person',
    technical: 'Technical Interview',
    panel: 'Panel Interview',
    take_home: 'Take-Home Assignment',
  },
  systemTemplates: [
    {
      id: 'system-standard',
      name: 'Standard Interview Invitation',
      description: 'A professional and formal invitation suitable for most interview types.',
      subject: 'Interview Invitation: {{jobTitle}} at {{organizationName}}',
      body: `Dear {{candidateName}},

We are pleased to invite you to an interview for the {{jobTitle}} position at {{organizationName}}.

Interview Details:
- Date: {{interviewDate}}
- Time: {{interviewTime}}
- Duration: {{interviewDuration}} minutes
- Type: {{interviewType}}
- Location: {{interviewLocation}}

Interviewers: {{interviewers}}

Please confirm your availability by replying to this email. If you need to reschedule, let us know as soon as possible.

We look forward to speaking with you!

Best regards,
{{organizationName}}`,
    },
    {
      id: 'system-friendly',
      name: 'Friendly & Casual',
      description: 'A warm, conversational tone that puts candidates at ease.',
      subject: "Let's chat! Interview for {{jobTitle}}",
      body: `Hi {{candidateFirstName}},

Great news — we'd love to meet you for the {{jobTitle}} role at {{organizationName}}!

Here are the details:
- When: {{interviewDate}} at {{interviewTime}} ({{interviewDuration}} min)
- How: {{interviewType}}
- Where: {{interviewLocation}}

You'll be speaking with: {{interviewers}}

If this time doesn't work for you, just let us know and we'll find something that does.

Looking forward to it!

The {{organizationName}} Team`,
    },
    {
      id: 'system-technical',
      name: 'Technical Interview',
      description: 'Tailored for technical interviews with preparation tips for candidates.',
      subject: 'Technical Interview: {{jobTitle}} — {{organizationName}}',
      body: `Dear {{candidateName}},

Thank you for your interest in the {{jobTitle}} position at {{organizationName}}. We'd like to invite you to a technical interview.

Interview Details:
- Title: {{interviewTitle}}
- Date: {{interviewDate}}
- Time: {{interviewTime}}
- Duration: {{interviewDuration}} minutes
- Format: {{interviewType}}
- Location: {{interviewLocation}}

Your interviewer(s): {{interviewers}}

To help you prepare:
- Be ready to discuss your technical experience and problem-solving approach
- You may be asked to write or review code during the session
- Feel free to ask questions about our tech stack and development practices

Please confirm your attendance by replying to this email.

Best regards,
{{organizationName}}`,
    },
  ],
}

const PT_BR: EmailMessages = {
  common: {
    productTagline: 'Sistema de recrutamento e seleção',
    sentByFooter: 'Enviado por {brand}',
    toBeConfirmed: 'A confirmar',
  },
  verification: {
    subject: 'Verifique seu e-mail — {brand}',
    title: 'Verifique seu e-mail',
    body: 'Clique no botão abaixo para verificar seu endereço de e-mail e ativar sua conta.',
    cta: 'Verificar e-mail',
    ignore: 'Se você não criou uma conta, pode ignorar este e-mail com segurança.',
    textTitle: 'Verifique seu endereço de e-mail',
    textBody: 'Clique no link abaixo para verificar seu e-mail e ativar sua conta no {brand}:',
  },
  passwordReset: {
    subject: 'Redefina sua senha — {brand}',
    title: 'Redefina sua senha',
    body: 'Clique no botão abaixo para redefinir sua senha. Este link expira em breve.',
    cta: 'Redefinir senha',
    ignore: 'Se você não solicitou a redefinição de senha, pode ignorar este e-mail com segurança.',
    textTitle: 'Redefina sua senha',
    textBody: 'Clique no link abaixo para redefinir sua senha do {brand}:',
  },
  invitation: {
    subject: 'Você foi convidado(a) para {organizationName} no {brand}',
    htmlTitle: 'Você foi convidado(a) para {organizationName}',
    heading: 'Você recebeu um convite',
    body: '<strong>{inviterName}</strong> convidou você para entrar em <strong>{organizationName}</strong> como <strong>{role}</strong>.',
    bodyCta: 'Clique no botão abaixo para aceitar o convite. Você precisará entrar ou criar uma conta primeiro.',
    cta: 'Aceitar convite',
    expires: 'Este convite expira em 48 horas. Se você não esperava este e-mail, pode ignorá-lo com segurança.',
    textTitle: 'Você foi convidado(a) para {organizationName}',
    textBody: '{inviterName} convidou você para entrar em {organizationName} como {role}.',
    textAccept: 'Aceite o convite acessando o link abaixo:',
    textExpires: 'Este convite expira em 48 horas.',
    textIgnore: 'Se você não esperava este e-mail, pode ignorá-lo com segurança.',
  },
  interviewInvite: {
    canYouMakeIt: 'Você pode participar?',
    accept: 'Aceitar',
    maybe: 'Talvez',
    decline: 'Recusar',
    sentByVia: 'Enviado por {organizationName} via {brand}',
    respondHeading: 'Responda a este convite:',
    textAccept: 'Aceitar',
    textMaybe: 'Talvez',
    textDecline: 'Recusar',
  },
  interviewerNotify: {
    subject: 'Entrevista agendada: {candidateName} — {jobTitle}',
    title: 'Você está agendado(a) para entrevistar',
    intro: 'Você foi adicionado(a) como entrevistador(a) na seguinte entrevista em {organizationName}.',
    candidateLabel: 'Candidato(a)',
    jobLabel: 'Vaga',
    dateLabel: 'Data',
    timeLabel: 'Horário',
    durationLabel: 'Duração',
    durationValue: '{n} minutos',
    typeLabel: 'Tipo',
    locationLabel: 'Local / link',
    calendarHint: 'Um convite de calendário (.ics) está anexado para você adicionar à sua agenda.',
    sentByVia: 'Enviado por {organizationName} via {brand}',
  },
  interviewTypes: {
    video: 'Videochamada',
    phone: 'Telefone',
    in_person: 'Presencial',
    technical: 'Entrevista técnica',
    panel: 'Painel',
    take_home: 'Teste prático',
  },
  systemTemplates: [
    {
      id: 'system-standard',
      name: 'Convite padrão de entrevista',
      description: 'Um convite profissional e formal adequado à maioria dos tipos de entrevista.',
      subject: 'Convite para entrevista: {{jobTitle}} em {{organizationName}}',
      body: `Prezado(a) {{candidateName}},

Temos o prazer de convidá-lo(a) para uma entrevista na vaga de {{jobTitle}} em {{organizationName}}.

Detalhes da entrevista:
- Data: {{interviewDate}}
- Horário: {{interviewTime}}
- Duração: {{interviewDuration}} minutos
- Tipo: {{interviewType}}
- Local: {{interviewLocation}}

Entrevistadores: {{interviewers}}

Por favor, confirme sua disponibilidade respondendo a este e-mail. Se precisar remarcar, avise-nos o quanto antes.

Esperamos conversar com você!

Atenciosamente,
{{organizationName}}`,
    },
    {
      id: 'system-friendly',
      name: 'Amigável e informal',
      description: 'Um tom caloroso e conversacional que deixa o candidato mais à vontade.',
      subject: 'Vamos conversar! Entrevista para {{jobTitle}}',
      body: `Olá {{candidateFirstName}},

Boa notícia — gostaríamos de conhecê-lo(a) para a vaga de {{jobTitle}} em {{organizationName}}!

Aqui estão os detalhes:
- Quando: {{interviewDate}} às {{interviewTime}} ({{interviewDuration}} min)
- Como: {{interviewType}}
- Onde: {{interviewLocation}}

Você conversará com: {{interviewers}}

Se esse horário não funcionar para você, é só avisar que encontramos outra opção.

Estamos no aguardo!

Equipe {{organizationName}}`,
    },
    {
      id: 'system-technical',
      name: 'Entrevista técnica',
      description: 'Pensado para entrevistas técnicas, com dicas de preparação para o candidato.',
      subject: 'Entrevista técnica: {{jobTitle}} — {{organizationName}}',
      body: `Prezado(a) {{candidateName}},

Obrigado pelo interesse na vaga de {{jobTitle}} em {{organizationName}}. Gostaríamos de convidá-lo(a) para uma entrevista técnica.

Detalhes da entrevista:
- Título: {{interviewTitle}}
- Data: {{interviewDate}}
- Horário: {{interviewTime}}
- Duração: {{interviewDuration}} minutos
- Formato: {{interviewType}}
- Local: {{interviewLocation}}

Seu(s) entrevistador(es): {{interviewers}}

Para se preparar:
- Esteja pronto(a) para falar sobre sua experiência técnica e abordagem de resolução de problemas
- Você pode ser solicitado(a) a escrever ou revisar código durante a sessão
- Sinta-se à vontade para perguntar sobre nosso stack e práticas de desenvolvimento

Por favor, confirme sua presença respondendo a este e-mail.

Atenciosamente,
{{organizationName}}`,
    },
  ],
}

export const EMAIL_MESSAGES: Record<EmailLocale, EmailMessages> = {
  en: EN,
  'pt-BR': PT_BR,
}

/** Prefer getSystemTemplates(locale) — sync default uses DEFAULT_EMAIL_LOCALE */
export const SYSTEM_TEMPLATES: SystemTemplate[] = getSystemTemplates(DEFAULT_EMAIL_LOCALE)
