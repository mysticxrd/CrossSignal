-- Stage 02 guards that SQLite/Drizzle cannot express declaratively.
-- FIXTURE traces remain deletable by the exact reset contract. Durable
-- non-fixture chain-of-custody rows are immutable or append-only.

CREATE TRIGGER `trg_flight_traces_identity_immutable`
BEFORE UPDATE OF `id`, `workspace_id`, `trace_key`, `fixture_key`, `truth_mode`, `retention_class`, `retention_until`, `created_by`, `created_at`
ON `flight_traces`
WHEN NEW.`id` IS NOT OLD.`id`
  OR NEW.`workspace_id` IS NOT OLD.`workspace_id`
  OR NEW.`trace_key` IS NOT OLD.`trace_key`
  OR NEW.`fixture_key` IS NOT OLD.`fixture_key`
  OR NEW.`truth_mode` IS NOT OLD.`truth_mode`
  OR NEW.`retention_class` IS NOT OLD.`retention_class`
  OR NEW.`retention_until` IS NOT OLD.`retention_until`
  OR NEW.`created_by` IS NOT OLD.`created_by`
  OR NEW.`created_at` IS NOT OLD.`created_at`
BEGIN
	SELECT RAISE(ABORT, 'flight trace identity and truth are immutable');
END;--> statement-breakpoint

CREATE TRIGGER `trg_policy_decisions_immutable`
BEFORE UPDATE ON `policy_decisions`
BEGIN
	SELECT RAISE(ABORT, 'policy decisions are immutable');
END;--> statement-breakpoint
CREATE TRIGGER `trg_policy_decisions_delete_guard`
BEFORE DELETE ON `policy_decisions`
WHEN EXISTS (
	SELECT 1 FROM `flight_traces` trace
	WHERE trace.`workspace_id` = OLD.`workspace_id`
		AND trace.`id` = OLD.`trace_id`
		AND trace.`truth_mode` <> 'FIXTURE'
)
BEGIN
	SELECT RAISE(ABORT, 'non-fixture policy decisions cannot be deleted');
END;--> statement-breakpoint
CREATE TRIGGER `trg_policy_decisions_bind_intent`
BEFORE INSERT ON `policy_decisions`
BEGIN
	SELECT CASE WHEN NOT EXISTS (
		SELECT 1 FROM `action_intents` intent
		WHERE intent.`workspace_id` = NEW.`workspace_id`
			AND intent.`id` = NEW.`intent_id`
			AND intent.`trace_id` = NEW.`trace_id`
			AND intent.`policy_version` = NEW.`policy_version`
			AND intent.`policy_hash` = NEW.`policy_hash`
			AND intent.`canonical_payload_hash` = NEW.`evaluated_payload_hash`
			AND intent.`context_manifest_hash` = NEW.`evaluated_context_hash`
			AND unixepoch(NEW.`decided_at`) IS NOT NULL
			AND unixepoch(NEW.`decided_at`) >= unixepoch(intent.`created_at`)
			AND unixepoch(NEW.`decided_at`) < unixepoch(intent.`expires_at`)
	) THEN RAISE(ABORT, 'policy decision is not bound to the current sealed intent') END;
END;--> statement-breakpoint

CREATE TRIGGER `trg_approval_grants_immutable`
BEFORE UPDATE ON `approval_grants`
BEGIN
	SELECT RAISE(ABORT, 'approval grants are immutable');
END;--> statement-breakpoint
CREATE TRIGGER `trg_approval_grants_delete_guard`
BEFORE DELETE ON `approval_grants`
WHEN EXISTS (
	SELECT 1 FROM `flight_traces` trace
	WHERE trace.`workspace_id` = OLD.`workspace_id`
		AND trace.`id` = OLD.`trace_id`
		AND trace.`truth_mode` <> 'FIXTURE'
)
BEGIN
	SELECT RAISE(ABORT, 'non-fixture approval grants cannot be deleted');
END;--> statement-breakpoint
CREATE TRIGGER `trg_approval_grants_bind_authority`
BEFORE INSERT ON `approval_grants`
BEGIN
	SELECT CASE WHEN NOT EXISTS (
		SELECT 1
		FROM `action_intents` intent
		JOIN `policy_decisions` policy
			ON policy.`workspace_id` = intent.`workspace_id`
			AND policy.`intent_id` = intent.`id`
		WHERE intent.`workspace_id` = NEW.`workspace_id`
			AND intent.`id` = NEW.`intent_id`
			AND intent.`trace_id` = NEW.`trace_id`
			AND policy.`id` = NEW.`policy_decision_id`
			AND policy.`trace_id` = NEW.`trace_id`
			AND policy.`verdict` = 'approval_required'
			AND NEW.`bound_payload_hash` = intent.`canonical_payload_hash`
			AND NEW.`bound_context_hash` = intent.`context_manifest_hash`
			AND NEW.`bound_policy_hash` = intent.`policy_hash`
			AND NEW.`bound_recipient_set_hash` = intent.`recipient_set_hash`
			AND NEW.`nonce` = intent.`nonce`
			AND unixepoch(NEW.`approved_at`) IS NOT NULL
			AND unixepoch(NEW.`expires_at`) IS NOT NULL
			AND unixepoch(NEW.`approved_at`) >= unixepoch(policy.`decided_at`)
			AND unixepoch(NEW.`approved_at`) < unixepoch(NEW.`expires_at`)
			AND unixepoch(NEW.`expires_at`) <= unixepoch(intent.`expires_at`)
	) THEN RAISE(ABORT, 'approval is not exact, current, and payload-bound') END;
END;--> statement-breakpoint

CREATE TRIGGER `trg_effect_attempts_immutable`
BEFORE UPDATE ON `effect_attempts`
BEGIN
	SELECT RAISE(ABORT, 'effect reservations are immutable');
END;--> statement-breakpoint
CREATE TRIGGER `trg_effect_attempts_delete_guard`
BEFORE DELETE ON `effect_attempts`
WHEN EXISTS (
	SELECT 1 FROM `flight_traces` trace
	WHERE trace.`workspace_id` = OLD.`workspace_id`
		AND trace.`id` = OLD.`trace_id`
		AND trace.`truth_mode` <> 'FIXTURE'
)
BEGIN
	SELECT RAISE(ABORT, 'non-fixture effect reservations cannot be deleted');
END;--> statement-breakpoint
CREATE TRIGGER `trg_effect_attempts_bind_grant`
BEFORE INSERT ON `effect_attempts`
BEGIN
	SELECT CASE WHEN NOT EXISTS (
		SELECT 1 FROM `workspace_authority_controls` controls
		WHERE controls.`workspace_id` = NEW.`workspace_id`
			AND controls.`kill_switch_engaged` = 0
	) THEN RAISE(ABORT, 'effect reservation requires an explicit disengaged kill switch') END;
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
			AND (
				existing.`approval_grant_id` = NEW.`approval_grant_id`
				OR existing.`intended_effect_key` = NEW.`intended_effect_key`
			)
	) THEN RAISE(ABORT, 'effect reservation is a replay or duplicate intended effect') END;
