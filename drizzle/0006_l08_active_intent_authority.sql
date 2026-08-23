ALTER TABLE `action_intents` ADD `supersedes_intent_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_action_intents_one_successor` ON `action_intents` (`workspace_id`,`trace_id`,`supersedes_intent_id`) WHERE `supersedes_intent_id` IS NOT NULL;--> statement-breakpoint
ALTER TABLE `flight_traces` ADD `active_intent_id` text;--> statement-breakpoint
CREATE INDEX `idx_flight_traces_workspace_active_intent` ON `flight_traces` (`workspace_id`,`active_intent_id`);--> statement-breakpoint

CREATE TABLE `__l08_migration_assertions` (`error_code` text NOT NULL);--> statement-breakpoint
CREATE TRIGGER `__trg_l08_migration_assertions`
BEFORE INSERT ON `__l08_migration_assertions`
BEGIN
	SELECT CASE WHEN NEW.`error_code` = 'migration_l08_historical_authority_mismatch' THEN RAISE(ABORT, 'migration_l08_historical_authority_mismatch') END;
	SELECT CASE WHEN NEW.`error_code` = 'migration_l08_required_state_missing_active_intent' THEN RAISE(ABORT, 'migration_l08_required_state_missing_active_intent') END;
END;--> statement-breakpoint

DROP TRIGGER `trg_action_intents_immutable`;--> statement-breakpoint
UPDATE `action_intents` AS current_intent
SET `supersedes_intent_id` = (
	SELECT prior_intent.`id` FROM `action_intents` AS prior_intent
	WHERE prior_intent.`workspace_id` = current_intent.`workspace_id`
		AND prior_intent.`trace_id` = current_intent.`trace_id`
		AND (prior_intent.`created_at` < current_intent.`created_at`
			OR (prior_intent.`created_at` = current_intent.`created_at` AND prior_intent.`rowid` < current_intent.`rowid`))
	ORDER BY prior_intent.`created_at` DESC, prior_intent.`rowid` DESC LIMIT 1
);--> statement-breakpoint

INSERT INTO `__l08_migration_assertions` (`error_code`)
SELECT 'migration_l08_required_state_missing_active_intent'
WHERE EXISTS (
	SELECT 1 FROM `flight_traces` AS trace
	WHERE trace.`current_state` IN ('awaiting_approval', 'executing', 'observing', 'assessed')
		AND NOT EXISTS (
			SELECT 1 FROM `action_intents` AS candidate
			JOIN `policy_decisions` AS policy ON policy.`workspace_id` = candidate.`workspace_id`
				AND policy.`trace_id` = candidate.`trace_id` AND policy.`intent_id` = candidate.`id`
			WHERE candidate.`workspace_id` = trace.`workspace_id` AND candidate.`trace_id` = trace.`id`
				AND candidate.`id` = (
					SELECT latest.`id` FROM `action_intents` AS latest
					WHERE latest.`workspace_id` = trace.`workspace_id` AND latest.`trace_id` = trace.`id`
					ORDER BY latest.`created_at` DESC, latest.`rowid` DESC LIMIT 1
				)
		)
);--> statement-breakpoint

INSERT INTO `__l08_migration_assertions` (`error_code`)
SELECT 'migration_l08_historical_authority_mismatch'
WHERE EXISTS (
	SELECT 1 FROM `flight_traces` AS trace
	WHERE (trace.`current_state` = 'awaiting_approval' AND (
		EXISTS (SELECT 1 FROM `approval_grants` AS grant_row WHERE grant_row.`workspace_id` = trace.`workspace_id` AND grant_row.`trace_id` = trace.`id`)
		OR EXISTS (SELECT 1 FROM `effect_attempts` AS effect WHERE effect.`workspace_id` = trace.`workspace_id` AND effect.`trace_id` = trace.`id`)
	)) OR EXISTS (
		SELECT 1 FROM (
			SELECT grant_row.`intent_id` AS authority_intent_id FROM `approval_grants` AS grant_row
			WHERE grant_row.`workspace_id` = trace.`workspace_id` AND grant_row.`trace_id` = trace.`id`
			UNION
			SELECT effect.`intent_id` FROM `effect_attempts` AS effect
			WHERE effect.`workspace_id` = trace.`workspace_id` AND effect.`trace_id` = trace.`id`
		) AS authority
		WHERE authority.`authority_intent_id` IS NOT (
			SELECT latest.`id` FROM `action_intents` AS latest
			WHERE latest.`workspace_id` = trace.`workspace_id` AND latest.`trace_id` = trace.`id`
			ORDER BY latest.`created_at` DESC, latest.`rowid` DESC LIMIT 1
		)
	)
);--> statement-breakpoint

