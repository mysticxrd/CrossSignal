export const ERROR_BYTES=8192;
const STATUSES=new Set(['INVALID_ARGUMENT','RESOURCE_EXHAUSTED','UNAUTHENTICATED','PERMISSION_DENIED',
  'NOT_FOUND','UNAVAILABLE','DEADLINE_EXCEEDED','INTERNAL','FAILED_PRECONDITION','ABORTED','UNKNOWN']);

// Returned paths come from trusted request keys, never provider prose/values.
function permittedPaths(body) {
  const paths=new Map();
  const snake=value=>value.replace(/[A-Z]/g,c=>'_'+c.toLowerCase());
  function visit(value,path='',alias='') {
    if(path)paths.set(alias,path);
    if(Array.isArray(value))value.forEach((v,i)=>visit(v,`${path}[${i}]`,`${alias}[${i}]`));
    else if(value&&typeof value==='object')for(const [key,child] of Object.entries(value)) {
      if(!/^[a-zA-Z][a-zA-Z0-9_]{0,79}$/.test(key))continue;
      visit(child,path?`${path}.${key}`:key,alias?`${alias}.${snake(key)}`:snake(key));
    }
  }
  visit(body);
  for(const path of [...paths.values()])paths.set(path,path);
  return paths;
}

export function sanitizeError(bytes,{httpStatus,requestBody,secret=null}) {
  const result={version:'bounded-provider-diagnostic-v1',httpStatus,
    providerCode:null,providerStatus:null,fields:[],bodyUnavailableReason:null,
    providerProseRetained:false,rawBodyRetained:false};
  if(bytes===null){result.bodyUnavailableReason='stream_unavailable';return result;}
  if(bytes.byteLength>ERROR_BYTES){result.bodyUnavailableReason='error_body_limit';return result;}
  const text=Buffer.from(bytes).toString('utf8');
  if(typeof secret==='string'&&secret.length>0&&text.includes(secret)) {
    result.bodyUnavailableReason='secret_echo_discarded';return result;
  }
  let raw;
  try {raw=JSON.parse(text);}catch {result.bodyUnavailableReason='invalid_error_json';return result;}
  const error=raw?.error;
  if(!error||typeof error!=='object'){result.bodyUnavailableReason='unrecognized_error_shape';return result;}
  if(Number.isSafeInteger(error.code)&&error.code===httpStatus)result.providerCode=error.code;
  if(STATUSES.has(error.status))result.providerStatus=error.status;
  const allowed=permittedPaths(requestBody),fields=new Set();
  for(const detail of Array.isArray(error.details)?error.details.slice(0,8):[]) {
    if(detail?.['@type']!=='type.googleapis.com/google.rpc.BadRequest')continue;
    for(const violation of Array.isArray(detail.fieldViolations)?detail.fieldViolations.slice(0,16):[]) {
      if(typeof violation?.field==='string'&&violation.field.length<=256&&allowed.has(violation.field))
        fields.add(allowed.get(violation.field));
    }
  }
  result.fields=[...fields].sort().slice(0,16);
  return result;
}

// The surrounding original transport still supplies the request deadline and
// abort signal. No unrestricted error body is returned to its caller or store.
export async function readDiagnostic(response,{signal,requestBody,secret}) {
  const reader=response.body?.getReader();
  if(!reader)return sanitizeError(null,{httpStatus:response.status,requestBody,secret});
  const parts=[];let size=0;
  let onAbort;
  const aborted=new Promise((_,reject)=>{onAbort=()=>reject(new Error('request_timeout'));
    signal.addEventListener('abort',onAbort,{once:true});});
  try {
    if(signal.aborted)throw new Error('request_timeout');
    for(;;) {
      const {value,done}=await Promise.race([reader.read(),aborted]);
      if(done)break;
      size+=value.byteLength;
      if(size>ERROR_BYTES)return sanitizeError(new Uint8Array(ERROR_BYTES+1),{httpStatus:response.status,requestBody,secret});
      parts.push(Buffer.from(value));
    }
    return sanitizeError(Buffer.concat(parts),{httpStatus:response.status,requestBody,secret});
  } finally {
    signal.removeEventListener('abort',onAbort);
    reader.cancel().catch(()=>{});
  }
}
