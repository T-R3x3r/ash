const dir = String(args?.dir ?? '')
  .replace(/^[\\/]*workspace[\\/]+/, '')
  .replace(/[\\/]+$/, '');
const step = Number(args?.step) || 1;
const key = `research:${dir}`;
const AT_ONCE = 2;
const MOST_PAGES = 5;
const MOST_PASSAGES = 8;
const PER_PAGE = 3;
const PASSAGE_CHARS = 700;
const LINE_CHARS = 900;
const WORK_MS = 8000;
const began = Date.now();
const left = () => WORK_MS - (Date.now() - began);

const words = (s) =>
  String(s)
    .toLowerCase()
    .split(/[\s.,;:!?()[\]{}"'“”„‘’«»/\\|<>=+*#&%$§@^~`_–—-]+/)
    .filter((w) => w.length >= 3);
const plain = (s) => s.replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1');
const origin = (url) => (/^(https?:\/\/[^/?#]+)/i.exec(url) ?? [])[1]?.toLowerCase();
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
const call = (n) =>
  JSON.stringify({ file: { root: "<this skill's root>", path: 'scripts/next.js' }, args: { dir, step: n }, yield_s: 30 });

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
const readPages = async (urls) => {
  if (!urls.length) return [];
  try {
    return (await tools.browser_read_pages({ urls })).structured.pages;
  } catch (e) {
    return urls.map((url) => ({ url, error: String(e?.message ?? e) }));
  }
};

/** Reads the pages of sub-question n, saves each one in the folder and
 *  answers the passages that best match the sub-question. */
async function gather(plan, n) {
  const question = plan.questions[n - 1].question;
  const wanted = [...new Set(words(question))];
  const weigh = (texts) => {
    const seen = new Map();
    for (const t of texts) for (const w of new Set(words(t))) seen.set(w, (seen.get(w) ?? 0) + 1);
    const weight = new Map(wanted.map((w) => [w, Math.log((texts.length + 1) / (1 + (seen.get(w) ?? 0)))]));
    return (t) => {
      const own = new Set(words(t));
      return wanted.reduce((sum, w) => sum + (own.has(w) ? Math.max(weight.get(w), 0.05) : 0), 0);
    };
  };
  const notes = [];
  let pages = [];
  let urls = [];
  if (plan.sources.length) {
    pages = await readPages(plan.sources.slice(0, MOST_PAGES));
    const sites = new Set(plan.sources.map(origin));
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
    try {
      const r = await tools.browser_search({ query: question });
      urls = [...new Set(r.structured.results.map((x) => bare(x.url)))].slice(0, MOST_PAGES);
    } catch (e) {
      notes.push(`The search failed: ${String(e?.message ?? e)}`);
    }
  }
  pages.push(...(await readPages(urls)));

  const blocks = [];
  let k = 0;
  for (const page of pages) {
    if (page.error || !page.markdown?.trim()) continue;
    k += 1;
    const id = `${n}-${k}`;
    const url = bare(page.url);
    const title = page.title || page.url;
    const body = page.markdown.split('\n').flatMap(wrap).join('\n');
    await tools.write({ root: 'workspace', path: `${dir}/pages/${id}.md`, content: `# ${title}\n\n${url}\n\n${body}\n` });
    for (const block of page.markdown.split(/\n\s*\n/)) {
      const lines = block.split('\n').filter((l) => l.trim());
      if (lines.filter((l) => /^\s*([-*+]|\d+\.)\s*\[/.test(l)).length * 2 >= lines.length) continue;
      const said = plain(block).replace(/\s+/g, ' ').trim();
      if (said.length < 60 || said.length < block.replace(/\s+/g, ' ').trim().length * 0.5) continue;
      blocks.push({ id, url, title, text: said });
    }
  }
  const score = weigh(blocks.map((b) => b.text));
  const taken = new Map();
  const clipped = (t) => {
    if (t.length <= PASSAGE_CHARS) return t;
    const end = t.lastIndexOf('. ', PASSAGE_CHARS);
    return end > 200 ? t.slice(0, end + 1) : t.slice(0, PASSAGE_CHARS);
  };
  return blocks
    .map((b) => ({ ...b, score: score(b.text) }))
    .filter((b) => b.score > 0)
    .sort((a, b) => b.score - a.score)
    .filter((b) => {
      const count = taken.get(b.id) ?? 0;
      if (count >= PER_PAGE) return false;
      taken.set(b.id, count + 1);
      return true;
    })
    .slice(0, MOST_PASSAGES)
    .map(({ id, url, title, text: said }) => ({ id, url, title, text: clipped(said) }));
}

/** The findings a helper answered as a JSON list; none for any other answer. */
function findingsOf(answer) {
  const said = String(answer ?? '');
  const from = said.indexOf('[');
  const to = said.lastIndexOf(']');
  if (from < 0 || to < from) return [];
  try {
    const list = JSON.parse(said.slice(from, to + 1));
    return Array.isArray(list) ? list.filter((f) => f && typeof f === 'object') : [];
  } catch {
    return [];
  }
}

async function report(plan) {
  const kept = [];
  let found = 0;
  for (const [n, findings] of Object.entries(plan.findings)) {
    const passages = plan.passages[n] ?? [];
    for (const f of findings) {
      found += 1;
      const source = /(\d+-\d+)/.exec(String(f.source ?? ''))?.[1];
      const quote = flat(f.quote).replace(/^["']|["']$/g, '').replace(/\.{3}|…/g, '').trim();
      const passage = passages.find((p) => p.id === source);
      if (!passage || quote.length < 12 || !flat(passage.text).includes(quote)) continue;
      kept.push({ n: Number(n), url: passage.url, title: passage.title, claim: linkless(f.claim) });
    }
  }
  const cited = [];
  const number = (k) => {
    const at = cited.findIndex((c) => c.url === k.url);
    if (at >= 0) return at + 1;
    cited.push(k);
    return cited.length;
  };
  const sections = plan.questions.map((q, i) => {
    const mine = kept.filter((k) => k.n === i + 1);
    const lines = mine.length
      ? mine.map((k) => `- ${k.claim} [${number(k)}](${k.url})`)
      : ['- No saved page answers this.'];
    return `## ${linkless(q.question)}\n\n${lines.join('\n')}`;
  });
  const sources = cited.map((c, i) => `${i + 1}. [${linkless(c.title) || c.url}](${c.url})`);
  const written = [`# ${linkless(plan.topic)}`, ...sections, sources.length ? `## Sources\n\n${sources.join('\n')}` : '']
    .filter(Boolean)
    .join('\n\n');
  await tools.write({ root: 'workspace', path: `${dir}/report.md`, content: `${written}\n` });
  return { written, found, kept: kept.length };
}

/** Starts the helpers two at a time, each once its pages are read, and
 *  collects their findings, until every sub-question has its findings or
 *  the time of this call is spent. */
async function work(plan, all) {
  const working = () => plan.helpers.filter((h) => !(h.n in plan.findings));
  for (;;) {
    const open = working();
    if (open.length) {
      const states = (await tools.wait_agents({ ids: open.map((h) => h.id), timeout_s: 0 })).structured.helpers;
      for (const h of open) {
        const s = states.find((x) => x.id === h.id);
        if (!s || !/^(finished|ended|closed)/.test(String(s.state))) continue;
        plan.findings[h.n] = findingsOf(s.text);
        if (s.state !== 'closed') await tools.stop_agent({ agent_id: h.id });
      }
    }
    if (all.every((n) => n in plan.findings)) return;
    const started = new Set(plan.helpers.map((h) => h.n));
    const next = all.find((n) => !started.has(n) && !(n in plan.findings));
    if (next && working().length < AT_ONCE && left() > 4000) {
      const passages = await gather(plan, next);
      plan.passages[next] = passages;
      if (!passages.length) {
        plan.findings[next] = [];
        continue;
      }
      const q = plan.questions[next - 1];
      const task = [
        `Sub-question ${next}: ${q.question}`,
        `Write each claim in ${plan.language}.`,
        'Passages:',
        ...passages.map((p) => `[${p.id}] ${p.title} — ${p.url}\n${p.text}`),
      ].join('\n\n');
      const r = await tools.spawn_agent({ agent: 'researcher', title: q.title, task });
      plan.helpers.push({ n: next, id: r.structured.id, title: q.title });
      continue;
    }
    const still = working();
    if (!still.length || left() < 2000) return;
    await tools.wait_agents({ ids: still.map((h) => h.id), timeout_s: Math.max(1, Math.floor(left() / 1000) - 1) });
  }
}

const plan = await load(key);
if (!plan) {
  throw new Error(`No plan is saved for "${dir}". Copy the folder that plan.js printed, or call plan.js first.`);
}
const all = plan.questions.map((_, i) => i + 1);
if (plan.report) {
  text(plan.report);
} else if (plan.running && Date.now() - plan.running < 90000) {
  text(`The step before this one still runs. Next: call exec with these arguments:\n\n${call(step + 1)}`);
} else {
  plan.running = Date.now();
  await store(key, plan);
  try {
    await work(plan, all);
  } finally {
    plan.running = 0;
    await store(key, plan);
  }
  if (all.every((n) => n in plan.findings)) {
    const { written, found, kept } = await report(plan);
    plan.report = [
      `Every sub-question has its findings: ${kept} of ${found} have their quote on a page saved for the research, and the report keeps those.`,
      `Next: write your answer in ${plan.language}. Start with two or three sentences that answer the person's question from the report. Then copy the whole report below into your answer, word for word, with every link. The person sees only your answer: not this output, and not the workspace, so name no file.`,
      written,
    ].join('\n\n');
    await store(key, plan);
    text(plan.report);
  } else {
    const done = all.filter((n) => n in plan.findings).length;
    const busy = plan.helpers.filter((h) => !(h.n in plan.findings)).map((h) => `${h.n} (${h.title})`);
    text(
      [
        `${done} of ${all.length} sub-questions have their findings.${busy.length ? ` Helpers at work: ${busy.join(', ')}.` : ''}`,
        `Next: call exec with these arguments, and again with each call this program prints, until it prints the report:\n\n${call(step + 1)}`,
      ].join('\n\n'),
    );
  }
}
