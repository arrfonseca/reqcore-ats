export type ScheduleInterviewActionMode = 'schedule' | 'scheduled' | 'schedule_new'

export interface InterviewActionSource {
  id: string
  status: string
  scheduledAt: string
}

export interface ScheduleInterviewAction {
  mode: ScheduleInterviewActionMode
  interviewId: string | null
}

/**
 * Resolve CTA for scheduling based on an application's interviews:
 * - scheduled → link to that interview
 * - only cancelled/no_show/none → schedule (glow)
 * - completed (and nothing still scheduled) → schedule new
 */
export function resolveScheduleInterviewAction(
  interviews: InterviewActionSource[],
): ScheduleInterviewAction {
  const scheduled = interviews
    .filter(item => item.status === 'scheduled')
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())

  if (scheduled[0]) {
    return { mode: 'scheduled', interviewId: scheduled[0].id }
  }

  const hasCompleted = interviews.some(item => item.status === 'completed')
  if (hasCompleted) {
    return { mode: 'schedule_new', interviewId: null }
  }

  return { mode: 'schedule', interviewId: null }
}