END;--> statement-breakpoint

CREATE TRIGGER `trg_effect_attempt_events_append_only`
BEFORE UPDATE ON `effect_attempt_events`
BEGIN
	SELECT RAISE(ABORT, 'effect attempt events are append-only');
END;--> statement-breakpoint
CREATE TRIGGER `trg_effect_attempt_events_delete_guard`
BEFORE DELETE ON `effect_attempt_events`
WHEN EXISTS (
	SELECT 1 FROM `flight_traces` trace
	WHERE trace.`workspace_id` = OLD.`workspace_id`
		AND trace.`id` = OLD.`trace_id`
		AND trace.`truth_mode` <> 'FIXTURE'
)
BEGIN
	SELECT RAISE(ABORT, 'non-fixture effect events cannot be deleted');
END;--> statement-breakpoint
CREATE TRIGGER `trg_effect_attempt_events_attempt_binding`
BEFORE INSERT ON `effect_attempt_events`
BEGIN
	SELECT CASE WHEN NOT EXISTS (
		SELECT 1 FROM `effect_attempts` attempt
		WHERE attempt.`workspace_id` = NEW.`workspace_id`
			AND attempt.`id` = NEW.`effect_attempt_id`
			AND attempt.`trace_id` = NEW.`trace_id`
			AND unixepoch(NEW.`occurred_at`) IS NOT NULL
			AND unixepoch(NEW.`occurred_at`) >= unixepoch(attempt.`reserved_at`)
	) THEN RAISE(ABORT, 'effect event is outside its attempt, trace, or time') END;
END;--> statement-breakpoint
CREATE TRIGGER `trg_effect_attempt_events_transition`
BEFORE INSERT ON `effect_attempt_events`
BEGIN
	SELECT CASE WHEN NEW.`sequence` <> COALESCE((
		SELECT MAX(event.`sequence`)
		FROM `effect_attempt_events` event
		WHERE event.`workspace_id` = NEW.`workspace_id`
			AND event.`effect_attempt_id` = NEW.`effect_attempt_id`
	), 0) + 1 THEN RAISE(ABORT, 'effect event sequence is not the exact next value') END;
	SELECT CASE WHEN NEW.`sequence` = 1
		AND (NEW.`prior_state` IS NOT NULL OR NEW.`current_state` <> 'reserved')
		THEN RAISE(ABORT, 'first effect event must initialize reserved state') END;
	SELECT CASE WHEN NEW.`sequence` > 1 AND NOT EXISTS (
		SELECT 1 FROM `effect_attempt_events` prior
		WHERE prior.`workspace_id` = NEW.`workspace_id`
			AND prior.`effect_attempt_id` = NEW.`effect_attempt_id`
			AND prior.`sequence` = NEW.`sequence` - 1
			AND prior.`current_state` = NEW.`prior_state`
			AND unixepoch(NEW.`occurred_at`) >= unixepoch(prior.`occurred_at`)
	) THEN RAISE(ABORT, 'effect event prior state or time is invalid') END;
	SELECT CASE WHEN NEW.`sequence` > 1 AND NOT (
		(NEW.`prior_state` = 'reserved' AND NEW.`current_state` IN ('dispatching', 'failed')) OR
		(NEW.`prior_state` = 'dispatching' AND NEW.`current_state` IN ('confirmed', 'failed', 'indeterminate')) OR
		(NEW.`prior_state` = 'indeterminate' AND NEW.`current_state` IN ('reconciled_confirmed', 'reconciled_failed'))
	) THEN RAISE(ABORT, 'effect state transition is invalid') END;
	SELECT CASE WHEN NOT (
		(NEW.`current_state` IN ('reserved', 'dispatching')
			AND NEW.`provider_receipt_id` IS NULL
			AND NEW.`provider_response_hash` IS NULL
			AND NEW.`error_code` IS NULL) OR
		(NEW.`current_state` IN ('confirmed', 'reconciled_confirmed')
			AND NEW.`provider_receipt_id` IS NOT NULL
			AND NEW.`provider_response_hash` IS NOT NULL
			AND NEW.`error_code` IS NULL) OR
		(NEW.`current_state` IN ('failed', 'indeterminate', 'reconciled_failed')
			AND NEW.`provider_receipt_id` IS NULL
			AND NEW.`error_code` IS NOT NULL)
	) THEN RAISE(ABORT, 'effect event receipt and error shape is invalid') END;
END;--> statement-breakpoint

CREATE TRIGGER `trg_outcome_definitions_immutable`
BEFORE UPDATE ON `outcome_definitions`
BEGIN
	SELECT RAISE(ABORT, 'outcome definitions are immutable');
END;--> statement-breakpoint
CREATE TRIGGER `trg_outcome_definitions_delete_guard`
BEFORE DELETE ON `outcome_definitions`
WHEN EXISTS (
	SELECT 1 FROM `flight_traces` trace
	WHERE trace.`workspace_id` = OLD.`workspace_id`
		AND trace.`id` = OLD.`trace_id`
		AND trace.`truth_mode` <> 'FIXTURE'
)
BEGIN
	SELECT RAISE(ABORT, 'non-fixture outcome definitions cannot be deleted');
END;--> statement-breakpoint

CREATE TRIGGER `trg_outcome_observations_immutable`
BEFORE UPDATE ON `outcome_observations`
BEGIN
	SELECT RAISE(ABORT, 'outcome observations are immutable');
END;--> statement-breakpoint
CREATE TRIGGER `trg_outcome_observations_delete_guard`
BEFORE DELETE ON `outcome_observations`
WHEN EXISTS (
	SELECT 1 FROM `flight_traces` trace
	WHERE trace.`workspace_id` = OLD.`workspace_id`
		AND trace.`id` = OLD.`trace_id`
		AND trace.`truth_mode` <> 'FIXTURE'
)
BEGIN
	SELECT RAISE(ABORT, 'non-fixture outcome observations cannot be deleted');
END;--> statement-breakpoint
CREATE TRIGGER `trg_outcome_observations_bindings`
BEFORE INSERT ON `outcome_observations`
BEGIN
	SELECT CASE WHEN NOT EXISTS (
		SELECT 1
		FROM `outcome_definitions` definition
		JOIN `flight_evidence` evidence
			ON evidence.`workspace_id` = definition.`workspace_id`
		WHERE definition.`workspace_id` = NEW.`workspace_id`
			AND definition.`id` = NEW.`definition_id`
			AND definition.`trace_id` = NEW.`trace_id`
			AND evidence.`id` = NEW.`source_evidence_id`
			AND evidence.`trace_id` = NEW.`trace_id`
			AND evidence.`truth_mode` = NEW.`truth_mode`
			AND unixepoch(NEW.`observed_at`) BETWEEN unixepoch(definition.`window_starts_at`) AND unixepoch(definition.`window_ends_at`)
	) THEN RAISE(ABORT, 'outcome observation is outside its trace, evidence, truth, or window') END;
