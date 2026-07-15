import { Resend } from 'resend'
import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'
import { APP_BRAND_NAME } from '~~/shared/brand'
import {
  DEFAULT_EMAIL_LOCALE,
  getEmailMessages,
  resolveEmailLocale,
  type EmailLocale,
} from '~~/shared/emails'
import { generateInterviewICS } from './ical'

// ─── Resend client ────────────────────────────────────────────────────────────

let _resend: Resend | undefined

function getResendClient(): Resend | null {
  const apiKey = env.RESEND_API_KEY
  if (!apiKey) return null
  if (!_resend) _resend = new Resend(apiKey)
  return _resend
}

// ─── SMTP transporter ─────────────────────────────────────────────────────────

let _smtp: Transporter | undefined

function getSmtpTransporter(): Transporter | null {
  if (!env.SMTP_HOST) return null
  if (!_smtp) {
    _smtp = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      ...(env.SMTP_USER && env.SMTP_PASS
        ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASS } }
        : {}),
    })
  }
  return _smtp
}

/**
 * Returns the configured sender address for the active email provider.
 * SMTP uses SMTP_FROM; Resend uses RESEND_FROM_EMAIL.
 * Exported for use in routes that need the organizer address (e.g. ICS generation).
 */
export function getFromEmail(): string {
  return env.SMTP_HOST ? env.SMTP_FROM : env.RESEND_FROM_EMAIL
}

// ─── Internal unified send helper ────────────────────────────────────────────

interface EmailMessage {
  to: string
  subject: string
  html: string
  text: string
  /** Optional .ics binary attachment (calendar invite). */
  icsAttachment?: Buffer
  /** Resend-only metadata tags — silently ignored by SMTP. */
  resendTags?: Array<{ name: string; value: string }>
  /** Message logged to console when no provider is configured (dev fallback). */
  logFallback: string
  /** logError category used on transport failure. */
  errorCategory: string
}

/**
 * Route an outbound email through SMTP (preferred) → Resend → console fallback.
 * Priority: SMTP_HOST set → use SMTP. Else RESEND_API_KEY set → use Resend.
 * Otherwise logs the fallback message and returns (no error thrown).
 * Throws on transport errors so callers can decide whether to swallow them.
 */
async function sendEmail(msg: EmailMessage): Promise<void> {
  const from = getFromEmail()

  // 1. SMTP — takes priority when SMTP_HOST is configured
  const smtp = getSmtpTransporter()
  if (smtp) {
    try {
      await smtp.sendMail({
        from,
        to: msg.to,
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
        ...(msg.icsAttachment
          ? { attachments: [{ filename: 'interview.ics', content: msg.icsAttachment, contentType: 'text/calendar; method=REQUEST' }] }
          : {}),
      })
    }
    catch (err) {
      logError(msg.errorCategory, {
        provider: 'smtp',
        error_message: err instanceof Error ? err.message : String(err),
      })
      throw err
    }
    return
  }

  // 2. Resend
  const resend = getResendClient()
  if (resend) {
    const resendAttachments = msg.icsAttachment
      ? [{ filename: 'interview.ics', content: msg.icsAttachment.toString('base64'), content_type: 'text/calendar; method=REQUEST' }]
      : undefined

    const { error } = await resend.emails.send({
      from,
      to: [msg.to],
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
      ...(resendAttachments ? { attachments: resendAttachments } : {}),
      ...(msg.resendTags ? { tags: msg.resendTags } : {}),
    })

    if (error) {
      logError(msg.errorCategory, {
        provider: 'resend',
        error_message: error.message,
      })
      throw new Error(error.message)
    }
    return
  }

  // 3. No provider configured — dev/test fallback
  console.info(`[Reqcore] ${msg.logFallback}`)
}

// ─── Public send functions ────────────────────────────────────────────────────

/**
 * Send an email verification link.
 * Called by Better Auth when requireEmailVerification is enabled.
 * Not awaited by the caller (fire-and-forget) to prevent timing attacks.
 */
