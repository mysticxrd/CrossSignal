import { createHttpTransport } from './http.mjs';
import { repairPrepared } from './wire.mjs';
import { readDiagnosticV2 } from './diagnostic-next.mjs';

// Candidate only: not an execution entrypoint, source proof or authorization.
export function diagnosticTransportCandidate({fetchImpl,keySource,mode,beforeRequest=null}) {
  let diagnostic=null;
  const core=createHttpTransport({mode,keySource,beforeRequest,fetchImpl:async(url,options)=>{
    const response=await fetchImpl(url,options);
    if(!response.ok)diagnostic=await readDiagnosticV2(response,{signal:options.signal,
      requestBody:options.body?JSON.parse(options.body):{},secret:options.headers['x-goog-api-key']});
    return response;
  }});
  return {...core,async count(prepared,deadline) {
    Object.assign(prepared,repairPrepared(prepared));return core.count(prepared,deadline);
  },counters() {const counters=core.counters();return {...counters,
    lastFailure:counters.lastFailure?{...counters.lastFailure,diagnostic}:null};}};
}