END;--> statement-breakpoint

CREATE TRIGGER `trg_outcome_assessments_immutable`
BEFORE UPDATE ON `outcome_assessments`
BEGIN
	SELECT RAISE(ABORT, 'outcome assessments are immutable');
END;--> statement-breakpoint
CREATE TRIGGER `trg_outcome_assessments_delete_guard`
BEFORE DELETE ON `outcome_assessments`
WHEN EXISTS (
	SELECT 1 FROM `flight_traces` trace
	WHERE trace.`workspace_id` = OLD.`workspace_id`
		AND trace.`id` = OLD.`trace_id`
		AND trace.`truth_mode` <> 'FIXTURE'
)
BEGIN
	SELECT RAISE(ABORT, 'non-fixture outcome assessments cannot be deleted');
END;--> statement-breakpoint
CREATE TRIGGER `trg_outcome_assessments_bindings`
BEFORE INSERT ON `outcome_assessments`
BEGIN
	SELECT CASE WHEN NOT EXISTS (
		SELECT 1 FROM `outcome_definitions` definition
		WHERE definition.`workspace_id` = NEW.`workspace_id`
			AND definition.`id` = NEW.`definition_id`
			AND definition.`trace_id` = NEW.`trace_id`
	) THEN RAISE(ABORT, 'outcome assessment definition is outside its trace') END;
	SELECT CASE WHEN EXISTS (
		SELECT 1 FROM json_each(NEW.`evidence_ids_json`) citation
		WHERE json_type(NEW.`evidence_ids_json`, '$[' || citation.`key` || ']') <> 'text'
			OR (
				NOT EXISTS (
					SELECT 1 FROM `flight_evidence` evidence
					WHERE evidence.`workspace_id` = NEW.`workspace_id`
						AND evidence.`trace_id` = NEW.`trace_id`
						AND evidence.`evidence_key` = citation.`value`
				)
				AND NOT EXISTS (
					SELECT 1 FROM `outcome_observations` observation
					WHERE observation.`workspace_id` = NEW.`workspace_id`
						AND observation.`trace_id` = NEW.`trace_id`
						AND observation.`definition_id` = NEW.`definition_id`
						AND observation.`observation_key` = citation.`value`
				)
			)
	) THEN RAISE(ABORT, 'outcome assessment cites evidence outside its trace') END;
	SELECT CASE WHEN NEW.`assessment_version` = 1 AND EXISTS (
		SELECT 1 FROM `outcome_assessments` existing
		WHERE existing.`workspace_id` = NEW.`workspace_id`
			AND existing.`definition_id` = NEW.`definition_id`
	) THEN RAISE(ABORT, 'first outcome assessment already exists') END;
	SELECT CASE WHEN NEW.`assessment_version` > 1 AND NOT EXISTS (
		SELECT 1 FROM `outcome_assessments` prior
		WHERE prior.`workspace_id` = NEW.`workspace_id`
			AND prior.`definition_id` = NEW.`definition_id`
			AND prior.`assessment_version` = NEW.`assessment_version` - 1
	) THEN RAISE(ABORT, 'outcome assessment version has a gap') END;
	SELECT CASE WHEN NEW.`label` = 'supported' AND (
		EXISTS (
			SELECT 1
			FROM json_each(NEW.`evidence_ids_json`) citation
			JOIN `outcome_observations` observation
				ON observation.`workspace_id` = NEW.`workspace_id`
				AND observation.`trace_id` = NEW.`trace_id`
				AND observation.`definition_id` = NEW.`definition_id`
				AND observation.`observation_key` = citation.`value`
			WHERE observation.`truth_mode` = 'FIXTURE'
				OR observation.`signature_status` <> 'verified'
		) OR NOT EXISTS (
			SELECT 1
			FROM json_each(NEW.`evidence_ids_json`) citation
			JOIN `outcome_observations` observation
				ON observation.`workspace_id` = NEW.`workspace_id`
				AND observation.`trace_id` = NEW.`trace_id`
				AND observation.`definition_id` = NEW.`definition_id`
				AND observation.`observation_key` = citation.`value`
			WHERE observation.`truth_mode` IN ('LIVE', 'TEST')
				AND observation.`signature_status` = 'verified'
		)
	) THEN RAISE(ABORT, 'fixture or unverified observations cannot support an outcome') END;
END;--> statement-breakpoint

CREATE TRIGGER `trg_outcome_supersessions_bindings`
BEFORE INSERT ON `outcome_assessment_supersessions`
BEGIN
	SELECT CASE WHEN NOT EXISTS (
		SELECT 1
		FROM `outcome_assessments` prior
		JOIN `outcome_assessments` current
			ON current.`workspace_id` = prior.`workspace_id`
			AND current.`trace_id` = prior.`trace_id`
			AND current.`definition_id` = prior.`definition_id`
		WHERE prior.`workspace_id` = NEW.`workspace_id`
			AND prior.`trace_id` = NEW.`trace_id`
			AND prior.`definition_id` = NEW.`definition_id`
			AND prior.`id` = NEW.`prior_assessment_id`
			AND current.`id` = NEW.`current_assessment_id`
			AND current.`assessment_version` = prior.`assessment_version` + 1
			AND unixepoch(current.`created_at`) >= unixepoch(prior.`created_at`)
	) THEN RAISE(ABORT, 'outcome supersession must bind consecutive assessments in one trace') END;
	SELECT CASE WHEN EXISTS (
		SELECT 1 FROM `outcome_assessment_supersessions` existing
		WHERE existing.`workspace_id` = NEW.`workspace_id`
			AND existing.`prior_assessment_id` = NEW.`prior_assessment_id`
	) THEN RAISE(ABORT, 'outcome assessment is already superseded') END;
END;--> statement-breakpoint
CREATE TRIGGER `trg_outcome_supersessions_immutable`
BEFORE UPDATE ON `outcome_assessment_supersessions`
BEGIN
	SELECT RAISE(ABORT, 'outcome assessment supersessions are immutable');
END;--> statement-breakpoint
CREATE TRIGGER `trg_outcome_supersessions_delete_guard`
BEFORE DELETE ON `outcome_assessment_supersessions`
WHEN EXISTS (
	SELECT 1 FROM `flight_traces` trace
	WHERE trace.`workspace_id` = OLD.`workspace_id`
		AND trace.`id` = OLD.`trace_id`
		AND trace.`truth_mode` <> 'FIXTURE'
)
BEGIN
	SELECT RAISE(ABORT, 'non-fixture outcome supersessions cannot be deleted');
