import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeDiagnosticV2, readDiagnosticV2 } from './diagnostic-next.mjs';
import { ERROR_BYTES } from '../diagnostics.mjs';
import { diagnosticTransportCandidate } from './diagnostic-transport-next.mjs';
import { DIRECTORY, json } from './preservation.mjs';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';

const options={httpStatus:400,requestBody:{generationConfig:{responseJsonSchema:{type:'object'}}},secret:'OFFLINE_SECRET_CANARY'};
const errorBytes=message=>Buffer.from(JSON.stringify({error:{code:400,status:'INVALID_ARGUMENT',message}}));
test('fixed classifications never retain provider prose or become a proven diagnosis',()=>{
  for(const [message,expected] of [
    ['Schema is too complex for serving','schema_complexity'],
    ['Unknown name responseFormat','unknown_parameter'],
    ['Unsupported schema keyword whatever','schema_keyword_rejected'],
    ['Thinking configuration not supported','thinking_configuration_rejected'],
    ['maxOutputTokens exceeds supported maximum','output_limit_rejected'],
    ['An unexplained rejection with private details','unclassified'],
  ]) {
    const output=sanitizeDiagnosticV2(errorBytes(message),options);
    assert.equal(output.messageClassification,expected);assert.equal(output.classificationIsConfirmedCause,false);
    assert(!JSON.stringify(output).includes(message));assert.equal(output.providerProseRetained,false);
  }
});
test('secret echo, malformed, oversized and message overflow discard or stay unclassified',()=>{
  assert.equal(sanitizeDiagnosticV2(errorBytes('Unknown field OFFLINE_SECRET_CANARY'),options).bodyUnavailableReason,'secret_echo_discarded');
  assert.equal(sanitizeDiagnosticV2(Buffer.from('not JSON'),options).bodyUnavailableReason,'invalid_error_json');
  assert.equal(sanitizeDiagnosticV2(new Uint8Array(ERROR_BYTES+1),options).bodyUnavailableReason,'error_body_limit');
  assert.equal(sanitizeDiagnosticV2(errorBytes('Unknown field '+'.'.repeat(2100)),options).messageClassification,'unclassified');
});
test('candidate diagnostic reader remains byte-bounded and abortable without fetch',async()=>{
  const controller=new AbortController();
  const response=new Response(errorBytes('Schema is too deep'),{status:400});
  assert.equal((await readDiagnosticV2(response,{...options,signal:controller.signal})).messageClassification,'schema_complexity');
  const large=new Response(new Uint8Array(ERROR_BYTES+1),{status:400});
  assert.equal((await readDiagnosticV2(large,{...options,signal:controller.signal})).bodyUnavailableReason,'error_body_limit');
  const aborted=new AbortController();aborted.abort();
  await assert.rejects(readDiagnosticV2(new Response(errorBytes('x'),{status:400}),{...options,signal:aborted.signal}),/request_timeout/);
});
test('candidate transport binds the unchanged counted request and records one fixture failure without retry',async()=>{
  const prepared=(await json(resolve(DIRECTORY,'INITIAL_REQUESTS.json'))).requests[0].prepared;
  let guards=0;
  const transport=diagnosticTransportCandidate({mode:'OFFLINE_FIXTURE',keySource:()=>options.secret,
    beforeRequest:async()=>{guards++;},fetchImpl:async url=>url.endsWith(':countTokens')
      ?new Response(JSON.stringify({totalTokens:10}),{status:200})
      :new Response(errorBytes('Schema is too complex for serving'),{status:400})});
  await transport.count(prepared,performance.now()+1000);
  await assert.rejects(transport.generate(prepared,{requestSha256:prepared.requestSha256,
    outputReservation:1024,deadlineMonotonicMs:performance.now()+1000}),/http_failure/);
  const counters=transport.counters();assert.equal(counters.generationCalls,1);
  assert.equal(counters.countCalls,2);assert.equal(counters.automaticRetries,0);assert.equal(guards,3);
  assert.equal(counters.lastFailure.diagnostic.messageClassification,'schema_complexity');
  assert(!JSON.stringify(counters).includes(options.secret));
});
