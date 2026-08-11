---
id: p00-m3-state-ownership-diagram
status: accepted
---

# CrossSignal state ownership

```mermaid
flowchart LR
    Browser["Owner browser<br/>inspection and decisions"]
    Sites["Sites / Vinext server<br/>authentication and API boundary"]
    D1["D1<br/>authorization, projections, run mapping,<br/>idempotency, permanent ledger"]
    Repo["IcmRepository<br/>path and Git policy"]
    Git["Private Git per workspace<br/>semantic artifacts and Company Brain"]
    Adapter["EveRuntime adapter<br/>signed short-lived context"]
    Eve["Separate EVE service<br/>sessions, checkpoints, bounded execution"]
    Tools["CrossSignal bounded tools / MCP<br/>fixture reads and declared writes"]
    Fixtures["Versioned fixtures<br/>synthetic source facts"]
    Traces["Agent Runs / traces<br/>expiring diagnostics"]

    Browser -->|"authenticated request / human edit"| Sites
    Sites -->|"authorize and append"| D1
    Sites -->|"semantic read, commit, diff"| Repo
    Repo -->|"server-held Git credential"| Git
    Sites -->|"signed execution envelope"| Adapter
    Adapter --> Eve
    Eve -->|"bounded call; tenant injected"| Tools
    Tools --> Fixtures
    Tools -->|"operational preflight and ledger"| D1
    Tools -->|"declared artifact operation"| Repo
    Eve --> Traces
    D1 -.->|"run and trace correlation only"| Traces
```

## Reconstruction rule

- Rebuild semantic meaning from private Git and canonical human reviews.
- Rebuild operational authorization/action state from D1 and the permanent
  ledger.
- Resume runtime work from EVE only after reloading current ICM and D1 state.
- Treat the UI and expiring traces as projections, never recovery authorities.
- If expected ICM heads/hashes and D1 authorization hashes disagree, show a
  reconciliation state and perform no side effect or brain merge.
