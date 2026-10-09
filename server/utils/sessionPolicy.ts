/** Idle window. Activity inside this window keeps the session alive. */
export const SESSION_IDLE_SECONDS = 8 * 60 * 60

/** Hard cap from sign-in. Activity cannot extend a session past this. */
export const SESSION_ABSOLUTE_SECONDS = 12 * 60 * 60

/** How often an active session may slide its idle expiry forward. */
export const SESSION_REFRESH_SECONDS = 15 * 60

/** Password-sensitive Better Auth actions require a sign-in this recent. */
export const SESSION_FRESH_SECONDS = 60 * 60

export function absoluteSessionExpiresAt(createdAt: Date | string): Date {
  const created = createdAt instanceof Date ? createdAt : new Date(createdAt)
  return new Date(created.getTime() + SESSION_ABSOLUTE_SECONDS * 1000)
}

export function isSessionPastAbsoluteLifetime(
  createdAt: Date | string,
  now = Date.now(),
): boolean {
  return now >= absoluteSessionExpiresAt(createdAt).getTime()
}

/** Never let a refresh write an expiry later than sign-in plus the absolute cap. */
export function clampSessionExpiresAt(createdAt: Date | string, requested: Date): Date {
  const cap = absoluteSessionExpiresAt(createdAt)
  return requested.getTime() > cap.getTime() ? cap : requested
}
