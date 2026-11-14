const { dir: folder, title, questions = [] } = args;
const dir = String(folder).replace(/^[\\/]*workspace[\\/]+/, '').replace(/[\\/]+$/, '');
const bare = (url) => String(url ?? '').trim().replace(/#.*$/, '').replace(/\/$/, '');
const flat = (s) =>
  String(s ?? '')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .toLowerCase()
    .replace(/[‘’‚`´]/g, "'")
    .replace(/[“”„«»]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/[*_]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
const linkless = (s) =>
  String(s ?? '')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\s*\(?https?:\/\/[^\s)]+\)?/g, '')
    .replace(/\s+/g, ' ')
    .trim();

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
const names = (await tools.read({ root: 'workspace', path: dir })).text.split('\n');
const numbered = (kind, ext) =>
  names
    .map((name) => new RegExp(`^${kind}-(\\d+)\\.${ext}$`).exec(name))
    .filter(Boolean)
    .map((m) => ({ n: Number(m[1]), path: `${dir}/${m[0]}` }))
    .sort((a, b) => a.n - b.n);

const ledger = new Map();
for (const { path } of numbered('ledger', 'jsonl')) {
  for (const line of (await readAll(path)).split('\n')) {
    if (!line.trim()) continue;
    const entry = JSON.parse(line);
    if (!ledger.has(bare(entry.url))) ledger.set(bare(entry.url), entry);
  }
}
const found = [];
const problems = [];
for (const { n, path } of numbered('findings', 'json')) {
  try {
    const parsed = JSON.parse((await readAll(path)).replace(/^\s*```\w*\s*|\s*```\s*$/g, ''));
    for (const f of (Array.isArray(parsed) ? parsed : parsed.findings) ?? []) found.push({ n, ...f });
  } catch {
    problems.push(`findings-${n}.json is not a JSON list.`);
  }
}

const pages = new Map();
const kept = [];
let dropped = 0;
for (const f of found) {
  const entry = ledger.get(bare(f.url));
  if (!entry) {
    dropped += 1;
    continue;
  }
  if (!pages.has(entry.file)) pages.set(entry.file, flat(await readAll(entry.file)));
  const quote = flat(f.quote).replace(/^["']|["']$/g, '').replace(/\.{3}|…/g, '').trim();
  if (quote.length < 12 || !pages.get(entry.file).includes(quote)) {
    dropped += 1;
    continue;
  }
  kept.push({ n: f.n, url: entry.url, title: entry.title, claim: linkless(f.claim), quote: f.quote });
}
await tools.write({ root: 'workspace', path: `${dir}/checked.json`, content: JSON.stringify(kept, null, 2) });

const cited = [];
const number = (url) => {
  const at = cited.findIndex((c) => bare(c.url) === bare(url));
  if (at >= 0) return at + 1;
  cited.push(kept.find((k) => bare(k.url) === bare(url)));
  return cited.length;
};
const count = Math.max(questions.length, ...kept.map((k) => k.n), 0);
const sections = [];
for (let n = 1; n <= count; n += 1) {
  const mine = kept.filter((k) => k.n === n);
  const heading = linkless(questions[n - 1]) || `Sub-question ${n}`;
  const lines = mine.length
    ? mine.map((k) => `- ${k.claim} [${number(k.url)}](${k.url})`)
    : ['- No saved page answers this.'];
  sections.push(`## ${heading}\n\n${lines.join('\n')}`);
}
const sources = cited.map((c, i) => `${i + 1}. [${linkless(c.title) || c.url}](${c.url})`);
const report = [`# ${linkless(title)}`, ...sections, sources.length ? `## Sources\n\n${sources.join('\n')}` : '']
  .filter(Boolean)
  .join('\n\n');
await tools.write({ root: 'workspace', path: `${dir}/report.md`, content: `${report}\n` });
text(
  [
    `Checked ${found.length} findings: kept ${kept.length}, dropped ${dropped} whose page no helper saved or whose quote is not on its page.`,
    ...problems,
    `The report is saved as ${dir}/report.md. Next: answer with two or three sentences that answer the question from the report, then the report below, copied whole with every link.`,
    report,
  ].join('\n\n'),
);
