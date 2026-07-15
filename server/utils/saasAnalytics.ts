import { and, count, eq, gte, inArray, isNotNull, lte, notInArray, sql, sum } from 'drizzle-orm'
import {
  aiUsageDaily,
  analysisRun,
  application,
  candidate,
  chatbotConversation,
  document,
  organization,
  trackingLink,
} from '../database/schema'
import { getDemoOrgIds, DEMO_ORG_SLUGS } from './demoOrg'

export type PlatformDailyMetric = {
  date: string
  visits: number
  candidates: number
  resumesProcessed: number
  aiAnalyses: number
  chatbotSessions: number
  candidatesApproved: number
  promptTokens: number
  completionTokens: number
  aiCostUsd: number
}

export type PlatformDashboardMetrics = {
  totals: {
    visits: number
    candidates: number
    resumesProcessed: number
    aiAnalyses: number
    chatbotSessions: number
    candidatesApproved: number
    promptTokens: number
    completionTokens: number
    aiCostUsd: number
    revenueUsd: number | null
    tenants: number
  }
  daily: PlatformDailyMetric[]
  period: { from: string; to: string; days: number }
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function buildDateRange(days: number): { from: Date; to: Date; keys: string[] } {
  const to = new Date()
  to.setHours(23, 59, 59, 999)
  const from = new Date(to)
  from.setDate(from.getDate() - (days - 1))
  from.setHours(0, 0, 0, 0)

  const keys: string[] = []
  const cursor = new Date(from)
  while (cursor <= to) {
    keys.push(dateKey(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return { from, to, keys }
}

function emptyDaily(keys: string[]): PlatformDailyMetric[] {
  return keys.map(date => ({
    date,
    visits: 0,
    candidates: 0,
    resumesProcessed: 0,
    aiAnalyses: 0,
    chatbotSessions: 0,
    candidatesApproved: 0,
    promptTokens: 0,
    completionTokens: 0,
    aiCostUsd: 0,
  }))
}

function mergeDailyRows(
  keys: string[],
  rows: { day: string; value: number }[],
  field: keyof Omit<PlatformDailyMetric, 'date'>,
  daily: PlatformDailyMetric[],
) {
  const map = new Map(rows.map(r => [r.day, r.value]))
  for (const entry of daily) {
    entry[field] = map.get(entry.date) ?? 0
  }
}

export async function fetchPlatformDashboardMetrics(days = 30): Promise<PlatformDashboardMetrics> {
  const { from, to, keys } = buildDateRange(days)
  const daily = emptyDaily(keys)

  const excludedOrgIds = [...await getDemoOrgIds([...DEMO_ORG_SLUGS])]
  const excludeOrg = (column: typeof organization.id) =>
    excludedOrgIds.length > 0 ? notInArray(column, excludedOrgIds) : sql`1=1`

  const daySql = (column: unknown) => sql<string>`to_char(date_trunc('day', ${column}), 'YYYY-MM-DD')`

  const [
    visitTotalRow,
    candidateTotal,
    resumeTotal,
    analysisTotal,
    chatbotTotal,
    approvedTotal,
    tokenTotals,
    usageCostRow,
    tenantTotal,
    visitDaily,
    candidateDaily,
    resumeDaily,
    analysisDaily,
    chatbotDaily,
    approvedDaily,
    tokenDaily,
    usageCostDaily,
  ] = await Promise.all([
    db.select({ total: sum(trackingLink.clickCount) }).from(trackingLink)
      .where(excludeOrg(trackingLink.organizationId)),
    db.$count(candidate, excludeOrg(candidate.organizationId)),
    db.$count(document, and(
      eq(document.type, 'resume'),
      isNotNull(document.parsedContent),
      excludeOrg(document.organizationId),
    )),
    db.$count(analysisRun, and(eq(analysisRun.status, 'completed'), excludeOrg(analysisRun.organizationId))),
    db.$count(chatbotConversation, excludeOrg(chatbotConversation.organizationId)),
    db.$count(application, and(
      inArray(application.status, ['offer', 'hired']),
      excludeOrg(application.organizationId),
    )),
    db.select({
      prompt: sum(analysisRun.promptTokens),
      completion: sum(analysisRun.completionTokens),
    }).from(analysisRun).where(excludeOrg(analysisRun.organizationId)),
    db.select({ total: sum(aiUsageDaily.estimatedCostUsd) }).from(aiUsageDaily)
      .where(excludeOrg(aiUsageDaily.organizationId)),
    db.$count(organization, excludeOrg(organization.id)),
    db.select({
      day: daySql(application.createdAt),
      value: count(),
    }).from(application)
      .where(and(
        gte(application.createdAt, from),
        lte(application.createdAt, to),
        excludeOrg(application.organizationId),
      ))
      .groupBy(sql`date_trunc('day', ${application.createdAt})`)
      .orderBy(sql`date_trunc('day', ${application.createdAt})`),
    db.select({
      day: daySql(candidate.createdAt),
      value: count(),
    }).from(candidate)
      .where(and(
        gte(candidate.createdAt, from),
        lte(candidate.createdAt, to),
        excludeOrg(candidate.organizationId),
      ))
      .groupBy(sql`date_trunc('day', ${candidate.createdAt})`)
      .orderBy(sql`date_trunc('day', ${candidate.createdAt})`),
    db.select({
      day: daySql(document.createdAt),
      value: count(),
    }).from(document)
      .where(and(
        eq(document.type, 'resume'),
        isNotNull(document.parsedContent),
        gte(document.createdAt, from),
        lte(document.createdAt, to),
        excludeOrg(document.organizationId),
      ))
      .groupBy(sql`date_trunc('day', ${document.createdAt})`)
      .orderBy(sql`date_trunc('day', ${document.createdAt})`),
    db.select({
      day: daySql(analysisRun.createdAt),
      value: count(),
    }).from(analysisRun)
      .where(and(
        eq(analysisRun.status, 'completed'),
        gte(analysisRun.createdAt, from),
        lte(analysisRun.createdAt, to),
        excludeOrg(analysisRun.organizationId),
      ))
      .groupBy(sql`date_trunc('day', ${analysisRun.createdAt})`)
      .orderBy(sql`date_trunc('day', ${analysisRun.createdAt})`),
    db.select({
      day: daySql(chatbotConversation.createdAt),
      value: count(),
    }).from(chatbotConversation)
      .where(and(
        gte(chatbotConversation.createdAt, from),
        lte(chatbotConversation.createdAt, to),
        excludeOrg(chatbotConversation.organizationId),
      ))
      .groupBy(sql`date_trunc('day', ${chatbotConversation.createdAt})`)
      .orderBy(sql`date_trunc('day', ${chatbotConversation.createdAt})`),
    db.select({
      day: daySql(application.updatedAt),
      value: count(),
    }).from(application)
      .where(and(
        inArray(application.status, ['offer', 'hired']),
        gte(application.updatedAt, from),
        lte(application.updatedAt, to),
        excludeOrg(application.organizationId),
      ))
      .groupBy(sql`date_trunc('day', ${application.updatedAt})`)
      .orderBy(sql`date_trunc('day', ${application.updatedAt})`),
    db.select({
      day: daySql(analysisRun.createdAt),
      prompt: sum(analysisRun.promptTokens),
      completion: sum(analysisRun.completionTokens),
    }).from(analysisRun)
      .where(and(
        gte(analysisRun.createdAt, from),
        lte(analysisRun.createdAt, to),
        excludeOrg(analysisRun.organizationId),
      ))
      .groupBy(sql`date_trunc('day', ${analysisRun.createdAt})`)
      .orderBy(sql`date_trunc('day', ${analysisRun.createdAt})`),
    db.select({
      day: sql<string>`to_char(${aiUsageDaily.usageDate}, 'YYYY-MM-DD')`,
      value: sum(aiUsageDaily.estimatedCostUsd),
    }).from(aiUsageDaily)
      .where(and(
        gte(aiUsageDaily.usageDate, dateKey(from)),
        lte(aiUsageDaily.usageDate, dateKey(to)),
        excludeOrg(aiUsageDaily.organizationId),
      ))
      .groupBy(aiUsageDaily.usageDate)
      .orderBy(aiUsageDaily.usageDate),
  ])

  mergeDailyRows(keys, visitDaily.map(r => ({ day: r.day, value: Number(r.value ?? 0) })), 'visits', daily)
  mergeDailyRows(keys, candidateDaily.map(r => ({ day: r.day, value: Number(r.value) })), 'candidates', daily)
  mergeDailyRows(keys, resumeDaily.map(r => ({ day: r.day, value: Number(r.value) })), 'resumesProcessed', daily)
  mergeDailyRows(keys, analysisDaily.map(r => ({ day: r.day, value: Number(r.value) })), 'aiAnalyses', daily)
  mergeDailyRows(keys, chatbotDaily.map(r => ({ day: r.day, value: Number(r.value) })), 'chatbotSessions', daily)
  mergeDailyRows(keys, approvedDaily.map(r => ({ day: r.day, value: Number(r.value) })), 'candidatesApproved', daily)

  const tokenDailyMap = new Map(tokenDaily.map(r => [r.day, r]))
  const costDailyMap = new Map(usageCostDaily.map(r => [r.day, Number(r.value ?? 0)]))
  for (const entry of daily) {
    const tokens = tokenDailyMap.get(entry.date)
    entry.promptTokens = Number(tokens?.prompt ?? 0)
    entry.completionTokens = Number(tokens?.completion ?? 0)
    entry.aiCostUsd = costDailyMap.get(entry.date) ?? 0
  }

  const promptTokens = Number(tokenTotals[0]?.prompt ?? 0)
  const completionTokens = Number(tokenTotals[0]?.completion ?? 0)
  const aiCostUsd = Number(usageCostRow[0]?.total ?? 0)

  return {
    totals: {
      visits: Number(visitTotalRow[0]?.total ?? 0),
      candidates: candidateTotal,
      resumesProcessed: resumeTotal,
      aiAnalyses: analysisTotal,
      chatbotSessions: chatbotTotal,
      candidatesApproved: approvedTotal,
      promptTokens,
      completionTokens,
      aiCostUsd,
      revenueUsd: null,
      tenants: tenantTotal,
    },
    daily,
    period: { from: dateKey(from), to: dateKey(to), days },
  }
}
