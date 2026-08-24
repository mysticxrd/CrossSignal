ALTER TABLE `reasoning_nodes` ADD `logical_node_id` text NOT NULL DEFAULT 'legacy-unbound';--> statement-breakpoint
ALTER TABLE `reasoning_nodes` ADD `graph_version` text NOT NULL DEFAULT 'legacy-precomputed-v1';--> statement-breakpoint
ALTER TABLE `reasoning_nodes` ADD `execution_mode` text NOT NULL DEFAULT 'precomputed_fixture';--> statement-breakpoint
ALTER TABLE `reasoning_nodes` ADD `handler_version` text NOT NULL DEFAULT 'legacy-precomputed-handler-v1';--> statement-breakpoint
ALTER TABLE `reasoning_nodes` ADD `predecessor_outputs_json` text NOT NULL DEFAULT '[]';--> statement-breakpoint
ALTER TABLE `reasoning_nodes` ADD `lease_token` text;--> statement-breakpoint
ALTER TABLE `reasoning_nodes` ADD `lease_expires_at` text;--> statement-breakpoint
ALTER TABLE `reasoning_nodes` ADD `completion_token_hash` text;--> statement-breakpoint

UPDATE `reasoning_nodes`
SET `logical_node_id` = 'legacy:' || `workspace_id` || ':' || `trace_id` || ':' || `node_key`,
    `graph_version` = 'legacy-precomputed-v1',
    `execution_mode` = 'precomputed_fixture',
    `handler_version` = 'legacy-precomputed-handler-v1',
    `predecessor_outputs_json` = '[]';--> statement-breakpoint

UPDATE `reasoning_nodes`
SET `current_state` = 'failed',
    `error_code` = 'l06_interrupted_attempt',
    `completed_at` = CASE
      WHEN unixepoch(`updated_at`) >= unixepoch(`started_at`) THEN `updated_at`
      ELSE `started_at`
    END,
    `lease_token` = NULL,
    `lease_expires_at` = NULL,
    `completion_token_hash` = NULL
WHERE `current_state` = 'running';--> statement-breakpoint

CREATE TABLE `__l06_migration_assertions` (`error_code` text NOT NULL);--> statement-breakpoint
CREATE TRIGGER `__trg_l06_migration_assertions`
BEFORE INSERT ON `__l06_migration_assertions`
BEGIN
  SELECT CASE WHEN NEW.`error_code` = 'migration_l06_invalid_history'
    THEN RAISE(ABORT, 'migration_l06_invalid_history') END;
END;--> statement-breakpoint
INSERT INTO `__l06_migration_assertions` (`error_code`)
SELECT 'migration_l06_invalid_history'
WHERE EXISTS (
  SELECT 1 FROM `reasoning_nodes`
  GROUP BY `workspace_id`, `logical_node_id`
  HAVING SUM(CASE WHEN `current_state` = 'succeeded' THEN 1 ELSE 0 END) > 1
    OR SUM(CASE WHEN `current_state` IN ('pending', 'running') THEN 1 ELSE 0 END) > 1
);--> statement-breakpoint

