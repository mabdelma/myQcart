// Post-build: emit route-specific HTML for the marketing vertical pages so social
// crawlers (which don't run JS) get per-page <title>/description/Open-Graph. Each
// file is a copy of dist/index.html with the meta swapped; it still boots the SPA,
// so React Router renders the right page for real visitors. nginx serves these for
// the exact paths (see frontend.Dockerfile), falling back to index.html.
import { readFileSync, writeFileSync } from 'node:fs';

const DIST = 'dist';
const BASE = 'https://qlisted.com';
const index = readFileSync(`${DIST}/index.html`, 'utf8');

const PAGES = [
  {
    file: 'restaurants.html',
    url: `${BASE}/restaurants`,
    title: 'Qlisted for Restaurants — QR ordering, payments & more',
    desc: 'Turn every table into a self-service revenue engine: QR ordering, pay-at-table, real-time kitchen, staff, and analytics — no app for your guests.',
    image: `${BASE}/og-restaurants.png`,
  },
  {
    file: 'hotels.html',
    url: `${BASE}/hotels`,
    title: 'Qlisted for Hotels — rooms, reservations & room service',
    desc: 'Run your whole property from one screen: rooms, housekeeping, reservations, check-in, room service, and the guest folio — plus AI forecasting.',
    image: `${BASE}/og-hotels.png`,
  },
];

const setMeta = (html, attr, key, value) =>
  html.replace(new RegExp(`(<meta ${attr}="${key}"[^>]*content=")[^"]*(")`, 'i'), `$1${value}$2`);

for (const p of PAGES) {
  let html = index;
  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${p.title}</title>`);
  html = html.replace(/(<link rel="canonical" href=")[^"]*(")/i, `$1${p.url}$2`);
  html = setMeta(html, 'name', 'description', p.desc);
  html = setMeta(html, 'property', 'og:title', p.title);
  html = setMeta(html, 'property', 'og:description', p.desc);
  html = setMeta(html, 'property', 'og:url', p.url);
  html = setMeta(html, 'property', 'og:image', p.image);
  html = setMeta(html, 'name', 'twitter:title', p.title);
  html = setMeta(html, 'name', 'twitter:description', p.desc);
  html = setMeta(html, 'name', 'twitter:image', p.image);
  writeFileSync(`${DIST}/${p.file}`, html, 'utf8');
  console.log('wrote', `${DIST}/${p.file}`);
}
