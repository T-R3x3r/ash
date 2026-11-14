(async ({ dir, title }) => {
  const bare = (url) => String(url ?? '').trim().replace(/#.*$/, '').replace(/\/$/, '');
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

  const byId = new Map();
  const byUrl = new Map();
  for (const { path } of numbered('ledger', 'jsonl')) {
    for (const line of (await readAll(path)).split('\n')) {
      if (!line.trim()) continue;
      const entry = JSON.parse(line);
      byId.set(entry.id, entry);
      if (!byUrl.has(bare(entry.url))) byUrl.set(bare(entry.url), entry);
    }
  }

  const cited = [];
  const number = (entry) => {
    const at = cited.findIndex((e) => bare(e.url) === bare(entry.url));
    if (at >= 0) return at + 1;
    cited.push(entry);
    return cited.length;
  };
  const removed = [];
  const link = (entry) => `[${number(entry)}](${entry.url})`;

  const sections = [];
  for (const { path } of numbered('section', 'md')) {
    const linked = (await readAll(path))
      .replace(/\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g, (all, label, url) => {
        const entry = byUrl.get(bare(url));
        if (entry) return `${label} ${link(entry)}`;
        removed.push(url);
        return label;
      })
      .replace(/\[\s*(\d+-\d+(?:\s*[,;]\s*\d+-\d+)*)\s*\]/g, (all, ids) =>
        ids
          .split(/\s*[,;]\s*/)
          .map((id) => {
            const entry = byId.get(id);
            if (entry) return link(entry);
            removed.push(`[${id}]`);
            return '';
          })
          .join(' '),
      )
      .replace(/(^|[\s(])(https?:\/\/[^\s)\]]*[^\s)\].,;:])/g, (all, before, url) => {
        if (byUrl.has(bare(url))) return all;
        removed.push(url);
        return before;
      })
      .replace(/ +([.,;:])/g, '$1');
    sections.push(linked.trim());
  }

  const sources = cited.map((e, i) => `${i + 1}. [${e.title}](${e.url})`);
  const report = [`# ${title}`, ...sections, sources.length ? `## Sources\n\n${sources.join('\n')}` : '']
    .filter(Boolean)
    .join('\n\n');
  await tools.write({ root: 'workspace', path: `${dir}/report.md`, content: `${report}\n` });
  return [
    removed.length ? `Removed ${removed.length} links that no helper saved.` : '',
    `The report, saved as ${dir}/report.md. Next: answer with it, copied whole from its title to its sources, with every link:`,
    report,
  ]
    .filter(Boolean)
    .join('\n\n');
})
