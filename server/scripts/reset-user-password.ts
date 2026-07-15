/**
 * Reset a user's credential password (local/dev recovery).
 *
 * Usage:
 *   DATABASE_URL=... npx tsx server/scripts/reset-user-password.ts user@example.com 'NewPassword123'
 */
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { eq } from 'drizzle-orm'
import { hashPassword } from 'better-auth/crypto'
import * as schema from '../database/schema'

const { account, user } = schema

async function main() {
  const email = process.argv[2]?.trim().toLowerCase()
  const password = process.argv[3]
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    console.error('DATABASE_URL is required')
    process.exit(1)
  }

  if (!email || !password) {
    console.error('Usage: npx tsx server/scripts/reset-user-password.ts <email> <password>')
    process.exit(1)
  }

  if (password.length < 8) {
    console.error('Password must be at least 8 characters.')
    process.exit(1)
  }

  const client = postgres(databaseUrl, { max: 1 })
  const db = drizzle(client, { schema })

  try {
    const row = await db.query.user.findFirst({
      where: eq(user.email, email),
      columns: { id: true, email: true },
    })

    if (!row) {
      console.error(`No user found for ${email}`)
      process.exit(1)
    }

    const hashed = await hashPassword(password)
    const updated = await db
      .update(account)
      .set({ password: hashed, updatedAt: new Date() })
      .where(eq(account.userId, row.id))
      .returning({ id: account.id })

    if (updated.length === 0) {
      await db.insert(account).values({
        id: crypto.randomUUID(),
        userId: row.id,
        accountId: row.id,
        providerId: 'credential',
        password: hashed,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }

    await db
      .update(user)
      .set({ emailVerified: true, updatedAt: new Date() })
      .where(eq(user.id, row.id))

    console.log(`Password reset for ${email}`)
  }
  finally {
    await client.end({ timeout: 5 })
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
