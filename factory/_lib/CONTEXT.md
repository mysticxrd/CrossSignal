# Factory tooling

One job: provide shared, read-only mechanics for hashing, status derivation, and
release sealing without becoming a second workflow state store.

- `verify-kit.mjs` owns path hashing, Markdown bindings, and checked commands.
- `factory-state.mjs` derives stage and Git state from existing contracts and
  output evidence.
- Nothing in this folder edits stage outputs or human gates.

Accepted historical verifiers remain frozen because their exact hashes are
part of reviewed evidence. New or deliberately re-verified stages should import
the shared kit instead of copying its helpers.
