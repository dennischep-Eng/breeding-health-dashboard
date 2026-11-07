CREATE TABLE "animals" (
	"id" serial PRIMARY KEY,
	"tag" text NOT NULL UNIQUE,
	"name" text DEFAULT '' NOT NULL,
	"breed" text DEFAULT 'Holstein' NOT NULL,
	"birth_date" date,
	"status" text DEFAULT 'milking' NOT NULL,
	"lactation" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "breeding_events" (
	"id" serial PRIMARY KEY,
	"animal_id" integer NOT NULL,
	"date" date NOT NULL,
	"method" text DEFAULT 'ai' NOT NULL,
	"sire" text DEFAULT '' NOT NULL,
	"technician" text DEFAULT '' NOT NULL,
	"pregnancy_result" text DEFAULT 'pending' NOT NULL,
	"check_date" date,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calving_events" (
	"id" serial PRIMARY KEY,
	"animal_id" integer NOT NULL,
	"date" date NOT NULL,
	"ease" integer DEFAULT 1 NOT NULL,
	"calf_sex" text DEFAULT 'heifer' NOT NULL,
	"calf_tag" text DEFAULT '' NOT NULL,
	"calf_weight_kg" real,
	"outcome" text DEFAULT 'alive' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "health_events" (
	"id" serial PRIMARY KEY,
	"animal_id" integer NOT NULL,
	"date" date NOT NULL,
	"category" text DEFAULT 'other' NOT NULL,
	"condition" text NOT NULL,
	"treatment" text DEFAULT '' NOT NULL,
	"given_by" text DEFAULT '' NOT NULL,
	"withdrawal_until" date,
	"resolved" boolean DEFAULT false NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "breeding_animal_idx" ON "breeding_events" ("animal_id");--> statement-breakpoint
CREATE INDEX "calving_animal_idx" ON "calving_events" ("animal_id");--> statement-breakpoint
CREATE INDEX "health_animal_idx" ON "health_events" ("animal_id");--> statement-breakpoint
ALTER TABLE "breeding_events" ADD CONSTRAINT "breeding_events_animal_id_animals_id_fkey" FOREIGN KEY ("animal_id") REFERENCES "animals"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "calving_events" ADD CONSTRAINT "calving_events_animal_id_animals_id_fkey" FOREIGN KEY ("animal_id") REFERENCES "animals"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "health_events" ADD CONSTRAINT "health_events_animal_id_animals_id_fkey" FOREIGN KEY ("animal_id") REFERENCES "animals"("id") ON DELETE CASCADE;