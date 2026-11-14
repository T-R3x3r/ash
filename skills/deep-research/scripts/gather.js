const { dir: folder, n, queries } = args ?? {};
if (!Array.isArray(queries) || !queries.length || queries.some((q) => typeof q !== 'string')) {
  throw new Error('"queries" lists 2 or 3 short web searches, each in quotes.');
}
const dir = String(folder ?? '')
  .replace(/^[\\/]*workspace[\\/]+/, '')
  .replace(/[\\/]+$/, '');
const MOST_PAGES = 8;
const MOST_PASSAGES = 8;
const PER_PAGE = 3;
const PASSAGE_CHARS = 700;
const LINE_CHARS = 900;

const readAll = async (path) => {
  const lines = [];
  let offset = 1;
  for (;;) {
    const r = await tools.read({ root: 'workspace', path, offset });
    const more = /\n\n\[Showing lines \d+-(\d+) of \d+\. Use offset=(\d+) to continue\.\]$/.exec(r.text);
    const body = more ? r.text.slice(0, more.index) : r.text;
    lines.push(...body.split('\n').map((l) => l.replace(/^\d+\|/, '')));
    if (!more) return lines.join('\n');
    offset = Number(more[2]);
  }
};
let plan;
try {
  plan = JSON.parse(await readAll(`${dir}/plan.json`));
} catch {
  throw new Error(`"${dir}" holds no plan. Copy the folder from your task into "dir".`);
}
const asked = plan.questions[Number(n) - 1];
if (!asked) throw new Error(`"n" is the number of your sub-question, 1 to ${plan.questions.length}.`);
const question = asked.question;
const sources = plan.sources;

