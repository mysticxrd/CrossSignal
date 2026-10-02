import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { changedSince, runChecked } from "./verify-kit.mjs";

test("Git preservation includes staged edits, deletions, both rename paths and nonignored additions", async () => {
  const root = await mkdtemp(join(tmpdir(), "factory-git-"));
  const git = (...args) => runChecked("git", ["-c", `safe.directory=${root}`, "-c", "core.autocrlf=false", "-c", "user.name=Factory test", "-c", "user.email=factory-test@example.invalid", ...args], { cwd: root }).stdout;
  try {
    await mkdir(join(root, "kept"));
    for (const [path, text] of Object.entries({ ".gitignore": "ignored/\n", "a.txt": "before\n", "b.txt": "delete\n", "old name.txt": "rename\n", "kept/unchanged.md": "keep\n" })) await writeFile(join(root, path), text);
    git("init"); git("add", "-A"); git("commit", "-m", "baseline");
    const commit = git("rev-parse", "HEAD").trim();
    assert.deepEqual(changedSince(commit, [], { cwd: root }), []);
    await writeFile(join(root, "a.txt"), "after\n");
    git("add", "a.txt");
    await rm(join(root, "b.txt"));
    await rename(join(root, "old name.txt"), join(root, "new name.txt"));
    git("add", "old name.txt", "new name.txt");
    await mkdir(join(root, "ignored"));
    await writeFile(join(root, "ignored/runtime.db"), "private runtime\n");
    await writeFile(join(root, "new untracked.txt"), "new\n");
    assert.deepEqual(changedSince(commit, [], { cwd: root }), ["a.txt", "b.txt", "new name.txt", "new untracked.txt", "old name.txt"]);
    assert.deepEqual(changedSince(commit, ["kept"], { cwd: root }), []);
    assert.deepEqual(changedSince(commit, ["a.txt", "new untracked.txt"], { cwd: root }), ["a.txt", "new untracked.txt"]);
    assert.equal(await readFile(join(root, "kept/unchanged.md"), "utf8"), "keep\n");
    git("add", "-A"); git("commit", "-m", "changed");
    assert.deepEqual(changedSince(commit, ["a.txt"], { cwd: root }), ["a.txt"]);
  } finally {
    assert.equal(dirname(resolve(root)), resolve(tmpdir()));
    assert.ok(root.startsWith(join(tmpdir(), "factory-git-")));
    await rm(root, { recursive: true });
  }
});
