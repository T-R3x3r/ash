const { message, sources = [], language, topic, questions } = args ?? {};

if (!('browser_search' in tools && 'browser_read_pages' in tools)) {
  throw new Error(
    'Deep research searches and reads the web with the Browser app, which this conversation cannot use. Tell the person to install, update or switch on the Browser, and do not research without it.',
  );
}

const fail = (words) => {
  throw new Error(`${words} Fix it and call plan.js again.`);
};
const said = (value) => (typeof value === 'string' ? value.trim() : '');
if (!said(topic)) fail('"topic" names the topic in two or three words.');
if (!said(message)) fail('"message" holds the person\'s message, copied whole with every web address in it.');
if (!said(language)) fail('"language" names the language of the message, such as English.');
if (!Array.isArray(questions) || questions.length < 2 || questions.length > 5) {
  fail('"questions" lists 2 to 5 sub-questions.');
}
const plan = questions.map((q, i) => {
  if (!said(q?.question) || !said(q?.title)) {
    fail(`Sub-question ${i + 1} needs "title", two or three words, and "question".`);
  }
  return { title: said(q.title), question: said(q.question) };
});

const slug = said(topic)
  .toLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 40)
  .replace(/-+$/, '');
if (!slug) fail('"topic" holds no letters.');

const asked = said(message);
const words = new Set(asked.toLowerCase().split(/[^\p{L}\p{N}.:-]+/u));
const hostOf = (address) =>
  (/^(?:[a-z][a-z0-9+.-]*:\/\/)?([^/?#\s]+)/i.exec(address)?.[1] ?? '').toLowerCase().replace(/^www\./, '');
const named = (address) => {
  const host = hostOf(address);
  if (!host) return false;
  if (asked.toLowerCase().includes(host)) return true;
  return host
    .split('.')
    .slice(0, -1)
    .some((label) => label.length >= 4 && words.has(label));
};
const typed = [...asked.matchAll(/https?:\/\/[^\s<>()"'[\]]+/gi)].map((m) => m[0].replace(/[.,;:!?]+$/, ''));
const given = (Array.isArray(sources) ? sources : [])
  .map(said)
  .filter((s) => /^\S+[.:]\S+$/.test(s) && (!typed.length || named(s)));
const sites = [
  ...new Set([...typed, ...given].map((s) => (/^https?:\/\//i.test(s) ? s : `https://${s}`).replace(/\/+$/, ''))),
];

const exists = async (path) => {
  try {
    await tools.read({ root: 'workspace', path });
    return true;
  } catch {
    return false;
  }
};
const day = new Date().toISOString().slice(0, 10);
let dir = `research/${slug}-${day}`;
for (let i = 2; await exists(dir); i += 1) dir = `research/${slug}-${day}-${i}`;

const saved = { topic: said(topic), language: said(language), sources: sites, questions: plan };
await store(`research:${dir}`, { ...saved, helpers: [], findings: {}, passages: {}, failed: {} });

const card = { question: `${saved.topic}: ${plan.map((q, i) => `${i + 1}. ${q.question}`).join(' ')}`, choices: ['Start', 'Change'] };
const next = { file: { root: "<this skill's root>", path: 'scripts/next.js' }, args: { dir, step: 1 }, yield_s: 30 };
text(
  [
    `Saved the plan in ${dir}: ${plan.length} sub-questions, read ${sites.length ? `on ${sites.join(', ')} only` : 'on the web'}.`,
    `Next: call ask with these arguments, so that the person sees the plan:\n\n${JSON.stringify(card)}`,
    `On "Start", call exec with these arguments, and again with each call that program prints, until it prints the report:\n\n${JSON.stringify(next)}`,
    'On "Change" or any other answer, ask what to change when the answer does not say it, then call plan.js again with the changed sub-questions.',
  ].join('\n\n'),
);
