/**
 * Client-side analytics hooks — disabled (no events sent to external services).
 */
export function useTrack() {
  function track(_eventName: string, _properties?: Record<string, unknown>) {
    // no-op
  }

  function captureError(_error: unknown, _properties?: Record<string, unknown>) {
    // no-op
  }

  return { track, captureError }
}
