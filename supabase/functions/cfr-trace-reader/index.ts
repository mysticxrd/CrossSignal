import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import postgres from "npm:postgres@3.4.9";
import { buildSimulatedCheckout, canonicalCheckout, CHECKOUT_LIMIT, RUN_ID } from "../_shared/case-checkout.mjs";

type TraceRequest = { userId: string; workspaceId: string; traceId: string };
type WorkspaceListRequest = { operation: "workspace.list"; userId: string };
type WorkspaceCreateRequest = {
  operation: "workspace.create";
  userId: string;
  workspace: { id: string; name: string; slug: string };
};
type WorkspaceAccessRequest = { operation: "workspace.access"; userId: string; workspaceId: string };
type RuntimeGetRequest = { operation: "runtime.get"; userId: string; workspaceId: string };
type RuntimePutRequest = {
  operation: "runtime.put";
  userId: string;
  workspaceId: string;
  expectedVersion: number;
  eventType: string;
  snapshot: Record<string, unknown>;
};
type CaseDecisionReadRequest = {
  operation: "case.decision.read";
  userId: string;
  workspaceId: string;
  caseId: string;
};
type CaseResponseApproveRequest = {
  operation: "case.response.approve";
  userId: string;
  workspaceId: string;
  caseId: string;
  responseId: string;
  responseHash: string;
};
type CaseCheckRecordRequest = {
  operation: "case.check.record";
  userId: string;
  workspaceId: string;
  caseId: string;
  responseId: string;
  responseHash: string;
  runReference: string;
  captureStatus: "captured" | "not_captured" | "indeterminate";
};
type CaseCheckTrialRequest = {
  operation: "case.check.trial";
  userId: string;
  workspaceId: string;
  caseId: string;
  responseId: string;
  responseHash: string;
  receiptHash: string;
};
type CaseCheckoutRequest = {
  operation: "case.checkout.simulate"; userId: string; workspaceId: string; caseId: string;
  responseId: string; responseHash: string; runId: string; scenario: "capture" | "decline";
};
type RuntimeRequest = WorkspaceListRequest | WorkspaceCreateRequest | WorkspaceAccessRequest | RuntimeGetRequest | RuntimePutRequest;
type GatewayRequest = TraceRequest | RuntimeRequest | CaseDecisionReadRequest | CaseResponseApproveRequest
  | CaseCheckRecordRequest | CaseCheckTrialRequest | CaseCheckoutRequest;

const RUNTIME_EVENT_TYPES = new Set([
  "runtime.initialized",
  "intent.replaced",
  "authority.paused",
  "authority.resumed",
  "action.confirmed",
  "action.failed",
  "action.indeterminate",
  "fixture.reset",
]);

const databaseUrl = Deno.env.get("SUPABASE_DB_URL");
if (!databaseUrl) throw new Error("SUPABASE_DB_URL is unavailable.");

const sql = postgres(databaseUrl, {
  connect_timeout: 10,
  fetch_types: false,
  idle_timeout: 10,
  max: 1,
  prepare: false,
});

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function validIdentifier(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(value);
}

function validWorkspaceName(value: unknown): value is string {
  return typeof value === "string" && value.length >= 2 && value.length <= 64 && value.trim() === value;
}

function validSlug(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(value);
}

