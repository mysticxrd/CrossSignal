import { createHash, createPublicKey, randomBytes, timingSafeEqual, verify } from 'node:crypto';
import { requireThat } from './contracts.mjs';

const ISSUER = 'https://auth.openai.com', RESOURCE = 'https://api.openai.com/v1';
const requiredScopes = ['openid', 'profile', 'email', 'offline_access', 'resource.invoke', 'chatgpt.tokens.use.direct'];
const equal = (a, b) => typeof a === 'string' && typeof b === 'string' && Buffer.byteLength(a) === Buffer.byteLength(b)
  && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const issued = id => typeof id === 'string' && /^[a-zA-Z0-9_-]{1,160}$/.test(id) && id !== 'dynamic_agent_client';

// Offline OAuth protocol helpers. No browser, listener, credential store or token
// discovery from another app is performed. The caller must persist one host ID,
// bind the loopback listener before opening a browser, and protect credentials.
export function prepareSignin({ hostId, port = 1455, clientId = null, now = Date.now() }) {
  requireThat(typeof hostId === 'string' && /^urn:uuid:[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(hostId), 'invalid persisted UUIDv4 host ID');
  requireThat(Number.isSafeInteger(port) && port > 0 && port <= 65535, 'invalid loopback port');
  requireThat(clientId === null || issued(clientId), 'invalid saved client ID');
  const pending = { hostId, clientId, redirectUri: `http://127.0.0.1:${port}/auth/callback`,
    state: randomBytes(32).toString('base64url'), nonce: randomBytes(32).toString('base64url'),
    verifier: randomBytes(32).toString('base64url'), expiresAt: now + 300_000, used: false };
  const url = new URL(`${ISSUER}/api/accounts/authorize`);
  const fields = { client_id: clientId ?? 'dynamic_agent_client', ext_agent_host_id: hostId, response_type: 'code',
    redirect_uri: pending.redirectUri, scope: requiredScopes.join(' '), resource: RESOURCE, state: pending.state,
    nonce: pending.nonce, code_challenge_method: 'S256', code_challenge: createHash('sha256').update(pending.verifier).digest('base64url') };
  if (clientId === null) fields.agent_name_hint = 'CrossSignal';
  for (const [name, value] of Object.entries(fields)) url.searchParams.set(name, value);
  return { authorizationUrl: url.toString(), pending };
}
export function prepareCodeExchange(callbackUrl, pending, now = Date.now()) {
  requireThat(!pending.used && now <= pending.expiresAt, 'expired or replayed authorization');
  const callback = new URL(callbackUrl), registered = new URL(pending.redirectUri);
  requireThat(callback.origin === registered.origin && callback.pathname === registered.pathname && !callback.hash, 'callback URI mismatch');
  requireThat(callback.searchParams.getAll('state').length === 1 && equal(callback.searchParams.get('state'), pending.state), 'state mismatch');
  pending.used = true;
  requireThat(!callback.searchParams.has('error'), 'OAuth permission declined');
  const code = callback.searchParams.get('code'), clientId = callback.searchParams.get('client_id') ?? pending.clientId;
  requireThat(callback.searchParams.getAll('code').length === 1 && code && code.length <= 4096, 'invalid authorization code');
  requireThat(callback.searchParams.getAll('client_id').length <= 1 && issued(clientId)
    && (pending.clientId === null || pending.clientId === clientId), 'issued client mismatch');
  return { endpoint: `${ISSUER}/api/accounts/oauth/token`, clientId,
    body: new URLSearchParams({ grant_type: 'authorization_code', client_id: clientId, code,
      code_verifier: pending.verifier, redirect_uri: pending.redirectUri, resource: RESOURCE }).toString() };
}
// Signature/claim validation can be tested with fixture keys. Real execution must
// retrieve the issuer's trusted discovery/JWKS; accepting an arbitrary JWKS is unsafe.
export function validateIdentity(token, jwks, pending, clientId, nowSeconds = Math.floor(Date.now() / 1000)) {
  requireThat(issued(clientId) && typeof token === 'string' && token.length <= 32768, 'invalid ID token');
  const parts = token.split('.'); requireThat(parts.length === 3 && parts.every(p => /^[A-Za-z0-9_-]+$/.test(p)), 'malformed JWT');
  const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
  requireThat(header.alg === 'RS256' && typeof header.kid === 'string', 'unsupported JWT algorithm');
  const keys = jwks?.keys?.filter(key => key.kid === header.kid && key.kty === 'RSA' && key.alg === 'RS256' && key.use === 'sig');
  requireThat(keys?.length === 1, 'unmatched signing key');
  const key = createPublicKey({ key: keys[0], format: 'jwk' });
  requireThat(verify('RSA-SHA256', Buffer.from(`${parts[0]}.${parts[1]}`), key, Buffer.from(parts[2], 'base64url')), 'invalid token signature');
  const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  requireThat(claims.iss === ISSUER && (claims.aud === clientId || (Array.isArray(claims.aud) && claims.aud.includes(clientId)
    && claims.azp === clientId)), 'issuer/audience mismatch');
  requireThat(Number.isSafeInteger(claims.exp) && claims.exp > nowSeconds && Number.isSafeInteger(claims.iat)
    && claims.iat <= nowSeconds && (claims.nbf === undefined || (Number.isSafeInteger(claims.nbf) && claims.nbf <= nowSeconds)), 'expired or future token');
  requireThat(equal(claims.nonce, pending.nonce) && typeof claims.sub === 'string' && claims.sub.length > 0, 'nonce/identity mismatch');
  return { issuer: ISSUER, subject: claims.sub, clientId, expiresAt: claims.exp };
}
export function requirePlanScope(tokenResponse) {
  requireThat(tokenResponse?.token_type === 'Bearer' && typeof tokenResponse.access_token === 'string'
    && tokenResponse.access_token.length > 0 && typeof tokenResponse.scope === 'string', 'incomplete token response');
  const scopes = tokenResponse.scope.split(/\s+/);
  requireThat(['resource.invoke', 'chatgpt.tokens.use.direct'].every(scope => scopes.includes(scope)), 'ChatGPT plan permission absent');
  return { planScopePresent: true }; // Never return a credential into evidence or model context.
}
export function accountModels(catalog) {
  requireThat(Array.isArray(catalog?.models), 'invalid account catalog');
  const shown = catalog.models.filter(model => model.visibility === 'list').map(model => {
    requireThat(typeof model.slug === 'string' && /^[a-zA-Z0-9._-]{1,160}$/.test(model.slug)
      && typeof model.display_name === 'string' && model.display_name.length <= 160, 'invalid model catalog entry');
    return { slug: model.slug, displayName: model.display_name };
  });
  requireThat(new Set(shown.map(model => model.slug)).size === shown.length, 'duplicate catalog model');
  return shown;
}
