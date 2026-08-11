import type { ChatGPTUser } from "../app/chatgpt-auth";
import type { WorkspaceSummary } from "../app/workspace-types";
import { getD1 } from ".";
import { ensureDatabaseCompatibility } from "./migrations";

type WorkspaceRow = {
  id: string;
  name: string;
  slug: string;
  role: "owner";
  created_at: string;
};

export function normalizeWorkspaceName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function workspaceSlugBase(value: string): string {
  const slug = normalizeWorkspaceName(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");

  return slug || "workspace";
}

export async function ensureWorkspaceSchema(): Promise<void> {
  return ensureDatabaseCompatibility();
}

export async function upsertOwner(user: ChatGPTUser): Promise<void> {
  await ensureWorkspaceSchema();
  await getD1()
    .prepare(`INSERT INTO users (id, email, display_name)
      VALUES (?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        email = excluded.email,
        display_name = excluded.display_name,
        updated_at = CURRENT_TIMESTAMP`)
    .bind(user.userId, user.email, user.displayName)
    .run();
}

export async function listOwnerWorkspaces(
  user: ChatGPTUser,
): Promise<WorkspaceSummary[]> {
  await upsertOwner(user);
  const result = await getD1()
    .prepare(`SELECT
      w.id,
      w.name,
      w.slug,
      wm.role,
      w.created_at
    FROM workspace_members wm
    INNER JOIN workspaces w ON w.id = wm.workspace_id
    WHERE wm.user_id = ? AND wm.role = 'owner'
    ORDER BY w.created_at ASC, w.name ASC`)
    .bind(user.userId)
    .all<WorkspaceRow>();

  return result.results.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    role: row.role,
  }));
}

async function createUniqueSlug(name: string): Promise<string> {
  const d1 = getD1();
  const base = workspaceSlugBase(name);

  for (let suffix = 1; suffix <= 100; suffix += 1) {
    const candidate = suffix === 1 ? base : `${base}-${suffix}`;
    const existing = await d1
      .prepare("SELECT id FROM workspaces WHERE slug = ? LIMIT 1")
      .bind(candidate)
      .first<{ id: string }>();
    if (!existing) return candidate;
  }

  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function createOwnerWorkspace(
  user: ChatGPTUser,
  rawName: string,
): Promise<WorkspaceSummary> {
  const name = normalizeWorkspaceName(rawName);
  if (name.length < 2 || name.length > 64) {
    throw new Error("Workspace name must be between 2 and 64 characters.");
  }

  await upsertOwner(user);
  const d1 = getD1();
  const id = crypto.randomUUID();
  const slug = await createUniqueSlug(name);

  await d1.batch([
    d1
      .prepare("INSERT INTO workspaces (id, name, slug, owner_user_id) VALUES (?, ?, ?, ?)")
      .bind(id, name, slug, user.userId),
    d1
      .prepare("INSERT INTO workspace_members (workspace_id, user_id, role) VALUES (?, ?, 'owner')")
      .bind(id, user.userId),
  ]);

  const created = await d1
    .prepare(`SELECT id, name, slug, created_at FROM workspaces
      WHERE id = ? AND owner_user_id = ? LIMIT 1`)
    .bind(id, user.userId)
    .first<Omit<WorkspaceRow, "role">>();

  if (!created) throw new Error("Workspace could not be created.");
  return {
    id: created.id,
    name: created.name,
    slug: created.slug,
    role: "owner",
  };
}

export async function ownerCanAccessWorkspace(
  userId: string,
  workspaceId: string,
): Promise<boolean> {
  await ensureWorkspaceSchema();
  const row = await getD1()
    .prepare(`SELECT workspace_id FROM workspace_members
      WHERE workspace_id = ? AND user_id = ? AND role = 'owner' LIMIT 1`)
    .bind(workspaceId, userId)
    .first<{ workspace_id: string }>();
  return Boolean(row);
}
