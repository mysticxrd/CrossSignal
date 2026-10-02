import { ERROR_BYTES, sanitizeError } from '../diagnostics.mjs';

// REVIEW-ONLY candidate. The frozen execution transport does not import this.
// Fixed diagnostic hints preserve no provider message, secret or unknown text.
export function sanitizeDiagnosticV2(bytes,options) {
  const result={...sanitizeError(bytes,options),version:'bounded-provider-diagnostic-v2-candidate',
    messageClassification:'unclassified',classificationIsConfirmedCause:false};
  if(result.bodyUnavailableReason!==null||bytes===null)return result;
  const message=JSON.parse(Buffer.from(bytes).toString('utf8'))?.error?.message;
  if(typeof message!=='string'||message.length>2048)return result;
  const patterns=[
    ['schema_complexity',/(?:schema.{0,80}too (?:large|complex|deep)|too many states.{0,80}schema|maximum nesting depth)/i],
    ['unknown_parameter',/unknown (?:name|field|parameter)/i],
    ['schema_keyword_rejected',/(?:unsupported.{0,80}(?:schema|keyword)|(?:schema|keyword).{0,80}not supported)/i],
    ['thinking_configuration_rejected',/thinking.{0,80}(?:invalid|unsupported|not supported)/i],
    ['output_limit_rejected',/max[_ ]?output[_ ]?tokens.{0,80}(?:invalid|unsupported|exceed)/i],
  ];
  result.messageClassification=patterns.find(([,pattern])=>pattern.test(message))?.[0]??'unclassified';
  return result;
}

export async function readDiagnosticV2(response,{signal,requestBody,secret}) {
  const options={httpStatus:response.status,requestBody,secret},reader=response.body?.getReader();
  if(!reader)return sanitizeDiagnosticV2(null,options);
  const parts=[];let size=0,onAbort;
  const aborted=new Promise((_,reject)=>{onAbort=()=>reject(new Error('request_timeout'));
    signal.addEventListener('abort',onAbort,{once:true});});
  try {
    if(signal.aborted)throw new Error('request_timeout');
    for(;;) {
      const {value,done}=await Promise.race([reader.read(),aborted]);
      if(done)break;
      size+=value.byteLength;
      if(size>ERROR_BYTES)return sanitizeDiagnosticV2(new Uint8Array(ERROR_BYTES+1),options);
      parts.push(Buffer.from(value));
    }
    return sanitizeDiagnosticV2(Buffer.concat(parts),options);
  } finally {signal.removeEventListener('abort',onAbort);reader.cancel().catch(()=>{});}
}
