const dir = String(args?.dir ?? '')
  .replace(/^[\\/]*workspace[\\/]+/, '')
  .replace(/[\\/]+$/, '');
const key = `research:${dir}`;
const AT_ONCE = 2;

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
const named = (helpers) =>
  `${helpers.length > 1 ? 'helpers' : 'helper'} ${helpers.map((h) => `${h.n} (${h.title})`).join(' and ')}`;
const again = JSON.stringify({ file: { root: "<this skill's root>", path: 'scripts/next.js' }, args: { dir }, yield_s: 30 });

async function report(plan) {
  const found = [];
  const problems = [];
  for (let n = 1; n <= plan.questions.length; n += 1) {
    let raw;
    try {
      raw = await readAll(`${dir}/findings-${n}.json`);
    } catch {
      continue;
    }
    try {
      const parsed = JSON.parse(raw.replace(/^\s*```\w*\s*|\s*```\s*$/g, ''));
      for (const f of (Array.isArray(parsed) ? parsed : parsed.findings) ?? []) found.push({ n, ...f });
    } catch {
      problems.push(`findings-${n}.json is not a JSON list.`);
    }
  }

  const pages = new Map();
  const page = async (source) => {
    if (!pages.has(source)) {
      try {
        const lines = (await readAll(`${dir}/pages/${source}.md`)).split('\n');
        pages.set(source, {
          title: lines[0].replace(/^#\s*/, ''),
          url: bare(lines[2]),
          text: flat(lines.slice(4).join('\n')),
        });
      } catch {
        pages.set(source, null);
      }
    }
    return pages.get(source);
  };
  const kept = [];
  for (const f of found) {
    const source = /(\d+-\d+)/.exec(String(f.source ?? ''))?.[1];
    const saved = source && (await page(source));
    const quote = flat(f.quote).replace(/^["']|["']$/g, '').replace(/\.{3}|…/g, '').trim();
    if (!saved || quote.length < 12 || !saved.text.includes(quote)) continue;
    kept.push({ n: f.n, url: saved.url, title: saved.title, claim: linkless(f.claim) });
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
  const path = `${dir}/report.md`;
  try {
    await tools.read({ root: 'workspace', path });
  } catch {}
  await tools.write({ root: 'workspace', path, content: `${written}\n` });
  text(
    [
      `Every helper has ended. Of ${found.length} findings, ${kept.length} have their quote on the page a helper saved; the report keeps those.`,
      ...problems,
      `Next: write your answer in ${plan.language}. Start with two or three sentences that answer the person's question from the report. Then copy the whole report below into your answer, word for word, with every link. The person sees only your answer: not this output, and not the workspace, so name no file.`,
      written,
    ].join('\n\n'),
  );
}

const plan = await load(key);
if (!plan) {
  throw new Error(`No plan is saved for "${dir}". Copy the folder that plan.js printed, or call plan.js first.`);
}
const states = plan.helpers.length
  ? (await tools.wait_agents({ ids: plan.helpers.map((h) => h.id), timeout_s: 0 })).structured.helpers
  : [];
const ended = (state) => /^(finished|ended|closed)/.test(String(state));
const working = plan.helpers.filter((h) => !ended(states.find((s) => s.id === h.id)?.state));
if (working.length) {
  text(
    `The ${named(working)} ${working.length > 1 ? 'are' : 'is'} still working. Next: call wait_agents with these arguments:\n\n${JSON.stringify({ ids: working.map((h) => h.id), timeout_s: 1800 })}\n\nThen call exec with these arguments again:\n\n${again}`,
  );
} else {
  for (const s of states) if (s.state !== 'closed') await tools.stop_agent({ agent_id: s.id });
  const started = new Set(plan.helpers.map((h) => h.n));
  const waiting = plan.questions.map((q, i) => ({ n: i + 1, ...q })).filter((q) => !started.has(q.n));
  if (waiting.length) {
    const now = [];
    for (const q of waiting.slice(0, AT_ONCE)) {
      const r = await tools.spawn_agent({
        agent: 'researcher',
        title: q.title,
        task: `Sub-question ${q.n}: ${q.question}\nFolder: ${dir}`,
      });
      now.push({ n: q.n, title: q.title, id: r.structured.id });
    }
    plan.helpers.push(...now);
    await store(key, plan);
    text(
      `Started ${named(now)}. Next: call wait_agents with these arguments:\n\n${JSON.stringify({ ids: now.map((h) => h.id), timeout_s: 1800 })}\n\nThen call exec with these arguments again:\n\n${again}`,
    );
  } else {
    await report(plan);
  }
}
