import { digest, requireThat } from '../../../../../db/benchmark/contracts.mjs';
import { GEMINI } from '../../../../../db/benchmark/gemini-config.mjs';

// Enum membership already implies the type. Make that implication explicit on
// the wire, leaving the frozen host schema and its accepted answers unchanged.
export function normalizePrepared(prepared) {
  requireThat(prepared.provider==='gemini'&&prepared.endpoint===GEMINI.endpoint
    &&prepared.requestSha256===digest(prepared.body),'request_binding_mismatch');
  const normalized=structuredClone(prepared),changes=[];
  function visit(schema,path) {
    if(schema.enum&&!schema.type) {
      requireThat(schema.enum.length>0&&schema.enum.every(v=>typeof v==='string'),'unsupported_untyped_enum');
      schema.type='string';changes.push({path,keyword:'type',disposition:'explicit_type_implied_by_string_enum'});
    }
    for(const [key,child] of Object.entries(schema.properties??{}))visit(child,`${path}.properties.${key}`);
    if(schema.items)visit(schema.items,`${path}.items`);
    for(const [i,child] of (schema.anyOf??[]).entries())visit(child,`${path}.anyOf[${i}]`);
  }
  visit(normalized.body.generationConfig.responseFormat.text.schema,'generationConfig.responseFormat.text.schema');
  normalized.requestSha256=digest(normalized.body);
  normalized.context.requestBytes=Buffer.byteLength(JSON.stringify(normalized.body));
  if(changes.length)normalized.schemaProjection.push(...changes);
  return normalized;
}