export async function sendVerificationEmail(data: {
  user: { email: string; name: string }
  url: string
  token: string
  locale?: string | null
}): Promise<void> {
  try {
    const locale = resolveEmailLocale(data.locale)
    await sendEmail({
      to: data.user.email,
      subject: getEmailMessages(locale).verification.subject.replace('{brand}', APP_BRAND_NAME),
      html: buildVerificationHtml({ url: data.url, locale }),
      text: buildVerificationText({ url: data.url, locale }),
      resendTags: [{ name: 'category', value: 'verification' }],
      logFallback: 'Verification email suppressed — no email provider configured (set SMTP_HOST or RESEND_API_KEY)',
      errorCategory: 'email.verification_send_failed',
    })
  }
  catch {
    // fire-and-forget — error already logged inside sendEmail
  }
}

/**
 * Send a password reset link.
 * Called by Better Auth when sendResetPassword is configured.
 * Not awaited by the caller (fire-and-forget) to prevent timing attacks.
 */
export async function sendPasswordResetEmail(data: {
  user: { email: string; name: string }
  url: string
  token: string
  locale?: string | null
}): Promise<void> {
  try {
    const locale = resolveEmailLocale(data.locale)
    await sendEmail({
      to: data.user.email,
      subject: getEmailMessages(locale).passwordReset.subject.replace('{brand}', APP_BRAND_NAME),
      html: buildPasswordResetHtml({ url: data.url, locale }),
      text: buildPasswordResetText({ url: data.url, locale }),
      resendTags: [{ name: 'category', value: 'password-reset' }],
      logFallback: 'Password reset email suppressed — no email provider configured (set SMTP_HOST or RESEND_API_KEY)',
      errorCategory: 'email.password_reset_send_failed',
    })
  }
  catch {
    // fire-and-forget — error already logged inside sendEmail
  }
}

/**
 * Send an organization invitation email.
 * Falls back to console.info when no email provider is configured.
 */
export async function sendOrgInvitationEmail(data: {
  id: string
  email: string
  inviter: { user: { name: string; email: string } }
  organization: { name: string; id?: string }
  role: string
}, inviteLink: string, locale?: string | null): Promise<void> {
  const resolvedLocale = resolveEmailLocale(locale)
  const m = getEmailMessages(resolvedLocale)
  const subject = m.invitation.subject
    .replace('{organizationName}', data.organization.name)
    .replace('{brand}', APP_BRAND_NAME)

  await sendEmail({
    to: data.email,
    subject,
    html: buildInvitationHtml({
      inviteeName: data.email,
      inviterName: data.inviter.user.name,
      inviterEmail: data.inviter.user.email,
      organizationName: data.organization.name,
      role: data.role,
      inviteLink,
      locale: resolvedLocale,
    }),
    text: buildInvitationText({
      inviterName: data.inviter.user.name,
      organizationName: data.organization.name,
      role: data.role,
      inviteLink,
      locale: resolvedLocale,
    }),
    resendTags: [
      { name: 'category', value: 'invitation' },
      { name: 'organization', value: data.organization.name.slice(0, 256).replace(/[^a-zA-Z0-9_-]/g, '_') },
    ],
    logFallback:
      `Invitation email → ${data.email} | ` +
      `Invited by ${data.inviter.user.name} (${data.inviter.user.email}) | ` +
      `Org: ${data.organization.name} | ` +
      `Role: ${data.role} | ` +
      `Link: ${inviteLink}`,
    errorCategory: 'email.invitation_send_failed',
  })
}

// ─────────────────────────────────────────────
// Email templates
// ─────────────────────────────────────────────

