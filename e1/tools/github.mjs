// Ticket 09: list_deploys, shaped as GitHub's REST API answers GET /repos/{owner}/{repo}/deployments for the
// store's repository. The backend answers raw deploy records (e1/store.mjs), plugin updates among them; this gives
// them GitHub's field names and UTC date-times. tests/fixtures/github-docs.json holds the doc fields it must match.
import { CURSOR, defineTool, listPage } from './core.mjs';
import { storeTime } from '../world.mjs';

const object = properties => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
// GitHub's date-time: ISO 8601 in UTC with a Z.
const utc = unix => `${storeTime(unix, 0)}Z`;

// The 8-field row (section 3 item 1); creator is GitHub's simple user, cut to its login and type.
export const deployRow = d => ({ id: d.id, sha: d.sha, ref: 'main', task: 'deploy', environment: 'production',
  description: d.description, creator: { login: d.creator, type: 'User' }, created_at: utc(d.at) });

export const GITHUB_TOOLS = Object.freeze([
  defineTool({
    name: 'list_deploys',
    description: 'Deploys of the store\'s code to production, from its GitHub repository, as of now, oldest first, 20 a page. Plugins live in the repository, so a plugin update is a deploy. Times are UTC.',
    schema: object({ cursor: CURSOR }),
    handler: async (args, { backend, now }) => listPage({
      tool: 'list_deploys', args, now, project: deployRow, wrap: rows => rows,
      fetch: async ({ count, skip }) => {
        const reply = await backend.listDeploys({ per_page: count, offset: skip });
        return reply.ok ? { ...reply, body: { items: reply.body } } : reply;
      },
    }),
  }),
]);
