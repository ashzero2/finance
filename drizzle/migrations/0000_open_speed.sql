CREATE TYPE "public"."asset_category" AS ENUM('cash', 'bank', 'investment', 'property', 'vehicle', 'other');--> statement-breakpoint
CREATE TYPE "public"."asset_sub_category" AS ENUM('stocks', 'mf', 'fd', 'ppf', 'nps', 'gold', 'crypto', 'etf');--> statement-breakpoint
CREATE TYPE "public"."category_type" AS ENUM('income', 'expense');--> statement-breakpoint
CREATE TYPE "public"."frequency" AS ENUM('daily', 'weekly', 'monthly', 'quarterly', 'yearly');--> statement-breakpoint
CREATE TYPE "public"."goal_category" AS ENUM('emergency', 'retirement', 'purchase', 'travel', 'education', 'other');--> statement-breakpoint
CREATE TYPE "public"."goal_priority" AS ENUM('high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "public"."insight_priority" AS ENUM('high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "public"."insight_type" AS ENUM('anomaly', 'milestone', 'suggestion', 'warning', 'celebration');--> statement-breakpoint
CREATE TYPE "public"."liability_category" AS ENUM('loan', 'credit_card', 'personal_debt', 'other');--> statement-breakpoint
CREATE TYPE "public"."period_type" AS ENUM('weekly', 'monthly');--> statement-breakpoint
CREATE TYPE "public"."snapshot_source" AS ENUM('manual', 'api', 'estimated');--> statement-breakpoint
CREATE TYPE "public"."theme" AS ENUM('light', 'dark', 'system');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('income', 'expense', 'transfer');--> statement-breakpoint
CREATE TYPE "public"."week_day" AS ENUM('sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "asset_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"asset_id" text NOT NULL,
	"value" numeric(15, 2) NOT NULL,
	"recorded_at" date NOT NULL,
	"source" "snapshot_source" DEFAULT 'manual' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"category" "asset_category" NOT NULL,
	"sub_category" "asset_sub_category",
	"current_value" numeric(15, 2) DEFAULT '0' NOT NULL,
	"is_liquid" boolean DEFAULT false NOT NULL,
	"liquidity_days" integer DEFAULT 0 NOT NULL,
	"institution" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"name" text NOT NULL,
	"type" "category_type" NOT NULL,
	"icon" text DEFAULT 'circle' NOT NULL,
	"color" text DEFAULT '#8B8B96' NOT NULL,
	"is_essential" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emergency_fund" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"target_months" integer DEFAULT 6 NOT NULL,
	"monthly_essential_expenses" numeric(15, 2) DEFAULT '0' NOT NULL,
	"current_fund_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"linked_asset_ids" jsonb DEFAULT '[]'::jsonb,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "emergency_fund_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "financial_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"snapshot_date" date NOT NULL,
	"period_type" "period_type" NOT NULL,
	"net_worth" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total_assets" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total_liabilities" numeric(15, 2) DEFAULT '0' NOT NULL,
	"total_liquid" numeric(15, 2) DEFAULT '0' NOT NULL,
	"monthly_income" numeric(15, 2) DEFAULT '0' NOT NULL,
	"monthly_expenses" numeric(15, 2) DEFAULT '0' NOT NULL,
	"savings_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"runway_months" numeric(5, 1) DEFAULT '0' NOT NULL,
	"health_score" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"target_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"current_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"target_date" date,
	"priority" "goal_priority" DEFAULT 'medium' NOT NULL,
	"category" "goal_category" DEFAULT 'other' NOT NULL,
	"icon" text DEFAULT 'target' NOT NULL,
	"color" text DEFAULT '#C9A84C' NOT NULL,
	"is_completed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp,
	"monthly_contribution" numeric(15, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "insights" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" "insight_type" NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"priority" "insight_priority" DEFAULT 'medium' NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"is_dismissed" boolean DEFAULT false NOT NULL,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"metadata" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "liabilities" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"category" "liability_category" NOT NULL,
	"principal_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"outstanding_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"interest_rate" numeric(5, 2),
	"emi_amount" numeric(15, 2),
	"emi_day" integer,
	"start_date" date,
	"end_date" date,
	"institution" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recurring_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" "transaction_type" NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"category_id" text,
	"description" text,
	"frequency" "frequency" NOT NULL,
	"day_of_month" integer,
	"start_date" date NOT NULL,
	"end_date" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_generated_at" date
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" "transaction_type" NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"category_id" text,
	"description" text,
	"date" date NOT NULL,
	"is_recurring" boolean DEFAULT false NOT NULL,
	"recurring_id" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"financial_month_start_day" integer DEFAULT 1 NOT NULL,
	"weekly_review_day" "week_day" DEFAULT 'sunday' NOT NULL,
	"theme" "theme" DEFAULT 'dark' NOT NULL,
	"onboarding_completed" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_snapshots" ADD CONSTRAINT "asset_snapshots_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emergency_fund" ADD CONSTRAINT "emergency_fund_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_snapshots" ADD CONSTRAINT "financial_snapshots_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insights" ADD CONSTRAINT "insights_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "liabilities" ADD CONSTRAINT "liabilities_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_transactions" ADD CONSTRAINT "recurring_transactions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_transactions" ADD CONSTRAINT "recurring_transactions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_assets_user_category" ON "assets" USING btree ("user_id","category");--> statement-breakpoint
CREATE INDEX "idx_snapshots_user_date" ON "financial_snapshots" USING btree ("user_id","snapshot_date");--> statement-breakpoint
CREATE INDEX "idx_insights_user_unread" ON "insights" USING btree ("user_id","is_read","generated_at");--> statement-breakpoint
CREATE INDEX "idx_transactions_user_date" ON "transactions" USING btree ("user_id","date");