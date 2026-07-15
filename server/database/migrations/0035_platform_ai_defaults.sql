-- Platform AI config: chatbot/analysis default flags (parity with org ai_config)

ALTER TABLE "platform_ai_config" ADD COLUMN IF NOT EXISTS "is_default_chatbot" boolean NOT NULL DEFAULT false;
ALTER TABLE "platform_ai_config" ADD COLUMN IF NOT EXISTS "is_default_analysis" boolean NOT NULL DEFAULT false;

-- Backfill: active configs become defaults for both purposes
UPDATE "platform_ai_config"
SET
  "is_default_chatbot" = true,
  "is_default_analysis" = true
WHERE "is_active" = true
  AND "is_default_chatbot" = false
  AND "is_default_analysis" = false;

-- If no active row, promote the oldest config
UPDATE "platform_ai_config"
SET
  "is_default_chatbot" = true,
  "is_default_analysis" = true
WHERE "id" = (
  SELECT "id" FROM "platform_ai_config"
  ORDER BY "created_at" ASC
  LIMIT 1
)
AND NOT EXISTS (
  SELECT 1 FROM "platform_ai_config" WHERE "is_default_chatbot" = true
);

CREATE UNIQUE INDEX IF NOT EXISTS "platform_ai_config_default_chatbot_idx"
  ON "platform_ai_config" ((true))
  WHERE "is_default_chatbot" = true;

CREATE UNIQUE INDEX IF NOT EXISTS "platform_ai_config_default_analysis_idx"
  ON "platform_ai_config" ((true))
  WHERE "is_default_analysis" = true;
