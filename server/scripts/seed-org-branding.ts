/**
 * Seed org branding logos (SVG light/dark) into S3 and org_settings.
 *
 * Usage:
 *   npx tsx server/scripts/seed-org-branding.ts armarinho-sao-jose
 */
import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { eq } from 'drizzle-orm'
import * as schema from '../database/schema'
import { buildLogoStorageKey } from '../utils/schemas/branding'
import {
  BRAND_LOGO_DARK_FILL,
  BRAND_LOGO_LIGHT_FILL,
  buildBrandLogoSvg,
} from '../../shared/brand-logo'

const { organization, orgSettings } = schema

const DEFAULT_BRAND_SUBTITLE = 'Esse é seu centro de comando para recrutamento e seleção.'

function requireEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    console.error(`${name} is required`)
    process.exit(1)
  }
  return value
}

function getScriptS3Client(): S3Client {
  const forcePathStyle = process.env.S3_FORCE_PATH_STYLE !== 'false'
  return new S3Client({
    endpoint: requireEnv('S3_ENDPOINT'),
    region: process.env.S3_REGION?.trim() || 'us-east-1',
    credentials: {
      accessKeyId: requireEnv('S3_ACCESS_KEY'),
      secretAccessKey: requireEnv('S3_SECRET_KEY'),
    },
    forcePathStyle,
  })
}

function getS3Bucket(): string {
  return requireEnv('S3_BUCKET')
}

async function ensureBucketExists(client: S3Client): Promise<void> {
  const bucket = getS3Bucket()
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }))
  }
  catch {
    await client.send(new CreateBucketCommand({ Bucket: bucket }))
  }
}

async function uploadLogoSvg(client: S3Client, key: string, svg: string): Promise<void> {
  await client.send(
    new PutObjectCommand({
      Bucket: getS3Bucket(),
      Key: key,
      Body: Buffer.from(svg, 'utf8'),
      ContentType: 'image/svg+xml',
    }),
  )
}

async function upsertOrgLogoKey(
  db: ReturnType<typeof drizzle<typeof schema>>,
  organizationId: string,
  variant: 'light' | 'dark',
  storageKey: string,
): Promise<void> {
  const column = variant === 'light' ? 'logoLightKey' : 'logoDarkKey'
  await db
    .insert(orgSettings)
    .values({
      organizationId,
      nameDisplayFormat: 'first_last',
      dateFormat: 'dmy',
      [column]: storageKey,
    })
    .onConflictDoUpdate({
      target: orgSettings.organizationId,
      set: {
        [column]: storageKey,
        updatedAt: new Date(),
      },
    })
}

async function main() {
  const orgSlug = process.argv[2]?.trim()
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    console.error('DATABASE_URL is required')
    process.exit(1)
  }
  if (!orgSlug) {
    console.error('Usage: npx tsx server/scripts/seed-org-branding.ts <org-slug>')
    process.exit(1)
  }

  const client = postgres(databaseUrl, { max: 1 })
  const db = drizzle(client, { schema })
  const s3 = getScriptS3Client()

  try {
    const org = await db.query.organization.findFirst({
      where: eq(organization.slug, orgSlug),
      columns: { id: true, name: true, slug: true },
    })

    if (!org) {
      console.error(`Organization not found: ${orgSlug}`)
      process.exit(1)
    }

    await ensureBucketExists(s3)

    const variants = [
      { variant: 'light' as const, fill: BRAND_LOGO_LIGHT_FILL },
      { variant: 'dark' as const, fill: BRAND_LOGO_DARK_FILL },
    ]

    for (const { variant, fill } of variants) {
      const svg = buildBrandLogoSvg(fill)
      const storageKey = buildLogoStorageKey(org.id, variant, 'svg')
      await uploadLogoSvg(s3, storageKey, svg)
      await upsertOrgLogoKey(db, org.id, variant, storageKey)
      console.log(`Uploaded ${variant} logo → ${storageKey}`)
    }

    await db
      .insert(orgSettings)
      .values({
        organizationId: org.id,
        nameDisplayFormat: 'first_last',
        dateFormat: 'dmy',
        brandSubtitle: DEFAULT_BRAND_SUBTITLE,
      })
      .onConflictDoUpdate({
        target: orgSettings.organizationId,
        set: {
          brandSubtitle: DEFAULT_BRAND_SUBTITLE,
          updatedAt: new Date(),
        },
      })

    console.log(`Branding seeded for ${org.name} (${org.slug})`)
  }
  finally {
    await client.end({ timeout: 5 })
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
