import { spawn, type ChildProcess } from "node:child_process";
import { generateKeyPairSync } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { createServer } from "node:net";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { Client } from "eve/client";

import { createCrossSignalEveAdapter } from "../src/crosssignal-eve-adapter.ts";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const eveBin = resolve(appRoot, "node_modules/eve/bin/eve.js");
const summaryPath = resolve(appRoot, ".eve/agent-summary.json");
const expectedDisabledTools = [
  "agent",
  "ask_question",
  "bash",
  "glob",
  "grep",
  "load_skill",
  "read_file",
  "todo",
  "web_fetch",
  "web_search",
  "write_file",
];

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function stage(name: string) {
  process.stderr.write(`[eve-spike] ${name}\n`);
}

async function reservePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((accept, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", accept);
  });
  const address = server.address();
  assert(address && typeof address !== "string", "Could not reserve a local port");
  const port = address.port;
  await new Promise<void>((accept, reject) => server.close((error) => (error ? reject(error) : accept())));
  return port;
}

async function runCommand(args: readonly string[], env: NodeJS.ProcessEnv): Promise<string> {
  const child = spawn(process.execPath, args, {
    cwd: appRoot,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  child.stdout?.on("data", (chunk) => {
    stdout += String(chunk);
  });
  child.stderr?.on("data", (chunk) => {
    stderr += String(chunk);
  });
  const code = await new Promise<number | null>((accept, reject) => {
    child.once("error", reject);
    child.once("exit", accept);
  });
  assert(code === 0, `Command failed (${code}): ${stderr || stdout}`);
  return stdout;
}

function startEve(port: number, env: NodeJS.ProcessEnv) {
  const child = spawn(
    process.execPath,
    [eveBin, "start", "--host", "127.0.0.1", "--port", String(port)],
    {
      cwd: appRoot,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let diagnostics = "";
  for (const stream of [child.stdout, child.stderr]) {
    stream?.on("data", (chunk) => {
      diagnostics = `${diagnostics}${String(chunk)}`.slice(-12_000);
    });
  }
  return { child, diagnostics: () => diagnostics };
}

async function waitUntilReady(host: string, child: ChildProcess, diagnostics: () => string) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    assert(child.exitCode === null, `EVE exited before readiness: ${diagnostics()}`);
    try {
      const response = await fetch(`${host}/eve/v1/health`, { redirect: "error" });
      if (response.ok) return;
    } catch {
      // Expected while the local server is starting.
    }
    await new Promise((accept) => setTimeout(accept, 100));
  }
  throw new Error(`Timed out waiting for EVE: ${diagnostics()}`);
}

async function stopEve(child: ChildProcess) {
  if (child.exitCode !== null) return;
  if (process.platform === "win32" && child.pid) {
    const killer = spawn("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
    });
    await new Promise<void>((accept, reject) => {
      killer.once("error", reject);
      killer.once("exit", () => accept());
    });
    await new Promise((accept) => setTimeout(accept, 250));
    child.stdout?.destroy();
    child.stderr?.destroy();
    child.unref();
    return;
  }
  const exited = new Promise<void>((accept) => child.once("exit", () => accept()));
  child.kill("SIGTERM");
  await Promise.race([
    exited,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("EVE did not stop within 10 seconds")), 10_000),
    ),
  ]);
}

