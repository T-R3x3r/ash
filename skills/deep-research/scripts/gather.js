(async ({ dir, n, question, queries = [], sources = [] }) => {
  const MOST_PAGES = 8;
  const MOST_PASSAGES = 8;
  const PER_PAGE = 3;
  const PASSAGE_CHARS = 700;
  const LINE_CHARS = 900;

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
      .filter((l) => !opened.has(l.url))
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
    urls = [...new Set(urls)].slice(0, MOST_PAGES);
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

  const ledger = [];
  const blocks = [];
  let k = 0;
  for (const page of pages) {
    if (page.error || !page.markdown?.trim()) {
      notes.push(`Not read: ${page.url} (${page.error ?? 'no text'})`);
      continue;
    }
    k += 1;
    const id = `${n}-${k}`;
    const file = `${dir}/pages/${id}.md`;
    const body = page.markdown.split('\n').flatMap(wrap).join('\n');
    await tools.write({ root: 'workspace', path: file, content: `# ${page.title || page.url}\n\n${page.url}\n\n${body}\n` });
    ledger.push({ id, url: bare(page.url), title: page.title || page.url, file });
    for (const block of page.markdown.split(/\n\s*\n/)) {
      const lines = block.split('\n').filter((l) => l.trim());
      if (lines.filter((l) => /^\s*([-*+]|\d+\.)\s*\[/.test(l)).length * 2 >= lines.length) continue;
      const text = plain(block).replace(/\s+/g, ' ').trim();
      if (text.length < 60 || text.length < block.replace(/\s+/g, ' ').trim().length * 0.5) continue;
      blocks.push({ id, url: bare(page.url), title: page.title, text });
    }
  }
  await tools.write({
    root: 'workspace',
    path: `${dir}/ledger-${n}.jsonl`,
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
  return [
    `Saved ${ledger.length} pages in ${dir}/pages and listed them in ${dir}/ledger-${n}.jsonl.`,
    ...notes,
    best.length ? 'The passages that best match the sub-question:' : 'No passage matches the sub-question.',
    ...best.map((b) => `[${b.id}] ${b.title ? `${b.title} — ` : ''}${b.url}\n${clipped(b.text)}`),
    `Next: write your findings to ${dir}/findings-${n}.json with write, root workspace, then answer in one line.`,
  ].join('\n\n');
})