const words = (s) =>
  String(s)
    .toLowerCase()
    .split(/[\s.,;:!?()[\]{}"'“”„‘’«»/\\|<>=+*#&%$§@^~`_–—-]+/)
    .filter((w) => w.length >= 3);
const plain = (s) => s.replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1');
const origin = (url) => (/^(https?:\/\/[^/?#]+)/i.exec(url) ?? [])[1]?.toLowerCase();
const bare = (url) => url.replace(/#.*$/, '').replace(/\/$/, '');

const wanted = [...new Set([question, ...queries].flatMap(words))];
const weigh = (texts) => {
  const seen = new Map();
  for (const t of texts) for (const w of new Set(words(t))) seen.set(w, (seen.get(w) ?? 0) + 1);
  const weight = new Map(wanted.map((w) => [w, Math.log((texts.length + 1) / (1 + (seen.get(w) ?? 0)))]));
  return (t) => {
    const own = new Set(words(t));
    return wanted.reduce((sum, w) => sum + (own.has(w) ? Math.max(weight.get(w), 0.05) : 0), 0);
  };
};

const read = async (url) => {
  try {
    const r = await tools.browser_read_pages({ urls: [url] });
    return r.structured.pages[0];
  } catch (e) {
    return { url, error: String(e?.message ?? e) };
  }
};

const ledgerPath = `${dir}/ledger-${n}.jsonl`;
let ledger = [];
try {
  ledger = (await readAll(ledgerPath))
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));
} catch {}
const known = new Set(ledger.map((e) => e.url));

const notes = [];
let urls = [];
let pages = [];
if (sources.length) {
  pages = await Promise.all(sources.map(read));
  const sites = new Set(sources.map(origin));
  const links = [];
  for (const page of pages) {
    for (const [, label, href] of (page.markdown ?? '').matchAll(/\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g)) {
      if (sites.has(origin(href))) links.push({ label: `${label} ${href}`, url: bare(href) });
    }
  }
  const score = weigh(links.map((l) => l.label));
  const opened = new Set(pages.map((p) => bare(p.url)));
  urls = [...new Map(links.map((l) => [l.url, l])).values()]
    .filter((l) => !opened.has(l.url) && !known.has(l.url))
    .sort((a, b) => score(b.label) - score(a.label))
    .slice(0, MOST_PAGES)
    .map((l) => l.url);
} else {
  for (const query of queries.slice(0, 3)) {
    try {
      const r = await tools.browser_search({ query });
      urls.push(...r.structured.results.slice(0, 4).map((x) => bare(x.url)));
    } catch (e) {
      notes.push(`The search "${query}" failed: ${String(e?.message ?? e)}`);
    }
  }
  urls = [...new Set(urls)].filter((u) => !known.has(u)).slice(0, MOST_PAGES);
}
for (let i = 0; i < urls.length; i += 4) pages.push(...(await Promise.all(urls.slice(i, i + 4).map(read))));

const wrap = (line) => {
  if (line.length <= LINE_CHARS) return [line];
  const out = [];
  let rest = line;
  while (rest.length > LINE_CHARS) {
    const cut = Math.max(rest.lastIndexOf('. ', LINE_CHARS), rest.lastIndexOf(' ', LINE_CHARS));
    const at = cut > 0 ? cut + 1 : LINE_CHARS;
    out.push(rest.slice(0, at).trim());
    rest = rest.slice(at);
  }
  if (rest.trim()) out.push(rest.trim());
  return out;
};

const blocks = [];
let k = ledger.reduce((most, e) => Math.max(most, Number(String(e.id).split('-')[1]) || 0), 0);
let added = 0;
for (const page of pages) {
  if (page.error || !page.markdown?.trim()) {
    notes.push(`Not read: ${page.url} (${page.error ?? 'no text'})`);
    continue;
  }
  const url = bare(page.url);
  let entry = ledger.find((e) => e.url === url);
  if (!entry) {
    k += 1;
    entry = { id: `${n}-${k}`, url, title: page.title || page.url };
    const body = page.markdown.split('\n').flatMap(wrap).join('\n');
    await tools.write({
      root: 'workspace',
      path: `${dir}/pages/${entry.id}.md`,
      content: `# ${entry.title}\n\n${url}\n\n${body}\n`,
    });
    ledger.push(entry);
    added += 1;
  }
  for (const block of page.markdown.split(/\n\s*\n/)) {
    const lines = block.split('\n').filter((l) => l.trim());
    if (lines.filter((l) => /^\s*([-*+]|\d+\.)\s*\[/.test(l)).length * 2 >= lines.length) continue;
    const said = plain(block).replace(/\s+/g, ' ').trim();
    if (said.length < 60 || said.length < block.replace(/\s+/g, ' ').trim().length * 0.5) continue;
    blocks.push({ id: entry.id, url, title: entry.title, text: said });
  }
}
await tools.write({
  root: 'workspace',
  path: ledgerPath,
  content: ledger.map((e) => JSON.stringify(e)).join('\n') + '\n',
});

const score = weigh(blocks.map((b) => b.text));
const taken = new Map();
const best = blocks
  .map((b) => ({ ...b, score: score(b.text) }))
  .filter((b) => b.score > 0)
  .sort((a, b) => b.score - a.score)
  .filter((b) => {
    const count = taken.get(b.id) ?? 0;
    if (count >= PER_PAGE) return false;
    taken.set(b.id, count + 1);
    return true;
  })
  .slice(0, MOST_PASSAGES);
const clipped = (t) => {
  if (t.length <= PASSAGE_CHARS) return t;
  const end = t.lastIndexOf('. ', PASSAGE_CHARS);
  return end > 200 ? t.slice(0, end + 1) : `${t.slice(0, PASSAGE_CHARS)}…`;
};
text(
  [
    `Sub-question ${n}: ${question}`,
    `Saved ${added} new pages, ${ledger.length} in all for this sub-question.`,
    ...notes,
    best.length ? 'The passages that best match the sub-question:' : 'No passage matches the sub-question.',
    ...best.map((b) => `[${b.id}] ${b.title ? `${b.title} — ` : ''}${b.url}\n${clipped(b.text)}`),
    `Next: write your findings with write, root workspace, to ${dir}/findings-${n}.json, each with the source number in brackets above its passage, such as "${best[0]?.id ?? `${n}-1`}", and each claim in ${plan.language}. Then answer in one line.`,
  ].join('\n\n'),
);