function buildInvitationHtml(params: {
  inviteeName: string
  inviterName: string
  inviterEmail: string
  organizationName: string
  role: string
  inviteLink: string
  locale: EmailLocale
}): string {
  const { inviterName, organizationName, role, inviteLink, locale } = params
  const m = getEmailMessages(locale)
  const title = m.invitation.htmlTitle.replace('{organizationName}', organizationName)
  const body = m.invitation.body
    .replace('{inviterName}', escapeHtml(inviterName))
    .replace('{organizationName}', escapeHtml(organizationName))
    .replace('{role}', escapeHtml(role))

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7;">
          <!-- Header -->
          <tr>
            <td style="padding:32px 32px 24px;text-align:center;border-bottom:1px solid #f4f4f5;">
              <h1 style="margin:0;font-size:20px;font-weight:600;color:#09090b;">${escapeHtml(APP_BRAND_NAME)}</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 16px;font-size:18px;font-weight:600;color:#09090b;">${escapeHtml(m.invitation.heading)}</h2>
              <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#3f3f46;">
                ${body}
              </p>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#3f3f46;">
                ${escapeHtml(m.invitation.bodyCta)}
              </p>
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${escapeHtml(inviteLink)}" target="_blank" rel="noopener noreferrer"
                       style="display:inline-block;padding:12px 32px;background-color:#2563eb;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;border-radius:8px;line-height:1;">
                      ${escapeHtml(m.invitation.cta)}
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:#71717a;">
                ${escapeHtml(m.invitation.expires)}
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px;text-align:center;border-top:1px solid #f4f4f5;background-color:#fafafa;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;">
                ${escapeHtml(m.common.sentByFooter.replace('{brand}', APP_BRAND_NAME))} &mdash; ${escapeHtml(m.common.productTagline)}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function buildInvitationText(params: {
  inviterName: string
  organizationName: string
  role: string
  inviteLink: string
  locale: EmailLocale
}): string {
  const m = getEmailMessages(params.locale)
  return [
    m.invitation.textTitle.replace('{organizationName}', params.organizationName),
    '',
    m.invitation.textBody
      .replace('{inviterName}', params.inviterName)
      .replace('{organizationName}', params.organizationName)
      .replace('{role}', params.role),
    '',
    m.invitation.textAccept,
    params.inviteLink,
    '',
    m.invitation.textExpires,
    m.invitation.textIgnore,
    '',
    `— ${APP_BRAND_NAME}`,
  ].join('\n')
}

/**
 * Escape HTML special characters to prevent XSS in email templates.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// ─────────────────────────────────────────────
// Email verification & password reset templates
// ─────────────────────────────────────────────

function buildVerificationHtml(params: { url: string, locale: EmailLocale }): string {
  const m = getEmailMessages(params.locale)
  return `<!DOCTYPE html>
<html lang="${params.locale}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(m.verification.title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7;">
          <tr>
            <td style="padding:32px 32px 24px;text-align:center;border-bottom:1px solid #f4f4f5;">
              <h1 style="margin:0;font-size:20px;font-weight:600;color:#09090b;">${escapeHtml(APP_BRAND_NAME)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 16px;font-size:18px;font-weight:600;color:#09090b;">${escapeHtml(m.verification.title)}</h2>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#3f3f46;">
                ${escapeHtml(m.verification.body)}
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${escapeHtml(params.url)}" target="_blank" rel="noopener noreferrer"
                       style="display:inline-block;padding:12px 32px;background-color:#2563eb;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;border-radius:8px;line-height:1;">
                      ${escapeHtml(m.verification.cta)}
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:#71717a;">
                ${escapeHtml(m.verification.ignore)}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;text-align:center;border-top:1px solid #f4f4f5;background-color:#fafafa;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;">${escapeHtml(m.common.sentByFooter.replace('{brand}', APP_BRAND_NAME))} &mdash; ${escapeHtml(m.common.productTagline)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function buildVerificationText(params: { url: string, locale: EmailLocale }): string {
  const m = getEmailMessages(params.locale)
  return [
    m.verification.textTitle,
    '',
    m.verification.textBody.replace('{brand}', APP_BRAND_NAME),
    params.url,
    '',
    m.verification.ignore,
    '',
    `— ${APP_BRAND_NAME}`,
  ].join('\n')
}

function buildPasswordResetHtml(params: { url: string, locale: EmailLocale }): string {
  const m = getEmailMessages(params.locale)
  return `<!DOCTYPE html>
<html lang="${params.locale}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(m.passwordReset.title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7;">
          <tr>
            <td style="padding:32px 32px 24px;text-align:center;border-bottom:1px solid #f4f4f5;">
              <h1 style="margin:0;font-size:20px;font-weight:600;color:#09090b;">${escapeHtml(APP_BRAND_NAME)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 16px;font-size:18px;font-weight:600;color:#09090b;">${escapeHtml(m.passwordReset.title)}</h2>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#3f3f46;">
                ${escapeHtml(m.passwordReset.body)}
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${escapeHtml(params.url)}" target="_blank" rel="noopener noreferrer"
                       style="display:inline-block;padding:12px 32px;background-color:#2563eb;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;border-radius:8px;line-height:1;">
                      ${escapeHtml(m.passwordReset.cta)}
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:#71717a;">
                ${escapeHtml(m.passwordReset.ignore)}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;text-align:center;border-top:1px solid #f4f4f5;background-color:#fafafa;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;">${escapeHtml(m.common.sentByFooter.replace('{brand}', APP_BRAND_NAME))} &mdash; ${escapeHtml(m.common.productTagline)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function buildPasswordResetText(params: { url: string, locale: EmailLocale }): string {
  const m = getEmailMessages(params.locale)
  return [
    m.passwordReset.textTitle,
    '',
    m.passwordReset.textBody.replace('{brand}', APP_BRAND_NAME),
    params.url,
    '',
    m.passwordReset.ignore,
    '',
    `— ${APP_BRAND_NAME}`,
  ].join('\n')
}

// ─────────────────────────────────────────────
// Interview invitation emails
// ─────────────────────────────────────────────

export interface InterviewEmailData {
  candidateName: string
  candidateFirstName: string
  candidateLastName: string
  candidateEmail: string
  jobTitle: string
  interviewTitle: string
  interviewDate: string
  interviewTime: string
  interviewDuration: number
  interviewType: string
  interviewLocation: string | null
  interviewers: string[] | null
  organizationName: string
  /** Response URLs for accept/decline/tentative (omitted = no response links) */
  responseUrls?: {
    accepted: string
    declined: string
    tentative: string
  }
  /** iCalendar (.ics) file content to attach */
  icsContent?: string
}

