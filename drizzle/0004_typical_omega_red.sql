CREATE TABLE `action_intents` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`trace_id` text NOT NULL,
	`context_snapshot_id` text NOT NULL,
	`source_artifact_id` text NOT NULL,
	`intent_key` text NOT NULL,
	`action_kind` text NOT NULL,
	`truth_mode` text NOT NULL,
	`recipients_json` text NOT NULL,
	`recipient_set_hash` text NOT NULL,
	`subject` text NOT NULL,
	`body` text NOT NULL,
	`cohort_cap` integer NOT NULL,
	`evidence_ids_json` text NOT NULL,
	`metric_definition_id` text NOT NULL,
	`context_manifest_hash` text NOT NULL,
	`policy_version` text NOT NULL,
	`policy_hash` text NOT NULL,
	`nonce` text NOT NULL,
	`expires_at` text NOT NULL,
	`canonical_payload_json` text NOT NULL,
	`canonical_payload_hash` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`workspace_id`,`trace_id`) REFERENCES `flight_traces`(`workspace_id`,`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`,`context_snapshot_id`) REFERENCES `context_snapshots`(`workspace_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`workspace_id`,`source_artifact_id`) REFERENCES `reasoning_artifacts`(`workspace_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`workspace_id`,`metric_definition_id`) REFERENCES `outcome_definitions`(`workspace_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`workspace_id`,`created_by`) REFERENCES `workspace_members`(`workspace_id`,`user_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "chk_action_intents_kind" CHECK("action_intents"."action_kind" = 'email_test'),
	CONSTRAINT "chk_action_intents_truth_mode" CHECK("action_intents"."truth_mode" = 'TEST'),
	CONSTRAINT "chk_action_intents_recipients_json" CHECK(json_valid("action_intents"."recipients_json") AND json_type("action_intents"."recipients_json") = 'array' AND json_array_length("action_intents"."recipients_json") = "action_intents"."cohort_cap"),
	CONSTRAINT "chk_action_intents_evidence_json" CHECK(json_valid("action_intents"."evidence_ids_json") AND json_type("action_intents"."evidence_ids_json") = 'array' AND json_array_length("action_intents"."evidence_ids_json") > 0),
	CONSTRAINT "chk_action_intents_canonical_json" CHECK(json_valid("action_intents"."canonical_payload_json")),
	CONSTRAINT "chk_action_intents_cohort_cap" CHECK("action_intents"."cohort_cap" BETWEEN 1 AND 3),
	CONSTRAINT "chk_action_intents_recipient_hash" CHECK(length("action_intents"."recipient_set_hash") = 64 AND "action_intents"."recipient_set_hash" NOT GLOB '*[^0-9a-f]*'),
	CONSTRAINT "chk_action_intents_context_hash" CHECK(length("action_intents"."context_manifest_hash") = 64 AND "action_intents"."context_manifest_hash" NOT GLOB '*[^0-9a-f]*'),
	CONSTRAINT "chk_action_intents_policy_hash" CHECK(length("action_intents"."policy_hash") = 64 AND "action_intents"."policy_hash" NOT GLOB '*[^0-9a-f]*'),
	CONSTRAINT "chk_action_intents_payload_hash" CHECK(length("action_intents"."canonical_payload_hash") = 64 AND "action_intents"."canonical_payload_hash" NOT GLOB '*[^0-9a-f]*'),
	CONSTRAINT "chk_action_intents_expiry" CHECK(unixepoch("action_intents"."expires_at") IS NOT NULL AND unixepoch("action_intents"."expires_at") > unixepoch("action_intents"."created_at"))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_action_intents_workspace_id` ON `action_intents` (`workspace_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_action_intents_trace_key` ON `action_intents` (`workspace_id`,`trace_id`,`intent_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_action_intents_workspace_payload` ON `action_intents` (`workspace_id`,`canonical_payload_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_action_intents_workspace_nonce` ON `action_intents` (`workspace_id`,`nonce`);--> statement-breakpoint
CREATE TABLE `approval_grants` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`trace_id` text NOT NULL,
	`intent_id` text NOT NULL,
	`policy_decision_id` text NOT NULL,
	`decision` text NOT NULL,
	`bound_payload_hash` text NOT NULL,
	`bound_context_hash` text NOT NULL,
	`bound_policy_hash` text NOT NULL,
	`bound_recipient_set_hash` text NOT NULL,
	`nonce` text NOT NULL,
	`expires_at` text NOT NULL,
	`approved_by` text NOT NULL,
	`approved_at` text NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`workspace_id`,`trace_id`) REFERENCES `flight_traces`(`workspace_id`,`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`,`intent_id`) REFERENCES `action_intents`(`workspace_id`,`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`,`policy_decision_id`) REFERENCES `policy_decisions`(`workspace_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`workspace_id`,`approved_by`) REFERENCES `workspace_members`(`workspace_id`,`user_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "chk_approval_grants_decision" CHECK("approval_grants"."decision" IN ('approved', 'rejected')),
	CONSTRAINT "chk_approval_grants_payload_hash" CHECK(length("approval_grants"."bound_payload_hash") = 64 AND "approval_grants"."bound_payload_hash" NOT GLOB '*[^0-9a-f]*'),
	CONSTRAINT "chk_approval_grants_context_hash" CHECK(length("approval_grants"."bound_context_hash") = 64 AND "approval_grants"."bound_context_hash" NOT GLOB '*[^0-9a-f]*'),
	CONSTRAINT "chk_approval_grants_policy_hash" CHECK(length("approval_grants"."bound_policy_hash") = 64 AND "approval_grants"."bound_policy_hash" NOT GLOB '*[^0-9a-f]*'),
	CONSTRAINT "chk_approval_grants_recipient_hash" CHECK(length("approval_grants"."bound_recipient_set_hash") = 64 AND "approval_grants"."bound_recipient_set_hash" NOT GLOB '*[^0-9a-f]*'),
	CONSTRAINT "chk_approval_grants_expiry" CHECK(unixepoch("approval_grants"."expires_at") IS NOT NULL AND unixepoch("approval_grants"."approved_at") IS NOT NULL AND unixepoch("approval_grants"."expires_at") > unixepoch("approval_grants"."approved_at"))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_approval_grants_workspace_id` ON `approval_grants` (`workspace_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_approval_grants_workspace_intent` ON `approval_grants` (`workspace_id`,`intent_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_approval_grants_workspace_nonce` ON `approval_grants` (`workspace_id`,`nonce`);--> statement-breakpoint
CREATE TABLE `context_snapshot_sources` (
	`workspace_id` text NOT NULL,
	`snapshot_id` text NOT NULL,
	`position` integer NOT NULL,
	`source_id` text NOT NULL,
	`source_kind` text NOT NULL,
	`source_version` text NOT NULL,
	`source_ref` text NOT NULL,
	`content_hash` text NOT NULL,
	`access_decision` text NOT NULL,
	`retrieval_json` text NOT NULL,
	PRIMARY KEY(`snapshot_id`, `position`),
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`,`snapshot_id`) REFERENCES `context_snapshots`(`workspace_id`,`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "chk_context_sources_position" CHECK("context_snapshot_sources"."position" >= 1),
	CONSTRAINT "chk_context_sources_content_hash" CHECK(length("context_snapshot_sources"."content_hash") = 64 AND "context_snapshot_sources"."content_hash" NOT GLOB '*[^0-9a-f]*'),
	CONSTRAINT "chk_context_sources_access_decision" CHECK("context_snapshot_sources"."access_decision" IN ('allowed', 'redacted')),
	CONSTRAINT "chk_context_sources_retrieval_json" CHECK(json_valid("context_snapshot_sources"."retrieval_json"))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_context_sources_snapshot_source` ON `context_snapshot_sources` (`workspace_id`,`snapshot_id`,`source_id`);--> statement-breakpoint
CREATE TABLE `context_snapshot_supersessions` (
	`workspace_id` text NOT NULL,
	`trace_id` text NOT NULL,
	`prior_snapshot_id` text NOT NULL,
	`current_snapshot_id` text NOT NULL,
	`reason` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`workspace_id`, `current_snapshot_id`),
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`,`prior_snapshot_id`,`trace_id`) REFERENCES `context_snapshots`(`workspace_id`,`id`,`trace_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`,`current_snapshot_id`,`trace_id`) REFERENCES `context_snapshots`(`workspace_id`,`id`,`trace_id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "chk_context_supersessions_distinct" CHECK("context_snapshot_supersessions"."prior_snapshot_id" <> "context_snapshot_supersessions"."current_snapshot_id")
);
--> statement-breakpoint
CREATE TABLE `context_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`trace_id` text NOT NULL,
	`snapshot_key` text NOT NULL,
	`truth_mode` text NOT NULL,
	`current_state` text DEFAULT 'collecting' NOT NULL,
	`source_count` integer NOT NULL,
	`ordered_manifest_json` text NOT NULL,
	`manifest_hash` text NOT NULL,
	`created_by` text NOT NULL,
	`frozen_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`workspace_id`,`trace_id`) REFERENCES `flight_traces`(`workspace_id`,`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`,`created_by`) REFERENCES `workspace_members`(`workspace_id`,`user_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "chk_context_snapshots_truth_mode" CHECK("context_snapshots"."truth_mode" IN ('LIVE', 'TEST', 'FIXTURE')),
	CONSTRAINT "chk_context_snapshots_state" CHECK("context_snapshots"."current_state" IN ('collecting', 'frozen', 'superseded')),
	CONSTRAINT "chk_context_snapshots_state_time" CHECK(("context_snapshots"."current_state" = 'collecting' AND "context_snapshots"."frozen_at" IS NULL) OR ("context_snapshots"."current_state" IN ('frozen', 'superseded') AND unixepoch("context_snapshots"."frozen_at") IS NOT NULL)),
	CONSTRAINT "chk_context_snapshots_source_count" CHECK("context_snapshots"."source_count" > 0),
	CONSTRAINT "chk_context_snapshots_manifest_json" CHECK(json_valid("context_snapshots"."ordered_manifest_json") AND json_type("context_snapshots"."ordered_manifest_json") = 'array' AND json_array_length("context_snapshots"."ordered_manifest_json") = "context_snapshots"."source_count"),
	CONSTRAINT "chk_context_snapshots_manifest_hash" CHECK(length("context_snapshots"."manifest_hash") = 64 AND "context_snapshots"."manifest_hash" NOT GLOB '*[^0-9a-f]*')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_context_snapshots_workspace_id` ON `context_snapshots` (`workspace_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_context_snapshots_workspace_id_trace` ON `context_snapshots` (`workspace_id`,`id`,`trace_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_context_snapshots_trace_key` ON `context_snapshots` (`workspace_id`,`trace_id`,`snapshot_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_context_snapshots_workspace_manifest` ON `context_snapshots` (`workspace_id`,`manifest_hash`);--> statement-breakpoint
CREATE TABLE `effect_attempt_events` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`trace_id` text NOT NULL,
	`effect_attempt_id` text NOT NULL,
	`sequence` integer NOT NULL,
	`prior_state` text,
	`current_state` text NOT NULL,
	`provider_receipt_id` text,
	`provider_response_hash` text,
	`error_code` text,
	`payload_json` text DEFAULT '{}' NOT NULL,
	`idempotency_key` text NOT NULL,
	`occurred_at` text NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`,`trace_id`) REFERENCES `flight_traces`(`workspace_id`,`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`,`effect_attempt_id`,`trace_id`) REFERENCES `effect_attempts`(`workspace_id`,`id`,`trace_id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "chk_effect_attempt_events_sequence" CHECK("effect_attempt_events"."sequence" >= 1),
	CONSTRAINT "chk_effect_attempt_events_prior_state" CHECK("effect_attempt_events"."prior_state" IS NULL OR "effect_attempt_events"."prior_state" IN ('reserved', 'dispatching', 'confirmed', 'failed', 'indeterminate', 'reconciled_confirmed', 'reconciled_failed')),
	CONSTRAINT "chk_effect_attempt_events_current_state" CHECK("effect_attempt_events"."current_state" IN ('reserved', 'dispatching', 'confirmed', 'failed', 'indeterminate', 'reconciled_confirmed', 'reconciled_failed')),
	CONSTRAINT "chk_effect_attempt_events_payload_json" CHECK(json_valid("effect_attempt_events"."payload_json")),
	CONSTRAINT "chk_effect_attempt_events_response_hash" CHECK("effect_attempt_events"."provider_response_hash" IS NULL OR (length("effect_attempt_events"."provider_response_hash") = 64 AND "effect_attempt_events"."provider_response_hash" NOT GLOB '*[^0-9a-f]*')),
	CONSTRAINT "chk_effect_attempt_events_occurred_time" CHECK(unixepoch("effect_attempt_events"."occurred_at") IS NOT NULL)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_effect_attempt_events_workspace_id` ON `effect_attempt_events` (`workspace_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_effect_attempt_events_sequence` ON `effect_attempt_events` (`workspace_id`,`effect_attempt_id`,`sequence`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_effect_attempt_events_idempotency` ON `effect_attempt_events` (`workspace_id`,`idempotency_key`);--> statement-breakpoint
CREATE TABLE `effect_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`trace_id` text NOT NULL,
	`intent_id` text NOT NULL,
	`approval_grant_id` text NOT NULL,
	`intended_effect_key` text NOT NULL,
	`adapter_kind` text NOT NULL,
	`provider_mode` text NOT NULL,
	`initial_state` text DEFAULT 'reserved' NOT NULL,
	`request_hash` text NOT NULL,
	`reserved_by` text NOT NULL,
	`reserved_at` text NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reserved_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`workspace_id`,`trace_id`) REFERENCES `flight_traces`(`workspace_id`,`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`,`intent_id`) REFERENCES `action_intents`(`workspace_id`,`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`,`approval_grant_id`) REFERENCES `approval_grants`(`workspace_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`workspace_id`,`reserved_by`) REFERENCES `workspace_members`(`workspace_id`,`user_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "chk_effect_attempts_adapter" CHECK("effect_attempts"."adapter_kind" = 'email_test'),
	CONSTRAINT "chk_effect_attempts_provider_mode" CHECK("effect_attempts"."provider_mode" IN ('TEST', 'FIXTURE')),
	CONSTRAINT "chk_effect_attempts_initial_state" CHECK("effect_attempts"."initial_state" = 'reserved'),
	CONSTRAINT "chk_effect_attempts_request_hash" CHECK(length("effect_attempts"."request_hash") = 64 AND "effect_attempts"."request_hash" NOT GLOB '*[^0-9a-f]*'),
	CONSTRAINT "chk_effect_attempts_reserved_time" CHECK(unixepoch("effect_attempts"."reserved_at") IS NOT NULL)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_effect_attempts_workspace_id` ON `effect_attempts` (`workspace_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_effect_attempts_workspace_id_trace` ON `effect_attempts` (`workspace_id`,`id`,`trace_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_effect_attempts_intended_effect` ON `effect_attempts` (`workspace_id`,`intended_effect_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_effect_attempts_one_grant_use` ON `effect_attempts` (`workspace_id`,`approval_grant_id`);--> statement-breakpoint
CREATE TABLE `flight_evidence` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`trace_id` text NOT NULL,
	`evidence_key` text NOT NULL,
	`truth_mode` text NOT NULL,
	`source_kind` text NOT NULL,
	`source_version` text NOT NULL,
	`source_ref` text NOT NULL,
	`captured_at` text NOT NULL,
	`payload_json` text NOT NULL,
	`content_hash` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`workspace_id`,`trace_id`) REFERENCES `flight_traces`(`workspace_id`,`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`,`created_by`) REFERENCES `workspace_members`(`workspace_id`,`user_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "chk_flight_evidence_truth_mode" CHECK("flight_evidence"."truth_mode" IN ('LIVE', 'TEST', 'FIXTURE')),
	CONSTRAINT "chk_flight_evidence_payload_json" CHECK(json_valid("flight_evidence"."payload_json")),
	CONSTRAINT "chk_flight_evidence_content_hash" CHECK(length("flight_evidence"."content_hash") = 64 AND "flight_evidence"."content_hash" NOT GLOB '*[^0-9a-f]*')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_flight_evidence_workspace_id` ON `flight_evidence` (`workspace_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_flight_evidence_trace_key` ON `flight_evidence` (`workspace_id`,`trace_id`,`evidence_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_flight_evidence_idempotency` ON `flight_evidence` (`workspace_id`,`idempotency_key`);--> statement-breakpoint
CREATE TABLE `flight_trace_events` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`trace_id` text NOT NULL,
	`sequence` integer NOT NULL,
	`event_type` text NOT NULL,
	`subject_type` text NOT NULL,
	`subject_id` text NOT NULL,
	`prior_state` text,
	`current_state` text NOT NULL,
	`actor_type` text NOT NULL,
	`actor_id` text,
	`payload_json` text DEFAULT '{}' NOT NULL,
	`payload_hash` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`occurred_at` text NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`,`trace_id`) REFERENCES `flight_traces`(`workspace_id`,`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "chk_flight_trace_events_sequence" CHECK("flight_trace_events"."sequence" >= 1),
	CONSTRAINT "chk_flight_trace_events_subject_type" CHECK("flight_trace_events"."subject_type" IN ('trace', 'context', 'graph', 'intent', 'policy', 'approval', 'effect', 'outcome')),
	CONSTRAINT "chk_flight_trace_events_actor_type" CHECK("flight_trace_events"."actor_type" IN ('human', 'system', 'agent', 'adapter')),
	CONSTRAINT "chk_flight_trace_events_payload_json" CHECK(json_valid("flight_trace_events"."payload_json")),
	CONSTRAINT "chk_flight_trace_events_payload_hash" CHECK(length("flight_trace_events"."payload_hash") = 64 AND "flight_trace_events"."payload_hash" NOT GLOB '*[^0-9a-f]*'),
	CONSTRAINT "chk_flight_trace_events_occurred_time" CHECK(unixepoch("flight_trace_events"."occurred_at") IS NOT NULL)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_flight_trace_events_workspace_id` ON `flight_trace_events` (`workspace_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_flight_trace_events_sequence` ON `flight_trace_events` (`workspace_id`,`trace_id`,`sequence`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_flight_trace_events_idempotency` ON `flight_trace_events` (`workspace_id`,`idempotency_key`);--> statement-breakpoint
CREATE INDEX `idx_flight_trace_events_subject` ON `flight_trace_events` (`workspace_id`,`subject_type`,`subject_id`);--> statement-breakpoint
CREATE TABLE `flight_traces` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`trace_key` text NOT NULL,
	`fixture_key` text,
	`truth_mode` text NOT NULL,
	`current_state` text DEFAULT 'collecting' NOT NULL,
	`retention_class` text NOT NULL,
	`retention_until` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`workspace_id`,`created_by`) REFERENCES `workspace_members`(`workspace_id`,`user_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "chk_flight_traces_truth_mode" CHECK("flight_traces"."truth_mode" IN ('LIVE', 'TEST', 'FIXTURE')),
	CONSTRAINT "chk_flight_traces_state" CHECK("flight_traces"."current_state" IN ('collecting', 'context_frozen', 'reasoning', 'awaiting_approval', 'executing', 'observing', 'assessed', 'failed', 'cancelled')),
	CONSTRAINT "chk_flight_traces_retention" CHECK("flight_traces"."retention_class" IN ('ephemeral_demo', 'review_evidence')),
	CONSTRAINT "chk_flight_traces_fixture_label" CHECK("flight_traces"."truth_mode" <> 'FIXTURE' OR "flight_traces"."fixture_key" IS NOT NULL),
	CONSTRAINT "chk_flight_traces_retention_time" CHECK(unixepoch("flight_traces"."retention_until") IS NOT NULL)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_flight_traces_workspace_key` ON `flight_traces` (`workspace_id`,`trace_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_flight_traces_workspace_id` ON `flight_traces` (`workspace_id`,`id`);--> statement-breakpoint
CREATE INDEX `idx_flight_traces_workspace_state` ON `flight_traces` (`workspace_id`,`current_state`);--> statement-breakpoint
CREATE TABLE `outcome_assessment_supersessions` (
	`workspace_id` text NOT NULL,
	`trace_id` text NOT NULL,
	`definition_id` text NOT NULL,
	`prior_assessment_id` text NOT NULL,
	`current_assessment_id` text NOT NULL,
	`reason` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`workspace_id`, `current_assessment_id`),
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`,`prior_assessment_id`,`trace_id`,`definition_id`) REFERENCES `outcome_assessments`(`workspace_id`,`id`,`trace_id`,`definition_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`,`current_assessment_id`,`trace_id`,`definition_id`) REFERENCES `outcome_assessments`(`workspace_id`,`id`,`trace_id`,`definition_id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "chk_outcome_supersessions_distinct" CHECK("outcome_assessment_supersessions"."prior_assessment_id" <> "outcome_assessment_supersessions"."current_assessment_id")
);
--> statement-breakpoint
CREATE TABLE `outcome_assessments` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`trace_id` text NOT NULL,
	`definition_id` text NOT NULL,
	`assessment_version` integer NOT NULL,
	`label` text NOT NULL,
	`evidence_ids_json` text NOT NULL,
	`limitations_json` text NOT NULL,
	`rationale_summary` text NOT NULL,
	`content_hash` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`,`trace_id`) REFERENCES `flight_traces`(`workspace_id`,`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`,`definition_id`) REFERENCES `outcome_definitions`(`workspace_id`,`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "chk_outcome_assessments_version" CHECK("outcome_assessments"."assessment_version" >= 1),
	CONSTRAINT "chk_outcome_assessments_label" CHECK("outcome_assessments"."label" IN ('supported', 'unsupported', 'correlated', 'inconclusive')),
	CONSTRAINT "chk_outcome_assessments_evidence_json" CHECK(json_valid("outcome_assessments"."evidence_ids_json") AND json_type("outcome_assessments"."evidence_ids_json") = 'array' AND json_array_length("outcome_assessments"."evidence_ids_json") > 0),
	CONSTRAINT "chk_outcome_assessments_limitations_json" CHECK(json_valid("outcome_assessments"."limitations_json") AND json_type("outcome_assessments"."limitations_json") = 'array' AND json_array_length("outcome_assessments"."limitations_json") > 0),
	CONSTRAINT "chk_outcome_assessments_content_hash" CHECK(length("outcome_assessments"."content_hash") = 64 AND "outcome_assessments"."content_hash" NOT GLOB '*[^0-9a-f]*')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_outcome_assessments_workspace_id` ON `outcome_assessments` (`workspace_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_outcome_assessments_workspace_id_trace_definition` ON `outcome_assessments` (`workspace_id`,`id`,`trace_id`,`definition_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_outcome_assessments_definition_version` ON `outcome_assessments` (`workspace_id`,`definition_id`,`assessment_version`);--> statement-breakpoint
CREATE TABLE `outcome_definitions` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`trace_id` text NOT NULL,
	`definition_key` text NOT NULL,
	`metric_name` text NOT NULL,
	`cohort_json` text NOT NULL,
	`cohort_hash` text NOT NULL,
	`baseline_json` text NOT NULL,
	`baseline_hash` text NOT NULL,
	`window_starts_at` text NOT NULL,
	`window_ends_at` text NOT NULL,
	`assessment_rule_json` text NOT NULL,
	`assessment_rule_hash` text NOT NULL,
	`registered_by` text NOT NULL,
	`registered_at` text NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`registered_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`workspace_id`,`trace_id`) REFERENCES `flight_traces`(`workspace_id`,`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`,`registered_by`) REFERENCES `workspace_members`(`workspace_id`,`user_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "chk_outcome_definitions_cohort_json" CHECK(json_valid("outcome_definitions"."cohort_json")),
	CONSTRAINT "chk_outcome_definitions_baseline_json" CHECK(json_valid("outcome_definitions"."baseline_json")),
	CONSTRAINT "chk_outcome_definitions_rule_json" CHECK(json_valid("outcome_definitions"."assessment_rule_json")),
	CONSTRAINT "chk_outcome_definitions_window" CHECK(unixepoch("outcome_definitions"."window_starts_at") IS NOT NULL AND unixepoch("outcome_definitions"."window_ends_at") IS NOT NULL AND unixepoch("outcome_definitions"."window_starts_at") < unixepoch("outcome_definitions"."window_ends_at")),
	CONSTRAINT "chk_outcome_definitions_cohort_hash" CHECK(length("outcome_definitions"."cohort_hash") = 64 AND "outcome_definitions"."cohort_hash" NOT GLOB '*[^0-9a-f]*'),
	CONSTRAINT "chk_outcome_definitions_baseline_hash" CHECK(length("outcome_definitions"."baseline_hash") = 64 AND "outcome_definitions"."baseline_hash" NOT GLOB '*[^0-9a-f]*'),
	CONSTRAINT "chk_outcome_definitions_rule_hash" CHECK(length("outcome_definitions"."assessment_rule_hash") = 64 AND "outcome_definitions"."assessment_rule_hash" NOT GLOB '*[^0-9a-f]*')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_outcome_definitions_workspace_id` ON `outcome_definitions` (`workspace_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_outcome_definitions_trace_key` ON `outcome_definitions` (`workspace_id`,`trace_id`,`definition_key`);--> statement-breakpoint
CREATE TABLE `outcome_observations` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`trace_id` text NOT NULL,
	`definition_id` text NOT NULL,
	`source_evidence_id` text NOT NULL,
	`observation_key` text NOT NULL,
	`truth_mode` text NOT NULL,
	`signature_status` text NOT NULL,
	`value_json` text NOT NULL,
	`value_hash` text NOT NULL,
	`observed_at` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`,`trace_id`) REFERENCES `flight_traces`(`workspace_id`,`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`,`definition_id`) REFERENCES `outcome_definitions`(`workspace_id`,`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`,`source_evidence_id`) REFERENCES `flight_evidence`(`workspace_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "chk_outcome_observations_truth_mode" CHECK("outcome_observations"."truth_mode" IN ('LIVE', 'TEST', 'FIXTURE')),
	CONSTRAINT "chk_outcome_observations_signature" CHECK("outcome_observations"."signature_status" IN ('verified', 'fixture', 'invalid')),
	CONSTRAINT "chk_outcome_observations_truth_signature" CHECK(("outcome_observations"."truth_mode" = 'FIXTURE' AND "outcome_observations"."signature_status" IN ('fixture', 'invalid')) OR ("outcome_observations"."truth_mode" IN ('LIVE', 'TEST') AND "outcome_observations"."signature_status" IN ('verified', 'invalid'))),
	CONSTRAINT "chk_outcome_observations_value_json" CHECK(json_valid("outcome_observations"."value_json")),
	CONSTRAINT "chk_outcome_observations_value_hash" CHECK(length("outcome_observations"."value_hash") = 64 AND "outcome_observations"."value_hash" NOT GLOB '*[^0-9a-f]*'),
	CONSTRAINT "chk_outcome_observations_observed_time" CHECK(unixepoch("outcome_observations"."observed_at") IS NOT NULL)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_outcome_observations_workspace_id` ON `outcome_observations` (`workspace_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_outcome_observations_definition_key` ON `outcome_observations` (`workspace_id`,`definition_id`,`observation_key`);--> statement-breakpoint
CREATE TABLE `policy_decisions` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`trace_id` text NOT NULL,
	`intent_id` text NOT NULL,
	`policy_version` text NOT NULL,
	`policy_hash` text NOT NULL,
	`verdict` text NOT NULL,
	`reason_codes_json` text NOT NULL,
	`evaluated_payload_hash` text NOT NULL,
	`evaluated_context_hash` text NOT NULL,
	`evaluator_version` text NOT NULL,
	`decided_at` text NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`,`trace_id`) REFERENCES `flight_traces`(`workspace_id`,`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`,`intent_id`) REFERENCES `action_intents`(`workspace_id`,`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "chk_policy_decisions_verdict" CHECK("policy_decisions"."verdict" IN ('deny', 'allow', 'approval_required')),
	CONSTRAINT "chk_policy_decisions_reasons_json" CHECK(json_valid("policy_decisions"."reason_codes_json") AND json_type("policy_decisions"."reason_codes_json") = 'array' AND json_array_length("policy_decisions"."reason_codes_json") > 0),
	CONSTRAINT "chk_policy_decisions_policy_hash" CHECK(length("policy_decisions"."policy_hash") = 64 AND "policy_decisions"."policy_hash" NOT GLOB '*[^0-9a-f]*'),
	CONSTRAINT "chk_policy_decisions_payload_hash" CHECK(length("policy_decisions"."evaluated_payload_hash") = 64 AND "policy_decisions"."evaluated_payload_hash" NOT GLOB '*[^0-9a-f]*'),
	CONSTRAINT "chk_policy_decisions_context_hash" CHECK(length("policy_decisions"."evaluated_context_hash") = 64 AND "policy_decisions"."evaluated_context_hash" NOT GLOB '*[^0-9a-f]*')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_policy_decisions_workspace_id` ON `policy_decisions` (`workspace_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_policy_decisions_intent_policy` ON `policy_decisions` (`workspace_id`,`intent_id`,`policy_hash`);--> statement-breakpoint
CREATE TABLE `reasoning_artifacts` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`trace_id` text NOT NULL,
	`node_id` text NOT NULL,
	`artifact_kind` text NOT NULL,
	`schema_version` text NOT NULL,
	`content_json` text NOT NULL,
	`content_hash` text NOT NULL,
	`evidence_citations_json` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`,`trace_id`) REFERENCES `flight_traces`(`workspace_id`,`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`,`node_id`) REFERENCES `reasoning_nodes`(`workspace_id`,`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "chk_reasoning_artifacts_kind" CHECK("reasoning_artifacts"."artifact_kind" IN ('plan', 'analysis', 'critique', 'intent_draft')),
	CONSTRAINT "chk_reasoning_artifacts_content_json" CHECK(json_valid("reasoning_artifacts"."content_json")),
	CONSTRAINT "chk_reasoning_artifacts_citations_json" CHECK(json_valid("reasoning_artifacts"."evidence_citations_json") AND json_type("reasoning_artifacts"."evidence_citations_json") = 'array' AND json_array_length("reasoning_artifacts"."evidence_citations_json") > 0),
	CONSTRAINT "chk_reasoning_artifacts_content_hash" CHECK(length("reasoning_artifacts"."content_hash") = 64 AND "reasoning_artifacts"."content_hash" NOT GLOB '*[^0-9a-f]*')
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_reasoning_artifacts_workspace_id` ON `reasoning_artifacts` (`workspace_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_reasoning_artifacts_node_kind` ON `reasoning_artifacts` (`workspace_id`,`node_id`,`artifact_kind`);--> statement-breakpoint
CREATE TABLE `reasoning_nodes` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`trace_id` text NOT NULL,
	`node_key` text NOT NULL,
	`attempt` integer DEFAULT 1 NOT NULL,
	`current_state` text DEFAULT 'pending' NOT NULL,
	`input_hash` text NOT NULL,
	`output_hash` text,
	`error_code` text,
	`started_at` text,
	`completed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`workspace_id`,`trace_id`) REFERENCES `flight_traces`(`workspace_id`,`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "chk_reasoning_nodes_key" CHECK("reasoning_nodes"."node_key" IN ('planner', 'quantitative', 'qualitative', 'experiment_design', 'skeptic', 'synthesizer')),
	CONSTRAINT "chk_reasoning_nodes_state" CHECK("reasoning_nodes"."current_state" IN ('pending', 'running', 'succeeded', 'failed', 'skipped')),
	CONSTRAINT "chk_reasoning_nodes_attempt" CHECK("reasoning_nodes"."attempt" >= 1),
	CONSTRAINT "chk_reasoning_nodes_input_hash" CHECK(length("reasoning_nodes"."input_hash") = 64 AND "reasoning_nodes"."input_hash" NOT GLOB '*[^0-9a-f]*'),
	CONSTRAINT "chk_reasoning_nodes_output_hash" CHECK("reasoning_nodes"."output_hash" IS NULL OR (length("reasoning_nodes"."output_hash") = 64 AND "reasoning_nodes"."output_hash" NOT GLOB '*[^0-9a-f]*')),
	CONSTRAINT "chk_reasoning_nodes_state_payload" CHECK((
        "reasoning_nodes"."current_state" = 'pending'
        AND "reasoning_nodes"."started_at" IS NULL
        AND "reasoning_nodes"."completed_at" IS NULL
        AND "reasoning_nodes"."output_hash" IS NULL
        AND "reasoning_nodes"."error_code" IS NULL
      ) OR (
        "reasoning_nodes"."current_state" = 'running'
        AND "reasoning_nodes"."started_at" IS NOT NULL
        AND "reasoning_nodes"."completed_at" IS NULL
        AND "reasoning_nodes"."output_hash" IS NULL
        AND "reasoning_nodes"."error_code" IS NULL
      ) OR (
        "reasoning_nodes"."current_state" = 'succeeded'
        AND "reasoning_nodes"."started_at" IS NOT NULL
        AND "reasoning_nodes"."completed_at" IS NOT NULL
        AND "reasoning_nodes"."output_hash" IS NOT NULL
        AND "reasoning_nodes"."error_code" IS NULL
      ) OR (
        "reasoning_nodes"."current_state" = 'failed'
        AND "reasoning_nodes"."started_at" IS NOT NULL
        AND "reasoning_nodes"."completed_at" IS NOT NULL
        AND "reasoning_nodes"."output_hash" IS NULL
        AND "reasoning_nodes"."error_code" IS NOT NULL
      ) OR (
        "reasoning_nodes"."current_state" = 'skipped'
        AND "reasoning_nodes"."completed_at" IS NOT NULL
        AND "reasoning_nodes"."output_hash" IS NULL
      ))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_reasoning_nodes_workspace_id` ON `reasoning_nodes` (`workspace_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_reasoning_nodes_trace_identity` ON `reasoning_nodes` (`workspace_id`,`trace_id`,`node_key`,`attempt`);--> statement-breakpoint
CREATE TABLE `workspace_authority_controls` (
	`workspace_id` text PRIMARY KEY NOT NULL,
	`kill_switch_engaged` integer DEFAULT false NOT NULL,
	`updated_by` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`workspace_id`,`updated_by`) REFERENCES `workspace_members`(`workspace_id`,`user_id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "chk_workspace_authority_controls_kill_switch" CHECK("workspace_authority_controls"."kill_switch_engaged" IN (0, 1))
);
