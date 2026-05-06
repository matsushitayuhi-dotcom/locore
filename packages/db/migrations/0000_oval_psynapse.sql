CREATE TYPE "public"."crisis_candidate_status" AS ENUM('new', 'approved', 'rejected', 'duplicate');--> statement-breakpoint
CREATE TYPE "public"."crisis_feed_type" AS ENUM('rss', 'api', 'twitter');--> statement-breakpoint
CREATE TYPE "public"."crisis_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."crisis_type" AS ENUM('strike', 'demo', 'event', 'security', 'other');--> statement-breakpoint
CREATE TYPE "public"."founding_application_status" AS ENUM('pending', 'approved', 'rejected', 'waitlist');--> statement-breakpoint
CREATE TYPE "public"."founding_status" AS ENUM('active', 'paused', 'graduated', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."light_diary_status" AS ENUM('draft', 'published', 'removed');--> statement-breakpoint
CREATE TYPE "public"."moderation_action" AS ENUM('pass', 'warned', 'held', 'overridden');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('email', 'web_push', 'in_app');--> statement-breakpoint
CREATE TYPE "public"."notification_status" AS ENUM('pending', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."payout_status" AS ENUM('pending', 'initiated', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."purchase_status" AS ENUM('pending', 'completed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('open', 'investigating', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."report_target_type" AS ENUM('article', 'user', 'review', 'light_diary');--> statement-breakpoint
CREATE TYPE "public"."residency_document_type" AS ENUM('visa', 'residence_card', 'utility_bill', 'tax_certificate', 'other');--> statement-breakpoint
CREATE TYPE "public"."residency_verification_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."sns_platform" AS ENUM('tiktok', 'instagram', 'youtube', 'x', 'blog');--> statement-breakpoint
CREATE TYPE "public"."spot_category" AS ENUM('food', 'sight', 'shopping', 'lodging', 'other');--> statement-breakpoint
CREATE TYPE "public"."trip_collab_role" AS ENUM('viewer', 'editor');--> statement-breakpoint
CREATE TYPE "public"."trip_item_type" AS ENUM('spot', 'free');--> statement-breakpoint
CREATE TYPE "public"."trip_share_role" AS ENUM('viewer', 'editor', 'none');--> statement-breakpoint
CREATE TYPE "public"."video_platform" AS ENUM('tiktok', 'instagram', 'youtube', 'x', 'other');--> statement-breakpoint
CREATE TYPE "public"."writer_role" AS ENUM('resident_writer', 'editor', 'light_diarist', 'reader');--> statement-breakpoint
CREATE TYPE "public"."writer_tier" AS ENUM('S', 'A', 'B');--> statement-breakpoint
CREATE TYPE "public"."article_duration" AS ENUM('half_day', 'full_day', 'few_hours', 'other');--> statement-breakpoint
CREATE TYPE "public"."article_status" AS ENUM('draft', 'published', 'archived', 'pending_review');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"display_name" text NOT NULL,
	"avatar_url" text,
	"bio" text,
	"role" "writer_role" DEFAULT 'reader' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "writer_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"tier" "writer_tier" DEFAULT 'B' NOT NULL,
	"residency_country" text NOT NULL,
	"residency_years" integer DEFAULT 0 NOT NULL,
	"residency_verified_at" timestamp with time zone,
	"founding_member" boolean DEFAULT false NOT NULL,
	"founding_joined_at" timestamp with time zone,
	"founding_fee_waiver_until" timestamp with time zone,
	"founding_status" "founding_status",
	"bio" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "residency_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"document_type" "residency_document_type" NOT NULL,
	"document_url_enc" text NOT NULL,
	"status" "residency_verification_status" DEFAULT 'pending' NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"reviewed_by" uuid,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sns_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"platform" "sns_platform" NOT NULL,
	"url" text NOT NULL,
	"follower_count" integer,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name_ja" text NOT NULL,
	"country" text NOT NULL,
	"lat" double precision,
	"lng" double precision,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cities_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"writer_id" uuid NOT NULL,
	"city_id" uuid NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"cover_image_url" text,
	"price_jpy" integer NOT NULL,
	"status" "article_status" DEFAULT 'draft' NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"duration_type" "article_duration",
	"warned" boolean DEFAULT false NOT NULL,
	"moderation_score" integer,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "article_videos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" uuid NOT NULL,
	"platform" "video_platform" NOT NULL,
	"embed_url" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "spots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" uuid NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"location" "geography(Point,4326)" NOT NULL,
	"category" "spot_category",
	"price_estimate" text,
	"opening_hours" jsonb,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"buyer_id" uuid NOT NULL,
	"article_id" uuid NOT NULL,
	"amount_jpy" integer NOT NULL,
	"fee_jpy" integer DEFAULT 0 NOT NULL,
	"payout_jpy" integer DEFAULT 0 NOT NULL,
	"stripe_payment_intent_id" text,
	"status" "purchase_status" DEFAULT 'pending' NOT NULL,
	"purchased_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"writer_id" uuid NOT NULL,
	"amount_jpy" integer NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"status" "payout_status" DEFAULT 'pending' NOT NULL,
	"wise_transfer_id" text,
	"initiated_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purchase_id" uuid NOT NULL,
	"local_score" integer NOT NULL,
	"satisfaction_stars" integer NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"body" text,
	"visited_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_local_score_chk" CHECK ("reviews"."local_score" BETWEEN 0 AND 100),
	CONSTRAINT "reviews_satisfaction_chk" CHECK ("reviews"."satisfaction_stars" BETWEEN 1 AND 5),
	CONSTRAINT "reviews_tags_count_chk" CHECK (array_length("reviews"."tags", 1) IS NULL OR array_length("reviews"."tags", 1) <= 3)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "trips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"city_id" uuid NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"party_size" integer DEFAULT 1 NOT NULL,
	"share_token" uuid DEFAULT gen_random_uuid() NOT NULL,
	"share_role" "trip_share_role" DEFAULT 'none' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "trip_days" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"day_number" integer NOT NULL,
	"date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "trip_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_day_id" uuid NOT NULL,
	"type" "trip_item_type" NOT NULL,
	"spot_id" uuid,
	"custom_name" text,
	"custom_lat" double precision,
	"custom_lng" double precision,
	"scheduled_time" text,
	"position" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"budget_jpy" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "trip_collaborators" (
	"trip_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "trip_collab_role" DEFAULT 'viewer' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trip_collaborators_trip_id_user_id_pk" PRIMARY KEY("trip_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "light_diaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"photos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"city_id" uuid,
	"visited_at" timestamp with time zone,
	"status" "light_diary_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "editor_collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"cover_image_url" text,
	"editor_id" uuid NOT NULL,
	"city_id" uuid,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "collection_articles" (
	"collection_id" uuid NOT NULL,
	"article_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"revenue_share_pct" integer DEFAULT 30 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "collection_articles_collection_id_article_id_pk" PRIMARY KEY("collection_id","article_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "article_moderation_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" uuid NOT NULL,
	"tourist_score" integer NOT NULL,
	"visual_score" integer NOT NULL,
	"text_score" integer NOT NULL,
	"final_score" integer NOT NULL,
	"visual_breakdown" jsonb,
	"text_breakdown" jsonb,
	"action" "moderation_action" NOT NULL,
	"reviewer_id" uuid,
	"reviewed_at" timestamp with time zone,
	"override_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "founding_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"display_name" text NOT NULL,
	"sns_links" jsonb,
	"residency_country" text NOT NULL,
	"residency_years_self_reported" integer NOT NULL,
	"motivation" text NOT NULL,
	"topics" text[] DEFAULT '{}' NOT NULL,
	"writing_samples" text,
	"status" "founding_application_status" DEFAULT 'pending' NOT NULL,
	"reviewer_notes" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_id" uuid,
	"target_type" "report_target_type" NOT NULL,
	"target_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"body" text,
	"status" "report_status" DEFAULT 'open' NOT NULL,
	"resolved_by" uuid,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crisis_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"city_id" uuid NOT NULL,
	"type" "crisis_type" NOT NULL,
	"severity" integer DEFAULT 1 NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"japanese_summary" text,
	"sources" jsonb,
	"affected_areas" jsonb,
	"affected_lines" text[],
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"status" "crisis_status" DEFAULT 'draft' NOT NULL,
	"published_by" uuid,
	"published_at" timestamp with time zone,
	"auto_collected" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crisis_source_feeds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"city_id" uuid NOT NULL,
	"source_name" text NOT NULL,
	"feed_url" text NOT NULL,
	"feed_type" "crisis_feed_type" NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_fetched_at" timestamp with time zone,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crisis_candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_feed_id" uuid NOT NULL,
	"raw_content" text NOT NULL,
	"parsed_title" text,
	"parsed_severity" integer,
	"status" "crisis_candidate_status" DEFAULT 'new' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh_key" text NOT NULL,
	"auth_key" text NOT NULL,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb,
	"channel" "notification_channel" NOT NULL,
	"status" "notification_status" DEFAULT 'pending' NOT NULL,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "exchange_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_currency" text NOT NULL,
	"to_currency" text NOT NULL,
	"rate" numeric(20, 10) NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"source" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"target_type" text,
	"target_id" uuid,
	"metadata" jsonb,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "writer_profiles" ADD CONSTRAINT "writer_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "residency_verifications" ADD CONSTRAINT "residency_verifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "residency_verifications" ADD CONSTRAINT "residency_verifications_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sns_links" ADD CONSTRAINT "sns_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "articles" ADD CONSTRAINT "articles_writer_id_users_id_fk" FOREIGN KEY ("writer_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "articles" ADD CONSTRAINT "articles_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "article_videos" ADD CONSTRAINT "article_videos_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "spots" ADD CONSTRAINT "spots_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchases" ADD CONSTRAINT "purchases_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "purchases" ADD CONSTRAINT "purchases_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payouts" ADD CONSTRAINT "payouts_writer_id_users_id_fk" FOREIGN KEY ("writer_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reviews" ADD CONSTRAINT "reviews_purchase_id_purchases_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchases"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trips" ADD CONSTRAINT "trips_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trips" ADD CONSTRAINT "trips_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trip_days" ADD CONSTRAINT "trip_days_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trip_items" ADD CONSTRAINT "trip_items_trip_day_id_trip_days_id_fk" FOREIGN KEY ("trip_day_id") REFERENCES "public"."trip_days"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trip_items" ADD CONSTRAINT "trip_items_spot_id_spots_id_fk" FOREIGN KEY ("spot_id") REFERENCES "public"."spots"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trip_collaborators" ADD CONSTRAINT "trip_collaborators_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trip_collaborators" ADD CONSTRAINT "trip_collaborators_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "light_diaries" ADD CONSTRAINT "light_diaries_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "light_diaries" ADD CONSTRAINT "light_diaries_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "editor_collections" ADD CONSTRAINT "editor_collections_editor_id_users_id_fk" FOREIGN KEY ("editor_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "editor_collections" ADD CONSTRAINT "editor_collections_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "collection_articles" ADD CONSTRAINT "collection_articles_collection_id_editor_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."editor_collections"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "collection_articles" ADD CONSTRAINT "collection_articles_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "article_moderation_scores" ADD CONSTRAINT "article_moderation_scores_article_id_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."articles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "article_moderation_scores" ADD CONSTRAINT "article_moderation_scores_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "founding_applications" ADD CONSTRAINT "founding_applications_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reports" ADD CONSTRAINT "reports_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "crisis_events" ADD CONSTRAINT "crisis_events_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "crisis_events" ADD CONSTRAINT "crisis_events_published_by_users_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "crisis_source_feeds" ADD CONSTRAINT "crisis_source_feeds_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "crisis_candidates" ADD CONSTRAINT "crisis_candidates_source_feed_id_crisis_source_feeds_id_fk" FOREIGN KEY ("source_feed_id") REFERENCES "public"."crisis_source_feeds"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "crisis_candidates" ADD CONSTRAINT "crisis_candidates_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notification_log" ADD CONSTRAINT "notification_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "writer_profiles_tier_idx" ON "writer_profiles" USING btree ("tier");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "writer_profiles_founding_idx" ON "writer_profiles" USING btree ("founding_member");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "residency_verifications_user_idx" ON "residency_verifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "residency_verifications_status_idx" ON "residency_verifications" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sns_links_user_idx" ON "sns_links" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sns_links_user_platform_uq" ON "sns_links" USING btree ("user_id","platform");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "cities_is_active_idx" ON "cities" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "articles_writer_id_idx" ON "articles" USING btree ("writer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "articles_city_id_idx" ON "articles" USING btree ("city_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "articles_status_idx" ON "articles" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "articles_published_at_idx" ON "articles" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "article_videos_article_idx" ON "article_videos" USING btree ("article_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "spots_article_id_idx" ON "spots" USING btree ("article_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "spots_category_idx" ON "spots" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchases_buyer_idx" ON "purchases" USING btree ("buyer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchases_article_idx" ON "purchases" USING btree ("article_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchases_status_idx" ON "purchases" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchases_stripe_pi_idx" ON "purchases" USING btree ("stripe_payment_intent_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payouts_writer_idx" ON "payouts" USING btree ("writer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payouts_status_idx" ON "payouts" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payouts_period_idx" ON "payouts" USING btree ("period_start","period_end");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "reviews_purchase_uq" ON "reviews" USING btree ("purchase_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reviews_created_at_idx" ON "reviews" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "trips_owner_idx" ON "trips" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "trips_city_idx" ON "trips" USING btree ("city_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "trips_share_token_idx" ON "trips" USING btree ("share_token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "trip_days_trip_idx" ON "trip_days" USING btree ("trip_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "trip_days_trip_day_uq" ON "trip_days" USING btree ("trip_id","day_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "trip_items_day_idx" ON "trip_items" USING btree ("trip_day_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "trip_items_spot_idx" ON "trip_items" USING btree ("spot_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "light_diaries_author_idx" ON "light_diaries" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "light_diaries_city_idx" ON "light_diaries" USING btree ("city_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "light_diaries_status_idx" ON "light_diaries" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "editor_collections_editor_idx" ON "editor_collections" USING btree ("editor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "editor_collections_city_idx" ON "editor_collections" USING btree ("city_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "editor_collections_published_at_idx" ON "editor_collections" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "article_moderation_scores_article_idx" ON "article_moderation_scores" USING btree ("article_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "article_moderation_scores_final_score_idx" ON "article_moderation_scores" USING btree ("final_score");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "founding_applications_email_idx" ON "founding_applications" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "founding_applications_status_idx" ON "founding_applications" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reports_target_idx" ON "reports" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reports_status_idx" ON "reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reports_reporter_idx" ON "reports" USING btree ("reporter_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crisis_events_city_idx" ON "crisis_events" USING btree ("city_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crisis_events_status_idx" ON "crisis_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crisis_events_severity_idx" ON "crisis_events" USING btree ("severity");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crisis_events_time_idx" ON "crisis_events" USING btree ("starts_at","ends_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crisis_source_feeds_city_idx" ON "crisis_source_feeds" USING btree ("city_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crisis_source_feeds_enabled_idx" ON "crisis_source_feeds" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crisis_candidates_feed_idx" ON "crisis_candidates" USING btree ("source_feed_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crisis_candidates_status_idx" ON "crisis_candidates" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "push_subscriptions_user_idx" ON "push_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "push_subscriptions_endpoint_uq" ON "push_subscriptions" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_log_user_idx" ON "notification_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_log_status_idx" ON "notification_log" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_log_type_idx" ON "notification_log" USING btree ("type");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "exchange_rates_pair_fetched_uq" ON "exchange_rates" USING btree ("from_currency","to_currency","fetched_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "exchange_rates_pair_idx" ON "exchange_rates" USING btree ("from_currency","to_currency");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_actor_idx" ON "audit_logs" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_target_idx" ON "audit_logs" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");