/**
 * Replace {{variable}} placeholders in a template string with actual values.
 * Only replaces known variables to prevent injection of unexpected content.
 */
export function renderTemplate(
  template: string,
  data: InterviewEmailData,
  locale: string | null = DEFAULT_EMAIL_LOCALE,
): string {
  const m = getEmailMessages(locale)
  const toBeConfirmed = m.common.toBeConfirmed
  const variables: Record<string, string> = {
    candidateName: data.candidateName,
    candidateFirstName: data.candidateFirstName,
    candidateLastName: data.candidateLastName,
    candidateEmail: data.candidateEmail,
    jobTitle: data.jobTitle,
    interviewTitle: data.interviewTitle,
    interviewDate: data.interviewDate,
    interviewTime: data.interviewTime,
    interviewDuration: String(data.interviewDuration),
    interviewType: data.interviewType,
    interviewLocation: data.interviewLocation ?? toBeConfirmed,
    interviewers: data.interviewers?.join(', ') ?? toBeConfirmed,
    organizationName: data.organizationName,
  }

  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    return key in variables ? variables[key]! : match
  })
}

/**
 * Send an interview invitation email to a candidate.
 * Includes an .ics calendar attachment and response links when provided.
 * Falls back to console.info when no email provider is configured.
 */
export async function sendInterviewInvitationEmail(params: {
  subject: string
  body: string
  data: InterviewEmailData
  locale?: string | null
}): Promise<void> {
  const locale = resolveEmailLocale(params.locale)
  const renderedSubject = renderTemplate(params.subject, params.data, locale)
  const renderedBody = renderTemplate(params.body, params.data, locale)

  const icsBuffer = params.data.icsContent ? Buffer.from(params.data.icsContent) : undefined

  await sendEmail({
    to: params.data.candidateEmail,
    subject: renderedSubject,
    html: buildInterviewInvitationHtml(renderedSubject, renderedBody, params.data, locale),
    text: buildInterviewInvitationText(renderedBody, params.data.responseUrls, locale),
    icsAttachment: icsBuffer,
    resendTags: [
      { name: 'category', value: 'interview-invitation' },
      { name: 'interview', value: params.data.interviewTitle.slice(0, 256).replace(/[^a-zA-Z0-9_-]/g, '_') },
    ],
    logFallback:
      `Interview invitation email → ${params.data.candidateEmail} | ` +
      `Subject: ${renderedSubject} | ` +
      `Interview: ${params.data.interviewTitle} | ` +
      `Date: ${params.data.interviewDate} at ${params.data.interviewTime}` +
      (params.data.icsContent ? ' | .ics attached' : '') +
      (params.data.responseUrls ? ' | response links included' : ''),
    errorCategory: 'email.interview_invitation_send_failed',
  })
}

