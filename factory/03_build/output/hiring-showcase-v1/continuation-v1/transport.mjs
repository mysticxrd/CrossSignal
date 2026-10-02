import { createHttpTransport } from '../../../../../db/benchmark/gemini-http.mjs';
import { normalizePrepared } from './wire.mjs';
import { readDiagnostic } from './diagnostics.mjs';

// Thin host adapter; original endpoint/caps/counting/deadlines/concurrency and
// retry enforcement remain in the existing transport. No key lookup here.
export function diagnosticTransport({fetchImpl,keySource,mode,beforeRequest=null}) {
  let diagnostic=null;
  const core=createHttpTransport({mode,keySource,beforeRequest,fetchImpl:async(url,options)=>{
    const response=await fetchImpl(url,options);
    if(!response.ok)diagnostic=await readDiagnostic(response,{signal:options.signal,
      requestBody:options.body?JSON.parse(options.body):{},secret:options.headers['x-goog-api-key']});
    return response;
  }});
  return {...core,
    async count(prepared,deadline) {
      // Normalize before counting, ledger admission and write-ahead recording.
      Object.assign(prepared,normalizePrepared(prepared));
      return core.count(prepared,deadline);
    },
    counters(){const counters=core.counters();return {...counters,
      lastFailure:counters.lastFailure?{...counters.lastFailure,diagnostic}:null};},
  };
}
