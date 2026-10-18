import { CaseStore } from '../../db/cases/store.mjs';
import { Cases } from '../../db/cases/service.mjs';
const [path, hash] = process.argv.slice(2), store = new CaseStore(path), cases = new Cases(store);
cases.execute(hash, () => process.exit(17));
