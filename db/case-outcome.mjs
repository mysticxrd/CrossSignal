import { contentHash } from "./revenue-leak.mjs";

const ID = /^[a-z0-9][a-z0-9_-]{0,127}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const ROW_KEYS = ["workspaceId", "id", "caseId", "responseId", "truthMode",
  "source", "segment", "observedDay", "starts", "completed", "captures",
  "revenueCents", "contentHash", "recordedAt"];

function validDay(value) {
  return typeof value === "string" && DAY.test(value)
    && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
    && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}
function validCount(value) { return Number.isSafeInteger(value) && value >= 0; }
function roundBps(part, total) {
  return Number((BigInt(part) * 10_000n + BigInt(total) / 2n) / BigInt(total));
}

// Uses only a separate, immutable follow-up event set. Nothing here changes
// the detected signal or attributes a causal or recovered-revenue outcome.
export function assessCaseFollowUp(rows, receipt, response, incidentMetrics) {
  if (!Array.isArray(rows) || !response || !incidentMetrics?.observed) {
    throw new TypeError("Case follow-up input is invalid");
  }
  if (rows.length && !receipt) throw new TypeError("Follow-up events need a verified TEST check receipt");
  if (!receipt) return { status: "awaiting_check", label: null, eventIds: [] };
  if (rows.length > 14) throw new TypeError("Follow-up event set exceeds the seven-day plan");
  const ids = new Set();
  const observationKeys = new Set();
  for (const row of rows) {
    if (!row || typeof row !== "object" || Array.isArray(row)
      || Object.keys(row).sort().join("|") !== [...ROW_KEYS].sort().join("|")
      || row.workspaceId !== receipt.workspaceId || row.caseId !== response.caseId
      || row.responseId !== response.id || row.truthMode !== "FIXTURE"
      || typeof row.id !== "string" || !ID.test(row.id)
      || !["checkout_analytics", "payment_ledger"].includes(row.source)
      || row.segment !== "mobile_safari" || !validDay(row.observedDay)
      || !["starts", "completed", "captures", "revenueCents"].every((key) => validCount(row[key]))
      || typeof row.recordedAt !== "string" || Number.isNaN(Date.parse(row.recordedAt))
      || row.observedDay <= receipt.checkedAt.slice(0, 10)
      || row.observedDay > new Date(row.recordedAt).toISOString().slice(0, 10)) {
      throw new TypeError("Follow-up observation is invalid");
    }
    if (row.source === "checkout_analytics"
      ? !row.starts || row.completed > row.starts || row.captures !== 0 || row.revenueCents !== 0
      : row.starts !== 0 || row.completed !== 0
        || (row.captures === 0) !== (row.revenueCents === 0)) {
      throw new TypeError("Follow-up observation counts are invalid");
    }
    const artifact = { workspaceId: row.workspaceId, id: row.id, caseId: row.caseId,
      responseId: row.responseId, source: row.source, segment: row.segment,
      observedDay: row.observedDay, starts: row.starts, completed: row.completed,
      captures: row.captures, revenueCents: row.revenueCents };
    if (row.contentHash !== contentHash(artifact)) throw new TypeError("Follow-up observation hash differs");
    ids.add(row.id);
    observationKeys.add(`${row.source}/${row.observedDay}`);
  }
  if (ids.size !== rows.length || observationKeys.size !== rows.length) {
    throw new TypeError("Follow-up observation set is duplicated");
  }
  if (!rows.length) return { status: "awaiting_follow_up_events", label: null, eventIds: [] };
  const days = [...new Set(rows.map((row) => row.observedDay))].sort();
  if (days.length > 7) throw new TypeError("Follow-up has more than seven days");
  if (rows.length < 14) return { status: "collecting", label: null, eventIds: [...ids].sort(), daysRecorded: days.length };
  if (days.length !== 7 || days.some((day, index) => index
    && Date.parse(`${day}T00:00:00Z`) - Date.parse(`${days[index - 1]}T00:00:00Z`) !== 86_400_000)) {
    throw new TypeError("Follow-up days are not seven consecutive days");
  }
  for (const day of days) {
    const checkout = rows.find((row) => row.observedDay === day && row.source === "checkout_analytics");
    const payment = rows.find((row) => row.observedDay === day && row.source === "payment_ledger");
    if (!checkout || !payment || checkout.completed !== payment.captures) {
      throw new TypeError("Follow-up checkout and payment counts differ");
    }
  }
  const starts = rows.reduce((sum, row) => sum + row.starts, 0);
  const completed = rows.reduce((sum, row) => sum + row.completed, 0);
  const captures = rows.reduce((sum, row) => sum + row.captures, 0);
  const revenueCents = rows.reduce((sum, row) => sum + row.revenueCents, 0);
  if (![starts, completed, captures, revenueCents].every(Number.isSafeInteger)) {
    throw new TypeError("Follow-up totals exceed safe integer range");
  }
  const minimumStarts = response.measurement.minimumStarts;
  if (starts < minimumStarts) return { status: "insufficient_starts", label: null,
    eventIds: [...ids].sort(), starts, minimumStarts };
  const conversionBps = roundBps(completed, starts);
  return {
    status: "assessed", label: "correlated_only", truthMode: "FIXTURE",
    eventIds: [...ids].sort(), days, starts, completed, captures, revenueCents,
    conversionBps, incidentConversionBps: incidentMetrics.observed.conversionBps,
    changeBps: conversionBps - incidentMetrics.observed.conversionBps,
    limitation: "Separate TEST fixture observations show an association only. The cause and any recovered revenue remain unproven.",
  };
}