function buildInterviewInvitationHtml(
  subject: string,
  bodyText: string,
  data: InterviewEmailData,
  locale: EmailLocale,
): string {
  const m = getEmailMessages(locale)
  const bodyHtml = escapeHtml(bodyText).replace(/\n/g, '<br />')

  // Build response buttons HTML when URLs are available
  const responseButtonsHtml = data.responseUrls
    ? `
          <!-- Response Buttons -->
          <tr>
            <td style="padding:0 32px 32px;">
              <div style="border-top:1px solid #e4e4e7;padding-top:24px;">
                <p style="margin:0 0 16px;font-size:14px;font-weight:600;color:#09090b;text-align:center;">
                  ${escapeHtml(m.interviewInvite.canYouMakeIt)}
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center">
                      <table role="presentation" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding:0 4px;">
                            <a href="${escapeHtml(data.responseUrls.accepted)}" target="_blank" rel="noopener noreferrer"
                               style="display:inline-block;padding:10px 20px;background-color:#16a34a;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;border-radius:6px;line-height:1;">
                              &#10003; ${escapeHtml(m.interviewInvite.accept)}
                            </a>
                          </td>
                          <td style="padding:0 4px;">
                            <a href="${escapeHtml(data.responseUrls.tentative)}" target="_blank" rel="noopener noreferrer"
                               style="display:inline-block;padding:10px 20px;background-color:#ca8a04;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;border-radius:6px;line-height:1;">
                              &#63; ${escapeHtml(m.interviewInvite.maybe)}
                            </a>
                          </td>
                          <td style="padding:0 4px;">
                            <a href="${escapeHtml(data.responseUrls.declined)}" target="_blank" rel="noopener noreferrer"
                               style="display:inline-block;padding:10px 20px;background-color:#dc2626;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;border-radius:6px;line-height:1;">
                              &#10005; ${escapeHtml(m.interviewInvite.decline)}
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>`
    : ''

  const footer = m.interviewInvite.sentByVia
    .replace('{organizationName}', data.organizationName)
    .replace('{brand}', APP_BRAND_NAME)

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7;">
          <!-- Header -->
          <tr>
            <td style="padding:32px 32px 24px;text-align:center;border-bottom:1px solid #f4f4f5;">
              <h1 style="margin:0;font-size:20px;font-weight:600;color:#09090b;">${escapeHtml(data.organizationName)}</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <div style="font-size:14px;line-height:1.7;color:#3f3f46;">
                ${bodyHtml}
              </div>
            </td>
          </tr>${responseButtonsHtml}
          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px;text-align:center;border-top:1px solid #f4f4f5;background-color:#fafafa;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;">
                ${escapeHtml(footer)}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

/**
 * Build plain-text email body with response links appended.
 */
function buildInterviewInvitationText(
  renderedBody: string,
  responseUrls?: InterviewEmailData['responseUrls'],
  locale: EmailLocale = DEFAULT_EMAIL_LOCALE,
): string {
  if (!responseUrls) return renderedBody
  const m = getEmailMessages(locale)

  return [
    renderedBody,
    '',
    '─────────────────────────────',
    m.interviewInvite.respondHeading,
    '',
    `✓ ${m.interviewInvite.textAccept}: ${responseUrls.accepted}`,
    `? ${m.interviewInvite.textMaybe}:  ${responseUrls.tentative}`,
    `✗ ${m.interviewInvite.textDecline}: ${responseUrls.declined}`,
    '',
    '─────────────────────────────',
  ].join('\n')
}

const INTERVIEWER_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Extract unique valid email addresses from interviewer form values. */
export function extractInterviewerEmails(interviewers: string[] | null | undefined): string[] {
  if (!interviewers?.length) return []
  const seen = new Set<string>()
  const result: string[] = []
  for (const value of interviewers) {
    const trimmed = value.trim()
    if (!INTERVIEWER_EMAIL_RE.test(trimmed)) continue
    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(trimmed)
  }
  return result
}

export interface InterviewerNotificationParams {
  interviewId: string
  interviewerEmails: string[]
  candidateName: string
  candidateEmail: string
  jobTitle: string
  interviewTitle: string
  scheduledAt: Date
  durationMinutes: number
  interviewType: string
  location: string | null
  organizationName: string
  timezone?: string | null
  locale?: string | null
}

/**
 * Notify interviewers they are scheduled for an interview.
 * Sends one email (with .ics) per interviewer address. Failures are logged
 * per recipient and do not throw — scheduling should not fail because of this.
 */
export async function notifyInterviewers(params: InterviewerNotificationParams): Promise<{ sent: string[], failed: string[] }> {
  const emails = extractInterviewerEmails(params.interviewerEmails)
  if (emails.length === 0) return { sent: [], failed: [] }

  const locale = resolveEmailLocale(params.locale)
  const m = getEmailMessages(locale)
  const tz = params.timezone ?? 'UTC'
  const fromEmail = getFromEmail().replace(/^.*</, '').replace(/>$/, '')

  const interviewDate = params.scheduledAt.toLocaleDateString(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: tz,
  })
  const interviewTime = params.scheduledAt.toLocaleTimeString(locale, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: locale.startsWith('en'),
    timeZone: tz,
  })
  const interviewTypeLabel = m.interviewTypes[params.interviewType] ?? params.interviewType
  const durationLabel = m.interviewerNotify.durationValue.replace('{n}', String(params.durationMinutes))
  const locationLabel = params.location?.trim() || m.common.toBeConfirmed

  const subject = m.interviewerNotify.subject
    .replace('{candidateName}', params.candidateName)
    .replace('{jobTitle}', params.jobTitle)

  const intro = m.interviewerNotify.intro.replace('{organizationName}', params.organizationName)
  const footer = m.interviewerNotify.sentByVia
    .replace('{organizationName}', params.organizationName)
    .replace('{brand}', APP_BRAND_NAME)

  const sent: string[] = []
  const failed: string[] = []

  for (const to of emails) {
    const icsContent = generateInterviewICS({
      interviewId: params.interviewId,
      summary: subject,
      description: [
        `${m.interviewerNotify.title}`,
        '',
        `${m.interviewerNotify.candidateLabel}: ${params.candidateName} (${params.candidateEmail})`,
        `${m.interviewerNotify.jobLabel}: ${params.jobTitle}`,
        `${m.interviewerNotify.dateLabel}: ${interviewDate}`,
        `${m.interviewerNotify.timeLabel}: ${interviewTime}`,
        `${m.interviewerNotify.durationLabel}: ${durationLabel}`,
        `${m.interviewerNotify.typeLabel}: ${interviewTypeLabel}`,
        `${m.interviewerNotify.locationLabel}: ${locationLabel}`,
      ].join('\n'),
      startTime: params.scheduledAt,
      durationMinutes: params.durationMinutes,
      location: params.location,
      organizerName: params.organizationName,
      organizerEmail: fromEmail,
      attendeeEmail: to,
      attendeeName: to,
    })

    const text = [
      m.interviewerNotify.title,
      '',
      intro,
      '',
      `${m.interviewerNotify.candidateLabel}: ${params.candidateName} (${params.candidateEmail})`,
      `${m.interviewerNotify.jobLabel}: ${params.jobTitle}`,
      `${m.interviewerNotify.dateLabel}: ${interviewDate}`,
      `${m.interviewerNotify.timeLabel}: ${interviewTime}`,
      `${m.interviewerNotify.durationLabel}: ${durationLabel}`,
      `${m.interviewerNotify.typeLabel}: ${interviewTypeLabel}`,
      `${m.interviewerNotify.locationLabel}: ${locationLabel}`,
      '',
      m.interviewerNotify.calendarHint,
    ].join('\n')

    const html = buildInterviewerNotifyHtml({
      locale,
      subject,
      title: m.interviewerNotify.title,
      intro,
      rows: [
        [m.interviewerNotify.candidateLabel, `${params.candidateName} (${params.candidateEmail})`],
        [m.interviewerNotify.jobLabel, params.jobTitle],
        [m.interviewerNotify.dateLabel, interviewDate],
        [m.interviewerNotify.timeLabel, interviewTime],
        [m.interviewerNotify.durationLabel, durationLabel],
        [m.interviewerNotify.typeLabel, interviewTypeLabel],
        [m.interviewerNotify.locationLabel, locationLabel],
      ],
      calendarHint: m.interviewerNotify.calendarHint,
      footer,
      organizationName: params.organizationName,
    })

    try {
      await sendEmail({
        to,
        subject,
        html,
        text,
        icsAttachment: Buffer.from(icsContent),
        resendTags: [
          { name: 'category', value: 'interviewer-notification' },
          { name: 'interview', value: params.interviewTitle.slice(0, 256).replace(/[^a-zA-Z0-9_-]/g, '_') },
        ],
        logFallback:
          `Interviewer notification → ${to} | ` +
          `Subject: ${subject} | ` +
          `Interview: ${params.interviewTitle} | ` +
          `Candidate: ${params.candidateName}`,
        errorCategory: 'email.interviewer_notification_send_failed',
      })
      sent.push(to)
    }
    catch {
      failed.push(to)
    }
  }

  return { sent, failed }
}

