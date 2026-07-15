import { z } from 'zod'

/** MIME types allowed for org logo upload. */
export const ALLOWED_LOGO_MIME_TYPES = [
  'image/png',
  'image/gif',
  'image/jpeg',
  'image/svg+xml',
] as const

/** Maximum logo file size in bytes (2 MB) */
export const MAX_LOGO_FILE_SIZE = 2 * 1024 * 1024

export type LogoVariant = 'light' | 'dark'

export const logoVariantSchema = z.enum(['light', 'dark'])

export const MIME_TO_LOGO_EXTENSION: Record<string, string> = {
  'image/png': 'png',
  'image/gif': 'gif',
  'image/jpeg': 'jpg',
  'image/svg+xml': 'svg',
}

const ALLOWED_LOGO_EXTENSIONS = new Set(['png', 'gif', 'jpg', 'jpeg', 'svg'])

/**
 * Validate logo file from magic bytes and optional filename extension.
 * SVG may not be detected by file-type — allow when extension is .svg and content looks safe.
 */
export async function validateLogoFile(
  fileBuffer: Buffer,
  filename?: string | null,
): Promise<{ mimeType: string, extension: string }> {
  if (fileBuffer.length > MAX_LOGO_FILE_SIZE) {
    throw createError({
      statusCode: 413,
      statusMessage: `File too large. Maximum size is ${MAX_LOGO_FILE_SIZE / 1024 / 1024} MB`,
    })
  }

  const { fileTypeFromBuffer } = await import('file-type')
  const detectedType = await fileTypeFromBuffer(fileBuffer)
  let mimeType = detectedType?.mime

  const extFromName = filename?.split('.').pop()?.toLowerCase()

  if (!mimeType && extFromName === 'svg') {
    const text = fileBuffer.toString('utf8', 0, Math.min(fileBuffer.length, 512)).trim()
    if (text.startsWith('<svg') || text.startsWith('<?xml')) {
      mimeType = 'image/svg+xml'
    }
  }

  if (!mimeType || !ALLOWED_LOGO_MIME_TYPES.includes(mimeType as typeof ALLOWED_LOGO_MIME_TYPES[number])) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid file type. Allowed: PNG, GIF, JPG, SVG',
    })
  }

  if (extFromName && !ALLOWED_LOGO_EXTENSIONS.has(extFromName)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid file extension. Allowed: .png, .gif, .jpg, .svg',
    })
  }

  const extension = MIME_TO_LOGO_EXTENSION[mimeType] ?? extFromName ?? 'png'
  return { mimeType, extension }
}

export function buildLogoStorageKey(orgId: string, variant: LogoVariant, extension: string): string {
  return `${orgId}/branding/logo-${variant}.${extension}`
}
