import { createServer } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { exact, requireThat as check } from '../benchmark/contracts.mjs';
export function caseServer({ cases, jobs, staticDirectory, modelReady = () => {}, errorLog = console.error }) {
  const token = randomBytes(32).toString('hex');
  const equal = value => typeof value === 'string' && value.length === token.length && timingSafeEqual(Buffer.from(value), Buffer.from(token));
  const server = createServer(async (request, response) => {
    const send = (status, value) => { response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); response.end(JSON.stringify(value)); };
    response.setHeader('X-Content-Type-Options', 'nosniff'); response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Content-Security-Policy', "default-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    try {
      const origin = `http://127.0.0.1:${server.address().port}`;
      check(request.headers.host === new URL(origin).host, 'invalid_host');
      check(!request.headers.origin || request.headers.origin === origin, 'foreign_origin');
      check(!request.headers['sec-fetch-site'] || ['same-origin', 'none'].includes(request.headers['sec-fetch-site']), 'cross_site_request');
      const url = new URL(request.url, origin), segments = url.pathname.split('/').filter(Boolean);
      if (url.pathname.startsWith('/api/')) {
        if (request.method === 'GET') {
          if (url.pathname === '/api/session') {
            let reason = null; try { modelReady(); } catch (error) { reason = error.message; }
            const used = cases.store.db.prepare('SELECT COUNT(*) AS n FROM attempts WHERE source=?').get(cases.source).n;
            return send(200, { token, owner: 'local_owner', truthMode: 'SIMULATED', model: 'gemini-3.5-flash-lite', profile: 'low',
              source: cases.source, modelReady: reason === null, unavailableReason: reason, attemptsUsed: used, attemptCap: cases.maxAttempts });
          }
          if (url.pathname === '/api/cases') return send(200, cases.store.list());
          if (segments.length === 3 && segments[1] === 'cases') return send(200, cases.store.view(segments[2]));
          return send(404, { error: 'not_found' });
        }
        check(request.method === 'POST' && equal(request.headers['x-case-token']) && request.headers['content-type'] === 'application/json', 'mutation_denied');
        // A streaming decoder keeps a multibyte character intact when the body splits it across chunks.
        request.setEncoding('utf8'); let text = ''; for await (const chunk of request) { text += chunk; check(Buffer.byteLength(text) <= 8192, 'body_too_large'); }
        const body = JSON.parse(text);
        if (url.pathname === '/api/cases') { exact(body, ['key', 'scenario'], 'create'); return send(201, { id: cases.create(body.key, body.scenario) }); }
        check(segments.length === 4 && segments[1] === 'cases', 'unknown_endpoint');
        const id = segments[2], action = segments[3];
        if (action === 'investigate') {
          exact(body, ['revision'], 'investigate'); modelReady(); cases.requestInvestigation(id, body.revision);
          void jobs.kick(); return send(202, cases.store.view(id));
        }
        if (action === 'approve') {
          exact(body, ['proposalHash'], 'approve'); const grant = cases.approve(id, body.proposalHash, cases.source === 'fixture_surrogate' ? 'fixture_surrogate' : 'local_human');
          cases.execute(grant.proposalHash); return send(200, cases.store.view(id));
        }
        if (action === 'command') { exact(body, ['revision', 'command', 'reason'], 'command');
          cases.command(id, body.revision, body.command, body.reason); return send(200, cases.store.view(id)); }
        return send(404, { error: 'not_found' });
      }
      check(request.method === 'GET' || request.method === 'HEAD', 'read_only_asset');
      const requested = decodeURIComponent(url.pathname), file = resolve(staticDirectory, requested === '/' ? 'index.html' : `.${requested}`);
      check(file.startsWith(resolve(staticDirectory) + sep), 'invalid_asset_path');
      const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
      check(Object.hasOwn(types, extname(file)), 'asset_not_found');
      const bytes = await readFile(file); response.writeHead(200, { 'Content-Type': types[extname(file)], 'Cache-Control': 'no-store' });
      response.end(request.method === 'HEAD' ? undefined : bytes);
    } catch (error) {
      // A missing static file (the browser's automatic /favicon.ico) is a plain 404, not a host failure worth logging.
      const message = error.code === 'ENOENT' ? 'asset_not_found' : /^[a-z][a-z0-9_]{0,100}$/.test(error.message) ? error.message : 'request_failed';
      if (message === 'request_failed') errorLog('Case request failed');
      if (!response.headersSent) send(error.message === 'case_not_found' || error.code === 'ENOENT' ? 404 : 409, { error: message });
      else response.destroy();
    }
  });
  return server;
}
