import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { formatScoreboard, readScoreboard } from "../scoreboard.mjs";
import { runChecked } from "./verify-kit.mjs";

test("scoreboard uses reviewed timestamps and committed current-run decisions without writing", async () => {
  const root = await mkdtemp(join(tmpdir(), "factory-score-"));
  const git = (...args) => runChecked("git", ["-c", `safe.directory=${root}`, "-c", "core.autocrlf=false", "-c", "user.name=Factory test", "-c", "user.email=factory-test@example.invalid", ...args], { cwd: root }).stdout;
  const gate = (unit, decision, time, extra = "") => `unit: ${unit}\ndecision: ${decision}\nreviewed_at: ${time}\n${extra}`;
  const one = join(root, "factory/01_spec/output/HUMAN_GATE.md"), two = join(root, "factory/02_data/output/HUMAN_GATE.md");
  try {
    for (const name of ["01_spec", "02_data", "03_build", "04_verify"]) {
      await mkdir(join(root, "factory", name, "output"), { recursive: true });
      await writeFile(join(root, "factory", name, "CONTEXT.md"), "unit: fixture\n");
    }
    git("init");
    await writeFile(one, gate("old-run", "changes-requested", "2026-09-01T00:00:00Z"));
    git("add", "-A"); git("commit", "-m", "old run");
    await writeFile(one, gate("fixture", "accepted", "2026-10-01T20:52:40+05:30", "human_minutes: 0\n"));
    await writeFile(two, gate("fixture", "changes-requested", "2026-10-01T21:10:00+05:30"));
    git("add", "-A"); git("commit", "-m", "first review");
    await writeFile(two, gate("fixture", "changes-requested", "2026-10-01T21:15:00+05:30"));
    git("add", "-A"); git("commit", "-m", "second repair");
    await writeFile(two, gate("fixture", "accepted", "2026-10-01T21:22:14+05:30", "human_minutes: 12.5\n"));
    await writeFile(join(root, "factory/03_build/output/HUMAN_GATE.md"), gate("fixture", "pending", "not-recorded", "human_minutes: \n"));
    git("add", "-A"); git("commit", "-m", "accepted Data");
    const before = git("status", "--porcelain=v1", "--untracked-files=all");
    const scoreboard = await readScoreboard({ projectRoot: root });
    assert.deepEqual(scoreboard.stages, [
      { stage: "01_spec", cycleMinutes: null, humanMinutes: 0, repairRounds: 0, firstPassAccepted: true },
      { stage: "02_data", cycleMinutes: 1774 / 60, humanMinutes: 12.5, repairRounds: 2, firstPassAccepted: false },
      { stage: "03_build", cycleMinutes: null, humanMinutes: null, repairRounds: 0, firstPassAccepted: null },
      { stage: "04_verify", cycleMinutes: null, humanMinutes: null, repairRounds: null, firstPassAccepted: null },
    ]);
    assert.equal(git("status", "--porcelain=v1", "--untracked-files=all"), before);
    assert.match(formatScoreboard(scoreboard), /29\.57/);
    assert.match(formatScoreboard(scoreboard), /n\/a/);
    const accepted = await readFile(two, "utf8");
    await writeFile(two, gate("fixture", "changes-requested", "tomorrow", "human_minutes: unknown\n"));
    const dirty = await readScoreboard({ projectRoot: root });
    assert.equal(dirty.stages[1].repairRounds, 2);
    assert.equal(dirty.stages[1].cycleMinutes, null);
    assert.equal(dirty.stages[1].humanMinutes, null);
    await writeFile(two, accepted);
    await rm(two);
    git("add", "-A"); git("commit", "-m", "gate removed");
    assert.equal((await readScoreboard({ projectRoot: root })).stages[1].cycleMinutes, null);
  } finally {
    assert.equal(dirname(resolve(root)), resolve(tmpdir()));
    assert.ok(root.startsWith(join(tmpdir(), "factory-score-")));
    await rm(root, { recursive: true });
  }
});
