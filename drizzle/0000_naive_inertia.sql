CREATE TABLE IF NOT EXISTS "decision_signals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"after_turn_index" integer NOT NULL,
	"competencies" jsonb NOT NULL,
	"topics_covered" jsonb NOT NULL,
	"gaps" jsonb NOT NULL,
	"next_question_rationale" text NOT NULL,
	"next_question_kind" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "evaluations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"overall_score" integer NOT NULL,
	"summary" text NOT NULL,
	"strengths" jsonb NOT NULL,
	"concerns" jsonb NOT NULL,
	"competency_scores" jsonb NOT NULL,
	"raw_model_output" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "evaluations_session_id_unique" UNIQUE("session_id"),
	CONSTRAINT "evaluations_score_range" CHECK ("evaluations"."overall_score" BETWEEN 0 AND 100)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "interview_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" uuid NOT NULL,
	"soft_user_id" uuid,
	"status" text NOT NULL,
	"max_questions" integer DEFAULT 6 NOT NULL,
	"questions_asked" integer DEFAULT 0 NOT NULL,
	"follow_ups_asked" integer DEFAULT 0 NOT NULL,
	"video_enabled" boolean DEFAULT false NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"short_description" text NOT NULL,
	"long_description" text NOT NULL,
	"level" text NOT NULL,
	"competencies" jsonb NOT NULL,
	"question_pack" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "jobs_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "turns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"role" text NOT NULL,
	"index" integer NOT NULL,
	"text" text NOT NULL,
	"question_kind" text,
	"stt_confidence" real,
	"audio_url" text,
	"source_question_id" text,
	"spoken_duration_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "turns_role_shape" CHECK (("turns"."role" = 'interviewer' AND "turns"."question_kind" IS NOT NULL AND "turns"."stt_confidence" IS NULL AND "turns"."spoken_duration_ms" IS NULL)
          OR ("turns"."role" = 'candidate' AND "turns"."question_kind" IS NULL AND "turns"."source_question_id" IS NULL))
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "decision_signals" ADD CONSTRAINT "decision_signals_session_id_interview_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."interview_sessions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_session_id_interview_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."interview_sessions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "interview_sessions" ADD CONSTRAINT "interview_sessions_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "turns" ADD CONSTRAINT "turns_session_id_interview_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."interview_sessions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_signals_session" ON "decision_signals" USING btree ("session_id","after_turn_index");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sessions_job_id" ON "interview_sessions" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sessions_status" ON "interview_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sessions_created" ON "interview_sessions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sessions_soft_user" ON "interview_sessions" USING btree ("soft_user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_jobs_slug" ON "jobs" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_turns_session_order" ON "turns" USING btree ("session_id","index");