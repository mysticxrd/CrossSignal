// The public deploy (npm run deploy:replay) serves only the recorded-run replays: no sign-in, no database, no
// server action. The rest of the app trusts sign-in headers that only the ChatGPT Sites proxy sets, so a public
// Worker must never reach it. Returns the response to send, or null to hand the request to the app.
export const DEMO_RUN_ID = 'r_c72728d0a839';

export function publicReplayGate(request) {
  const url = new URL(request.url);
  // Server actions are POSTs that any page route will dispatch, so only reads get through.
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('This is a read-only replay.', { status: 405, headers: { allow: 'GET, HEAD' } });
  }
  if (url.pathname === '/') return Response.redirect(new URL(`/runs/${DEMO_RUN_ID}`, url), 302);
  if (url.pathname.startsWith('/runs/')) return null;
  return new Response('Not found', { status: 404 });
}