END;--> statement-breakpoint
CREATE TRIGGER `trg_flight_traces_transition`
BEFORE UPDATE OF `current_state` ON `flight_traces`
BEGIN
	SELECT CASE WHEN NOT (
		(OLD.`current_state` = 'collecting' AND NEW.`current_state` IN ('context_frozen', 'failed', 'cancelled')) OR
		(OLD.`current_state` = 'context_frozen' AND NEW.`current_state` IN ('reasoning', 'failed', 'cancelled')) OR
		(OLD.`current_state` = 'reasoning' AND NEW.`current_state` IN ('awaiting_approval', 'failed', 'cancelled')) OR
		(OLD.`current_state` = 'awaiting_approval' AND NEW.`current_state` IN ('executing', 'failed', 'cancelled')) OR
		(OLD.`current_state` = 'executing' AND NEW.`current_state` IN ('observing', 'failed', 'cancelled')) OR
		(OLD.`current_state` = 'observing' AND NEW.`current_state` IN ('assessed', 'failed', 'cancelled'))
	) THEN RAISE(ABORT, 'invalid flight trace transition') END;
END;--> statement-breakpoint
CREATE TRIGGER `trg_flight_traces_delete_guard`
BEFORE DELETE ON `flight_traces`
WHEN OLD.`truth_mode` <> 'FIXTURE'
BEGIN
	SELECT RAISE(ABORT, 'non-fixture flight traces cannot be deleted');
END;--> statement-breakpoint

CREATE TRIGGER `trg_flight_evidence_immutable`
BEFORE UPDATE ON `flight_evidence`
BEGIN
	SELECT RAISE(ABORT, 'flight evidence is immutable');
END;--> statement-breakpoint
CREATE TRIGGER `trg_flight_evidence_delete_guard`
BEFORE DELETE ON `flight_evidence`
WHEN EXISTS (
	SELECT 1 FROM `flight_traces` t
	WHERE t.`workspace_id` = OLD.`workspace_id`
		AND t.`id` = OLD.`trace_id`
		AND t.`truth_mode` <> 'FIXTURE'
)
BEGIN
	SELECT RAISE(ABORT, 'non-fixture flight evidence cannot be deleted');
END;--> statement-breakpoint

CREATE TRIGGER `trg_context_snapshots_identity_immutable`
BEFORE UPDATE OF `id`, `workspace_id`, `trace_id`, `snapshot_key`, `truth_mode`, `source_count`, `ordered_manifest_json`, `manifest_hash`, `created_by`, `created_at`
ON `context_snapshots`
WHEN NEW.`id` IS NOT OLD.`id`
  OR NEW.`workspace_id` IS NOT OLD.`workspace_id`
  OR NEW.`trace_id` IS NOT OLD.`trace_id`
  OR NEW.`snapshot_key` IS NOT OLD.`snapshot_key`
  OR NEW.`truth_mode` IS NOT OLD.`truth_mode`
  OR NEW.`source_count` IS NOT OLD.`source_count`
  OR NEW.`ordered_manifest_json` IS NOT OLD.`ordered_manifest_json`
  OR NEW.`manifest_hash` IS NOT OLD.`manifest_hash`
  OR NEW.`created_by` IS NOT OLD.`created_by`
  OR NEW.`created_at` IS NOT OLD.`created_at`
BEGIN
	SELECT RAISE(ABORT, 'context snapshot identity and manifest are immutable');
END;--> statement-breakpoint
CREATE TRIGGER `trg_context_snapshots_transition`
BEFORE UPDATE OF `current_state`, `frozen_at` ON `context_snapshots`
BEGIN
	SELECT CASE WHEN NOT (
		(
			OLD.`current_state` = 'collecting'
			AND NEW.`current_state` = 'frozen'
			AND OLD.`frozen_at` IS NULL
			AND unixepoch(NEW.`frozen_at`) IS NOT NULL
			AND (
				SELECT COUNT(*) FROM `context_snapshot_sources` s
				WHERE s.`workspace_id` = OLD.`workspace_id`
					AND s.`snapshot_id` = OLD.`id`
			) = OLD.`source_count`
			AND NOT EXISTS (
				SELECT 1
				FROM json_each(OLD.`ordered_manifest_json`) manifest
				LEFT JOIN `context_snapshot_sources` s
					ON s.`workspace_id` = OLD.`workspace_id`
					AND s.`snapshot_id` = OLD.`id`
					AND s.`position` = CAST(manifest.`key` AS INTEGER) + 1
				WHERE s.`snapshot_id` IS NULL
					OR s.`source_id` IS NOT json_extract(manifest.`value`, '$.sourceId')
					OR s.`source_kind` IS NOT json_extract(manifest.`value`, '$.sourceKind')
					OR s.`source_version` IS NOT json_extract(manifest.`value`, '$.sourceVersion')
					OR s.`source_ref` IS NOT json_extract(manifest.`value`, '$.sourceRef')
					OR s.`content_hash` IS NOT json_extract(manifest.`value`, '$.contentHash')
					OR s.`access_decision` IS NOT json_extract(manifest.`value`, '$.accessDecision')
					OR json(s.`retrieval_json`) <> json(json_extract(manifest.`value`, '$.retrieval'))
			)
		) OR (
			OLD.`current_state` = 'frozen'
			AND NEW.`current_state` = 'superseded'
			AND NEW.`frozen_at` IS OLD.`frozen_at`
			AND EXISTS (
				SELECT 1 FROM `context_snapshot_supersessions` supersession
				WHERE supersession.`workspace_id` = OLD.`workspace_id`
					AND supersession.`trace_id` = OLD.`trace_id`
					AND supersession.`prior_snapshot_id` = OLD.`id`
			)
		)
	) THEN RAISE(ABORT, 'invalid context snapshot transition or incomplete manifest') END;
END;--> statement-breakpoint
CREATE TRIGGER `trg_context_snapshots_delete_guard`
BEFORE DELETE ON `context_snapshots`
WHEN OLD.`truth_mode` <> 'FIXTURE'
BEGIN
	SELECT RAISE(ABORT, 'non-fixture context snapshots cannot be deleted');
END;--> statement-breakpoint

CREATE TRIGGER `trg_context_snapshot_sources_immutable`
BEFORE UPDATE ON `context_snapshot_sources`
BEGIN
	SELECT RAISE(ABORT, 'context snapshot sources are immutable');
