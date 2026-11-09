import { readFileSync, writeFileSync, existsSync, realpathSync, readdirSync } from 'node:fs';
import { resolve, join, relative, isAbsolute, sep, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { check, queue } from '../order-recovery/world.mjs';
import { checkHeldout, withOrderStatuses, acceptReview, checkPins, sha256 } from '../tests/evaluator/order-recovery/heldout.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const json = path => JSON.parse(readFileSync(path, 'utf8'));
const save = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' });
export function runHeldout(mode, directory) {
  check(['--validate', '--review', '--compare', '--pin', '--check', '--check-public'].includes(mode) && directory, 'set: usage');
  const folder = realpathSync(directory), rel = relative(realpathSync(root), folder);
  check(rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel), 'set: outside-checkout');
  for (let parent = folder; ; parent = dirname(parent)) {
    check(!existsSync(join(parent, '.git')), 'set: outside-checkout');
    if (dirname(parent) === parent) break;
  }
  checkPins(json(join(root, 'reports/order-recovery/heldout-670.sources.json')));
  const draft = withOrderStatuses(json(join(folder, 'draft.json')));
  const summary = checkHeldout(draft);
  if (mode === '--validate') return summary;
  if (mode === '--review') {
    check(!existsSync(join(folder, 'world.json')), 'set: review-exists');
    save(join(folder, 'world.json'), draft.world);
    return { review: 'ready', orders: queue(draft.world).length };
  }
  const answers = json(join(folder, 'reviewer-answers.json')), investigation = json(join(folder, 'investigation.json'));
  const authorHash = sha256(readFileSync(join(folder, 'draft.json'))), reviewerHash = sha256(readFileSync(join(folder, 'reviewer-answers.json')));
  check(investigation.authorHash === authorHash && investigation.reviewerHash === reviewerHash, 'set: investigation-changed');
  const compared = acceptReview(draft, answers, investigation);
  if (mode === '--compare') {
    check(!existsSync(join(folder, 'truth.json')) && !existsSync(join(folder, 'comparison.json')), 'set: comparison-exists');
    save(join(folder, 'comparison.json'), { authorHash, reviewerHash, investigationHash: sha256(readFileSync(join(folder, 'investigation.json'))), disagreements: compared.disagreements, corrected: compared.corrected, migration: 'orderStatus from explicit action semantics; original draft preserved' });
    save(join(folder, 'truth.json'), compared.draft.truth);
    return { compared: true, disagreements: compared.disagreements };
  }
  const comparison = json(join(folder, 'comparison.json'));
  check(comparison.authorHash === authorHash && comparison.reviewerHash === reviewerHash && comparison.investigationHash === sha256(readFileSync(join(folder, 'investigation.json'))), 'set: comparison-changed');
  check(JSON.stringify(json(join(folder, 'world.json'))) === JSON.stringify(draft.world) && JSON.stringify(json(join(folder, 'truth.json'))) === JSON.stringify(compared.draft.truth), 'set: reviewed-files-changed');
  const names = ['draft.json', 'world.json', 'truth.json', 'reviewer-answers.json', 'investigation.json', 'comparison.json', ...readdirSync(folder).filter(n => /^(?:attempt-\d+\.(?:json|stderr|input\.txt)|refusal-\d+\.txt)$/.test(n))].sort();
  const manifest = { files: Object.fromEntries(names.map(name => [name, sha256(readFileSync(join(folder, name)))])) };
  const path = join(folder, 'commitment.json');
  if (mode === '--pin') save(path, manifest);
  else check(JSON.stringify(json(path)) === JSON.stringify(manifest), 'set: commitment-changed');
  if (mode === '--check-public') check(JSON.stringify(json(join(root, 'reports/order-recovery/heldout-670.commitment.json'))) === JSON.stringify(manifest), 'set: public-commitment-changed');
  return { committed: true, files: Object.keys(manifest.files).length };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { check(process.argv.length === 4, 'set: usage'); console.log(JSON.stringify(runHeldout(...process.argv.slice(2)))); }
  catch (error) {
    console.error(/^(?:set|[\w-]+): [a-z-]+$/.test(error.message) ? error.message : 'set: unreadable-input');
    process.exitCode = 1;
  }
}
