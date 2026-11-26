// Sorted keys at every depth, so the same value always gives the same bytes. Kept apart from world.mjs so the run
// log (and, later, a browser checking a published chain) can use it without loading the GA4 world.
export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}
