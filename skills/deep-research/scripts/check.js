(async (dir) => {
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
  const numbered = (kind) =>
    names
      .map((name) => new RegExp(`^${kind}-(\\d+)\\.json(l?)$`).exec(name))
      .filter(Boolean)
      .map((m) => ({ n: Number(m[1]), path: `${dir}/${m[0]}` }))
      .sort((a, b) => a.n - b.n);

  const ledger = new Map();
  const found = [];
  const problems = [];
  for (const { path } of numbered('ledger')) {
    for (const line of (await readAll(path)).split('\n')) {
      if (!line.trim()) continue;
      const entry = JSON.parse(line);
      if (!ledger.has(bare(entry.url))) ledger.set(bare(entry.url), entry);
    }
  }
  for (const { n, path } of numbered('findings')) {
    const raw = await readAll(path);
    let list;
    try {
      const parsed = JSON.parse(raw.replace(/^\s*```\w*\s*|\s*```\s*$/g, ''));
      list = Array.isArray(parsed) ? parsed : parsed.findings;
    } catch {
      problems.push(`findings-${n}.json is not a JSON list`);
      continue;
    }
    for (const f of list ?? []) found.push({ n, ...f });
  }

  const pages = new Map();
  const kept = [];
  const dropped = [];
  for (const f of found) {
    const entry = ledger.get(bare(f.url));
    if (!entry) {
      dropped.push(`${f.claim} (its address ${f.url} is not in the ledger)`);
      continue;
    }
    if (!pages.has(entry.file)) pages.set(entry.file, flat(await readAll(entry.file)));
    const quote = flat(f.quote).replace(/^["']|["']$/g, '').replace(/\.{3}|…/g, '').trim();
    if (quote.length < 12 || !pages.get(entry.file).includes(quote)) {
      dropped.push(`${f.claim} (its quote is not on the saved page ${entry.id})`);
      continue;
    }
    kept.push({ n: f.n, source: entry.id, url: entry.url, claim: f.claim, quote: f.quote });
  }
  await tools.write({ root: 'workspace', path: `${dir}/checked.json`, content: JSON.stringify(kept, null, 2) });

  const numbers = [...new Set(found.map((f) => f.n))].sort((a, b) => a - b);
  return [
    `Checked ${found.length} findings: kept ${kept.length}, dropped ${dropped.length}. The kept findings are in ${dir}/checked.json.`,
    ...problems,
    ...numbers.map((n) => {
      const mine = kept.filter((f) => f.n === n);
      return [
        `Sub-question ${n}, findings kept: ${mine.length}.`,
        ...mine.map((f) => `- [${f.source}] ${f.claim} Quote: "${f.quote}"`),
      ].join('\n');
    }),
    dropped.length ? `Dropped:\n${dropped.map((d) => `- ${d}`).join('\n')}` : '',
    `Next: for each sub-question, write ${dir}/section-<number>.md with write, root workspace, from its kept findings only, with their source numbers such as [${kept[0]?.source ?? '1-1'}]; then run scripts/report.js.`,
  ]
    .filter(Boolean)
    .join('\n\n');
})
