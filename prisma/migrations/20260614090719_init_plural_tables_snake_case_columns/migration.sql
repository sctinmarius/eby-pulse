-- CreateEnum
CREATE TYPE "KnowledgeKind" AS ENUM ('PRODUCT', 'AUDIENCE', 'TONE', 'EXAMPLES');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('EDUCATIONAL', 'FEATURE', 'SOCIAL_PROOF', 'OFFER');

-- CreateEnum
CREATE TYPE "RecommendationStatus" AS ENUM ('PROPOSED', 'ACCEPTED', 'REJECTED', 'USED');

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('FACEBOOK', 'INSTAGRAM');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'SKIPPED', 'POSTED');

-- CreateEnum
CREATE TYPE "SignalType" AS ENUM ('APPROVED', 'EDITED', 'SKIPPED', 'PERFORMANCE');

-- CreateEnum
CREATE TYPE "LearningCategory" AS ENUM ('TONE', 'TOPIC', 'FORMAT', 'TIMING');

-- CreateEnum
CREATE TYPE "LearningStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AgentTask" AS ENUM ('GENERATE', 'RECOMMEND', 'REGENERATE', 'DISTILL');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateTable
CREATE TABLE "businesses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "default_language" TEXT NOT NULL DEFAULT 'en',
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Bucharest',
    "telegram_chat_id" TEXT,
    "api_key_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "businesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "settings" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_sections" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "kind" "KnowledgeKind" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendations" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "angle" TEXT NOT NULL,
    "content_type" "ContentType" NOT NULL,
    "rationale" TEXT NOT NULL,
    "status" "RecommendationStatus" NOT NULL DEFAULT 'PROPOSED',
    "week_of" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "recommendation_id" TEXT,
    "platform" "Platform" NOT NULL,
    "content" TEXT NOT NULL,
    "edited_content" TEXT,
    "status" "PostStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "scheduled_for" TIMESTAMP(3),
    "generation_meta" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback_signals" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "type" "SignalType" NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learnings" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "category" "LearningCategory" NOT NULL,
    "content" TEXT NOT NULL,
    "source_signal_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "LearningStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learnings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_runs" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "task" "AgentTask" NOT NULL,
    "model" TEXT NOT NULL,
    "input_tokens" INTEGER NOT NULL DEFAULT 0,
    "output_tokens" INTEGER NOT NULL DEFAULT 0,
    "cost_usd" DECIMAL(10,6) NOT NULL DEFAULT 0,
    "status" "RunStatus" NOT NULL DEFAULT 'RUNNING',
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),

    CONSTRAINT "agent_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "businesses_api_key_hash_key" ON "businesses"("api_key_hash");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE INDEX "products_business_id_idx" ON "products"("business_id");

-- CreateIndex
CREATE INDEX "knowledge_sections_product_id_idx" ON "knowledge_sections"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_sections_product_id_kind_key" ON "knowledge_sections"("product_id", "kind");

-- CreateIndex
CREATE INDEX "recommendations_product_id_week_of_idx" ON "recommendations"("product_id", "week_of");

-- CreateIndex
CREATE INDEX "posts_product_id_status_idx" ON "posts"("product_id", "status");

-- CreateIndex
CREATE INDEX "posts_product_id_scheduled_for_idx" ON "posts"("product_id", "scheduled_for");

-- CreateIndex
CREATE INDEX "feedback_signals_post_id_idx" ON "feedback_signals"("post_id");

-- CreateIndex
CREATE INDEX "learnings_product_id_status_idx" ON "learnings"("product_id", "status");

-- CreateIndex
CREATE INDEX "agent_runs_product_id_created_at_idx" ON "agent_runs"("product_id", "created_at");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_sections" ADD CONSTRAINT "knowledge_sections_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_recommendation_id_fkey" FOREIGN KEY ("recommendation_id") REFERENCES "recommendations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback_signals" ADD CONSTRAINT "feedback_signals_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learnings" ADD CONSTRAINT "learnings_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
