/**
 * PostHog integration disabled — no usage analytics are sent to external services.
 * Call sites keep the same API; all functions are no-ops.
 */
export function useServerPostHog(): null {
  return null
}

export async function shutdownServerPostHog(): Promise<void> {
  // no-op
}
