// Test-only: vinext supplies next/link and next/navigation at build time, so a test that renders a page under plain
// Node maps them to the two stubs beside this file. Register it with module.register before importing the page.
const stubs = { 'next/link': './link.mjs', 'next/navigation': './navigation.mjs' };

export async function resolve(specifier, context, next) {
  if (!Object.hasOwn(stubs, specifier)) return next(specifier, context);
  return { url: new URL(stubs[specifier], import.meta.url).href, shortCircuit: true };
}