END;--> statement-breakpoint
CREATE TRIGGER `trg_context_snapshot_sources_bind_manifest`
BEFORE INSERT ON `context_snapshot_sources`
BEGIN
	SELECT CASE WHEN NOT EXISTS (
		SELECT 1
		FROM `context_snapshots` snapshot
		WHERE snapshot.`workspace_id` = NEW.`workspace_id`
			AND snapshot.`id` = NEW.`snapshot_id`
			AND snapshot.`current_state` = 'collecting'
			AND NEW.`position` <= snapshot.`source_count`
			AND NEW.`source_id` = json_extract(snapshot.`ordered_manifest_json`, '$[' || (NEW.`position` - 1) || '].sourceId')
			AND NEW.`source_kind` = json_extract(snapshot.`ordered_manifest_json`, '$[' || (NEW.`position` - 1) || '].sourceKind')
			AND NEW.`source_version` = json_extract(snapshot.`ordered_manifest_json`, '$[' || (NEW.`position` - 1) || '].sourceVersion')
			AND NEW.`source_ref` = json_extract(snapshot.`ordered_manifest_json`, '$[' || (NEW.`position` - 1) || '].sourceRef')
			AND NEW.`content_hash` = json_extract(snapshot.`ordered_manifest_json`, '$[' || (NEW.`position` - 1) || '].contentHash')
			AND NEW.`access_decision` = json_extract(snapshot.`ordered_manifest_json`, '$[' || (NEW.`position` - 1) || '].accessDecision')
			AND json(NEW.`retrieval_json`) = json(json_extract(snapshot.`ordered_manifest_json`, '$[' || (NEW.`position` - 1) || '].retrieval'))
	) THEN RAISE(ABORT, 'context source does not exactly match its collecting manifest') END;
	SELECT CASE WHEN NOT EXISTS (
		SELECT 1
		FROM `context_snapshots` snapshot
		JOIN `flight_evidence` evidence
			ON evidence.`workspace_id` = snapshot.`workspace_id`
			AND evidence.`trace_id` = snapshot.`trace_id`
		WHERE snapshot.`workspace_id` = NEW.`workspace_id`
			AND snapshot.`id` = NEW.`snapshot_id`
			AND evidence.`evidence_key` = NEW.`source_id`
			AND evidence.`source_kind` = NEW.`source_kind`
			AND evidence.`source_version` = NEW.`source_version`
			AND evidence.`source_ref` = NEW.`source_ref`
			AND evidence.`content_hash` = NEW.`content_hash`
			AND evidence.`truth_mode` = snapshot.`truth_mode`
	) THEN RAISE(ABORT, 'context source has no exact trace evidence') END;
END;--> statement-breakpoint
CREATE TRIGGER `trg_context_snapshot_sources_delete_guard`
BEFORE DELETE ON `context_snapshot_sources`
WHEN EXISTS (
	SELECT 1 FROM `context_snapshots` snapshot
	WHERE snapshot.`workspace_id` = OLD.`workspace_id`
		AND snapshot.`id` = OLD.`snapshot_id`
		AND snapshot.`truth_mode` <> 'FIXTURE'
)
BEGIN
	SELECT RAISE(ABORT, 'non-fixture context sources cannot be deleted');
END;--> statement-breakpoint

CREATE TRIGGER `trg_context_supersessions_bindings`
BEFORE INSERT ON `context_snapshot_supersessions`
BEGIN
	SELECT CASE WHEN NOT EXISTS (
		SELECT 1
		FROM `context_snapshots` prior
		JOIN `context_snapshots` current
			ON current.`workspace_id` = prior.`workspace_id`
			AND current.`trace_id` = prior.`trace_id`
		WHERE prior.`workspace_id` = NEW.`workspace_id`
			AND prior.`trace_id` = NEW.`trace_id`
			AND prior.`id` = NEW.`prior_snapshot_id`
			AND current.`id` = NEW.`current_snapshot_id`
			AND prior.`current_state` = 'frozen'
			AND current.`current_state` = 'frozen'
			AND unixepoch(current.`frozen_at`) >= unixepoch(prior.`frozen_at`)
	) THEN RAISE(ABORT, 'context supersession must bind frozen snapshots in one trace') END;
	SELECT CASE WHEN EXISTS (
		SELECT 1 FROM `context_snapshot_supersessions` existing
		WHERE existing.`workspace_id` = NEW.`workspace_id`
			AND existing.`prior_snapshot_id` = NEW.`prior_snapshot_id`
	) THEN RAISE(ABORT, 'context snapshot is already superseded') END;
END;--> statement-breakpoint
CREATE TRIGGER `trg_context_supersessions_immutable`
BEFORE UPDATE ON `context_snapshot_supersessions`
BEGIN
	SELECT RAISE(ABORT, 'context supersessions are immutable');
END;--> statement-breakpoint
CREATE TRIGGER `trg_context_supersessions_delete_guard`
BEFORE DELETE ON `context_snapshot_supersessions`
WHEN EXISTS (
	SELECT 1 FROM `context_snapshots` prior
	WHERE prior.`workspace_id` = OLD.`workspace_id`
		AND prior.`id` = OLD.`prior_snapshot_id`
		AND prior.`truth_mode` <> 'FIXTURE'
)
BEGIN
	SELECT RAISE(ABORT, 'non-fixture context supersessions cannot be deleted');
END;--> statement-breakpoint

CREATE TRIGGER `trg_reasoning_nodes_identity_immutable`
BEFORE UPDATE OF `id`, `workspace_id`, `trace_id`, `node_key`, `attempt`, `input_hash`, `created_at`
ON `reasoning_nodes`
WHEN NEW.`id` IS NOT OLD.`id`
  OR NEW.`workspace_id` IS NOT OLD.`workspace_id`
  OR NEW.`trace_id` IS NOT OLD.`trace_id`
  OR NEW.`node_key` IS NOT OLD.`node_key`
  OR NEW.`attempt` IS NOT OLD.`attempt`
  OR NEW.`input_hash` IS NOT OLD.`input_hash`
  OR NEW.`created_at` IS NOT OLD.`created_at`
BEGIN
	SELECT RAISE(ABORT, 'reasoning node identity and input are immutable');
END;--> statement-breakpoint
CREATE TRIGGER `trg_reasoning_nodes_transition`
BEFORE UPDATE OF `current_state`, `output_hash`, `error_code`, `started_at`, `completed_at`
ON `reasoning_nodes`
BEGIN
	SELECT CASE WHEN NOT (
		(
			OLD.`current_state` = 'pending'
			AND NEW.`current_state` = 'running'
			AND unixepoch(NEW.`started_at`) IS NOT NULL
			AND NEW.`completed_at` IS NULL
			AND NEW.`output_hash` IS NULL
			AND NEW.`error_code` IS NULL
		) OR (
			OLD.`current_state` = 'pending'
			AND NEW.`current_state` = 'skipped'
			AND unixepoch(NEW.`completed_at`) IS NOT NULL
			AND NEW.`output_hash` IS NULL
		) OR (
			OLD.`current_state` = 'running'
			AND NEW.`current_state` = 'succeeded'
			AND NEW.`started_at` IS OLD.`started_at`
			AND unixepoch(NEW.`completed_at`) >= unixepoch(NEW.`started_at`)
			AND NEW.`output_hash` IS NOT NULL
			AND NEW.`error_code` IS NULL
		) OR (
			OLD.`current_state` = 'running'
			AND NEW.`current_state` = 'failed'
			AND NEW.`started_at` IS OLD.`started_at`
			AND unixepoch(NEW.`completed_at`) >= unixepoch(NEW.`started_at`)
			AND NEW.`output_hash` IS NULL
			AND NEW.`error_code` IS NOT NULL
		)
	) THEN RAISE(ABORT, 'invalid reasoning node transition or state payload') END;
