CREATE TABLE `effect_authority_control_bindings` (
	`workspace_id` text NOT NULL,
	`trace_id` text NOT NULL,
	`effect_attempt_id` text NOT NULL,
	`authority_control_event_id` text NOT NULL,
	`authority_control_sequence` integer NOT NULL,
	`authority_control_hash` text NOT NULL,
	`bound_at` text NOT NULL,
	PRIMARY KEY(`workspace_id`, `effect_attempt_id`),
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`,`effect_attempt_id`,`trace_id`) REFERENCES `effect_attempts`(`workspace_id`,`id`,`trace_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`,`authority_control_event_id`) REFERENCES `workspace_authority_control_events`(`workspace_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "chk_effect_authority_binding_sequence" CHECK("effect_authority_control_bindings"."authority_control_sequence" >= 1),
	CONSTRAINT "chk_effect_authority_binding_hash" CHECK(length("effect_authority_control_bindings"."authority_control_hash") = 64 AND "effect_authority_control_bindings"."authority_control_hash" NOT GLOB '*[^0-9a-f]*'),
	CONSTRAINT "chk_effect_authority_binding_time" CHECK(unixepoch("effect_authority_control_bindings"."bound_at") IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE `workspace_authority_control_events` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`sequence` integer NOT NULL,
	`control_kind` text NOT NULL,
	`prior_state` integer,
	`current_state` integer NOT NULL,
	`actor_user_id` text NOT NULL,
	`reason_code` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`payload_json` text NOT NULL,
	`content_hash` text NOT NULL,
	`occurred_at` text NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`workspace_id`,`actor_user_id`) REFERENCES `workspace_members`(`workspace_id`,`user_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "chk_authority_control_events_sequence" CHECK("workspace_authority_control_events"."sequence" >= 1),
	CONSTRAINT "chk_authority_control_events_kind" CHECK("workspace_authority_control_events"."control_kind" = 'kill_switch'),
	CONSTRAINT "chk_authority_control_events_prior_state" CHECK("workspace_authority_control_events"."prior_state" IS NULL OR "workspace_authority_control_events"."prior_state" IN (0, 1)),
	CONSTRAINT "chk_authority_control_events_current_state" CHECK("workspace_authority_control_events"."current_state" IN (0, 1)),
	CONSTRAINT "chk_authority_control_events_reason" CHECK("workspace_authority_control_events"."reason_code" IN ('workspace_initialized', 'migration_backfill', 'owner_transition')),
	CONSTRAINT "chk_authority_control_events_payload" CHECK(json_valid("workspace_authority_control_events"."payload_json")),
	CONSTRAINT "chk_authority_control_events_hash" CHECK(length("workspace_authority_control_events"."content_hash") = 64 AND "workspace_authority_control_events"."content_hash" NOT GLOB '*[^0-9a-f]*'),
	CONSTRAINT "chk_authority_control_events_time" CHECK(unixepoch("workspace_authority_control_events"."occurred_at") IS NOT NULL)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_authority_control_events_workspace_id` ON `workspace_authority_control_events` (`workspace_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_authority_control_events_sequence` ON `workspace_authority_control_events` (`workspace_id`,`sequence`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_authority_control_events_idempotency` ON `workspace_authority_control_events` (`workspace_id`,`idempotency_key`);--> statement-breakpoint
CREATE INDEX `idx_authority_control_events_head` ON `workspace_authority_control_events` (`workspace_id`,`control_kind`,`sequence`);
--> statement-breakpoint

CREATE TABLE `__l04_migration_assertions` (`error_code` text NOT NULL);--> statement-breakpoint
CREATE TRIGGER `__trg_l04_migration_assertions`
BEFORE INSERT ON `__l04_migration_assertions`
BEGIN
	SELECT CASE WHEN NEW.`error_code` = 'migration_l04_unresolvable_effect_authority'
		THEN RAISE(ABORT, 'migration_l04_unresolvable_effect_authority') END;
	SELECT CASE WHEN NEW.`error_code` = 'migration_l04_incomplete_trace_history'
		THEN RAISE(ABORT, 'migration_l04_incomplete_trace_history') END;
END;--> statement-breakpoint

INSERT INTO `__l04_migration_assertions` (`error_code`)
SELECT 'migration_l04_unresolvable_effect_authority'
WHERE EXISTS (
	SELECT 1
	FROM `effect_attempts` attempt
	JOIN `flight_traces` trace
		ON trace.`workspace_id` = attempt.`workspace_id`
		AND trace.`id` = attempt.`trace_id`
	WHERE trace.`truth_mode` <> 'FIXTURE'
		AND NOT EXISTS (
			SELECT 1 FROM `effect_authority_control_bindings` binding
			WHERE binding.`workspace_id` = attempt.`workspace_id`
				AND binding.`effect_attempt_id` = attempt.`id`
				AND binding.`trace_id` = attempt.`trace_id`
		)
);--> statement-breakpoint

INSERT INTO `__l04_migration_assertions` (`error_code`)
SELECT 'migration_l04_incomplete_trace_history'
WHERE EXISTS (
	SELECT 1
	FROM `flight_traces` trace
	WHERE trace.`truth_mode` <> 'FIXTURE'
		AND (
			EXISTS (
				SELECT 1 FROM `action_intents` intent
				WHERE intent.`workspace_id` = trace.`workspace_id`
					AND intent.`trace_id` = trace.`id`
					AND (SELECT COUNT(*) FROM `flight_trace_events` event
						WHERE event.`workspace_id` = intent.`workspace_id`
							AND event.`trace_id` = intent.`trace_id`
							AND event.`subject_type` = 'intent'
							AND event.`subject_id` = intent.`id`) < 4
			) OR EXISTS (
				SELECT 1 FROM `policy_decisions` policy
				WHERE policy.`workspace_id` = trace.`workspace_id`
					AND policy.`trace_id` = trace.`id`
					AND (SELECT COUNT(*) FROM `flight_trace_events` event
						WHERE event.`workspace_id` = policy.`workspace_id`
							AND event.`trace_id` = policy.`trace_id`
							AND event.`subject_type` = 'policy'
							AND event.`subject_id` = policy.`id`) < 2
			) OR EXISTS (
				SELECT 1 FROM `approval_grants` grant_row
				WHERE grant_row.`workspace_id` = trace.`workspace_id`
					AND grant_row.`trace_id` = trace.`id`
					AND (SELECT COUNT(*) FROM `flight_trace_events` event
						WHERE event.`workspace_id` = grant_row.`workspace_id`
							AND event.`trace_id` = grant_row.`trace_id`
							AND event.`subject_type` = 'approval'
							AND event.`subject_id` = grant_row.`id`) < 2
			) OR EXISTS (
				SELECT 1 FROM `effect_attempts` attempt
				WHERE attempt.`workspace_id` = trace.`workspace_id`
					AND attempt.`trace_id` = trace.`id`
					AND (SELECT COUNT(*) FROM `flight_trace_events` event
						WHERE event.`workspace_id` = attempt.`workspace_id`
							AND event.`trace_id` = attempt.`trace_id`
							AND event.`subject_type` = 'effect'
							AND event.`subject_id` = attempt.`id`) <
						(SELECT COUNT(*) FROM `effect_attempt_events` effect_event
							WHERE effect_event.`workspace_id` = attempt.`workspace_id`
								AND effect_event.`effect_attempt_id` = attempt.`id`)
			)
		)
);--> statement-breakpoint

DELETE FROM `flight_traces` WHERE `truth_mode` = 'FIXTURE';--> statement-breakpoint

DROP TRIGGER `trg_effect_attempts_bind_grant`;--> statement-breakpoint
CREATE TRIGGER `trg_effect_attempts_bind_grant`
BEFORE INSERT ON `effect_attempts`
BEGIN
	SELECT CASE WHEN NOT EXISTS (
		SELECT 1
		FROM `approval_grants` grant_row
		JOIN `action_intents` intent
			ON intent.`workspace_id` = grant_row.`workspace_id`
			AND intent.`id` = grant_row.`intent_id`
		JOIN `flight_traces` trace
			ON trace.`workspace_id` = intent.`workspace_id`
			AND trace.`id` = intent.`trace_id`
		WHERE grant_row.`workspace_id` = NEW.`workspace_id`
			AND grant_row.`id` = NEW.`approval_grant_id`
			AND grant_row.`intent_id` = NEW.`intent_id`
			AND grant_row.`trace_id` = NEW.`trace_id`
			AND grant_row.`decision` = 'approved'
			AND grant_row.`approved_by` = NEW.`reserved_by`
			AND intent.`trace_id` = NEW.`trace_id`
			AND intent.`canonical_payload_hash` = NEW.`request_hash`
			AND unixepoch(NEW.`reserved_at`) IS NOT NULL
			AND unixepoch(NEW.`reserved_at`) >= unixepoch(grant_row.`approved_at`)
			AND unixepoch(NEW.`reserved_at`) < unixepoch(grant_row.`expires_at`)
			AND unixepoch(NEW.`reserved_at`) < unixepoch(intent.`expires_at`)
			AND (NEW.`provider_mode` <> 'FIXTURE' OR trace.`truth_mode` = 'FIXTURE')
	) THEN RAISE(ABORT, 'effect reservation has no current exact grant') END;
	SELECT CASE WHEN EXISTS (
		SELECT 1 FROM `effect_attempts` existing
		WHERE existing.`workspace_id` = NEW.`workspace_id`
			AND (existing.`approval_grant_id` = NEW.`approval_grant_id`
				OR existing.`intended_effect_key` = NEW.`intended_effect_key`)
	) THEN RAISE(ABORT, 'effect reservation is a replay or duplicate intended effect') END;
END;--> statement-breakpoint

CREATE TRIGGER `trg_l04_authority_events_append_only`
BEFORE UPDATE ON `workspace_authority_control_events`
BEGIN
	SELECT RAISE(ABORT, 'l04_authority_history_immutable');
END;--> statement-breakpoint
CREATE TRIGGER `trg_l04_authority_events_delete_guard`
BEFORE DELETE ON `workspace_authority_control_events`
BEGIN
	SELECT RAISE(ABORT, 'l04_authority_history_immutable');
END;--> statement-breakpoint
CREATE TRIGGER `trg_l04_authority_events_actor`
BEFORE INSERT ON `workspace_authority_control_events`
WHEN NOT EXISTS (
	SELECT 1 FROM `workspace_members` member
	WHERE member.`workspace_id` = NEW.`workspace_id`
		AND member.`user_id` = NEW.`actor_user_id`
)
BEGIN
	SELECT RAISE(ABORT, 'l04_authority_history_actor_mismatch');
END;--> statement-breakpoint
CREATE TRIGGER `trg_l04_authority_events_sequence`
BEFORE INSERT ON `workspace_authority_control_events`
BEGIN
	SELECT CASE WHEN NEW.`sequence` <> COALESCE((
		SELECT MAX(event.`sequence`) FROM `workspace_authority_control_events` event
		WHERE event.`workspace_id` = NEW.`workspace_id`
			AND event.`control_kind` = NEW.`control_kind`
	), 0) + 1 THEN RAISE(ABORT, 'l04_authority_history_sequence') END;
	SELECT CASE WHEN NEW.`sequence` = 1 AND NEW.`prior_state` IS NOT NULL
		THEN RAISE(ABORT, 'l04_authority_history_sequence') END;
	SELECT CASE WHEN NEW.`sequence` > 1 AND NOT EXISTS (
		SELECT 1 FROM `workspace_authority_control_events` prior
		WHERE prior.`workspace_id` = NEW.`workspace_id`
			AND prior.`control_kind` = NEW.`control_kind`
			AND prior.`sequence` = NEW.`sequence` - 1
			AND prior.`current_state` = NEW.`prior_state`
			AND unixepoch(NEW.`occurred_at`) >= unixepoch(prior.`occurred_at`)
	) THEN RAISE(ABORT, 'l04_authority_history_sequence') END;
	SELECT CASE WHEN NEW.`sequence` > 1 AND NEW.`prior_state` = NEW.`current_state`
		THEN RAISE(ABORT, 'l04_authority_history_noop') END;
END;--> statement-breakpoint

CREATE TRIGGER `trg_l04_legacy_authority_control_frozen`
BEFORE UPDATE ON `workspace_authority_controls`
BEGIN
	SELECT RAISE(ABORT, 'l04_legacy_authority_control_frozen');
END;--> statement-breakpoint
CREATE TRIGGER `trg_l04_legacy_authority_control_frozen_delete`
BEFORE DELETE ON `workspace_authority_controls`
BEGIN
	SELECT RAISE(ABORT, 'l04_legacy_authority_control_frozen');
END;--> statement-breakpoint

CREATE TRIGGER `trg_l04_effect_authority_bindings_immutable`
BEFORE UPDATE ON `effect_authority_control_bindings`
BEGIN
	SELECT RAISE(ABORT, 'l04_effect_authority_immutable');
END;--> statement-breakpoint
CREATE TRIGGER `trg_l04_effect_authority_bindings_delete_guard`
BEFORE DELETE ON `effect_authority_control_bindings`
WHEN EXISTS (
	SELECT 1 FROM `flight_traces` trace
	WHERE trace.`workspace_id` = OLD.`workspace_id`
		AND trace.`id` = OLD.`trace_id`
		AND trace.`truth_mode` <> 'FIXTURE'
)
BEGIN
	SELECT RAISE(ABORT, 'l04_effect_authority_immutable');
END;--> statement-breakpoint
CREATE TRIGGER `trg_l04_effect_authority_binding_exact`
BEFORE INSERT ON `effect_authority_control_bindings`
BEGIN
	SELECT CASE WHEN NOT EXISTS (
		SELECT 1 FROM `workspace_authority_control_events` control_event
		WHERE control_event.`workspace_id` = NEW.`workspace_id`
			AND control_event.`id` = NEW.`authority_control_event_id`
			AND control_event.`control_kind` = 'kill_switch'
			AND control_event.`current_state` = 0
			AND control_event.`sequence` = NEW.`authority_control_sequence`
			AND control_event.`content_hash` = NEW.`authority_control_hash`
			AND unixepoch(NEW.`bound_at`) >= unixepoch(control_event.`occurred_at`)
			AND control_event.`sequence` = (
				SELECT MAX(head.`sequence`) FROM `workspace_authority_control_events` head
				WHERE head.`workspace_id` = NEW.`workspace_id`
					AND head.`control_kind` = 'kill_switch'
			)
	) THEN RAISE(ABORT, 'l04_stale_authority_control') END;
END;--> statement-breakpoint
CREATE TRIGGER `trg_l04_effect_reserved_requires_authority`
BEFORE INSERT ON `effect_attempt_events`
WHEN NEW.`current_state` = 'reserved'
BEGIN
	SELECT CASE WHEN NOT EXISTS (
		SELECT 1 FROM `effect_authority_control_bindings` binding
		WHERE binding.`workspace_id` = NEW.`workspace_id`
			AND binding.`trace_id` = NEW.`trace_id`
			AND binding.`effect_attempt_id` = NEW.`effect_attempt_id`
	) THEN RAISE(ABORT, 'l04_missing_authority_control') END;
END;--> statement-breakpoint
CREATE TRIGGER `trg_l04_trace_executing_requires_authority`
BEFORE INSERT ON `flight_trace_events`
WHEN NEW.`subject_type` = 'trace' AND NEW.`current_state` = 'executing'
BEGIN
	SELECT CASE WHEN NOT EXISTS (
		SELECT 1
		FROM `flight_traces` trace
		JOIN `effect_attempts` attempt
			ON attempt.`workspace_id` = trace.`workspace_id`
			AND attempt.`trace_id` = trace.`id`
		JOIN `effect_authority_control_bindings` binding
			ON binding.`workspace_id` = attempt.`workspace_id`
			AND binding.`trace_id` = attempt.`trace_id`
			AND binding.`effect_attempt_id` = attempt.`id`
		WHERE trace.`workspace_id` = NEW.`workspace_id`
			AND trace.`id` = NEW.`trace_id`
			AND trace.`current_state` = 'executing'
			AND trace.`active_intent_id` = attempt.`intent_id`
			AND json_extract(NEW.`payload_json`, '$.intentRef') = attempt.`intent_id`
			AND json_extract(NEW.`payload_json`, '$.effectRef') = attempt.`id`
			AND json_extract(NEW.`payload_json`, '$.authorityControlEventRef') = binding.`authority_control_event_id`
	) THEN RAISE(ABORT, 'l04_trace_authority_projection_mismatch') END;
END;--> statement-breakpoint

DROP TRIGGER `__trg_l04_migration_assertions`;--> statement-breakpoint
DROP TABLE `__l04_migration_assertions`;--> statement-breakpoint
PRAGMA foreign_key_check;