CREATE UNIQUE INDEX `idx_reasoning_nodes_logical_attempt`
  ON `reasoning_nodes` (`workspace_id`,`logical_node_id`,`attempt`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_reasoning_nodes_active`
  ON `reasoning_nodes` (`workspace_id`,`logical_node_id`)
  WHERE `current_state` IN ('pending', 'running');--> statement-breakpoint
CREATE UNIQUE INDEX `idx_reasoning_nodes_running`
  ON `reasoning_nodes` (`workspace_id`,`logical_node_id`)
  WHERE `current_state` = 'running';--> statement-breakpoint
CREATE UNIQUE INDEX `idx_reasoning_nodes_succeeded`
  ON `reasoning_nodes` (`workspace_id`,`logical_node_id`)
  WHERE `current_state` = 'succeeded';--> statement-breakpoint

DROP TRIGGER `trg_reasoning_nodes_identity_immutable`;--> statement-breakpoint
DROP TRIGGER `trg_reasoning_nodes_transition`;--> statement-breakpoint

CREATE TRIGGER `trg_l06_reasoning_nodes_input_immutable`
BEFORE UPDATE OF `input_hash`, `predecessor_outputs_json`
ON `reasoning_nodes`
WHEN NEW.`input_hash` IS NOT OLD.`input_hash`
  OR NEW.`predecessor_outputs_json` IS NOT OLD.`predecessor_outputs_json`
BEGIN
  SELECT RAISE(ABORT, 'l06_input_drift');
END;--> statement-breakpoint

CREATE TRIGGER `trg_reasoning_nodes_identity_immutable`
BEFORE UPDATE OF `id`, `workspace_id`, `trace_id`, `node_key`, `logical_node_id`,
  `graph_version`, `execution_mode`, `handler_version`, `attempt`, `created_at`
ON `reasoning_nodes`
WHEN NEW.`id` IS NOT OLD.`id`
  OR NEW.`workspace_id` IS NOT OLD.`workspace_id`
  OR NEW.`trace_id` IS NOT OLD.`trace_id`
  OR NEW.`node_key` IS NOT OLD.`node_key`
  OR NEW.`logical_node_id` IS NOT OLD.`logical_node_id`
  OR NEW.`graph_version` IS NOT OLD.`graph_version`
  OR NEW.`execution_mode` IS NOT OLD.`execution_mode`
  OR NEW.`handler_version` IS NOT OLD.`handler_version`
  OR NEW.`attempt` IS NOT OLD.`attempt`
  OR NEW.`created_at` IS NOT OLD.`created_at`
BEGIN
  SELECT RAISE(ABORT, 'reasoning node identity and input are immutable');
END;--> statement-breakpoint

CREATE TRIGGER `trg_reasoning_nodes_transition`
BEFORE UPDATE OF `current_state`, `output_hash`, `error_code`, `lease_token`,
  `lease_expires_at`, `completion_token_hash`, `started_at`, `completed_at`
ON `reasoning_nodes`
BEGIN
  SELECT CASE WHEN NOT (
    (OLD.`current_state` = 'pending'
      AND NEW.`current_state` = 'running'
      AND unixepoch(NEW.`started_at`) IS NOT NULL
      AND NEW.`completed_at` IS NULL
      AND NEW.`output_hash` IS NULL
      AND NEW.`error_code` IS NULL
      AND length(NEW.`lease_token`) >= 16
      AND unixepoch(NEW.`lease_expires_at`) > unixepoch(NEW.`started_at`)
      AND NEW.`completion_token_hash` IS NULL)
    OR (OLD.`current_state` = 'pending'
      AND NEW.`current_state` = 'skipped'
      AND unixepoch(NEW.`completed_at`) IS NOT NULL
      AND NEW.`output_hash` IS NULL
      AND NEW.`lease_token` IS NULL
      AND NEW.`lease_expires_at` IS NULL
      AND NEW.`completion_token_hash` IS NULL)
    OR (OLD.`current_state` = 'running'
      AND NEW.`current_state` = 'succeeded'
      AND NEW.`started_at` IS OLD.`started_at`
      AND unixepoch(NEW.`completed_at`) >= unixepoch(NEW.`started_at`)
      AND NEW.`output_hash` IS NOT NULL
      AND NEW.`error_code` IS NULL
      AND NEW.`lease_token` IS NULL
      AND NEW.`lease_expires_at` IS NULL
      AND length(NEW.`completion_token_hash`) = 64
      AND NEW.`completion_token_hash` NOT GLOB '*[^0-9a-f]*')
    OR (OLD.`current_state` = 'running'
      AND NEW.`current_state` = 'failed'
      AND NEW.`started_at` IS OLD.`started_at`
      AND unixepoch(NEW.`completed_at`) >= unixepoch(NEW.`started_at`)
      AND NEW.`output_hash` IS NULL
      AND NEW.`error_code` IS NOT NULL
      AND NEW.`lease_token` IS NULL
      AND NEW.`lease_expires_at` IS NULL
      AND NEW.`completion_token_hash` IS NULL)
  ) THEN RAISE(ABORT, 'invalid reasoning node transition or lease payload') END;
END;--> statement-breakpoint

CREATE TRIGGER `trg_l06_reasoning_nodes_runtime_insert`
BEFORE INSERT ON `reasoning_nodes`
BEGIN
  SELECT CASE WHEN NEW.`execution_mode` <> 'runtime'
    THEN RAISE(ABORT, 'l06_arbitrary_graph_rejected') END;
  SELECT CASE WHEN NEW.`graph_version` <> 'crosssignal-fixed-graph-v1'
      OR NEW.`handler_version` <> 'crosssignal-fixture-handlers-v1'
    THEN RAISE(ABORT, 'l06_arbitrary_graph_rejected') END;
  SELECT CASE WHEN NEW.`node_key` NOT IN (
      'planner', 'quantitative', 'qualitative', 'experiment_design', 'skeptic', 'synthesizer'
    ) THEN RAISE(ABORT, 'l06_arbitrary_graph_rejected') END;
  SELECT CASE WHEN NEW.`current_state` <> 'pending'
      OR NEW.`output_hash` IS NOT NULL OR NEW.`error_code` IS NOT NULL
      OR NEW.`lease_token` IS NOT NULL OR NEW.`lease_expires_at` IS NOT NULL
      OR NEW.`completion_token_hash` IS NOT NULL
      OR NEW.`started_at` IS NOT NULL OR NEW.`completed_at` IS NOT NULL
    THEN RAISE(ABORT, 'l06_dependency_blocked') END;
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM `flight_traces` trace
    WHERE trace.`workspace_id` = NEW.`workspace_id`
      AND trace.`id` = NEW.`trace_id`
      AND trace.`truth_mode` = 'FIXTURE'
      AND trace.`current_state` IN ('context_frozen', 'reasoning')
  ) THEN RAISE(ABORT, 'l06_workspace_trace_mismatch') END;
  SELECT CASE WHEN NEW.`attempt` <> COALESCE((
    SELECT MAX(prior.`attempt`) FROM `reasoning_nodes` prior
    WHERE prior.`workspace_id` = NEW.`workspace_id`
      AND prior.`trace_id` = NEW.`trace_id`
      AND prior.`graph_version` = NEW.`graph_version`
      AND prior.`node_key` = NEW.`node_key`
  ), 0) + 1 THEN RAISE(ABORT, 'l06_dependency_blocked') END;
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM `reasoning_nodes` prior
    WHERE prior.`workspace_id` = NEW.`workspace_id`
      AND prior.`trace_id` = NEW.`trace_id`
      AND prior.`graph_version` = NEW.`graph_version`
      AND prior.`node_key` = NEW.`node_key`
      AND prior.`logical_node_id` <> NEW.`logical_node_id`
  ) THEN RAISE(ABORT, 'l06_arbitrary_graph_rejected') END;
  SELECT CASE WHEN NOT json_valid(NEW.`predecessor_outputs_json`)
      OR json_type(NEW.`predecessor_outputs_json`) <> 'array'
      OR json_array_length(NEW.`predecessor_outputs_json`) <> CASE NEW.`node_key`
        WHEN 'planner' THEN 0 WHEN 'quantitative' THEN 1 WHEN 'qualitative' THEN 1
        WHEN 'experiment_design' THEN 1 WHEN 'skeptic' THEN 3
        WHEN 'synthesizer' THEN 5 ELSE -1 END
    THEN RAISE(ABORT, 'l06_arbitrary_graph_rejected') END;
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM json_each(NEW.`predecessor_outputs_json`) item
    WHERE json_extract(item.`value`, '$.nodeKey') <> CASE NEW.`node_key` || ':' || item.`key`
      WHEN 'quantitative:0' THEN 'planner' WHEN 'qualitative:0' THEN 'planner'
      WHEN 'experiment_design:0' THEN 'planner'
      WHEN 'skeptic:0' THEN 'quantitative' WHEN 'skeptic:1' THEN 'qualitative'
      WHEN 'skeptic:2' THEN 'experiment_design'
      WHEN 'synthesizer:0' THEN 'planner' WHEN 'synthesizer:1' THEN 'quantitative'
      WHEN 'synthesizer:2' THEN 'qualitative' WHEN 'synthesizer:3' THEN 'experiment_design'
      WHEN 'synthesizer:4' THEN 'skeptic' ELSE '__invalid__' END
  ) THEN RAISE(ABORT, 'l06_arbitrary_graph_rejected') END;
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM json_each(NEW.`predecessor_outputs_json`) item
    WHERE NOT EXISTS (
        SELECT 1 FROM `reasoning_nodes` predecessor
        JOIN `reasoning_artifacts` artifact
          ON artifact.`workspace_id` = predecessor.`workspace_id`
          AND artifact.`trace_id` = predecessor.`trace_id`
          AND artifact.`node_id` = predecessor.`id`
          AND artifact.`content_hash` = predecessor.`output_hash`
        WHERE predecessor.`workspace_id` = NEW.`workspace_id`
          AND predecessor.`trace_id` = NEW.`trace_id`
          AND predecessor.`graph_version` = NEW.`graph_version`
          AND predecessor.`node_key` = json_extract(item.`value`, '$.nodeKey')
          AND predecessor.`current_state` = 'succeeded'
      )
  ) THEN RAISE(ABORT, 'l06_dependency_blocked') END;
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM json_each(NEW.`predecessor_outputs_json`) item
    WHERE NOT EXISTS (
      SELECT 1 FROM `reasoning_nodes` predecessor
      JOIN `reasoning_artifacts` artifact
        ON artifact.`workspace_id` = predecessor.`workspace_id`
        AND artifact.`trace_id` = predecessor.`trace_id`
        AND artifact.`node_id` = predecessor.`id`
        AND artifact.`content_hash` = predecessor.`output_hash`
      WHERE predecessor.`workspace_id` = NEW.`workspace_id`
        AND predecessor.`trace_id` = NEW.`trace_id`
        AND predecessor.`graph_version` = NEW.`graph_version`
        AND predecessor.`node_key` = json_extract(item.`value`, '$.nodeKey')
        AND predecessor.`current_state` = 'succeeded'
        AND predecessor.`output_hash` = json_extract(item.`value`, '$.outputHash')
    )
  ) THEN RAISE(ABORT, 'l06_input_drift') END;
END;--> statement-breakpoint

CREATE TRIGGER `trg_l06_reasoning_artifact_runtime_contract`
BEFORE INSERT ON `reasoning_artifacts`
WHEN EXISTS (
  SELECT 1 FROM `reasoning_nodes` node
  WHERE node.`workspace_id` = NEW.`workspace_id`
    AND node.`id` = NEW.`node_id` AND node.`execution_mode` = 'runtime'
)
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM `reasoning_nodes` node
    WHERE node.`workspace_id` = NEW.`workspace_id`
      AND node.`trace_id` = NEW.`trace_id` AND node.`id` = NEW.`node_id`
      AND node.`graph_version` = 'crosssignal-fixed-graph-v1'
      AND node.`handler_version` = 'crosssignal-fixture-handlers-v1'
      AND node.`current_state` = 'succeeded' AND node.`output_hash` = NEW.`content_hash`
      AND NEW.`schema_version` = 'reasoning-artifact-v2'
      AND NEW.`artifact_kind` = CASE node.`node_key`
        WHEN 'planner' THEN 'plan' WHEN 'skeptic' THEN 'critique'
        WHEN 'synthesizer' THEN 'intent_draft' ELSE 'analysis' END
      AND json_extract(NEW.`content_json`, '$.truthMode') = 'FIXTURE'
      AND json_extract(NEW.`content_json`, '$.graphVersion') = node.`graph_version`
      AND json_extract(NEW.`content_json`, '$.handlerVersion') = node.`handler_version`
      AND json_extract(NEW.`content_json`, '$.nodeKey') = node.`node_key`
      AND json_extract(NEW.`content_json`, '$.predecessorOutputs') = json(node.`predecessor_outputs_json`)
      AND json_extract(NEW.`content_json`, '$.usage.status') IN ('unknown', 'measured')
      AND ((json_extract(NEW.`content_json`, '$.usage.status') = 'unknown'
          AND json_type(NEW.`content_json`, '$.usage.measuredCostUsd') = 'null')
        OR (json_extract(NEW.`content_json`, '$.usage.status') = 'measured'
          AND json_type(NEW.`content_json`, '$.usage.measuredCostUsd') IN ('integer', 'real')))
  ) THEN RAISE(ABORT, 'l06_invalid_artifact') END;
  SELECT CASE WHEN lower(NEW.`content_json`) LIKE '%bearer %'
      OR lower(NEW.`content_json`) LIKE '%sk_live_%'
      OR lower(NEW.`content_json`) LIKE '%sk_test_%'
      OR lower(NEW.`content_json`) LIKE '%private key%'
    THEN RAISE(ABORT, 'l06_invalid_artifact') END;
  SELECT CASE WHEN NEW.`evidence_citations_json` <> CASE (
    SELECT node.`node_key` FROM `reasoning_nodes` node
    WHERE node.`workspace_id` = NEW.`workspace_id` AND node.`id` = NEW.`node_id`
  )
    WHEN 'planner' THEN '["evidence:activation-drop","evidence:onboarding-feedback"]'
    WHEN 'quantitative' THEN '["evidence:activation-drop","metric:activation-72h"]'
    WHEN 'qualitative' THEN '["evidence:onboarding-feedback","context:brand"]'
    WHEN 'experiment_design' THEN '["context:email-policy","metric:activation-72h"]'
    WHEN 'skeptic' THEN '["evidence:activation-drop","evidence:onboarding-feedback"]'
    WHEN 'synthesizer' THEN '["evidence:activation-drop","evidence:onboarding-feedback","context:email-policy","metric:activation-72h"]'
    ELSE '[]' END
  THEN RAISE(ABORT, 'l06_invalid_artifact') END;
END;--> statement-breakpoint

CREATE TRIGGER `trg_l06_reasoning_artifact_scope`
BEFORE INSERT ON `reasoning_artifacts`
BEGIN
  SELECT CASE WHEN NOT EXISTS (
    SELECT 1 FROM `reasoning_nodes` node
    WHERE node.`workspace_id` = NEW.`workspace_id`
      AND node.`trace_id` = NEW.`trace_id`
      AND node.`id` = NEW.`node_id`
  ) THEN RAISE(ABORT, 'l06_workspace_trace_mismatch') END;
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM `reasoning_artifacts` canonical
    WHERE canonical.`workspace_id` = NEW.`workspace_id`
      AND canonical.`node_id` = NEW.`node_id`
      AND canonical.`artifact_kind` = NEW.`artifact_kind`
      AND canonical.`content_hash` <> NEW.`content_hash`
  ) THEN RAISE(ABORT, 'l06_invalid_artifact') END;
END;--> statement-breakpoint

CREATE TRIGGER `trg_l06_action_intent_graph_complete`
BEFORE INSERT ON `action_intents`
WHEN EXISTS (
  SELECT 1 FROM `reasoning_nodes` node
  WHERE node.`workspace_id` = NEW.`workspace_id`
    AND node.`trace_id` = NEW.`trace_id`
    AND node.`graph_version` = 'crosssignal-fixed-graph-v1'
)
BEGIN
  SELECT CASE WHEN (
    SELECT COUNT(*) FROM `reasoning_nodes` node
    JOIN `reasoning_artifacts` artifact
      ON artifact.`workspace_id` = node.`workspace_id`
      AND artifact.`trace_id` = node.`trace_id`
      AND artifact.`node_id` = node.`id`
      AND artifact.`content_hash` = node.`output_hash`
    WHERE node.`workspace_id` = NEW.`workspace_id`
      AND node.`trace_id` = NEW.`trace_id`
      AND node.`graph_version` = 'crosssignal-fixed-graph-v1'
      AND node.`execution_mode` = 'runtime'
      AND node.`current_state` = 'succeeded'
  ) <> 6 THEN RAISE(ABORT, 'l06_dependency_blocked') END;
END;--> statement-breakpoint

CREATE TRIGGER `trg_l06_trace_reasoning_handoff`
BEFORE UPDATE OF `current_state` ON `flight_traces`
WHEN OLD.`current_state` = 'reasoning' AND NEW.`current_state` = 'awaiting_approval'
BEGIN
  SELECT CASE WHEN (
    SELECT COUNT(*) FROM `reasoning_nodes` node
    JOIN `reasoning_artifacts` artifact
      ON artifact.`workspace_id` = node.`workspace_id`
      AND artifact.`trace_id` = node.`trace_id`
      AND artifact.`node_id` = node.`id`
      AND artifact.`content_hash` = node.`output_hash`
    WHERE node.`workspace_id` = NEW.`workspace_id`
      AND node.`trace_id` = NEW.`id`
      AND node.`graph_version` = 'crosssignal-fixed-graph-v1'
      AND node.`execution_mode` = 'runtime'
      AND node.`current_state` = 'succeeded'
  ) <> 6 THEN RAISE(ABORT, 'l06_dependency_blocked') END;
END;--> statement-breakpoint

DROP TRIGGER `__trg_l06_migration_assertions`;--> statement-breakpoint
DROP TABLE `__l06_migration_assertions`;