END;--> statement-breakpoint
CREATE TRIGGER `trg_reasoning_nodes_delete_guard`
BEFORE DELETE ON `reasoning_nodes`
WHEN EXISTS (
	SELECT 1 FROM `flight_traces` trace
	WHERE trace.`workspace_id` = OLD.`workspace_id`
		AND trace.`id` = OLD.`trace_id`
		AND trace.`truth_mode` <> 'FIXTURE'
)
BEGIN
	SELECT RAISE(ABORT, 'non-fixture reasoning nodes cannot be deleted');
END;--> statement-breakpoint

CREATE TRIGGER `trg_reasoning_artifacts_immutable`
BEFORE UPDATE ON `reasoning_artifacts`
BEGIN
	SELECT RAISE(ABORT, 'reasoning artifacts are immutable');
END;--> statement-breakpoint
CREATE TRIGGER `trg_reasoning_artifacts_bindings`
BEFORE INSERT ON `reasoning_artifacts`
BEGIN
	SELECT CASE WHEN NOT EXISTS (
		SELECT 1 FROM `reasoning_nodes` node
		WHERE node.`workspace_id` = NEW.`workspace_id`
			AND node.`id` = NEW.`node_id`
			AND node.`trace_id` = NEW.`trace_id`
			AND node.`current_state` = 'succeeded'
			AND node.`output_hash` = NEW.`content_hash`
	) THEN RAISE(ABORT, 'reasoning artifact is not the succeeded node output') END;
	SELECT CASE WHEN EXISTS (
		SELECT 1 FROM json_each(NEW.`evidence_citations_json`) citation
		WHERE json_type(NEW.`evidence_citations_json`, '$[' || citation.`key` || ']') <> 'text'
			OR NOT EXISTS (
				SELECT 1 FROM `flight_evidence` evidence
				WHERE evidence.`workspace_id` = NEW.`workspace_id`
					AND evidence.`trace_id` = NEW.`trace_id`
					AND evidence.`evidence_key` = citation.`value`
			)
	) THEN RAISE(ABORT, 'reasoning artifact cites evidence outside its trace') END;
	SELECT CASE WHEN (
		SELECT COUNT(*) FROM json_each(NEW.`evidence_citations_json`)
	) <> (
		SELECT COUNT(DISTINCT value) FROM json_each(NEW.`evidence_citations_json`)
	) THEN RAISE(ABORT, 'reasoning artifact contains duplicate citations') END;
END;--> statement-breakpoint
CREATE TRIGGER `trg_reasoning_artifacts_delete_guard`
BEFORE DELETE ON `reasoning_artifacts`
WHEN EXISTS (
	SELECT 1 FROM `flight_traces` trace
	WHERE trace.`workspace_id` = OLD.`workspace_id`
		AND trace.`id` = OLD.`trace_id`
		AND trace.`truth_mode` <> 'FIXTURE'
)
BEGIN
	SELECT RAISE(ABORT, 'non-fixture reasoning artifacts cannot be deleted');
END;--> statement-breakpoint

CREATE TRIGGER `trg_action_intents_immutable`
BEFORE UPDATE ON `action_intents`
BEGIN
	SELECT RAISE(ABORT, 'action intents are immutable');
END;--> statement-breakpoint
CREATE TRIGGER `trg_action_intents_delete_guard`
BEFORE DELETE ON `action_intents`
WHEN EXISTS (
	SELECT 1 FROM `flight_traces` trace
	WHERE trace.`workspace_id` = OLD.`workspace_id`
		AND trace.`id` = OLD.`trace_id`
		AND trace.`truth_mode` <> 'FIXTURE'
)
BEGIN
	SELECT RAISE(ABORT, 'non-fixture action intents cannot be deleted');
END;--> statement-breakpoint
CREATE TRIGGER `trg_action_intents_bindings`
BEFORE INSERT ON `action_intents`
BEGIN
	SELECT CASE WHEN NOT EXISTS (
		SELECT 1 FROM `context_snapshots` snapshot
		WHERE snapshot.`workspace_id` = NEW.`workspace_id`
			AND snapshot.`id` = NEW.`context_snapshot_id`
			AND snapshot.`trace_id` = NEW.`trace_id`
			AND snapshot.`current_state` = 'frozen'
			AND snapshot.`manifest_hash` = NEW.`context_manifest_hash`
	) THEN RAISE(ABORT, 'intent context is not the frozen trace manifest') END;
	SELECT CASE WHEN NOT EXISTS (
		SELECT 1
		FROM `reasoning_artifacts` artifact
		JOIN `reasoning_nodes` node
			ON node.`workspace_id` = artifact.`workspace_id`
			AND node.`id` = artifact.`node_id`
		WHERE artifact.`workspace_id` = NEW.`workspace_id`
			AND artifact.`id` = NEW.`source_artifact_id`
			AND artifact.`trace_id` = NEW.`trace_id`
			AND artifact.`artifact_kind` = 'intent_draft'
			AND node.`trace_id` = NEW.`trace_id`
			AND node.`node_key` = 'synthesizer'
			AND node.`current_state` = 'succeeded'
	) THEN RAISE(ABORT, 'intent source is not the succeeded synthesizer artifact') END;
	SELECT CASE WHEN NOT EXISTS (
		SELECT 1 FROM `outcome_definitions` definition
		WHERE definition.`workspace_id` = NEW.`workspace_id`
			AND definition.`id` = NEW.`metric_definition_id`
			AND definition.`trace_id` = NEW.`trace_id`
	) THEN RAISE(ABORT, 'intent metric definition is outside its trace') END;
	SELECT CASE WHEN EXISTS (
		SELECT 1 FROM json_each(NEW.`evidence_ids_json`) citation
		WHERE json_type(NEW.`evidence_ids_json`, '$[' || citation.`key` || ']') <> 'text'
			OR NOT EXISTS (
				SELECT 1
				FROM `flight_evidence` evidence
				JOIN `context_snapshot_sources` source
					ON source.`workspace_id` = evidence.`workspace_id`
					AND source.`source_id` = evidence.`evidence_key`
				WHERE evidence.`workspace_id` = NEW.`workspace_id`
					AND evidence.`trace_id` = NEW.`trace_id`
					AND evidence.`evidence_key` = citation.`value`
					AND source.`snapshot_id` = NEW.`context_snapshot_id`
			)
	) THEN RAISE(ABORT, 'intent cites evidence outside its frozen context') END;
	SELECT CASE WHEN (
		SELECT COUNT(*) FROM json_each(NEW.`evidence_ids_json`)
	) <> (
		SELECT COUNT(DISTINCT value) FROM json_each(NEW.`evidence_ids_json`)
	) THEN RAISE(ABORT, 'intent contains duplicate evidence citations') END;
