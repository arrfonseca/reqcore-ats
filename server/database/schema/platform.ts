import { relations, sql } from 'drizzle-orm'
import {
  pgTable,
  text,
  timestamp,
  boolean,
  jsonb,
  numeric,
  date,
  integer,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core'
import { organization, user } from './auth'
import { nameDisplayFormatEnum, dateFormatEnum } from './app'

export const tenantStatusEnum = ['active', 'suspended', 'archived'] as const

export const tenantSubscription = pgTable('tenant_subscription', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  planTier: text('plan_tier').notNull().default('free'),
  status: text('status').notNull().default('active'),
  externalCustomerId: text('external_customer_id'),
  currentPeriodEnd: timestamp('current_period_end'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ([
  uniqueIndex('tenant_subscription_organization_id_idx').on(t.organizationId),
]))

export const platformMember = pgTable('platform_member', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('saas_owner'),
  scopes: jsonb('scopes').$type<Record<string, boolean> | null>(),
  invitedById: text('invited_by_id').references(() => user.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ([
  uniqueIndex('platform_member_user_id_idx').on(t.userId),
]))

export const platformAiConfig = pgTable('platform_ai_config', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull().default('Default'),
  provider: text('provider').notNull().default('openai'),
  model: text('model').notNull().default('gpt-4o-mini'),
  apiKeyEncrypted: text('api_key_encrypted'),
  baseUrl: text('base_url'),
  maxTokens: integer('max_tokens').notNull().default(4096),
  inputPricePer1m: numeric('input_price_per_1m', { precision: 10, scale: 4 }),
  outputPricePer1m: numeric('output_price_per_1m', { precision: 10, scale: 4 }),
  isActive: boolean('is_active').notNull().default(true),
  isDefaultChatbot: boolean('is_default_chatbot').notNull().default(false),
  isDefaultAnalysis: boolean('is_default_analysis').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ([
  uniqueIndex('platform_ai_config_default_chatbot_idx').on(sql`true`).where(sql`${t.isDefaultChatbot} = true`),
  uniqueIndex('platform_ai_config_default_analysis_idx').on(sql`true`).where(sql`${t.isDefaultAnalysis} = true`),
]))

/** Models dismissed by the SaaS Owner in the Global AI model picker. */
export const platformAiHiddenModel = pgTable('platform_ai_hidden_model', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  provider: text('provider').notNull(),
  modelId: text('model_id').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ([
  uniqueIndex('platform_ai_hidden_model_provider_model_idx').on(t.provider, t.modelId),
]))

/** Cached live-probe results for platform AI model availability. */
export const platformAiModelVerification = pgTable('platform_ai_model_verification', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  provider: text('provider').notNull(),
  modelId: text('model_id').notNull(),
  baseUrl: text('base_url').notNull().default(''),
  ok: boolean('ok').notNull(),
  errorMessage: text('error_message'),
  verifiedAt: timestamp('verified_at').notNull().defaultNow(),
}, (t) => ([
  uniqueIndex('platform_ai_model_verification_unique_idx').on(t.provider, t.modelId, t.baseUrl),
]))

export const tenantAiSettings = pgTable('tenant_ai_settings', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  usePlatformAi: boolean('use_platform_ai').notNull().default(true),
  allowOwnLlm: boolean('allow_own_llm').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ([
  uniqueIndex('tenant_ai_settings_organization_id_idx').on(t.organizationId),
]))

export const platformCountryLocale = pgTable('platform_country_locale', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  countryCode: text('country_code').notNull(),
  nameDisplayFormat: nameDisplayFormatEnum('name_display_format').notNull().default('first_last'),
  dateFormat: dateFormatEnum('date_format').notNull().default('dmy'),
  defaultLanguage: text('default_language').notNull().default('pt-BR'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ([
  uniqueIndex('platform_country_locale_country_code_idx').on(t.countryCode),
]))

export const platformIntegrationConfig = pgTable('platform_integration_config', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  provider: text('provider').notNull(),
  enabled: boolean('enabled').notNull().default(false),
  configJson: jsonb('config_json').$type<Record<string, unknown>>(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ([
  uniqueIndex('platform_integration_config_provider_idx').on(t.provider),
]))

export const aiUsageDaily = pgTable('ai_usage_daily', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  organizationId: text('organization_id').notNull().references(() => organization.id, { onDelete: 'cascade' }),
  usageDate: date('usage_date').notNull(),
  promptTokens: integer('prompt_tokens').notNull().default(0),
  completionTokens: integer('completion_tokens').notNull().default(0),
  estimatedCostUsd: numeric('estimated_cost_usd', { precision: 12, scale: 4 }).notNull().default('0'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ([
  uniqueIndex('ai_usage_daily_org_date_idx').on(t.organizationId, t.usageDate),
  index('ai_usage_daily_usage_date_idx').on(t.usageDate),
]))

export const tenantSubscriptionRelations = relations(tenantSubscription, ({ one }) => ({
  organization: one(organization, { fields: [tenantSubscription.organizationId], references: [organization.id] }),
}))

export const platformMemberRelations = relations(platformMember, ({ one }) => ({
  user: one(user, { fields: [platformMember.userId], references: [user.id] }),
  invitedBy: one(user, { fields: [platformMember.invitedById], references: [user.id] }),
}))

export const tenantAiSettingsRelations = relations(tenantAiSettings, ({ one }) => ({
  organization: one(organization, { fields: [tenantAiSettings.organizationId], references: [organization.id] }),
}))