function buildInterviewerNotifyHtml(params: {
  locale: EmailLocale
  subject: string
  title: string
  intro: string
  rows: [string, string][]
  calendarHint: string
  footer: string
  organizationName: string
}): string {
  const rowsHtml = params.rows.map(([label, value]) => `
                <tr>
                  <td style="padding:6px 0;font-size:13px;color:#71717a;width:140px;vertical-align:top;">${escapeHtml(label)}</td>
                  <td style="padding:6px 0;font-size:14px;color:#18181b;font-weight:500;">${escapeHtml(value)}</td>
                </tr>`).join('')

  return `<!DOCTYPE html>
<html lang="${params.locale}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(params.subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7;">
          <tr>
            <td style="padding:32px 32px 24px;text-align:center;border-bottom:1px solid #f4f4f5;">
              <h1 style="margin:0;font-size:20px;font-weight:600;color:#09090b;">${escapeHtml(params.organizationName)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 12px;font-size:18px;font-weight:600;color:#09090b;">${escapeHtml(params.title)}</h2>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#3f3f46;">${escapeHtml(params.intro)}</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
                ${rowsHtml}
              </table>
              <p style="margin:0;font-size:13px;line-height:1.5;color:#71717a;">${escapeHtml(params.calendarHint)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;text-align:center;border-top:1px solid #f4f4f5;background-color:#fafafa;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;">${escapeHtml(params.footer)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