function parseRequest(value: unknown): GatewayRequest | null {
  if (!isRecord(value) || !validIdentifier(value.userId)) return null;
  if (value.operation === undefined) {
    return validIdentifier(value.workspaceId) && validIdentifier(value.traceId)
      ? value as TraceRequest
      : null;
  }
  if (value.operation === "workspace.list") return value as WorkspaceListRequest;
  if (value.operation === "workspace.create") {
    if (
      !isRecord(value.workspace)
      || !validIdentifier(value.workspace.id)
      || !validWorkspaceName(value.workspace.name)
      || !validSlug(value.workspace.slug)
    ) return null;
    return value as WorkspaceCreateRequest;
  }
  if (value.operation === "workspace.access" || value.operation === "runtime.get") {
    return validIdentifier(value.workspaceId) ? value as WorkspaceAccessRequest | RuntimeGetRequest : null;
  }
  if (value.operation === "case.decision.read") {
    return validIdentifier(value.workspaceId) && validIdentifier(value.caseId)
      ? value as CaseDecisionReadRequest : null;
  }
  if (value.operation === "case.response.approve") {
    return validIdentifier(value.workspaceId) && validIdentifier(value.caseId)
      && validIdentifier(value.responseId)
      && typeof value.responseHash === "string" && /^[0-9a-f]{64}$/.test(value.responseHash)
      ? value as CaseResponseApproveRequest : null;
  }
  if (value.operation === "case.check.record") {
    return validIdentifier(value.workspaceId) && validIdentifier(value.caseId)
      && validIdentifier(value.responseId)
      && typeof value.responseHash === "string" && /^[0-9a-f]{64}$/.test(value.responseHash)
      && typeof value.runReference === "string" && /^[A-Za-z0-9_-]{8,64}$/.test(value.runReference)
      && !/^sim_/i.test(value.runReference)
      && ["captured", "not_captured", "indeterminate"].includes(String(value.captureStatus))
      ? value as CaseCheckRecordRequest : null;
  }
  if (value.operation === "case.checkout.simulate") {
    return Object.keys(value).sort().join("|") === "caseId|operation|responseHash|responseId|runId|scenario|userId|workspaceId"
      && validIdentifier(value.workspaceId) && validIdentifier(value.caseId) && validIdentifier(value.responseId)
      && typeof value.responseHash === "string" && /^[0-9a-f]{64}$/.test(value.responseHash)
      && typeof value.runId === "string" && RUN_ID.test(value.runId)
      && (value.scenario === "capture" || value.scenario === "decline") ? value as CaseCheckoutRequest : null;
  }
  if (value.operation === "case.check.trial") {
    return validIdentifier(value.workspaceId) && validIdentifier(value.caseId)
      && validIdentifier(value.responseId)
      && typeof value.responseHash === "string" && /^[0-9a-f]{64}$/.test(value.responseHash)
      && typeof value.receiptHash === "string" && /^[0-9a-f]{64}$/.test(value.receiptHash)
      ? value as CaseCheckTrialRequest : null;
  }
  if (value.operation === "runtime.put") {
    if (
      !validIdentifier(value.workspaceId)
      || !Number.isSafeInteger(value.expectedVersion)
      || Number(value.expectedVersion) < 0
      || !RUNTIME_EVENT_TYPES.has(String(value.eventType))
      || !isRecord(value.snapshot)
      || value.snapshot.workspaceId !== value.workspaceId
      || value.snapshot.truthMode !== "FIXTURE"
      || JSON.stringify(value.snapshot).length > 750_000
    ) return null;
    return value as RuntimePutRequest;
  }
  return null;
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function equalHash(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

async function configureRuntimeRole(transaction: postgres.TransactionSql, principalId: string, workspaceId = "") {
  await transaction.unsafe("set local role cfr_app_runtime");
  await transaction`
    select
      set_config('app.current_user_id', ${principalId}, true),
      set_config('app.current_workspace_id', ${workspaceId}, true)
  `;
}

async function hasOwnerMembership(transaction: postgres.TransactionSql, principalId: string, workspaceId: string) {
  const [membership] = await transaction`
    select workspace_id
    from cfr_app.workspace_members
    where workspace_id = ${workspaceId}
      and user_id = ${principalId}
      and role = 'owner'
    limit 1
  `;
  return Boolean(membership);
}

async function handleTrace(input: TraceRequest, principalId: string, userIdSha256: string): Promise<Response> {
  const result = await sql.begin(async (transaction) => {
    await transaction`set transaction read only`;
    await transaction.unsafe("set local role cfr_trace_reader");
    await transaction`
      select
        set_config('app.current_user_id', ${principalId}, true),
        set_config('app.current_workspace_id', ${input.workspaceId}, true)
    `;
    const [membership] = await transaction`
      select workspace_id
      from cfr_app.workspace_members
      where workspace_id = ${input.workspaceId}
        and user_id = ${principalId}
        and role = 'owner'
      limit 1
    `;
    if (!membership) return { kind: "not_found" as const };

    const [trace] = await transaction`
      select id, workspace_id as "workspaceId", trace_key as "traceKey",
        current_state as "currentState", truth_mode as "truthMode"
      from cfr_app.flight_traces
      where workspace_id = ${input.workspaceId} and id = ${input.traceId}
      limit 1
    `;
    if (!trace) return { kind: "not_found" as const };

    const events = await transaction`
      select id, workspace_id as "workspaceId", trace_id as "traceId",
        sequence::int as sequence, event_type as "eventType",
        subject_type as "subjectType", subject_id as "subjectId",
        prior_state as "priorState", current_state as "currentState",
        actor_type as "actorType", actor_id as "actorId",
        payload_json as "payloadJson", payload_hash as "payloadHash",
        occurred_at as "occurredAt"
      from cfr_app.flight_trace_events
      where workspace_id = ${input.workspaceId} and trace_id = ${input.traceId}
      order by sequence asc
    `;
    if (events.length === 0) return { kind: "incomplete" as const };
    return { kind: "found" as const, trace, events };
  });
  console.log(JSON.stringify({ event: "trace_read_result", userIdSha256,
    workspaceId: input.workspaceId, traceId: input.traceId, kind: result.kind }));
  return json(result, result.kind === "not_found" ? 404 : result.kind === "incomplete" ? 409 : 200);
}

async function handleCaseDecision(input: CaseDecisionReadRequest, principalId: string, userIdSha256: string): Promise<Response> {
  const result = await sql.begin(async (transaction) => {
    await transaction`set transaction read only`;
    await transaction.unsafe("set local role cfr_trace_reader");
    await transaction`
      select set_config('app.current_user_id', ${principalId}, true),
        set_config('app.current_workspace_id', ${input.workspaceId}, true)
    `;
    if (!await hasOwnerMembership(transaction, principalId, input.workspaceId)) {
      return { kind: "not_found" as const };
    }
    const [caseRow] = await transaction`
      select workspace_id as "workspaceId", id, scenario_id as "scenarioId",
        scenario_version::int as "scenarioVersion", scenario_hash as "scenarioHash",
        title, status, truth_mode as "truthMode", content_hash as "contentHash"
      from cfr_app.detected_cases
      where workspace_id = ${input.workspaceId} and id = ${input.caseId}
      limit 1
    `;
    if (!caseRow) return { kind: "not_found" as const };
    const [signalRow] = await transaction`
      select workspace_id as "workspaceId", id, case_id as "caseId", kind,
        method_version as "methodVersion", detected, metrics_json as metrics,
        content_hash as "contentHash"
      from cfr_app.case_signals
      where workspace_id = ${input.workspaceId} and case_id = ${input.caseId}
      limit 1
    `;
    const evidenceRows = await transaction`
      select workspace_id as "workspaceId", id, case_id as "caseId", source,
        relation, claim, truth_mode as "truthMode", content_hash as "contentHash"
      from cfr_app.case_evidence
      where workspace_id = ${input.workspaceId} and case_id = ${input.caseId}
      order by id
    `;
    const eventRows = await transaction`
      select workspace_id as "workspaceId", id, scenario_id as "scenarioId",
        truth_mode as "truthMode", source, window_key as "window", segment,
        observed_day::text as "observedDay", starts, completed, captures,
        revenue_cents::int as "revenueCents", content_hash as "contentHash"
      from cfr_app.case_recorded_events
      where workspace_id = ${input.workspaceId} and scenario_id = ${caseRow.scenarioId}
      order by id
    `;
    const citationRows = await transaction`
      select r.workspace_id as "workspaceId", r.evidence_id as "evidenceId",
        r.event_id as "eventId"
      from cfr_app.case_evidence_event_refs r
      join cfr_app.case_evidence e
        on e.workspace_id = r.workspace_id and e.id = r.evidence_id
      where r.workspace_id = ${input.workspaceId} and e.case_id = ${input.caseId}
      order by r.evidence_id, r.event_id
    `;
    const [investigationRow] = await transaction`
      select id, artifact_json as artifact, content_hash as "contentHash"
      from cfr_app.case_investigations
      where workspace_id = ${input.workspaceId} and case_id = ${input.caseId}
        and method_version = 'bounded-deterministic-v1'
      limit 1
    `;
    if (!signalRow || !investigationRow) return { kind: "incomplete" as const };
    const investigationCitations = await transaction`
      select workspace_id as "workspaceId", investigation_id as "investigationId",
        claim_id as "claimId", evidence_id as "evidenceId", event_id as "eventId"
      from cfr_app.case_investigation_citations
      where workspace_id = ${input.workspaceId}
        and investigation_id = ${investigationRow.id}
      order by claim_id, evidence_id, event_id
    `;
    const [responseRow] = await transaction`
      select workspace_id as "workspaceId", id, case_id as "caseId",
        investigation_id as "investigationId", artifact_json as artifact,
        content_hash as "contentHash"
      from cfr_app.case_response_proposals
      where workspace_id = ${input.workspaceId} and case_id = ${input.caseId}
      limit 1
    `;
    if (!responseRow) return { kind: "incomplete" as const };
    const [approvalRow] = await transaction`
      select workspace_id as "workspaceId", response_id as "responseId",
        proposal_hash as "proposalHash", approved_by as "approvedBy",
        approved_at::text as "approvedAt"
      from cfr_app.case_response_approvals
      where workspace_id = ${input.workspaceId} and response_id = ${responseRow.id}
      limit 1
    `;
    const [receiptRow] = await transaction`
      select workspace_id as "workspaceId", response_id as "responseId",
        proposal_hash as "proposalHash", recorded_by as "recordedBy",
        run_reference as "runReference", capture_status as "captureStatus",
        to_char(checked_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "checkedAt",
        to_char(recorded_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "recordedAt",
        content_hash as "contentHash"
      from cfr_app.case_response_receipts
      where workspace_id = ${input.workspaceId} and response_id = ${responseRow.id}
      limit 1
    `;
    const [trialMarkerRow] = await transaction`
      select workspace_id as "workspaceId", response_id as "responseId",
        receipt_hash as "receiptHash", marked_by as "markedBy", reason,
        to_char(marked_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "markedAt",
        content_hash as "contentHash"
      from cfr_app.case_check_trial_markers
      where workspace_id = ${input.workspaceId} and response_id = ${responseRow.id}
      limit 1
    `;
    const [recheckRow] = await transaction`
      select workspace_id as "workspaceId", response_id as "responseId",
        proposal_hash as "proposalHash", supersedes_receipt_hash as "supersedesReceiptHash",
        recorded_by as "recordedBy", run_reference as "runReference",
        capture_status as "captureStatus",
        to_char(checked_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "checkedAt",
        to_char(recorded_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "recordedAt",
        content_hash as "contentHash"
      from cfr_app.case_check_recheck_receipts
      where workspace_id = ${input.workspaceId} and response_id = ${responseRow.id}
      limit 1
    `;
    const checkoutRows = await transaction`
      select artifact_json as artifact, content_hash as "contentHash"
      from cfr_app.case_simulated_checkouts
      where workspace_id = ${input.workspaceId} and case_id = ${input.caseId}
      order by executed_at desc, run_id limit 21
    `;
    const followUpRows = await transaction`
      select workspace_id as "workspaceId", id, case_id as "caseId",
        response_id as "responseId", receipt_hash as "receiptHash",
        truth_mode as "truthMode", source, segment,
        observed_day::text as "observedDay", starts, completed, captures,
        revenue_cents::int as "revenueCents", content_hash as "contentHash",
        to_char(recorded_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "recordedAt"
      from cfr_app.case_follow_up_events
      where workspace_id = ${input.workspaceId} and case_id = ${input.caseId}
      order by observed_day, source
    `;
    return {
      kind: "found" as const,
      snapshot: { caseRow, signalRow, evidenceRows, eventRows, citationRows },
      investigation: investigationRow.artifact,
      investigationHash: investigationRow.contentHash,
      investigationCitations,
      responseRow,
      approvalRow: approvalRow ?? null,
      receiptRow: receiptRow ?? null,
      trialMarkerRow: trialMarkerRow ?? null,
      recheckRow: recheckRow ?? null,
      followUpRows,
      checkoutRows,
    };
  });
  console.log(JSON.stringify({ event: "case_decision_read_result", userIdSha256,
    workspaceId: input.workspaceId, caseId: input.caseId, kind: result.kind }));
  return json(result, result.kind === "not_found" ? 404 : result.kind === "incomplete" ? 409 : 200);
}

async function handleSimulatedCheckout(input: CaseCheckoutRequest, principalId: string): Promise<Response> {
  const result = await sql.begin(async (transaction) => {
    await configureRuntimeRole(transaction, principalId, input.workspaceId);
    if (!await hasOwnerMembership(transaction, principalId, input.workspaceId)) return { kind: "not_found" };
    const [proposal] = await transaction`
      select content_hash from cfr_app.case_response_proposals
      where workspace_id = ${input.workspaceId} and case_id = ${input.caseId} and id = ${input.responseId}
    `;
    if (!proposal) return { kind: "not_found" };
    if (proposal.content_hash !== input.responseHash) return { kind: "conflict" };
    await transaction`select pg_advisory_xact_lock(hashtextextended(${input.workspaceId + '/' + input.caseId + '/synthetic-checkout'}, 0))`;
    const [existing] = await transaction`
      select scenario, recorded_by, case_id, proposal_hash from cfr_app.case_simulated_checkouts
      where workspace_id = ${input.workspaceId} and run_id = ${input.runId}
    `;
    if (existing) return existing.scenario === input.scenario && existing.recorded_by === principalId
      && existing.case_id === input.caseId && existing.proposal_hash === input.responseHash
      ? { kind: "simulated", runId: input.runId, reused: true } : { kind: "conflict" };
    const [count] = await transaction`select count(*)::int as total from cfr_app.case_simulated_checkouts
      where workspace_id = ${input.workspaceId} and case_id = ${input.caseId}`;
    if (count.total >= CHECKOUT_LIMIT) return { kind: "limit_reached" };
    const artifact = buildSimulatedCheckout({ workspaceId: input.workspaceId, caseId: input.caseId,
      responseId: input.responseId, proposalHash: input.responseHash, runId: input.runId,
      scenario: input.scenario, recordedBy: principalId, executedAt: new Date().toISOString() });
    const hash = await sha256(canonicalCheckout(artifact));
    await transaction`
      insert into cfr_app.case_simulated_checkouts
        (workspace_id, case_id, response_id, proposal_hash, run_id, scenario, recorded_by,
         executed_at, truth_mode, artifact_json, content_hash)
      values (${input.workspaceId}, ${input.caseId}, ${input.responseId}, ${input.responseHash},
        ${input.runId}, ${input.scenario}, ${principalId}, ${artifact.executedAt}::text::timestamptz,
        'SIMULATED', ${JSON.stringify(artifact)}::text::jsonb, ${hash})
    `;
    return { kind: "simulated", runId: input.runId, reused: false };
  });
  return json(result, result.kind === "not_found" ? 404 : result.kind === "conflict" ? 409
    : result.kind === "limit_reached" ? 429 : 200);
}

async function handleCaseCheckRecord(input: CaseCheckRecordRequest, principalId: string, userIdSha256: string): Promise<Response> {
  const result = await sql.begin(async (transaction) => {
    await configureRuntimeRole(transaction, principalId, input.workspaceId);
    if (!await hasOwnerMembership(transaction, principalId, input.workspaceId)) {
      return { kind: "not_found" as const };
    }
    const [proposal] = await transaction`
      select id, content_hash as "contentHash" from cfr_app.case_response_proposals
      where workspace_id = ${input.workspaceId} and id = ${input.responseId}
        and case_id = ${input.caseId} and truth_mode = 'FIXTURE'
      limit 1
    `;
    if (!proposal) return { kind: "not_found" as const };
    if (proposal.contentHash !== input.responseHash) return { kind: "conflict" as const };
    const [approval] = await transaction`
      select proposal_hash as "proposalHash" from cfr_app.case_response_approvals
      where workspace_id = ${input.workspaceId} and response_id = ${input.responseId}
      limit 1
    `;
    if (!approval || approval.proposalHash !== input.responseHash) return { kind: "approval_required" as const };
    const [trial] = await transaction`
      select marker.receipt_hash as "receiptHash", marker.marked_at as "markedAt",
        original.run_reference as "runReference"
      from cfr_app.case_check_trial_markers marker
      join cfr_app.case_response_receipts original
        on original.workspace_id = marker.workspace_id and original.response_id = marker.response_id
      where marker.workspace_id = ${input.workspaceId} and marker.response_id = ${input.responseId}
      limit 1
    `;
    const checkedAt = new Date().toISOString();
    if (trial) {
      if (input.runReference === trial.runReference
        || Date.parse(checkedAt) <= Date.parse(trial.markedAt)) return { kind: "conflict" as const };
      const artifact = { captureStatus: input.captureStatus, checkedAt,
        proposalHash: input.responseHash, recordedBy: principalId,
        responseId: input.responseId, runReference: input.runReference,
        supersedesReceiptHash: trial.receiptHash, workspaceId: input.workspaceId };
      const contentHash = await sha256(JSON.stringify(artifact));
      const inserted = await transaction`
        insert into cfr_app.case_check_recheck_receipts
          (workspace_id, response_id, proposal_hash, supersedes_receipt_hash,
           recorded_by, run_reference, capture_status, checked_at, recorded_at, content_hash)
        values (${input.workspaceId}, ${input.responseId}, ${input.responseHash},
          ${trial.receiptHash}, ${principalId}, ${input.runReference}, ${input.captureStatus},
          ${checkedAt}::text::timestamptz, ${checkedAt}::text::timestamptz, ${contentHash})
        on conflict do nothing returning response_id
      `;
      const [recheck] = await transaction`
        select run_reference as "runReference", capture_status as "captureStatus",
          content_hash as "contentHash"
        from cfr_app.case_check_recheck_receipts
        where workspace_id = ${input.workspaceId} and response_id = ${input.responseId}
        limit 1
      `;
      if (!recheck || recheck.runReference !== input.runReference
        || recheck.captureStatus !== input.captureStatus) return { kind: "conflict" as const };
      return { kind: "recorded" as const, reused: inserted.length === 0,
        receiptHash: recheck.contentHash };
    }
    const artifact = { captureStatus: input.captureStatus, checkedAt,
      proposalHash: input.responseHash, recordedBy: principalId,
      responseId: input.responseId, runReference: input.runReference,
      workspaceId: input.workspaceId };
    const contentHash = await sha256(JSON.stringify(artifact));
    const inserted = await transaction`
      insert into cfr_app.case_response_receipts
        (workspace_id, response_id, proposal_hash, recorded_by,
         run_reference, capture_status, checked_at, recorded_at, content_hash)
      values (${input.workspaceId}, ${input.responseId}, ${input.responseHash},
        ${principalId}, ${input.runReference}, ${input.captureStatus},
        ${checkedAt}::text::timestamptz, ${checkedAt}::text::timestamptz, ${contentHash})
      on conflict do nothing returning response_id
    `;
    const [receipt] = await transaction`
      select run_reference as "runReference", capture_status as "captureStatus",
        content_hash as "contentHash"
      from cfr_app.case_response_receipts
      where workspace_id = ${input.workspaceId} and response_id = ${input.responseId}
      limit 1
    `;
    if (!receipt || receipt.runReference !== input.runReference
      || receipt.captureStatus !== input.captureStatus) return { kind: "conflict" as const };
    return { kind: "recorded" as const, reused: inserted.length === 0,
      receiptHash: receipt.contentHash };
  });
  console.log(JSON.stringify({ event: "case_check_record_result", userIdSha256,
    workspaceId: input.workspaceId, caseId: input.caseId, kind: result.kind }));
  return json(result, result.kind === "not_found" ? 404
    : result.kind === "conflict" || result.kind === "approval_required" ? 409 : 200);
}

async function handleCaseCheckTrial(input: CaseCheckTrialRequest, principalId: string, userIdSha256: string): Promise<Response> {
  const result = await sql.begin(async (transaction) => {
    await configureRuntimeRole(transaction, principalId, input.workspaceId);
    if (!await hasOwnerMembership(transaction, principalId, input.workspaceId)) {
      return { kind: "not_found" as const };
    }
    const [proposal] = await transaction`
      select content_hash as "contentHash" from cfr_app.case_response_proposals
      where workspace_id = ${input.workspaceId} and id = ${input.responseId}
        and case_id = ${input.caseId} and truth_mode = 'FIXTURE'
      limit 1
    `;
    const [receipt] = await transaction`
      select proposal_hash as "proposalHash", content_hash as "contentHash"
      from cfr_app.case_response_receipts
      where workspace_id = ${input.workspaceId} and response_id = ${input.responseId}
      limit 1
    `;
    if (!proposal || !receipt) return { kind: "not_found" as const };
    if (proposal.contentHash !== input.responseHash
      || receipt.proposalHash !== input.responseHash
      || receipt.contentHash !== input.receiptHash) return { kind: "conflict" as const };
    const markedAt = new Date().toISOString();
    const artifact = { markedAt, markedBy: principalId, reason: "trial_submission",
      receiptHash: input.receiptHash, responseId: input.responseId,
      workspaceId: input.workspaceId };
    const contentHash = await sha256(JSON.stringify(artifact));
    const inserted = await transaction`
      insert into cfr_app.case_check_trial_markers
        (workspace_id, response_id, receipt_hash, marked_by, reason, marked_at, content_hash)
      values (${input.workspaceId}, ${input.responseId}, ${input.receiptHash},
        ${principalId}, 'trial_submission', ${markedAt}::text::timestamptz, ${contentHash})
      on conflict do nothing returning response_id
    `;
    const [marker] = await transaction`
      select receipt_hash as "receiptHash" from cfr_app.case_check_trial_markers
      where workspace_id = ${input.workspaceId} and response_id = ${input.responseId}
      limit 1
    `;
    if (!marker || marker.receiptHash !== input.receiptHash) return { kind: "conflict" as const };
    return { kind: "marked" as const, reused: inserted.length === 0 };
  });
  console.log(JSON.stringify({ event: "case_check_trial_result", userIdSha256,
    workspaceId: input.workspaceId, caseId: input.caseId, kind: result.kind }));
  return json(result, result.kind === "not_found" ? 404 : result.kind === "conflict" ? 409 : 200);
}

async function handleCaseResponseApprove(input: CaseResponseApproveRequest, principalId: string, userIdSha256: string): Promise<Response> {
  const result = await sql.begin(async (transaction) => {
    await configureRuntimeRole(transaction, principalId, input.workspaceId);
    if (!await hasOwnerMembership(transaction, principalId, input.workspaceId)) {
      return { kind: "not_found" as const };
    }
    const [proposal] = await transaction`
      select id, content_hash as "contentHash" from cfr_app.case_response_proposals
      where workspace_id = ${input.workspaceId} and id = ${input.responseId}
        and case_id = ${input.caseId} and status = 'proposed' and truth_mode = 'FIXTURE'
      limit 1
    `;
    if (!proposal) return { kind: "not_found" as const };
    if (proposal.contentHash !== input.responseHash) return { kind: "conflict" as const };
    const inserted = await transaction`
      insert into cfr_app.case_response_approvals
        (workspace_id, response_id, proposal_hash, approved_by)
      values (${input.workspaceId}, ${input.responseId}, ${input.responseHash}, ${principalId})
      on conflict do nothing
      returning response_id
    `;
    const [approval] = await transaction`
      select proposal_hash as "proposalHash", approved_by as "approvedBy",
        approved_at::text as "approvedAt"
      from cfr_app.case_response_approvals
      where workspace_id = ${input.workspaceId} and response_id = ${input.responseId}
      limit 1
    `;
    if (!approval || approval.proposalHash !== input.responseHash) return { kind: "conflict" as const };
    return { kind: "approved" as const, reused: inserted.length === 0,
      approvedAt: approval.approvedAt };
  });
  console.log(JSON.stringify({ event: "case_response_approval_result", userIdSha256,
    workspaceId: input.workspaceId, caseId: input.caseId, kind: result.kind }));
  return json(result, result.kind === "not_found" ? 404 : result.kind === "conflict" ? 409 : 200);
}

async function handleRuntime(input: RuntimeRequest, principalId: string, userIdSha256: string): Promise<Response> {
  if (input.operation === "workspace.list") {
    const workspaces = await sql.begin(async (transaction) => {
      await transaction`set transaction read only`;
      await configureRuntimeRole(transaction, principalId);
      return transaction`
        select workspace.id, workspace.name, workspace.slug, member.role
        from cfr_app.workspace_members member
        join cfr_app.workspaces workspace on workspace.id = member.workspace_id
        where member.user_id = ${principalId} and member.role = 'owner'
        order by workspace.created_at asc, workspace.name asc
      `;
    });
    return json({ kind: "found", workspaces });
  }

  if (input.operation === "workspace.create") {
    try {
      const workspace = await sql.begin(async (transaction) => {
        await configureRuntimeRole(transaction, principalId, input.workspace.id);
        await transaction`set constraints all deferred`;
        const [created] = await transaction`
          insert into cfr_app.workspaces (id, name, slug, owner_user_id)
          values (${input.workspace.id}, ${input.workspace.name}, ${input.workspace.slug}, ${principalId})
          returning id, name, slug
        `;
        await transaction`
          insert into cfr_app.workspace_members (workspace_id, user_id, role)
          values (${input.workspace.id}, ${principalId}, 'owner')
        `;
        return { ...created, role: "owner" };
      });
      return json({ kind: "created", workspace }, 201);
    } catch (error) {
      if (isRecord(error) && error.code === "23505") return json({ kind: "conflict" }, 409);
      throw error;
    }
  }

  if (input.operation === "workspace.access") {
    const allowed = await sql.begin(async (transaction) => {
      await transaction`set transaction read only`;
      await configureRuntimeRole(transaction, principalId, input.workspaceId);
      return hasOwnerMembership(transaction, principalId, input.workspaceId);
    });
    return json({ kind: allowed ? "allowed" : "not_found" }, allowed ? 200 : 404);
  }

  if (input.operation === "runtime.get") {
    const result = await sql.begin(async (transaction) => {
      await transaction`set transaction read only`;
      await configureRuntimeRole(transaction, principalId, input.workspaceId);
      if (!await hasOwnerMembership(transaction, principalId, input.workspaceId)) return { kind: "not_found" as const };
      const [state] = await transaction`
        select version::int as version, snapshot_json as snapshot
        from cfr_app.workspace_runtime_states
        where workspace_id = ${input.workspaceId}
        limit 1
      `;
      return state ? { kind: "found" as const, ...state } : { kind: "empty" as const };
    });
    return json(result, result.kind === "not_found" ? 404 : 200);
  }

  const result = await sql.begin(async (transaction) => {
    await configureRuntimeRole(transaction, principalId, input.workspaceId);
    if (!await hasOwnerMembership(transaction, principalId, input.workspaceId)) return { kind: "not_found" as const };
    const [current] = await transaction`
      select version::int as version from cfr_app.workspace_runtime_states
      where workspace_id = ${input.workspaceId} for update
    `;
    const currentVersion = current ? Number(current.version) : 0;
    if (currentVersion !== input.expectedVersion) return { kind: "conflict" as const, version: currentVersion };
    const nextVersion = currentVersion + 1;
    const snapshotJson = JSON.stringify(input.snapshot);
    if (current) {
      await transaction`
        update cfr_app.workspace_runtime_states
        set version = ${nextVersion}, snapshot_json = ${snapshotJson}::text::jsonb, updated_at = now()
        where workspace_id = ${input.workspaceId} and version = ${currentVersion}
      `;
    } else {
      await transaction`
        insert into cfr_app.workspace_runtime_states (workspace_id, version, snapshot_json)
        values (${input.workspaceId}, ${nextVersion}, ${snapshotJson}::text::jsonb)
      `;
    }
    await transaction`
      insert into cfr_app.workspace_runtime_events
        (workspace_id, sequence, event_type, actor_user_id, payload_json)
      values (${input.workspaceId}, ${nextVersion}, ${input.eventType}, ${principalId},
        ${JSON.stringify({ priorVersion: currentVersion, nextVersion })}::text::jsonb)
    `;
    return { kind: "saved" as const, version: nextVersion, snapshot: input.snapshot };
  });
  console.log(JSON.stringify({ event: "runtime_write_result", userIdSha256,
    workspaceId: input.workspaceId, operation: input.operation, kind: result.kind }));
  return json(result, result.kind === "not_found" ? 404 : result.kind === "conflict" ? 409 : 200);
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return json({ error: { code: "method_not_allowed" } }, 405);

  const suppliedToken = request.headers.get("x-cfr-preview-token") ?? "";
  const [storedToken] = await sql<{ token_sha256: string }[]>`
    select token_sha256 from cfr_app.runtime_tokens
    where name = 'sites-test-preview' and enabled = true limit 1
  `;
  if (!storedToken || !equalHash(await sha256(suppliedToken), storedToken.token_sha256)) {
    return json({ error: { code: "unauthorized" } }, 401);
  }

  let input: GatewayRequest | null = null;
  try {
    input = parseRequest(await request.json());
  } catch {
    // Invalid JSON is handled by the shared invalid request response.
  }
  if (!input) return json({ error: { code: "invalid_request" } }, 400);

  const userIdSha256 = await sha256(input.userId);
  const principalId = `sha256:${userIdSha256}`;
  try {
    if (!("operation" in input)) return await handleTrace(input, principalId, userIdSha256);
    if (input.operation === "case.decision.read") {
      return await handleCaseDecision(input, principalId, userIdSha256);
    }
    if (input.operation === "case.response.approve") {
      return await handleCaseResponseApprove(input, principalId, userIdSha256);
    }
    if (input.operation === "case.check.record") {
      return await handleCaseCheckRecord(input, principalId, userIdSha256);
    }
    if (input.operation === "case.check.trial") {
      return await handleCaseCheckTrial(input, principalId, userIdSha256);
    }
    if (input.operation === "case.checkout.simulate") {
      return await handleSimulatedCheckout(input, principalId);
    }
    return await handleRuntime(input, principalId, userIdSha256);
  } catch (error) {
    console.error(JSON.stringify({ event: "gateway_request_failed",
      operation: "operation" in input ? input.operation : "trace.read",
      error: error instanceof Error ? error.message : "unknown_error" }));
    return json({ error: { code: "supabase_runtime_unavailable" } }, 500);
  }
});
