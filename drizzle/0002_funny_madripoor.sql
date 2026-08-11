CREATE TABLE `case_evidence` (
	`case_id` text NOT NULL,
	`evidence_id` text NOT NULL,
	`workspace_id` text NOT NULL,
	`relation` text NOT NULL,
	`position` integer NOT NULL,
	`linked_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`case_id`, `evidence_id`),
	FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`evidence_id`) REFERENCES `evidence_observations`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_case_evidence_workspace_case` ON `case_evidence` (`workspace_id`,`case_id`);--> statement-breakpoint
CREATE TABLE `evidence_observations` (
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
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_evidence_observations_workspace_key` ON `evidence_observations` (`workspace_id`,`evidence_key`);--> statement-breakpoint
CREATE TRIGGER `trg_evidence_observations_immutable`
BEFORE UPDATE ON `evidence_observations`
BEGIN
	SELECT RAISE(ABORT, 'evidence observations are immutable');
END;--> statement-breakpoint
PRAGMA optimize;