UPDATE `flight_traces` AS trace
SET `active_intent_id` = (
	SELECT latest.`id` FROM `action_intents` AS latest
	WHERE latest.`workspace_id` = trace.`workspace_id` AND latest.`trace_id` = trace.`id`
	ORDER BY latest.`created_at` DESC, latest.`rowid` DESC LIMIT 1
);--> statement-breakpoint

CREATE TRIGGER `trg_action_intents_immutable`
BEFORE UPDATE ON `action_intents`
BEGIN SELECT RAISE(ABORT, 'action intents are immutable'); END;--> statement-breakpoint

CREATE TRIGGER `trg_flight_traces_active_intent_transition`
BEFORE UPDATE OF `active_intent_id` ON `flight_traces`
WHEN NEW.`active_intent_id` IS NOT OLD.`active_intent_id`
BEGIN
	SELECT CASE WHEN OLD.`active_intent_id` IS NOT NULL AND NEW.`active_intent_id` IS NULL THEN RAISE(ABORT, 'l08_active_intent_pointer_rejected') END;
	SELECT CASE WHEN NOT EXISTS (
		SELECT 1 FROM `action_intents` AS intent
		JOIN `policy_decisions` AS policy ON policy.`workspace_id` = intent.`workspace_id`
			AND policy.`trace_id` = intent.`trace_id` AND policy.`intent_id` = intent.`id`
		WHERE intent.`workspace_id` = NEW.`workspace_id` AND intent.`trace_id` = NEW.`id` AND intent.`id` = NEW.`active_intent_id`
	) THEN RAISE(ABORT, 'l08_active_intent_pointer_rejected') END;
	SELECT CASE WHEN OLD.`active_intent_id` IS NULL AND NOT (
		OLD.`current_state` = 'reasoning' AND EXISTS (
			SELECT 1 FROM `action_intents` AS intent
			WHERE intent.`workspace_id` = NEW.`workspace_id` AND intent.`trace_id` = NEW.`id`
				AND intent.`id` = NEW.`active_intent_id` AND intent.`supersedes_intent_id` IS NULL
		)
	) THEN RAISE(ABORT, 'l08_active_intent_pointer_rejected') END;
	SELECT CASE WHEN OLD.`active_intent_id` IS NOT NULL AND NOT (
		OLD.`current_state` = 'awaiting_approval' AND EXISTS (
			SELECT 1 FROM `action_intents` AS intent
			WHERE intent.`workspace_id` = NEW.`workspace_id` AND intent.`trace_id` = NEW.`id`
				AND intent.`id` = NEW.`active_intent_id` AND intent.`supersedes_intent_id` = OLD.`active_intent_id`
		) AND NOT EXISTS (
			SELECT 1 FROM `approval_grants` AS grant_row WHERE grant_row.`workspace_id` = NEW.`workspace_id` AND grant_row.`trace_id` = NEW.`id`
		) AND NOT EXISTS (
			SELECT 1 FROM `effect_attempts` AS effect WHERE effect.`workspace_id` = NEW.`workspace_id` AND effect.`trace_id` = NEW.`id`
		)
	) THEN RAISE(ABORT, 'l08_active_intent_pointer_rejected') END;
