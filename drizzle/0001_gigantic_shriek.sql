CREATE TABLE `approvals` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text NOT NULL,
	`workspace_id` text NOT NULL,
	`cycle` integer NOT NULL,
	`gate` text NOT NULL,
	`payload_hash` text NOT NULL,
	`approved_by` text NOT NULL,
	`external_receipt_id` text,
	`approved_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_approvals_case_cycle_gate` ON `approvals` (`workspace_id`,`case_id`,`cycle`,`gate`);--> statement-breakpoint
CREATE INDEX `idx_approvals_case_id` ON `approvals` (`case_id`);--> statement-breakpoint
CREATE TABLE `case_events` (
	`id` text PRIMARY KEY NOT NULL,
	`case_id` text NOT NULL,
	`workspace_id` text NOT NULL,
	`cycle` integer NOT NULL,
	`event_type` text NOT NULL,
	`actor_user_id` text NOT NULL,
	`payload_json` text DEFAULT '{}' NOT NULL,
	`idempotency_key` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_case_events_workspace_idempotency` ON `case_events` (`workspace_id`,`idempotency_key`);--> statement-breakpoint
CREATE INDEX `idx_case_events_case_created_at` ON `case_events` (`case_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `cases` (
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
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_cases_workspace_case_key` ON `cases` (`workspace_id`,`case_key`);--> statement-breakpoint
CREATE INDEX `idx_cases_workspace_stage` ON `cases` (`workspace_id`,`stage`);--> statement-breakpoint
PRAGMA optimize;
