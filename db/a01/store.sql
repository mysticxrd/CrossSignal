-- A01 local simulator store. Never apply to TEST or LIVE databases.
PRAGMA foreign_keys = ON;
CREATE TABLE runs (
  workspace_id TEXT NOT NULL, case_id TEXT NOT NULL, run_id TEXT NOT NULL,
  truth_mode TEXT NOT NULL CHECK (truth_mode = 'SIMULATED'),
  seed TEXT NOT NULL, initial_hash TEXT NOT NULL CHECK (length(initial_hash) = 64),
  PRIMARY KEY (workspace_id, case_id, run_id)
) STRICT;
CREATE TABLE evidence (
  workspace_id TEXT NOT NULL, case_id TEXT NOT NULL, run_id TEXT NOT NULL,
  event_id TEXT NOT NULL, content_hash TEXT NOT NULL CHECK (length(content_hash) = 64),
  payload_json TEXT NOT NULL CHECK (COALESCE(json_valid(payload_json) AND json_extract(payload_json, '$.truthMode') = 'SIMULATED', 0)),
  PRIMARY KEY (workspace_id, case_id, run_id, event_id),
  FOREIGN KEY (workspace_id, case_id, run_id) REFERENCES runs(workspace_id, case_id, run_id)
) STRICT;
CREATE TABLE intents (
  workspace_id TEXT NOT NULL, case_id TEXT NOT NULL, run_id TEXT NOT NULL,
  intent_id TEXT NOT NULL, proposal_hash TEXT NOT NULL CHECK (length(proposal_hash) = 64),
  payload_json TEXT NOT NULL CHECK (COALESCE(json_valid(payload_json)
    AND json_extract(payload_json, '$.action.kind') = 'simulated_rollback'
    AND json_extract(payload_json, '$.action.environment') = 'SIMULATED', 0)),
  PRIMARY KEY (workspace_id, case_id, run_id, intent_id),
  UNIQUE (workspace_id, case_id, run_id, intent_id, proposal_hash),
  FOREIGN KEY (workspace_id, case_id, run_id) REFERENCES runs(workspace_id, case_id, run_id)
) STRICT;
CREATE TABLE grants (
  workspace_id TEXT NOT NULL, case_id TEXT NOT NULL, run_id TEXT NOT NULL,
  grant_id TEXT NOT NULL, intent_id TEXT NOT NULL, proposal_hash TEXT NOT NULL,
  actor_id TEXT NOT NULL, expires_at TEXT NOT NULL,
  provenance TEXT NOT NULL CHECK (provenance IN ('local_human', 'fixture_surrogate')),
  PRIMARY KEY (workspace_id, case_id, run_id, grant_id),
  UNIQUE (workspace_id, case_id, run_id, grant_id, intent_id, proposal_hash),
  FOREIGN KEY (workspace_id, case_id, run_id, intent_id, proposal_hash)
    REFERENCES intents(workspace_id, case_id, run_id, intent_id, proposal_hash)
) STRICT;
CREATE TABLE effects (
  workspace_id TEXT NOT NULL, case_id TEXT NOT NULL, run_id TEXT NOT NULL,
  effect_id TEXT NOT NULL, grant_id TEXT NOT NULL, intent_id TEXT NOT NULL,
  proposal_hash TEXT NOT NULL, reservation_hash TEXT NOT NULL CHECK (length(reservation_hash) = 64),
  PRIMARY KEY (workspace_id, case_id, run_id, effect_id),
  UNIQUE (workspace_id, case_id, run_id, intent_id),
  UNIQUE (workspace_id, case_id, run_id, grant_id),
  FOREIGN KEY (workspace_id, case_id, run_id, grant_id, intent_id, proposal_hash)
    REFERENCES grants(workspace_id, case_id, run_id, grant_id, intent_id, proposal_hash)
) STRICT;
CREATE TABLE world_versions (
  workspace_id TEXT NOT NULL, case_id TEXT NOT NULL, run_id TEXT NOT NULL,
  revision INTEGER NOT NULL CHECK (revision >= 0),
  logical_time TEXT NOT NULL,
  snapshot_hash TEXT NOT NULL CHECK (length(snapshot_hash) = 64),
  snapshot_json TEXT NOT NULL CHECK (json_valid(snapshot_json)),
  PRIMARY KEY (workspace_id, case_id, run_id, revision),
  FOREIGN KEY (workspace_id, case_id, run_id) REFERENCES runs(workspace_id, case_id, run_id)
) STRICT;
CREATE TABLE timeline (
  workspace_id TEXT NOT NULL, case_id TEXT NOT NULL, run_id TEXT NOT NULL,
  sequence INTEGER NOT NULL CHECK (sequence >= 1), event_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('signal', 'evidence_query', 'hypothesis', 'proposal', 'approval', 'rejection', 'effect_reserved', 'effect_confirmed', 'effect_indeterminate', 'observation', 'resolved', 'uncertain', 'reopened')),
  logical_time TEXT NOT NULL, content_hash TEXT NOT NULL CHECK (length(content_hash) = 64),
  payload_json TEXT NOT NULL CHECK (json_valid(payload_json)),
  PRIMARY KEY (workspace_id, case_id, run_id, sequence),
  UNIQUE (workspace_id, case_id, run_id, event_id),
  FOREIGN KEY (workspace_id, case_id, run_id) REFERENCES runs(workspace_id, case_id, run_id)
) STRICT;
-- Corrections and effect outcomes append records; no destructive rewrites.
CREATE TRIGGER runs_no_update BEFORE UPDATE ON runs BEGIN SELECT RAISE(ABORT, 'append only'); END;
CREATE TRIGGER runs_no_delete BEFORE DELETE ON runs BEGIN SELECT RAISE(ABORT, 'append only'); END;
CREATE TRIGGER evidence_no_update BEFORE UPDATE ON evidence BEGIN SELECT RAISE(ABORT, 'append only'); END;
CREATE TRIGGER evidence_no_delete BEFORE DELETE ON evidence BEGIN SELECT RAISE(ABORT, 'append only'); END;
CREATE TRIGGER intents_no_update BEFORE UPDATE ON intents BEGIN SELECT RAISE(ABORT, 'append only'); END;
CREATE TRIGGER intents_no_delete BEFORE DELETE ON intents BEGIN SELECT RAISE(ABORT, 'append only'); END;
CREATE TRIGGER grants_no_update BEFORE UPDATE ON grants BEGIN SELECT RAISE(ABORT, 'append only'); END;
CREATE TRIGGER grants_no_delete BEFORE DELETE ON grants BEGIN SELECT RAISE(ABORT, 'append only'); END;
CREATE TRIGGER effects_no_update BEFORE UPDATE ON effects BEGIN SELECT RAISE(ABORT, 'append only'); END;
CREATE TRIGGER effects_no_delete BEFORE DELETE ON effects BEGIN SELECT RAISE(ABORT, 'append only'); END;
CREATE TRIGGER world_no_update BEFORE UPDATE ON world_versions BEGIN SELECT RAISE(ABORT, 'append only'); END;
CREATE TRIGGER world_no_delete BEFORE DELETE ON world_versions BEGIN SELECT RAISE(ABORT, 'append only'); END;
CREATE TRIGGER timeline_no_update BEFORE UPDATE ON timeline BEGIN SELECT RAISE(ABORT, 'append only'); END;
CREATE TRIGGER timeline_no_delete BEFORE DELETE ON timeline BEGIN SELECT RAISE(ABORT, 'append only'); END;
