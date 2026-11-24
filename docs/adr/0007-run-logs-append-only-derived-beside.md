# Run logs are append-only files, never rewritten; everything derived sits beside them

Every E1 run writes one JSONL file, one event per line, each line written and fsynced before the send, call or operation it announces, and hash-chained to the line before it. The file records raw facts once: each request's hash and new messages, the provider's whole response including reasoning, and each tool result exactly as the model saw it. It is never rewritten, even when its schema changes: each schema version keeps a frozen reader, and in-memory upcasters bring old files to the current shape, proved by a byte round trip on one committed fixture per version. Grades, metrics, step labels, scans, annotations and judge calls live in separate files keyed by the run id and the chain's head hash. Batches are archived with a committed, timestamped manifest of every file's hash. We chose this because ADR 0006 re-grades every stored run log whenever the grader changes, and a re-grade is only honest if the bytes it reads are the bytes the model produced, provably, months later. Adapted from Temporal's event history (via the owner's Notion "AI Engineering Roadmap", section 3 note 4): the history is the truth, and re-running code against it tests the code, not the history.

## Considered options

- **A database, like A01's SQLite timeline**: easy to query, but an export step would sit between the record and what anyone reads, and the file we hash and stamp would no longer be the record itself.
- **Migrating old logs to each new schema**: one shape to read, but every migration rewrites stamped files and breaks their chains and manifests.
- **Hashes of tool results, regenerated on demand**: logs about a fifth the size, but a drifted simulator could then show a reader something the model never saw.
- **Grades and labels written into the log**: one file per run, but a new grader version or label map would mean rewriting the record.

## Consequences

- A schema change must add a reader, an upcaster and a fixture, and `verify:e1` must still load every committed fixture.
- Publishing needs a masked copy: masking changes bytes, so the public file is re-chained and names the original's head and the mask version, and the private original stays the record.
- Re-grading an old run needs its world version, not its harness: world versions are git tags, regenerated from their tag.
- Logs run about 300 KB each and at most about 1 MB, about 15 MB a batch, kept in the home checkout and a private repository.