END;--> statement-breakpoint

CREATE TRIGGER `trg_policy_decisions_activate_intent`
AFTER INSERT ON `policy_decisions`
BEGIN
	UPDATE `flight_traces` SET `active_intent_id` = NEW.`intent_id`
	WHERE `workspace_id` = NEW.`workspace_id` AND `id` = NEW.`trace_id`
		AND ((`active_intent_id` IS NULL AND `current_state` = 'reasoning')
			OR (`active_intent_id` IS NOT NULL AND `current_state` = 'awaiting_approval'));
	SELECT CASE WHEN NOT EXISTS (
		SELECT 1 FROM `flight_traces` AS trace
		WHERE trace.`workspace_id` = NEW.`workspace_id` AND trace.`id` = NEW.`trace_id` AND trace.`active_intent_id` = NEW.`intent_id`
	) THEN RAISE(ABORT, 'l08_intent_activation_rejected') END;
END;--> statement-breakpoint

CREATE TRIGGER `trg_flight_traces_required_active_intent`
BEFORE UPDATE OF `current_state` ON `flight_traces`
WHEN NEW.`current_state` IN ('awaiting_approval', 'executing', 'observing', 'assessed')
BEGIN
	SELECT CASE WHEN NEW.`active_intent_id` IS NULL OR NOT EXISTS (
		SELECT 1 FROM `action_intents` AS intent
		JOIN `policy_decisions` AS policy ON policy.`workspace_id` = intent.`workspace_id`
			AND policy.`trace_id` = intent.`trace_id` AND policy.`intent_id` = intent.`id`
		WHERE intent.`workspace_id` = NEW.`workspace_id` AND intent.`trace_id` = NEW.`id` AND intent.`id` = NEW.`active_intent_id`
	) THEN RAISE(ABORT, 'l08_active_intent_pointer_rejected') END;
END;--> statement-breakpoint

CREATE TRIGGER `trg_approval_grants_bind_active_intent`
BEFORE INSERT ON `approval_grants`
BEGIN
	SELECT CASE WHEN NOT EXISTS (
		SELECT 1 FROM `flight_traces` AS trace
		WHERE trace.`workspace_id` = NEW.`workspace_id` AND trace.`id` = NEW.`trace_id`
			AND trace.`current_state` = 'awaiting_approval' AND trace.`active_intent_id` = NEW.`intent_id`
	) THEN RAISE(ABORT, 'l08_stale_or_superseded_intent') END;
END;--> statement-breakpoint

CREATE TRIGGER `trg_effect_attempts_bind_active_intent`
BEFORE INSERT ON `effect_attempts`
BEGIN
	SELECT CASE WHEN NOT EXISTS (
		SELECT 1 FROM `flight_traces` AS trace
		WHERE trace.`workspace_id` = NEW.`workspace_id` AND trace.`id` = NEW.`trace_id`
			AND trace.`current_state` = 'awaiting_approval' AND trace.`active_intent_id` = NEW.`intent_id`
	) THEN RAISE(ABORT, 'l08_stale_or_superseded_intent') END;
END;--> statement-breakpoint

CREATE TRIGGER `trg_flight_trace_events_executing_projection`
BEFORE INSERT ON `flight_trace_events`
WHEN NEW.`subject_type` = 'trace' AND NEW.`current_state` = 'executing'
BEGIN
	SELECT CASE WHEN NOT EXISTS (
		SELECT 1 FROM `flight_traces` AS trace
		WHERE trace.`workspace_id` = NEW.`workspace_id` AND trace.`id` = NEW.`trace_id`
			AND trace.`current_state` = 'executing' AND json_extract(NEW.`payload_json`, '$.intentId') = trace.`active_intent_id`
	) THEN RAISE(ABORT, 'l08_trace_execution_projection_mismatch') END;
END;--> statement-breakpoint

DROP TRIGGER `__trg_l08_migration_assertions`;--> statement-breakpoint
DROP TABLE `__l08_migration_assertions`;
