import { eq, and } from 'drizzle-orm'
import { document } from '../database/schema'
import { parseDocument, extractResumeText } from './resume-parser'
import { downloadFromS3 } from './s3'

interface DocumentParseInput {
  id: string
  organizationId: string
  storageKey: string
  mimeType: string
  parsedContent?: unknown
  /** When true, always download and parse again (e.g. manual re-parse). */
  force?: boolean
}

/**
 * Return extracted resume text, parsing from S3 first when missing.
 */
export async function ensureDocumentParsed(doc: DocumentParseInput): Promise<string | null> {
  if (!doc.force) {
    const existing = extractResumeText(doc.parsedContent)
    if (existing) return existing
  }

  const fileBuffer = await downloadFromS3(doc.storageKey)
  const parsedContent = await parseDocument(fileBuffer, doc.mimeType)
  if (!parsedContent?.text?.trim()) return null

  await db.update(document)
    .set({ parsedContent: parsedContent as any })
    .where(and(
      eq(document.id, doc.id),
      eq(document.organizationId, doc.organizationId),
    ))

  return parsedContent.text
}
