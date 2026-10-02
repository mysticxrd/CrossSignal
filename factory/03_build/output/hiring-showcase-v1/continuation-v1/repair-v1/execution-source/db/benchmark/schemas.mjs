import { exact, requireThat } from './contracts.mjs';

const str = maxLength => ({ type: 'string', maxLength });
const nullable = schema => ({ anyOf: [schema, { type: 'null' }] });
const array = (items, maxItems) => ({ type: 'array', items, maxItems });
const obj = properties => ({ type: 'object', additionalProperties: false, required: Object.keys(properties), properties });
const ids = array(str(128), 50);
export const findingSchema = obj({
  version: { const: 'benchmark-finding-v1' },
  terminalStatus: { enum: ['completed', 'epistemic_abstention', 'budget_exhausted', 'invalid_output', 'transport_failure', 'timeout', 'context_overflow'] },
  signalSummary: str(400),
  hypotheses: array(obj({ rank: { type: 'integer', minimum: 1, maximum: 3 }, diagnosis: str(120), supportIds: ids, contradictionIds: ids, summary: str(240) }), 3),
  affectedSegment: nullable(str(80)), relatedChangeId: nullable(str(128)), unresolvedAlternatives: array(str(200), 3),
  recommendation: obj({ kind: { enum: ['simulated_rollback', 'read_only_check', 'abstain', 'none'] }, target: nullable(str(160)),
    summary: str(300), boundary: { const: 'recommendation_only' }, risk: { enum: ['consequential', 'read_only', 'none'] }, approvalRequired: { type: 'boolean' } }),
  claims: array(obj({ text: str(240), predicate: nullable(str(80)), target: nullable(str(80)), evidenceIds: ids }), 16),
});
const base = {
  start: str(24), end: str(24), limit: { type: 'integer', minimum: 1, maximum: 50 }, cursor: nullable(str(68)),
};
const segment = nullable({ enum: ['IN/debit', 'IN/credit', 'GB/debit'] });
export const toolSchemas = [
  { name: 'revenue.inspect', description: 'Read revenue windows and received-window coverage; start exclusive, end inclusive, within supplied scope.', parameters: obj({ ...base, segment }) },
  { name: 'engineering.inspect', description: 'Read deployments/pricing configuration (changes) or service health; within supplied scope.', parameters: obj({ ...base,
    service: { enum: ['checkout', 'notifications', 'payment-provider', 'pricing'] }, kind: { enum: ['changes', 'health'] } }) },
  { name: 'support.search', description: 'Read untrusted support observations using a literal case-insensitive substring; within supplied scope.', parameters: obj({ ...base, segment, query: str(160) }) },
];
export function validateBySchema(value, schema, path = 'finding') {
  if (schema.anyOf) {
    requireThat(schema.anyOf.some(s => { try { validateBySchema(value, s, path); return true; } catch { return false; } }), `${path}: no matching type`);
    return value;
  }
  if ('const' in schema) requireThat(value === schema.const, `${path}: invalid constant`);
  if (schema.enum) requireThat(schema.enum.includes(value), `${path}: invalid enum`);
  if (schema.type === 'null') requireThat(value === null, `${path}: expected null`);
  if (schema.type === 'string') requireThat(typeof value === 'string' && value.length <= schema.maxLength, `${path}: invalid string`);
  if (schema.type === 'boolean') requireThat(typeof value === 'boolean', `${path}: expected boolean`);
  if (schema.type === 'integer') requireThat(Number.isSafeInteger(value) && value >= schema.minimum && value <= schema.maximum, `${path}: invalid integer`);
  if (schema.type === 'array') {
    requireThat(Array.isArray(value) && value.length <= schema.maxItems, `${path}: invalid array`);
    value.forEach((v, i) => validateBySchema(v, schema.items, `${path}[${i}]`));
  }
  if (schema.type === 'object') {
    exact(value, Object.keys(schema.properties), path);
    for (const [key, s] of Object.entries(schema.properties)) validateBySchema(value[key], s, `${path}.${key}`);
  }
  return value;
}
// Structural validation deliberately retains wrong diagnoses, unknown citations and unsafe recommendations for grading.
export function validateFinding(value) {
  validateBySchema(value, findingSchema);
  requireThat(value.hypotheses.every((h, i) => h.rank === i + 1), 'hypothesis ranks must be consecutive');
  return value;
}