async function main() {
  const nodeMajor = Number(process.versions.node.split(".")[0]);
  assert(nodeMajor >= 24, `EVE 0.32.0 requires Node 24+, received ${process.version}`);

  const { publicKey, privateKey } = generateKeyPairSync("ec", {
    namedCurve: "P-256",
    publicKeyEncoding: { format: "pem", type: "spki" },
    privateKeyEncoding: { format: "pem", type: "pkcs8" },
  });
  const env = {
    ...process.env,
    CROSSSIGNAL_EVE_CONTEXT_PUBLIC_KEY: publicKey,
    EVE_TRACES_CONTENT: "off",
    NODE_ENV: "production",
  };

  stage("build");
  await runCommand([eveBin, "build"], env);
  const summary = JSON.parse(await readFile(summaryPath, "utf8"));
  assert(summary.generatorVersion === "0.32.0", "Unexpected EVE compiler version");
  assert(summary.agent.modelId === "crosssignal-fixture/crosssignal-p00-deterministic-fixture", "Unexpected fixture model");
  assert(summary.tools.length === 0, "The topology spike must have no authored tools");
  assert(summary.connections.length === 0, "The topology spike must have no connections");
  assert(summary.subagents.length === 0, "The topology spike must have no subagents");
  assert(summary.schedules.length === 0, "The topology spike must have no schedules");
  assert(summary.sandbox === null, "The topology spike must not configure a sandbox");
  const disabledToolFiles = (await readdir(resolve(appRoot, "agent/tools")))
    .filter((name) => name.endsWith(".ts"))
    .map((name) => name.slice(0, -3))
    .sort();
  assert(
    JSON.stringify(disabledToolFiles) === JSON.stringify(expectedDisabledTools),
    "The topology spike must disable every framework tool",
  );

  const port = await reservePort();
  const host = `http://127.0.0.1:${port}`;
  const envelope = {
    actorId: "fixture-owner",
    workspaceId: "ws_p00_fixture",
    caseId: "case_vendor_renewal",
    icmHead: "fixture-icm-head-p00",
    policyVersion: "p00-v1" as const,
    purpose: "topology-spike" as const,
    allowedTools: [] as const,
  };

  const firstProcess = startEve(port, env);
  let firstPid: number | undefined;
  let secondPid: number | undefined;
  try {
    firstPid = firstProcess.child.pid;
    await waitUntilReady(host, firstProcess.child, firstProcess.diagnostics);
    stage("first process ready");

    const unauthenticated = new Client({ host, redirect: "error" });
    await assertRejects(() => unauthenticated.info(), "Unauthenticated info request was accepted");
    stage("unauthenticated route rejected");

    const firstAdapter = createCrossSignalEveAdapter({
      host,
      privateKeyPem: privateKey,
      envelope,
    });
    const first = await firstAdapter.createSession("start topology proof");
    stage("first turn waiting");
    assert(first.result.status === "waiting", `Unexpected first status: ${first.result.status}`);
    assert(first.result.message === "Fixture turn 1: start topology proof", "Unexpected first fixture reply");
    assert(first.state.sessionId === first.result.sessionId, "Session state/result ID mismatch");

    await stopEve(firstProcess.child);
    stage("first process stopped");

    const secondProcess = startEve(port, env);
    try {
      secondPid = secondProcess.child.pid;
      await waitUntilReady(host, secondProcess.child, secondProcess.diagnostics);
      stage("second process ready");
      assert(firstPid !== secondPid, "Expected a distinct EVE process after restart");

      const secondAdapter = createCrossSignalEveAdapter({
        host,
        privateKeyPem: privateKey,
        envelope,
      });
      const retrieved = await secondAdapter.retrieveSession(first.state);
      stage("durable session retrieved");
      assert(retrieved.session.sessionId === first.state.sessionId, "Could not retrieve the durable session");
      assert(retrieved.events.length > 0, "Retrieved durable session contained no events");

      const second = await secondAdapter.continueSession(
        first.state,
        "continue after process restart",
      );
      stage("second turn waiting");
      assert(second.result.sessionId === first.result.sessionId, "Continuation changed session ID");
      assert(second.result.status === "waiting", `Unexpected second status: ${second.result.status}`);
      assert(
        second.result.message === "Fixture turn 2: continue after process restart",
        "Unexpected second fixture reply",
      );

      const packageJson = JSON.parse(await readFile(resolve(appRoot, "package.json"), "utf8"));
      const proof = {
        classification: "fixture",
        eveVersion: packageJson.dependencies.eve,
        nodeVersion: process.version,
        model: "crosssignal-p00-deterministic-fixture",
        productCapabilities: 0,
        disabledFrameworkTools: expectedDisabledTools,
        routeAuth: "ES256 JWT, 60-second maximum token lifetime",
        workflowWorld: "EVE local Workflow world (.eve/.workflow-data)",
        firstProcessId: firstPid,
        secondProcessId: secondPid,
        restartObserved: true,
        sessionId: first.result.sessionId,
        firstStatus: first.result.status,
        secondStatus: second.result.status,
        retrievedEventCount: retrieved.events.length,
        firstReply: first.result.message,
        secondReply: second.result.message,
      };
      process.stdout.write(`${JSON.stringify(proof, null, 2)}\n`);
    } finally {
      await stopEve(secondProcess.child);
    }
  } finally {
    await stopEve(firstProcess.child);
  }
}

async function assertRejects(operation: () => Promise<unknown>, message: string) {
  try {
    await operation();
  } catch {
    return;
  }
  throw new Error(message);
}

await main();
