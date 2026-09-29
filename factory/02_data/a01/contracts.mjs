// Executable DATA contract. Product integration belongs to the Build stage.
import { contentHash } from "../../../db/revenue-leak.mjs";
export { contentHash };
export const VERSION = "incident-data-v1";
export const SEGMENTS = ["IN/debit", "IN/credit", "GB/debit"];
export const SERVICES = ["checkout", "notifications", "payment-provider"];
export const LIMITS = Object.freeze({ toolCalls: 10, hypothesisRevisions: 3, rows: 50, queryCharacters: 160 });
export function requireThat(value, message) { if (!value) throw new TypeError(message); }
export function exact(value, keys, label) {
  requireThat(value && typeof value === "object" && !Array.isArray(value)
    && Object.keys(value).sort().join("|") === [...keys].sort().join("|"), `${label}: unknown/missing fields`);
}
const id = (v) => typeof v === "string" && /^[a-z0-9][a-z0-9_-]{0,127}$/.test(v);
const hash = (v) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
const int = (v) => Number.isSafeInteger(v) && v >= 0;
export function time(v) {
  requireThat(typeof v === "string" && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.000Z$/.test(v)
    && Number.isFinite(Date.parse(v)) && new Date(v).toISOString() === v, "invalid logical timestamp");
  return Date.parse(v);
}
export function validateScope(scope) {
  exact(scope, ["workspaceId", "caseId", "runId", "actorId", "clock"], "trusted scope");
  requireThat([scope.workspaceId, scope.caseId, scope.runId, scope.actorId].every(id), "invalid scope identity");
  time(scope.clock);
}
export function validateEvent(event, scope) {
  validateScope(scope);
  exact(event, ["id", "workspaceId", "caseId", "runId", "type", "at", "source", "sourceVersion", "truthMode", "payload", "contentHash"], "event");
  requireThat(id(event.id) && event.workspaceId === scope.workspaceId && event.caseId === scope.caseId
    && event.runId === scope.runId, "event scope mismatch");
  requireThat(event.truthMode === "SIMULATED" && event.sourceVersion === VERSION, "event truth/version mismatch");
  requireThat(time(event.at) <= time(scope.clock), "future evidence denied");
  const p = event.payload;
  if (event.type === "revenue_window") {
    requireThat(event.source === "revenue", "source mismatch");
    exact(p, ["start", "end", "segment", "attempts", "successes", "failed", "revenueMinor", "currency", "unitPriceMinor", "visits", "validationErrors", "providerDeclines"], "revenue payload");
    requireThat(SEGMENTS.includes(p.segment) && p.end === event.at && time(p.end) - time(p.start) === 900000, "invalid revenue window");
    requireThat([p.attempts, p.successes, p.failed, p.revenueMinor, p.unitPriceMinor, p.visits, p.validationErrors, p.providerDeclines].every(int), "invalid count");
    requireThat(p.attempts === p.successes + p.failed && p.failed === p.validationErrors + p.providerDeclines
      && p.revenueMinor === p.successes * p.unitPriceMinor && Number.isSafeInteger(p.successes * p.unitPriceMinor)
      && p.currency === "INR" && p.unitPriceMinor === 50000 && p.visits >= p.attempts, "ledger mismatch");
  } else if (event.type === "deployment") {
    requireThat(event.source === "engineering", "source mismatch");
    exact(p, ["service", "fromVersion", "toVersion", "note"], "deployment payload");
    requireThat(SERVICES.includes(p.service) && /^v\d+$/.test(p.fromVersion) && /^v\d+$/.test(p.toVersion)
      && typeof p.note === "string" && p.note.length <= 240, "invalid deployment");
  } else if (event.type === "service_health") {
    requireThat(event.source === "engineering", "source mismatch");
    exact(p, ["service", "segment", "validationErrors", "providerHealthy"], "health payload");
    requireThat(SERVICES.includes(p.service) && SEGMENTS.includes(p.segment) && int(p.validationErrors)
      && typeof p.providerHealthy === "boolean", "invalid health");
  } else if (event.type === "support_message") {
    requireThat(event.source === "support", "source mismatch");
    exact(p, ["segment", "tags", "message"], "support payload");
    requireThat(SEGMENTS.includes(p.segment) && Array.isArray(p.tags) && p.tags.length <= 4
      && p.tags.every(v => ["checkout", "card", "unrelated", "untrusted"].includes(v))
      && typeof p.message === "string" && p.message.length <= 500, "invalid support message");
  } else throw new TypeError("unknown event type");
  const { contentHash: digest, ...body } = event;
  requireThat(hash(digest) && digest === contentHash(body), "event content hash mismatch");
  return event;
}
export function validateObservable(input, scope) {
  exact(input, ["version", "caseRef", "asOf", "events"], "observable package");
  requireThat(input.version === VERSION && input.caseRef === scope.caseId && input.asOf === scope.clock
    && Array.isArray(input.events) && input.events.length <= 200, "invalid observable package");
  const seen = new Set();
  for (const event of input.events) {
    validateEvent(event, scope);
    requireThat(!seen.has(event.id), "duplicate evidence"); seen.add(event.id);
  }
  return input;
}
export function validateQuery(tool, q, scope) {
  validateScope(scope);
  const extra = { "revenue.inspect": ["segment"], "engineering.inspect": ["service", "kind"], "support.search": ["segment", "query"] }[tool];
  requireThat(extra, "unknown domain tool");
  exact(q, ["start", "end", "limit", "cursor", ...extra], "tool arguments");
  requireThat(time(q.start) >= Date.parse("2026-09-01T09:00:00.000Z") && time(q.start) < time(q.end)
    && time(q.end) <= time(scope.clock), "query time scope mismatch");
  requireThat(Number.isSafeInteger(q.limit) && q.limit >= 1 && q.limit <= LIMITS.rows, "invalid query limit");
  requireThat(q.cursor === null || (typeof q.cursor === "string" && /^[a-f0-9]{64}:\d{1,3}$/.test(q.cursor)), "invalid cursor");
  if ("segment" in q) requireThat(q.segment === null || SEGMENTS.includes(q.segment), "invalid segment");
  if (tool === "engineering.inspect") requireThat(SERVICES.includes(q.service) && ["changes", "health"].includes(q.kind), "invalid engineering query");
  if (tool === "support.search") requireThat(typeof q.query === "string" && q.query.length <= LIMITS.queryCharacters, "invalid support query");
  const { cursor, ...withoutCursor } = q;
  const queryHash = contentHash({ tool, args: withoutCursor, scope });
  if (cursor !== null) requireThat(cursor.startsWith(`${queryHash}:`) && Number(cursor.split(":")[1]) <= 200, "cursor scope mismatch");
  return queryHash;
}
export function validateAction(action) {
  exact(action, ["kind", "service", "fromVersion", "toVersion", "environment", "maxRuns", "maxCostMinor", "externalWrite"], "action");
  requireThat(action.kind === "simulated_rollback" && action.environment === "SIMULATED" && action.maxRuns === 1
    && action.maxCostMinor === 0 && action.externalWrite === false, "action scope invalid");
  requireThat((action.service === "checkout" && action.fromVersion === "v142" && action.toVersion === "v141")
    || (action.service === "notifications" && action.fromVersion === "v8" && action.toVersion === "v7"), "action not allowlisted");
  return action;
}
export function validateProposal(proposal, scope, availableIds) {
  validateScope(scope);
  exact(proposal, ["id", "workspaceId", "caseId", "runId", "investigationHash", "contextHash", "policyHash", "nonce", "expiresAt", "action", "evidenceIds", "rationale", "contentHash"], "proposal");
  requireThat(id(proposal.id) && proposal.workspaceId === scope.workspaceId && proposal.caseId === scope.caseId
    && proposal.runId === scope.runId, "proposal scope mismatch");
  requireThat([proposal.investigationHash, proposal.contextHash, proposal.policyHash].every(hash)
    && id(proposal.nonce) && time(proposal.expiresAt) > time(scope.clock), "proposal binding invalid");
  validateAction(proposal.action);
  requireThat(Array.isArray(proposal.evidenceIds) && proposal.evidenceIds.length >= 2 && proposal.evidenceIds.length <= 50
    && new Set(proposal.evidenceIds).size === proposal.evidenceIds.length
    && proposal.evidenceIds.every(v => availableIds.has(v)), "proposal evidence invalid");
  requireThat(typeof proposal.rationale === "string" && proposal.rationale.length >= 1 && proposal.rationale.length <= 1000, "rationale invalid");
  const { contentHash: digest, ...body } = proposal;
  requireThat(digest === contentHash(body), "proposal hash mismatch");
  return proposal;
}