END;--> statement-breakpoint
CREATE TRIGGER `trg_action_intents_canonical_binding`
BEFORE INSERT ON `action_intents`
BEGIN
	SELECT CASE WHEN NEW.`canonical_payload_json` <> json_object(
		'actionKind', NEW.`action_kind`,
		'body', NEW.`body`,
		'cohortCap', NEW.`cohort_cap`,
		'contextManifestHash', NEW.`context_manifest_hash`,
		'evidenceIds', json(NEW.`evidence_ids_json`),
		'expiresAt', NEW.`expires_at`,
		'intentKey', NEW.`intent_key`,
		'metricDefinitionId', NEW.`metric_definition_id`,
		'nonce', NEW.`nonce`,
		'policyHash', NEW.`policy_hash`,
		'policyVersion', NEW.`policy_version`,
		'recipientSetHash', NEW.`recipient_set_hash`,
		'recipients', json(NEW.`recipients_json`),
		'subject', NEW.`subject`,
		'truthMode', NEW.`truth_mode`
	) THEN RAISE(ABORT, 'intent flattened fields do not match canonical payload') END;
	SELECT CASE WHEN EXISTS (
		SELECT 1 FROM json_each(NEW.`recipients_json`) recipient
		WHERE json_type(NEW.`recipients_json`, '$[' || recipient.`key` || ']') <> 'text'
			OR recipient.`value` <> lower(trim(recipient.`value`))
			OR recipient.`value` NOT LIKE '%_@_%._%'
	) THEN RAISE(ABORT, 'intent recipients are invalid or not normalized') END;
	SELECT CASE WHEN (
		SELECT COUNT(*) FROM json_each(NEW.`recipients_json`)
	) <> (
		SELECT COUNT(DISTINCT value) FROM json_each(NEW.`recipients_json`)
	) THEN RAISE(ABORT, 'intent recipient set contains duplicates') END;
END;--> statement-breakpoint

CREATE TRIGGER `trg_flight_trace_events_append_only`
BEFORE UPDATE ON `flight_trace_events`
BEGIN
	SELECT RAISE(ABORT, 'flight trace events are append-only');
END;--> statement-breakpoint
CREATE TRIGGER `trg_flight_trace_events_delete_guard`
BEFORE DELETE ON `flight_trace_events`
WHEN EXISTS (
	SELECT 1 FROM `flight_traces` trace
	WHERE trace.`workspace_id` = OLD.`workspace_id`
		AND trace.`id` = OLD.`trace_id`
		AND trace.`truth_mode` <> 'FIXTURE'
)
BEGIN
	SELECT RAISE(ABORT, 'non-fixture flight trace events cannot be deleted');
END;--> statement-breakpoint
CREATE TRIGGER `trg_flight_trace_events_sequence`
BEFORE INSERT ON `flight_trace_events`
BEGIN
	SELECT CASE WHEN NEW.`sequence` <> COALESCE((
		SELECT MAX(event.`sequence`)
		FROM `flight_trace_events` event
		WHERE event.`workspace_id` = NEW.`workspace_id`
			AND event.`trace_id` = NEW.`trace_id`
	), 0) + 1 THEN RAISE(ABORT, 'trace event sequence is not globally gap-free') END;
	SELECT CASE WHEN NEW.`sequence` > 1 AND NOT EXISTS (
		SELECT 1 FROM `flight_trace_events` prior
		WHERE prior.`workspace_id` = NEW.`workspace_id`
			AND prior.`trace_id` = NEW.`trace_id`
			AND prior.`sequence` = NEW.`sequence` - 1
			AND unixepoch(NEW.`occurred_at`) >= unixepoch(prior.`occurred_at`)
	) THEN RAISE(ABORT, 'trace event time precedes the prior global event') END;
END;--> statement-breakpoint
CREATE TRIGGER `trg_flight_trace_events_subject_binding`
BEFORE INSERT ON `flight_trace_events`
BEGIN
	SELECT CASE WHEN NEW.`actor_type` = 'human' AND (
		NEW.`actor_id` IS NULL OR NOT EXISTS (
			SELECT 1 FROM `workspace_members` member
			WHERE member.`workspace_id` = NEW.`workspace_id`
				AND member.`user_id` = NEW.`actor_id`
		)
	) THEN RAISE(ABORT, 'human trace event actor is not a workspace member') END;
	SELECT CASE WHEN NOT (
		(NEW.`subject_type` = 'trace'
			AND NEW.`subject_id` = NEW.`trace_id`
			AND EXISTS (
				SELECT 1 FROM `flight_traces` subject
				WHERE subject.`workspace_id` = NEW.`workspace_id`
					AND subject.`id` = NEW.`trace_id`
			)) OR
		(NEW.`subject_type` = 'context' AND EXISTS (
			SELECT 1 FROM `context_snapshots` subject
			WHERE subject.`workspace_id` = NEW.`workspace_id`
				AND subject.`trace_id` = NEW.`trace_id`
				AND subject.`id` = NEW.`subject_id`
		)) OR
		(NEW.`subject_type` = 'graph' AND EXISTS (
			SELECT 1 FROM `reasoning_nodes` subject
			WHERE subject.`workspace_id` = NEW.`workspace_id`
				AND subject.`trace_id` = NEW.`trace_id`
				AND subject.`id` = NEW.`subject_id`
		)) OR
		(NEW.`subject_type` = 'intent' AND EXISTS (
			SELECT 1 FROM `action_intents` subject
			WHERE subject.`workspace_id` = NEW.`workspace_id`
				AND subject.`trace_id` = NEW.`trace_id`
				AND subject.`id` = NEW.`subject_id`
		)) OR
		(NEW.`subject_type` = 'policy' AND EXISTS (
			SELECT 1 FROM `policy_decisions` subject
			WHERE subject.`workspace_id` = NEW.`workspace_id`
				AND subject.`trace_id` = NEW.`trace_id`
				AND subject.`id` = NEW.`subject_id`
		)) OR
		(NEW.`subject_type` = 'approval' AND EXISTS (
			SELECT 1 FROM `approval_grants` subject
			WHERE subject.`workspace_id` = NEW.`workspace_id`
				AND subject.`trace_id` = NEW.`trace_id`
				AND subject.`id` = NEW.`subject_id`
		)) OR
		(NEW.`subject_type` = 'effect' AND EXISTS (
			SELECT 1 FROM `effect_attempts` subject
			WHERE subject.`workspace_id` = NEW.`workspace_id`
				AND subject.`trace_id` = NEW.`trace_id`
				AND subject.`id` = NEW.`subject_id`
		)) OR
		(NEW.`subject_type` = 'outcome' AND (
			EXISTS (
				SELECT 1 FROM `outcome_definitions` subject
				WHERE subject.`workspace_id` = NEW.`workspace_id`
					AND subject.`trace_id` = NEW.`trace_id`
					AND subject.`id` = NEW.`subject_id`
			) OR EXISTS (
				SELECT 1 FROM `outcome_observations` subject
				WHERE subject.`workspace_id` = NEW.`workspace_id`
					AND subject.`trace_id` = NEW.`trace_id`
					AND subject.`id` = NEW.`subject_id`
			) OR EXISTS (
				SELECT 1 FROM `outcome_assessments` subject
				WHERE subject.`workspace_id` = NEW.`workspace_id`
					AND subject.`trace_id` = NEW.`trace_id`
					AND subject.`id` = NEW.`subject_id`
			)
		))
	) THEN RAISE(ABORT, 'trace event subject is outside its trace') END;
