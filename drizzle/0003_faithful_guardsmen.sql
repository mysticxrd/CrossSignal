PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_approvals` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text NOT NULL,
	`workspace_id` text NOT NULL,
	`cycle` integer NOT NULL,
	`gate` text NOT NULL,
	`payload_hash` text NOT NULL,
	`approved_by` text NOT NULL,
	`external_receipt_id` text,
	`approved_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`workspace_id`,`case_id`) REFERENCES `cases`(`workspace_id`,`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`,`approved_by`) REFERENCES `workspace_members`(`workspace_id`,`user_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "chk_approvals_cycle" CHECK("__new_approvals"."cycle" >= 1),
	CONSTRAINT "chk_approvals_gate" CHECK("__new_approvals"."gate" IN ('evidence', 'intervention', 'learning'))
);
--> statement-breakpoint
INSERT INTO `__new_approvals`("id", "case_id", "workspace_id", "cycle", "gate", "payload_hash", "approved_by", "external_receipt_id", "approved_at") SELECT "id", "case_id", "workspace_id", "cycle", "gate", "payload_hash", "approved_by", "external_receipt_id", "approved_at" FROM `approvals`;--> statement-breakpoint
DROP TABLE `approvals`;--> statement-breakpoint
ALTER TABLE `__new_approvals` RENAME TO `approvals`;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_approvals_case_cycle_gate` ON `approvals` (`workspace_id`,`case_id`,`cycle`,`gate`);--> statement-breakpoint
CREATE INDEX `idx_approvals_case_id` ON `approvals` (`case_id`);--> statement-breakpoint
CREATE TABLE `__new_case_events` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text NOT NULL,
	`workspace_id` text NOT NULL,
	`cycle` integer NOT NULL,
	`event_type` text NOT NULL,
	`actor_user_id` text NOT NULL,
	`payload_json` text DEFAULT '{}' NOT NULL,
	`idempotency_key` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`workspace_id`,`case_id`) REFERENCES `cases`(`workspace_id`,`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`,`actor_user_id`) REFERENCES `workspace_members`(`workspace_id`,`user_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "chk_case_events_cycle" CHECK("__new_case_events"."cycle" >= 1)
);
--> statement-breakpoint
INSERT INTO `__new_case_events`("id", "case_id", "workspace_id", "cycle", "event_type", "actor_user_id", "payload_json", "idempotency_key", "created_at") SELECT "id", "case_id", "workspace_id", "cycle", "event_type", "actor_user_id", "payload_json", "idempotency_key", "created_at" FROM `case_events`;--> statement-breakpoint
DROP TABLE `case_events`;--> statement-breakpoint
ALTER TABLE `__new_case_events` RENAME TO `case_events`;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_case_events_workspace_idempotency` ON `case_events` (`workspace_id`,`idempotency_key`);--> statement-breakpoint
CREATE INDEX `idx_case_events_case_created_at` ON `case_events` (`case_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `__new_case_evidence` (
	`case_id` text NOT NULL,
	`evidence_id` text NOT NULL,
	`workspace_id` text NOT NULL,
	`relation` text NOT NULL,
	`position` integer NOT NULL,
	`linked_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`case_id`, `evidence_id`),
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`,`case_id`) REFERENCES `cases`(`workspace_id`,`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`,`evidence_id`) REFERENCES `evidence_observations`(`workspace_id`,`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "chk_case_evidence_relation" CHECK("__new_case_evidence"."relation" IN ('supports', 'contradicts')),
	CONSTRAINT "chk_case_evidence_position" CHECK("__new_case_evidence"."position" >= 1)
);
--> statement-breakpoint
INSERT INTO `__new_case_evidence`("case_id", "evidence_id", "workspace_id", "relation", "position", "linked_at") SELECT "case_id", "evidence_id", "workspace_id", "relation", "position", "linked_at" FROM `case_evidence`;--> statement-breakpoint
DROP TABLE `case_evidence`;--> statement-breakpoint
ALTER TABLE `__new_case_evidence` RENAME TO `case_evidence`;--> statement-breakpoint
CREATE INDEX `idx_case_evidence_workspace_case` ON `case_evidence` (`workspace_id`,`case_id`);--> statement-breakpoint
CREATE TABLE `__new_cases` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`case_key` text NOT NULL,
	`title` text NOT NULL,
	`stage` integer DEFAULT 0 NOT NULL,
	`cycle` integer DEFAULT 1 NOT NULL,
	`issue_title` text NOT NULL,
	`external_receipt_id` text,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`workspace_id`,`created_by`) REFERENCES `workspace_members`(`workspace_id`,`user_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "chk_cases_stage" CHECK("__new_cases"."stage" BETWEEN 0 AND 5),
	CONSTRAINT "chk_cases_cycle" CHECK("__new_cases"."cycle" >= 1)
);
--> statement-breakpoint
INSERT INTO `__new_cases`("id", "workspace_id", "case_key", "title", "stage", "cycle", "issue_title", "external_receipt_id", "created_by", "created_at", "updated_at") SELECT "id", "workspace_id", "case_key", "title", "stage", "cycle", "issue_title", "external_receipt_id", "created_by", "created_at", "updated_at" FROM `cases`;--> statement-breakpoint
DROP TABLE `cases`;--> statement-breakpoint
ALTER TABLE `__new_cases` RENAME TO `cases`;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_cases_workspace_case_key` ON `cases` (`workspace_id`,`case_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_cases_workspace_id` ON `cases` (`workspace_id`,`id`);--> statement-breakpoint
CREATE INDEX `idx_cases_workspace_stage` ON `cases` (`workspace_id`,`stage`);--> statement-breakpoint
CREATE TABLE `__new_evidence_observations` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`evidence_key` text NOT NULL,
	`source` text NOT NULL,
	`source_class` text NOT NULL,
	`eyebrow` text NOT NULL,
	`title` text NOT NULL,
	`display_value` text NOT NULL,
	`delta` text NOT NULL,
	`detail` text NOT NULL,
	`query_text` text NOT NULL,
	`observed_window` text NOT NULL,
	`ingested_at` text NOT NULL,
	`content_hash` text NOT NULL,
	`identity_level` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`workspace_id`,`created_by`) REFERENCES `workspace_members`(`workspace_id`,`user_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "chk_evidence_source_class" CHECK("__new_evidence_observations"."source_class" IN ('source-posthog', 'source-stripe', 'source-support', 'source-github'))
);
--> statement-breakpoint
INSERT INTO `__new_evidence_observations`("id", "workspace_id", "evidence_key", "source", "source_class", "eyebrow", "title", "display_value", "delta", "detail", "query_text", "observed_window", "ingested_at", "content_hash", "identity_level", "created_by", "created_at") SELECT "id", "workspace_id", "evidence_key", "source", "source_class", "eyebrow", "title", "display_value", "delta", "detail", "query_text", "observed_window", "ingested_at", "content_hash", "identity_level", "created_by", "created_at" FROM `evidence_observations`;--> statement-breakpoint
DROP TABLE `evidence_observations`;--> statement-breakpoint
ALTER TABLE `__new_evidence_observations` RENAME TO `evidence_observations`;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_evidence_observations_workspace_key` ON `evidence_observations` (`workspace_id`,`evidence_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_evidence_observations_workspace_id` ON `evidence_observations` (`workspace_id`,`id`);--> statement-breakpoint
CREATE TRIGGER `trg_evidence_observations_immutable`
BEFORE UPDATE ON `evidence_observations`
BEGIN
	SELECT RAISE(ABORT, 'evidence observations are immutable');
END;--> statement-breakpoint
CREATE TABLE `__new_workspace_members` (
	`workspace_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`joined_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`workspace_id`, `user_id`),
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "chk_workspace_members_role" CHECK("__new_workspace_members"."role" = 'owner')
);
--> statement-breakpoint
INSERT INTO `__new_workspace_members`("workspace_id", "user_id", "role", "joined_at") SELECT "workspace_id", "user_id", "role", "joined_at" FROM `workspace_members`;--> statement-breakpoint
DROP TABLE `workspace_members`;--> statement-breakpoint
ALTER TABLE `__new_workspace_members` RENAME TO `workspace_members`;--> statement-breakpoint
CREATE INDEX `idx_workspace_members_user_id` ON `workspace_members` (`user_id`);--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
PRAGMA optimize;
