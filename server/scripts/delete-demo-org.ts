/**
 * Deletes demo organizations and demo users (reqcore-demo, legacy applirank-demo).
 * Usage: npx tsx server/scripts/delete-demo-org.ts
 */
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { eq, inArray } from 'drizzle-orm'
import * as schema from '../database/schema'

const DEMO_ORG_SLUGS = ['reqcore-demo', 'applirank-demo'] as const
const DEMO_USER_EMAILS = ['demo@reqcore.com', 'demo@applirank.com'] as const

const processWithLoadEnv = process as NodeJS.Process & { loadEnvFile?: (path?: string) => void }
if (!process.env.DATABASE_URL && typeof processWithLoadEnv.loadEnvFile === 'function') {
  try { processWithLoadEnv.loadEnvFile('.env') } catch {}
}

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('DATABASE_URL is required.')
  process.exit(1)
}

const client = postgres(DATABASE_URL, { max: 1 })
const db = drizzle(client, { schema })

async function main() {
  const orgs = await db
    .select({ id: schema.organization.id, slug: schema.organization.slug })
    .from(schema.organization)
    .where(inArray(schema.organization.slug, [...DEMO_ORG_SLUGS]))

  if (orgs.length === 0) {
    console.log('ℹ️  No demo organizations found.')
  }

  for (const org of orgs) {
    const deletedSessions = await db.delete(schema.session)
      .where(eq(schema.session.activeOrganizationId, org.id))
      .returning({ id: schema.session.id })

    await db.delete(schema.organization).where(eq(schema.organization.id, org.id))

    console.log(`✅ Deleted demo org "${org.slug}" (${org.id})`)
    if (deletedSessions.length) {
      console.log(`   🔒 Invalidated ${deletedSessions.length} session(s)`)
    }
  }

  const demoUsers = await db
    .select({ id: schema.user.id, email: schema.user.email })
    .from(schema.user)
    .where(inArray(schema.user.email, [...DEMO_USER_EMAILS]))

  for (const user of demoUsers) {
    await db.delete(schema.user).where(eq(schema.user.id, user.id))
    console.log(`✅ Deleted demo user: ${user.email}`)
  }

  if (orgs.length === 0 && demoUsers.length === 0) {
    console.log('ℹ️  Nothing to delete.')
  }

  await client.end()
}

main().catch((err) => {
  console.error('❌ Failed:', err)
  client.end().then(() => process.exit(1))
})