END;--> statement-breakpoint
CREATE TRIGGER `trg_flight_trace_events_transition`
BEFORE INSERT ON `flight_trace_events`
BEGIN
	SELECT CASE WHEN NEW.`prior_state` IS NULL AND EXISTS (
		SELECT 1 FROM `flight_trace_events` prior
		WHERE prior.`workspace_id` = NEW.`workspace_id`
			AND prior.`trace_id` = NEW.`trace_id`
			AND prior.`subject_type` = NEW.`subject_type`
			AND prior.`subject_id` = NEW.`subject_id`
	) THEN RAISE(ABORT, 'subject state history cannot restart') END;
	SELECT CASE WHEN NEW.`prior_state` IS NOT NULL AND NOT EXISTS (
		SELECT 1 FROM `flight_trace_events` prior
		WHERE prior.`workspace_id` = NEW.`workspace_id`
			AND prior.`trace_id` = NEW.`trace_id`
			AND prior.`subject_type` = NEW.`subject_type`
			AND prior.`subject_id` = NEW.`subject_id`
			AND prior.`sequence` = (
				SELECT MAX(last_event.`sequence`)
				FROM `flight_trace_events` last_event
				WHERE last_event.`workspace_id` = NEW.`workspace_id`
					AND last_event.`trace_id` = NEW.`trace_id`
					AND last_event.`subject_type` = NEW.`subject_type`
					AND last_event.`subject_id` = NEW.`subject_id`
			)
			AND prior.`current_state` = NEW.`prior_state`
	) THEN RAISE(ABORT, 'trace event prior state is not the subject head') END;
	SELECT CASE WHEN NOT (
		(NEW.`subject_type` = 'trace' AND (
			(NEW.`prior_state` IS NULL AND NEW.`current_state` = 'collecting') OR
			(NEW.`prior_state` = 'collecting' AND NEW.`current_state` IN ('context_frozen', 'failed', 'cancelled')) OR
			(NEW.`prior_state` = 'context_frozen' AND NEW.`current_state` IN ('reasoning', 'failed', 'cancelled')) OR
			(NEW.`prior_state` = 'reasoning' AND NEW.`current_state` IN ('awaiting_approval', 'failed', 'cancelled')) OR
			(NEW.`prior_state` = 'awaiting_approval' AND NEW.`current_state` IN ('executing', 'failed', 'cancelled')) OR
			(NEW.`prior_state` = 'executing' AND NEW.`current_state` IN ('observing', 'failed', 'cancelled')) OR
			(NEW.`prior_state` = 'observing' AND NEW.`current_state` IN ('assessed', 'failed', 'cancelled'))
		)) OR
		(NEW.`subject_type` = 'context' AND (
			(NEW.`prior_state` IS NULL AND NEW.`current_state` = 'collecting') OR
			(NEW.`prior_state` = 'collecting' AND NEW.`current_state` = 'frozen') OR
			(NEW.`prior_state` = 'frozen' AND NEW.`current_state` = 'superseded')
		)) OR
		(NEW.`subject_type` = 'graph' AND (
			(NEW.`prior_state` IS NULL AND NEW.`current_state` = 'pending') OR
			(NEW.`prior_state` = 'pending' AND NEW.`current_state` IN ('running', 'skipped')) OR
			(NEW.`prior_state` = 'running' AND NEW.`current_state` IN ('succeeded', 'failed'))
		)) OR
		(NEW.`subject_type` = 'intent' AND (
			(NEW.`prior_state` IS NULL AND NEW.`current_state` = 'drafted') OR
			(NEW.`prior_state` = 'drafted' AND NEW.`current_state` IN ('sealed', 'discarded')) OR
			(NEW.`prior_state` = 'sealed' AND NEW.`current_state` IN ('expired', 'superseded', 'policy_evaluated')) OR
			(NEW.`prior_state` = 'policy_evaluated' AND NEW.`current_state` IN ('expired', 'superseded', 'approval_pending')) OR
			(NEW.`prior_state` = 'approval_pending' AND NEW.`current_state` IN ('approved', 'rejected', 'expired', 'superseded')) OR
			(NEW.`prior_state` = 'approved' AND NEW.`current_state` IN ('consumed', 'expired', 'superseded'))
		)) OR
		(NEW.`subject_type` = 'policy' AND (
			(NEW.`prior_state` IS NULL AND NEW.`current_state` = 'unevaluated') OR
			(NEW.`prior_state` = 'unevaluated' AND NEW.`current_state` IN ('deny', 'allow', 'approval_required'))
		)) OR
		(NEW.`subject_type` = 'approval' AND (
			(NEW.`prior_state` IS NULL AND NEW.`current_state` = 'pending') OR
			(NEW.`prior_state` = 'pending' AND NEW.`current_state` IN ('approved', 'rejected', 'expired')) OR
			(NEW.`prior_state` = 'approved' AND NEW.`current_state` IN ('consumed', 'expired'))
		)) OR
		(NEW.`subject_type` = 'effect' AND (
			(NEW.`prior_state` IS NULL AND NEW.`current_state` = 'reserved') OR
			(NEW.`prior_state` = 'reserved' AND NEW.`current_state` IN ('dispatching', 'failed')) OR
			(NEW.`prior_state` = 'dispatching' AND NEW.`current_state` IN ('confirmed', 'failed', 'indeterminate')) OR
			(NEW.`prior_state` = 'indeterminate' AND NEW.`current_state` IN ('reconciled_confirmed', 'reconciled_failed'))
		)) OR
		(NEW.`subject_type` = 'outcome' AND (
			(NEW.`prior_state` IS NULL AND NEW.`current_state` = 'preregistered') OR
			(NEW.`prior_state` = 'preregistered' AND NEW.`current_state` IN ('observed', 'inconclusive')) OR
			(NEW.`prior_state` = 'observed' AND NEW.`current_state` IN ('assessed', 'inconclusive')) OR
			(NEW.`prior_state` IN ('assessed', 'inconclusive') AND NEW.`current_state` = 'superseded')
		))
	) THEN RAISE(ABORT, 'trace event violates its subject state machine') END;
END;
