import { Client, type ClientSessionState } from "eve/client";
import { importPKCS8, SignJWT } from "jose";
import { randomUUID } from "node:crypto";

const ISSUER = "crosssignal-web";
const AUDIENCE = "crosssignal-eve";
const TOKEN_TTL_SECONDS = 60;

export interface CrossSignalExecutionEnvelope {
  readonly actorId: string;
  readonly workspaceId: string;
  readonly caseId: string;
  readonly icmHead: string;
  readonly policyVersion: "p00-v1";
  readonly purpose: "topology-spike";
  readonly allowedTools: readonly [];
}

export interface CrossSignalEveAdapterOptions {
  readonly host: string;
  readonly privateKeyPem: string;
  readonly envelope: CrossSignalExecutionEnvelope;
}

async function mintExecutionToken(
  privateKeyPem: string,
  envelope: CrossSignalExecutionEnvelope,
): Promise<string> {
  const privateKey = await importPKCS8(privateKeyPem, "ES256");

  return new SignJWT({
    workspace_id: envelope.workspaceId,
    case_id: envelope.caseId,
    icm_head: envelope.icmHead,
    policy_version: envelope.policyVersion,
    purpose: envelope.purpose,
    allowed_tools: envelope.allowedTools,
  })
    .setProtectedHeader({ alg: "ES256", typ: "JWT" })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setSubject(`crosssignal-user:${envelope.actorId}`)
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_TTL_SECONDS}s`)
    .sign(privateKey);
}

export function createCrossSignalEveAdapter(options: CrossSignalEveAdapterOptions) {
  const client = new Client({
    host: options.host,
    redirect: "error",
    auth: {
      bearer: () => mintExecutionToken(options.privateKeyPem, options.envelope),
    },
  });

  return {
    health: () => client.health(),
    info: () => client.info(),
    async createSession(message: string) {
      const created = await client.sessions.create({
        message,
        streamReconnectPolicy: { reconnect: false },
      });
      const result = await created.response.result();
      return {
        result,
        state: created.session.state,
      };
    },
    async retrieveSession(state: ClientSessionState) {
      return client.sessions.attach(state.sessionId, { streamIndex: 0 }).snapshot();
    },
    async continueSession(state: ClientSessionState, message: string) {
      const session = client.sessions.attach(state.sessionId, {
        streamIndex: state.streamIndex,
      });
      const response = await session.send(message, {
        streamReconnectPolicy: { reconnect: false },
      });
      const result = await response.result();
      return {
        result,
        state: session.state,
      };
    },
  };
}
