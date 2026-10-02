import { normalizePrepared } from '../wire.mjs';
import { digest, exact, requireThat } from '../../../../../../db/benchmark/contracts.mjs';

const keywords=new Set(['type','enum','properties','required','additionalProperties','items','maxItems','minimum','maximum','anyOf']);
const types=new Set(['object','array','string','integer','boolean','null']);
export function validateWireSchema(schema) {
  requireThat(schema&&typeof schema==='object'&&!Array.isArray(schema),'wire_schema_object_required');
  requireThat(Object.keys(schema).every(key=>keywords.has(key)),'unsupported_wire_schema_keyword');
  if(schema.anyOf) {
    exact(schema,['anyOf'],'union schema');requireThat(Array.isArray(schema.anyOf)&&schema.anyOf.length>0,'empty_wire_union');
    schema.anyOf.forEach(validateWireSchema);return;
  }
  requireThat(types.has(schema.type),'explicit_wire_schema_type_required');
  if(schema.enum)requireThat(Array.isArray(schema.enum)&&schema.enum.length>0
    &&schema.type==='string'&&schema.enum.every(value=>typeof value==='string'),'typed_string_enum_required');
  if(schema.type==='object') {
    requireThat(schema.additionalProperties===false&&schema.properties&&Array.isArray(schema.required),'closed_wire_object_required');
    requireThat(JSON.stringify([...schema.required].sort())===JSON.stringify(Object.keys(schema.properties).sort()),'required_wire_fields_mismatch');
    Object.values(schema.properties).forEach(validateWireSchema);
  }
  if(schema.type==='array') {
    requireThat(Number.isSafeInteger(schema.maxItems)&&schema.maxItems>0,'wire_array_bound_required');
    validateWireSchema(schema.items);
  }
  if(schema.type==='integer')requireThat(Number.isSafeInteger(schema.minimum)&&Number.isSafeInteger(schema.maximum)
    &&schema.minimum<=schema.maximum,'wire_integer_bound_required');
}

// The original restricted worker/schema remain unchanged. This host projection
// uses the Developer API fields emitted by Google's current Mldev SDK converter.
export function repairPrepared(prepared) {
  requireThat(prepared.requestSha256===digest(prepared.body),'request_binding_mismatch');
  let result;
  if(prepared.body.generationConfig.responseFormat) {
    result=normalizePrepared(prepared);
    const config=result.body.generationConfig,schema=config.responseFormat.text.schema;
    delete config.responseFormat;
    config.responseMimeType='application/json';config.responseJsonSchema=schema;
    result.schemaProjection.push({path:'generationConfig',keyword:'responseFormat',
      disposition:'developer_api_responseMimeType_and_responseJsonSchema_same_output_schema'});
  } else result=structuredClone(prepared);
  requireThat(result.body.generationConfig.responseMimeType==='application/json','fixed_json_mime_required');
  validateWireSchema(result.body.generationConfig.responseJsonSchema);
  result.requestSha256=digest(result.body);result.context.requestBytes=Buffer.byteLength(JSON.stringify(result.body));
  return result;
}
