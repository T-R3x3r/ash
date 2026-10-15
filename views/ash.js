/**
 * Ash's page: its conversations and projects in a sidebar at the left, and
 * beside it the chat the shell draws in the page's `chat` slot. The sidebar
 * is drawn with the kit's `hs-*` classes and icons, reads and changes Ash's
 * conversations through the `sessions` extension, and keeps the open
 * projects, the unread marks and the folded sidebar in Ash's store. Its top
 * holds Ash's mark and name with the search and the press that folds it,
 * then a new conversation and a new project; the list below scrolls with
 * its bar over the right end of the rows. The search, open or folded,
 * opens in a panel over the middle of the page.
 *
 * The shell draws the chat over the page's `chat` slot, so while a menu, a
 * tip or a drag's label shows, the page covers the slot, and the shell lays
 * the chat under the page until it closes. The page's sheets open in a
 * modal over the page (`views/sheet.js`), which the shell draws over the
 * chat as well. Folded, the sidebar leaves a small bar floating over the
 * chat's top left corner, kept clear of the chat by a hole in the chat's
 * slot: a new conversation, the search and the press that shows the
 * sidebar again. On a wide page the sidebar slides
 * aside and the chat glides with it; below the wide width it opens over
 * the whole page in place of the chat.
 */
import {
  App,
  McpUiMessageResultSchema as Answer,
  PostMessageTransport,
} from '@modelcontextprotocol/ext-apps';

/** The narrowest page that shows the sidebar beside the chat. */
const WIDE = 640;
const DRAG_ARM_PX = 4;
/** How long a drag hovers a closed project before it springs open. */
const SPRING_MS = 600;
const EDGE_SCROLL_PX = 24;
/** Lists longer than this render only the rows the scroll shows. */
const WINDOWED = 60;
const OVERSCAN = 15;
/** The distance of a popup from its mark, and from the edges it stays in. */
const OFFSET = 6;
const PAD = 8;

const SHEET = `
html, body, .ash-root { height: 100%; overflow: hidden; }
.ash { position: relative; height: 100%; }
.ash-chat { flex: 1; min-width: 0; min-height: 0; }
.hs-app-surface > .hs-sidebar-column.ash-drawer { flex: 1; width: auto; border-right: none; }
.ash-head { flex: none; display: flex; align-items: center; gap: var(--space); height: calc(var(--space) * 9); margin-bottom: calc(var(--space) * 3); padding: 0 var(--pad-sidebar) 0 var(--space); }
.ash-brand { flex: 1; min-width: 0; display: flex; align-items: center; gap: calc(var(--space) * 2); color: var(--text); cursor: default; user-select: none; }
.ash-brand > .hs-lockup-word { top: 0; font-size: var(--fs-title); }
.ash-mark { display: block; flex: none; }
.ash-head > .hs-sidebar-rowact { width: calc(var(--space) * 7); height: calc(var(--space) * 7); }
.ash-actions { flex: none; display: flex; flex-direction: column; padding: 0 var(--pad-sidebar) calc(var(--space) * 3) 0; }
.ash-side { position: relative; flex: none; display: flex; width: var(--w-sidebar); overflow: hidden; transition: width var(--dur-slow) var(--ease-out); }
.ash-side[data-shown='false'] { width: 0; }
.ash-side::after { content: ''; position: absolute; top: 0; right: 0; bottom: 0; border-right: var(--bw) solid var(--line); pointer-events: none; }
.ash-side > .hs-sidebar-column { flex: none; transition: opacity var(--dur-slow) var(--ease-out); }
.ash-side[data-shown='false'] > .hs-sidebar-column { opacity: 0; transition-duration: var(--dur); }
.ash-probe { position: absolute; width: var(--w-sidebar); height: 0; visibility: hidden; }
.ash-float { position: absolute; top: var(--pad-sidebar); left: var(--pad-sidebar); display: flex; gap: var(--space); padding: var(--space); border: var(--bw) solid var(--tipline); border-radius: var(--r-card); background: var(--card); box-shadow: var(--shadow-pop); transition: opacity var(--dur) var(--ease-out); }
.ash-float[data-shown='false'] { opacity: 0; pointer-events: none; transition-duration: 0s; }
.ash-float > .hs-sidebar-rowact { width: calc(var(--space) * 7); height: calc(var(--space) * 7); border-radius: var(--r-ctl); }
.ash-finder { position: absolute; inset: 0; display: flex; justify-content: center; align-items: flex-start; padding-top: 12vh; background: var(--scrim-dialog); backdrop-filter: var(--blur-fan); }
.ash-finder-panel { display: flex; flex-direction: column; width: min(calc(var(--space) * 180), calc(100% - var(--space) * 8)); border: var(--bw) solid var(--tipline); border-radius: var(--r-card); background: var(--plate-menu); box-shadow: var(--gloss-edge), var(--shadow-pop); backdrop-filter: var(--blur-overlay); animation: hsPop var(--dur) var(--ease-out); }
.ash-finder-field { display: flex; align-items: center; gap: calc(var(--space) * 3); padding: calc(var(--space) * 3.5) calc(var(--space) * 3.5) calc(var(--space) * 3.5) calc(var(--space) * 4.5); color: var(--dim); }
.ash-finder-field > input { flex: 1; min-width: 0; border: 0; background: none; outline: none; font: inherit; font-size: var(--fs-title); color: var(--text); }
.ash-finder-field > input::-webkit-search-cancel-button { display: none; }
.ash-finder-esc { padding: calc(var(--space) * 1.5) calc(var(--space) * 2.5); border: var(--bw) solid var(--tipline); border-radius: var(--r-ctl); background: var(--hov); color: var(--mut); font: inherit; font-size: var(--fs-sm); cursor: pointer; }
.ash-finder-esc:hover { color: var(--text); }
.ash-finder-results { max-height: 50vh; padding: var(--space) calc(var(--space) * 2) calc(var(--space) * 2); border-top: var(--bw) solid var(--tipline); overflow-y: auto; overscroll-behavior: contain; }
.ash-name { flex: 1; min-width: 0; display: flex; align-items: center; gap: calc(var(--space) * 0.5); height: calc(var(--project-row-height) - 1px); padding: 0 var(--space); border: var(--bw) solid var(--tipline); box-sizing: border-box; }
.ash-name > .hs-project-create-mark { margin-left: 0; }
.ash-arrive { animation: hsPop var(--dur) var(--ease-out); }
.ash .hs-session-block { padding-left: 0; }
.ash-none { padding: calc(var(--space) * 2) calc(var(--space) * 2.5) calc(var(--space) * 2) calc(var(--space) * 7); font-size: var(--fs-sm); color: var(--mut); }
.ash-glyph { display: block; flex: none; width: 1em; height: 1em; line-height: 1; }
.ash-turning { display: grid; }
.hs-shell :is(.hs-hovbox, .hs-hovbox-ink):active .ash-glyph { transform: var(--press); opacity: var(--press-fade); }
`;

// ---------- The bridge ----------

const app = new App({ name: 'Ash', version: '6.2.0' }, {}, { autoResize: false });

/** One request of the host, its result whole. */
const call = (method, params = {}) => app.request({ method, params }, Answer);

/** A request whose failure changes nothing on the page. */
const quietly = (method, params) => call(method, params).catch(() => null);

// ---------- Elements ----------

const SVG = 'http://www.w3.org/2000/svg';

/** An element to draw: its tag, its attributes and handlers, its children. */
function h(tag, props, ...kids) {
  const out = [];
  for (const kid of kids.flat(Infinity)) {
    if (kid === null || kid === undefined || kid === false || kid === true || kid === '') continue;
    out.push(typeof kid === 'object' ? kid : { text: String(kid) });
  }
  return { tag, props: props ?? {}, kids: out };
}

/** The `mount` hooks of the elements the last draw made, run once they
 *  are in the page. */
let mounted = [];

const fits = (node, v) =>
  v.text !== undefined ? node.nodeType === 3 : node.nodeType === 1 && node.localName === v.tag;

function setProp(el, name, value) {
  if (name === 'key' || name === 'mount') return;
  if (name.startsWith('on')) el[name] = value ?? null;
  else if (value === undefined || value === null || value === false) el.removeAttribute(name);
  else el.setAttribute(name, value === true ? '' : String(value));
}

function create(v, svg) {
  if (v.text !== undefined) return document.createTextNode(v.text);
  const inSvg = svg || v.tag === 'svg';
  const el = inSvg ? document.createElementNS(SVG, v.tag) : document.createElement(v.tag);
  el.__props = {};
  update(el, v, inSvg);
  if (v.props.mount) mounted.push([el, v.props.mount]);
  return el;
}

function update(node, v, svg) {
  if (v.text !== undefined) {
    if (node.data !== v.text) node.data = v.text;
    return;
  }
  const inSvg = svg || v.tag === 'svg';
  const was = node.__props;
  for (const name of Object.keys(was)) if (!(name in v.props)) setProp(node, name, undefined);
  for (const [name, value] of Object.entries(v.props)) {
    if (was[name] !== value) setProp(node, name, value);
  }
  node.__props = v.props;
  node.__key = v.props.key;
  sync(node, v.kids, inSvg);
}

/** Makes a parent's children those drawn: an element with a key keeps its
 *  node wherever it moves, one without takes the node in its place. */
function sync(parent, kids, svg) {
  const keyed = new Map();
  for (const node of parent.childNodes) if (node.__key !== undefined) keyed.set(node.__key, node);
  let cursor = parent.firstChild;
  for (const v of kids) {
    const key = v.props?.key;
    let node = null;
    if (key !== undefined) {
      node = keyed.get(key) ?? null;
      keyed.delete(key);
      if (node && !fits(node, v)) node = null;
    } else if (cursor && cursor.__key === undefined && fits(cursor, v)) node = cursor;
    if (node) update(node, v, svg);
    else node = create(v, svg);
    if (node === cursor) cursor = cursor.nextSibling;
    else parent.insertBefore(node, cursor);
  }
  while (cursor) {
    const next = cursor.nextSibling;
    cursor.remove();
    cursor = next;
  }
}

const stop = (e) => e.stopPropagation();

/** What makes a drawn element a button named `label`, which the keyboard
 *  reaches and presses with Enter or Space. A key on a control inside it
 *  is that control's own. */
const pressable = (label) => ({
  role: 'button',
  tabindex: '0',
  'aria-label': label,
  onkeydown: (e) => {
    if (e.target !== e.currentTarget || (e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault();
    e.currentTarget.click();
  },
});

/** A Remix Icon of the kit, by its remixicon.com name. */
const glyph = (name, size) =>
  h('i', { class: `ri-${name} ash-glyph`, style: `font-size: ${size}px` });

/** One of Hearthscale's own marks of the kit: `side-wide` or
 *  `side-narrow`. */
const ownGlyph = (name, size) =>
  h('i', { class: `hs-icon hs-glyph-${name} ash-glyph`, style: `font-size: ${size}px` });

/** The centre and the top of each bar of Hearthscale's mark, as
 *  `icon.svg` draws them, on a base at 594 with bars 81 wide. */
const BARS = [
  [169, 391.5],
  [290.5, 297],
  [412, 230],
  [533.5, 297],
  [655, 391.5],
];

/** The bars of the mark as rounded boxes. */
const markBars = () =>
  BARS.map(([x, top]) =>
    h('rect', { x: x - 40.5, y: top - 40.5, width: 81, height: 675 - top, rx: 40.5 }),
  );

/** The soft core inside each bar. */
const markCores = () =>
  BARS.map(([x, top]) =>
    h('rect', { x: x - 20, y: top - 20, width: 40, height: 634 - top, rx: 20 }),
  );

/** Ash's mark, as `icon.svg` in the package draws it. */
const mark = (size) =>
  h(
    'svg',
    {
      class: 'ash-mark',
      width: size,
      height: size,
      viewBox: '102 102 620 620',
      'aria-hidden': 'true',
    },
    h(
      'defs',
      {},
      h(
        'linearGradient',
        { id: 'ash-ember', x1: 412, y1: 190, x2: 412, y2: 634, gradientUnits: 'userSpaceOnUse' },
        h('stop', { 'stop-color': '#ff7a2e' }),
        h('stop', { offset: 0.34, 'stop-color': '#e0401c' }),
        h('stop', { offset: 0.7, 'stop-color': '#a3200f' }),
        h('stop', { offset: 1, 'stop-color': '#5a150b' }),
      ),
      h(
        'linearGradient',
        { id: 'ash-core', x1: 412, y1: 190, x2: 412, y2: 634, gradientUnits: 'userSpaceOnUse' },
        h('stop', { 'stop-color': '#ffd27a' }),
        h('stop', { offset: 0.3, 'stop-color': '#ffa24a', 'stop-opacity': 0.85 }),
        h('stop', { offset: 0.65, 'stop-color': '#ff6a2a', 'stop-opacity': 0.35 }),
        h('stop', { offset: 0.95, 'stop-color': '#e0401c', 'stop-opacity': 0 }),
      ),
      h(
        'filter',
        { id: 'ash-glow', x: '-30%', y: '-30%', width: '160%', height: '160%' },
        h('feGaussianBlur', { stdDeviation: 22 }),
      ),
      h(
        'filter',
        { id: 'ash-soft', x: '-60%', y: '-30%', width: '220%', height: '160%' },
        h('feGaussianBlur', { stdDeviation: 18 }),
      ),
      h('clipPath', { id: 'ash-bars' }, markBars()),
    ),
    h('g', { fill: '#ff4a1a', opacity: 0.2, filter: 'url(#ash-glow)' }, markBars()),
    h('g', { fill: 'url(#ash-ember)' }, markBars()),
    h(
      'g',
      { 'clip-path': 'url(#ash-bars)' },
      h('g', { fill: 'url(#ash-core)', opacity: 0.7, filter: 'url(#ash-soft)' }, markCores()),
    ),
  );

/** A project folder, open or closed, drawn in outline when it holds no
 *  conversation. */
const folder = (open, empty, size) =>
  glyph(`folder-${open ? 'open-' : ''}${empty ? 'line' : 'fill'}`, size);

/** The mark in front of a conversation: an empty ring at rest, a turning
 *  arc on the ring while a turn runs, a filled dot when a turn finished
 *  unseen, a dot in the warning colour while a request waits for the
 *  person. While a turn runs the whole mark turns in a box of its own:
 *  the compositor turns an HTML box, where a shape inside the SVG would
 *  draw the page again on every frame. */
function statusMark(status) {
  const ring = { cx: 7, cy: 7, r: 2.6 };
  const glyph = h(
    'svg',
    { class: 'hs-glyph', width: 14, height: 14, viewBox: '0 0 14 14' },
    (status === 'rest' || status === 'working') &&
      h('circle', { ...ring, fill: 'none', stroke: 'var(--capt)', 'stroke-width': 1.1 }),
    status === 'working' &&
      h('circle', {
        ...ring,
        fill: 'none',
        stroke: 'var(--mut)',
        'stroke-width': 1.1,
        'stroke-dasharray': '3.7 12.6',
        'stroke-linecap': 'round',
      }),
    status === 'unread' && h('circle', { ...ring, fill: 'var(--text)' }),
    status === 'waiting' && h('circle', { ...ring, fill: 'var(--warn)' }),
  );
  return status === 'working' ? h('span', { class: 'ash-turning hs-spin' }, glyph) : glyph;
}

// ---------- State ----------

const state = {
  /** Ash's conversations that no helper call started. */
  sessions: [],
  /** The helpers of the open conversation's family. */
  helpers: [],
  projects: [],
  /** The conversation the chat shows; null for a new one, made in
   *  `project` by its first message. */
  open: null,
  project: null,
  /** The conversation whose helpers the sidebar lists. */
  family: null,
  openProjects: {},
  unread: new Set(),
  /** Whether the sidebar shows beside the chat on a wide page. */
  shown: true,
  /** Whether the sidebar covers a narrow page. */
  drawer: false,
  wide: innerWidth >= WIDE,
  /** The selected rows; the open conversation is among them. */
  selected: new Set(),
  anchor: null,
  /** The open menu: what it lists, what it acts on, the mark it opened
   *  from, and, once it is drawn, the call that stops its watch of the
   *  pointer. */
  menu: null,
  /** The mark whose tip shows. */
  tip: null,
  /** The project that opened since the last draw, whose rows come in. */
  arriving: null,
  /** What the search panel holds while it is open; null while it is
   *  closed. */
  finding: null,
  /** Whether the sidebar is sliding aside or back; the folded bar and its
   *  hole in the chat wait for the slide's end. */
  sliding: false,
  renaming: null,
  renamingProject: null,
  creatingProject: false,
  drag: null,
  heights: { session: 0, subagent: 0, project: 0 },
  scrollY: 0,
};

/** The turn each conversation last finished, for the unread marks. */
const finished = new Map();

const byRank = (a, b) => Number(b.pinned) - Number(a.pinned) || b.rank - a.rank;

const known = (id) =>
  state.sessions.find((s) => s.id === id) ?? state.helpers.find((s) => s.id === id);

// ---------- Drawing ----------

const root = document.createElement('div');
root.className = 'ash-root';
let queued = false;

/** Draws the page again at the end of the current task. */
function render() {
  if (queued) return;
  queued = true;
  queueMicrotask(() => {
    queued = false;
    draw();
  });
}

function draw() {
  mounted = [];
  // A row that moves in the list is taken out and put back, which drops
  // the focus it holds; it takes the focus again where it lands.
  const focused = document.activeElement;
  sync(root, [page()], false);
  if (focused !== document.activeElement && focused?.isConnected && root.contains(focused)) {
    focused.focus();
  }
  for (const [el, hook] of mounted) hook(el);
  state.arriving = null;
  measureRows();
  placePopups();
  coverSlots();
  reportSlots();
}

/** What the page shows: the sidebar beside the chat, the sidebar folded
 *  into the bar over the chat, or the sidebar over the whole page. */
function layout() {
  if (state.wide) return state.shown ? 'side' : 'folded';
  return state.drawer ? 'drawer' : 'folded';
}

function page() {
  tipTexts.clear();
  const shape = layout();
  return h(
    'div',
    { class: 'hs-app-surface ash', 'data-shape': shape, onclick: () => closeMenu() },
    state.wide ? side() : shape === 'drawer' && column(true),
    shape !== 'drawer' && h('main', { key: 'chat', class: 'ash-chat' }),
    shape !== 'drawer' && folded(shape === 'folded'),
    finder(),
    menuView(),
    tipView(),
    state.drag &&
      h(
        'div',
        {
          key: 'drag',
          class: 'hs-sidebar-drag',
          style: `left: ${state.drag.x + 12}px; top: ${state.drag.y + 12}px`,
        },
        state.drag.label,
      ),
  );
}

/** The words of each mark's tip and the side of the mark it shows on, as
 *  the draw under way gives them. */
const tipTexts = new Map();

/** The hover wiring of a mark's tip, which shows below the mark, or at its
 *  right for a mark in a column of marks. */
const tipOn = (key, text, side = 'below') => {
  tipTexts.set(key, { text, side });
  return {
    'data-tip': key,
    onmouseenter: () => {
      state.tip = { key };
      render();
    },
    onmouseleave: () => {
      if (state.tip?.key !== key) return;
      state.tip = null;
      render();
    },
  };
};

/** A control of the sidebar's own: the rows' action, always shown. */
const control = (label, props, child) =>
  h(
    'span',
    {
      ...pressable(label),
      ...props,
      class: `hs-hovink hs-inkmut hs-sidebar-rowact ${props.class ?? ''}`,
    },
    child,
  );

/** The sidebar of a wide page: the column, fading as the side takes its
 *  width or gives it up, and the width it takes, for the report of the
 *  chat's place. */
function side() {
  const shown = state.shown;
  return h(
    'div',
    { key: 'side', class: 'ash-side', 'data-shown': shown ? 'true' : 'false' },
    h('div', { key: 'probe', class: 'ash-probe' }),
    column(false, !shown),
  );
}

/** The bar a folded sidebar leaves over the chat's top left corner: a new
 *  conversation, the search and the press that shows the sidebar again;
 *  out of reach while the sidebar shows, and while it slides aside, so the
 *  bar comes in with its hole once the chat has settled. */
function folded(away) {
  const shown = away && !state.sliding;
  return h(
    'div',
    { key: 'float', class: 'ash-float', 'data-shown': shown ? 'true' : 'false', inert: !shown },
    control(
      'New conversation',
      {
        onclick: (e) => {
          e.stopPropagation();
          newSession(null);
        },
        ...tipOn('new:float', 'New conversation'),
      },
      glyph('edit-box-line', 18),
    ),
    searchControl('float'),
    control(
      'Show sidebar',
      {
        onclick: (e) => {
          e.stopPropagation();
          toggle();
        },
        ...tipOn('toggle:float', 'Show sidebar'),
      },
      ownGlyph('side-wide', 20),
    ),
  );
}

/** The search, in a panel over the middle of the page: the field, and the
 *  conversations whose title or first message holds its words. A press on
 *  a conversation opens it; Escape, Esc or a press beside the panel closes
 *  it. */
function finder() {
  if (state.finding === null) return null;
  const words = state.finding.trim().toLowerCase();
  const hits = words ? matching(words) : [];
  const close = () => {
    state.finding = null;
    render();
  };
  return h(
    'div',
    { key: 'finder', class: 'ash-finder', 'data-popup': 'finder', onclick: close },
    h(
      'div',
      {
        class: 'ash-finder-panel',
        role: 'dialog',
        'aria-label': 'Search conversations',
        onclick: stop,
      },
      h(
        'div',
        { class: 'ash-finder-field' },
        glyph('search-line', 18),
        h('input', {
          type: 'search',
          'aria-label': 'Search conversations',
          placeholder: 'Search',
          mount: (el) => el.focus(),
          oninput: (e) => {
            state.finding = e.currentTarget.value;
            render();
          },
          onkeydown: (e) => {
            if (e.key === 'Escape') {
              e.stopPropagation();
              close();
            } else if (e.key === 'Enter' && hits[0]) find(hits[0].id);
          },
        }),
        h('button', { type: 'button', class: 'ash-finder-esc', onclick: close }, 'Esc'),
      ),
      words &&
        h(
          'div',
          { class: 'ash-finder-results' },
          hits.length === 0
            ? h('div', { class: 'ash-none' }, 'No conversation matches')
            : hits.map((s) =>
                h(
                  'div',
                  { key: s.id, class: 'hs-session-slot' },
                  h(
                    'div',
                    {
                      class: 'hs-sessrow hs-hovbox-ink hs-inkmut hs-session-row',
                      ...pressable(s.title),
                      onclick: () => find(s.id),
                    },
                    h('span', { class: 'hs-session-mark' }, statusMark(statusOf(s))),
                    h('span', { class: 'hs-session-label' }, s.title),
                  ),
                ),
              ),
        ),
    ),
  );
}

/** Opens a conversation the search found, and closes the search. */
function find(id) {
  state.finding = null;
  selectOnly(id);
  show(id);
}

/** The conversations whose title or first message holds the words. */
const matching = (words) =>
  state.sessions
    .filter((s) => s.title.toLowerCase().includes(words) || s.preview.toLowerCase().includes(words))
    .sort(byRank);

/** The press that opens the search panel; `where` names the place of its
 *  tip. */
function searchControl(where) {
  return control(
    'Search conversations',
    {
      onclick: (e) => {
        e.stopPropagation();
        state.tip = null;
        state.finding = '';
        render();
      },
      ...tipOn(`search:${where}`, 'Search conversations'),
    },
    glyph('search-line', 18),
  );
}

/** A row of the sidebar's top that starts something: its mark and its
 *  name, in the place and the ink of a conversation's row. */
function actionRow(label, icon, onClick) {
  return h(
    'div',
    { class: 'hs-session-slot' },
    h(
      'div',
      {
        class: 'hs-sessrow hs-hovbox-ink hs-inkmut hs-session-row',
        ...pressable(label),
        onclick: (e) => {
          e.stopPropagation();
          onClick();
        },
      },
      h('span', { class: 'hs-session-mark' }, glyph(icon, 16)),
      h('span', { class: 'hs-session-label' }, label),
    ),
  );
}

/** The sidebar's top: Ash's mark and name, with the search and the press
 *  that folds the sidebar at its right, and below them a new conversation
 *  and a new project. */
function top() {
  return [
    h(
      'div',
      { key: 'head', class: 'ash-head' },
      h('span', { class: 'ash-brand' }, mark(28), h('span', { class: 'hs-lockup-word' }, 'Ash')),
      searchControl('head'),
      control(
        'Hide sidebar',
        {
          onclick: (e) => {
            e.stopPropagation();
            toggle();
          },
          ...tipOn('toggle:head', 'Hide sidebar'),
        },
        ownGlyph('side-narrow', 20),
      ),
    ),
    h(
      'div',
      { key: 'actions', class: 'ash-actions' },
      actionRow('New conversation', 'edit-box-line', () => newSession(null)),
      actionRow('New project', 'folder-add-line', () => {
        state.creatingProject = true;
        render();
      }),
    ),
  ];
}

function rowAction({ label, tight, open, onClick }, child) {
  return h(
    'span',
    {
      ...pressable(label),
      class: 'hs-rowact hs-hovink hs-inkmut hs-sidebar-rowact',
      'data-open': open ? 'true' : 'false',
      'data-tight': tight ? 'true' : undefined,
      onmousedown: stop,
      onclick: (e) => {
        e.stopPropagation();
        onClick(e);
      },
    },
    child,
  );
}

/** An in-place name field: Enter commits, Escape discards, leaving it
 *  commits a name and discards an empty one. A project's name is bold. */
function nameField({ key, initial, placeholder, bold, commit, cancel }) {
  const end = (el) => {
    const value = el.value.trim();
    if (value) commit(value);
    else cancel();
  };
  return h('input', {
    key,
    class: 'hs-in hs-sidebar-name',
    'data-bold': bold ? 'true' : undefined,
    placeholder,
    mount: (el) => {
      el.value = initial;
      el.focus();
      el.select();
    },
    onmousedown: stop,
    onclick: stop,
    onkeydown: (e) => {
      if (e.key === 'Enter') end(e.currentTarget);
      else if (e.key === 'Escape') cancel();
    },
    onblur: (e) => end(e.currentTarget),
  });
}

/** The rows of the list: the projects, each open one followed by its
 *  conversations, then the loose conversations, and under each
 *  conversation of the open family its helpers. */
function rowsOf() {
  const rows = [];
  if (state.creatingProject) rows.push({ kind: 'new-project' });
  const push = (session, list) => {
    rows.push({ kind: 'session', session, list });
    for (const helper of state.helpers.filter((x) => x.spawnedBy === session.id).sort(byRank)) {
      rows.push({ kind: 'helper', session: helper, list });
    }
  };
  for (const project of state.projects) {
    const members = state.sessions.filter((s) => s.project === project.id).sort(byRank);
    const open = state.openProjects[project.id] ?? false;
    rows.push({ kind: 'project', project, open, count: members.length });
    if (open) for (const session of members) push(session, project.id);
  }
  const filed = new Set(state.projects.map((p) => p.id));
  for (const session of state.sessions
    .filter((s) => !(s.project && filed.has(s.project)))
    .sort(byRank)) {
    push(session, null);
  }
  return rows;
}

const heightOf = (row) =>
  row.kind === 'session'
    ? state.heights.session
    : row.kind === 'helper'
      ? state.heights.subagent
      : state.heights.project;

const sessionOrder = (rows) => rows.flatMap((r) => (r.kind === 'session' ? [r.session.id] : []));

/** The rows a long list renders: those the scroll shows, with room for
 *  the rest, from a prefix sum over the rows' heights. */
function windowOf(rows) {
  const tops = [0];
  for (const row of rows) tops.push(tops[tops.length - 1] + heightOf(row));
  const total = tops[tops.length - 1];
  const scroller = root.querySelector('.hs-sidebar-scroll');
  const block = root.querySelector('.hs-session-block');
  if (!scroller || !block || rows.length <= WINDOWED)
    return { start: 0, end: rows.length, tops, total };
  const offset =
    block.getBoundingClientRect().top - scroller.getBoundingClientRect().top + state.scrollY;
  const from = state.scrollY - offset;
  const to = from + scroller.clientHeight;
  let start = 0;
  while (start < rows.length && tops[start + 1] < from) start++;
  let end = start;
  while (end < rows.length && tops[end] < to) end++;
  return {
    start: Math.max(0, start - OVERSCAN),
    end: Math.min(rows.length, end + OVERSCAN),
    tops,
    total,
  };
}

function statusOf(session) {
  const asks = (s) => s.status === 'requires_action';
  if (asks(session) || state.helpers.some((x) => x.spawnedBy === session.id && asks(x)))
    return 'waiting';
  if (session.status === 'running') return 'working';
  if (state.unread.has(session.id)) return 'unread';
  return 'rest';
}

function sessionRow(s, list, order) {
  const open = state.open === s.id;
  const picked = state.selected.size > 1 && state.selected.has(s.id);
  const menuOpen = state.menu?.key === 'session' && state.menu.target === s.id;
  const over = state.drag?.over;
  const ins = over?.rowId === s.id ? over.ins : undefined;
  const renaming = state.renaming === s.id;
  return h(
    'div',
    { key: s.id, class: `hs-session-slot${arrives(list)}` },
    h(
      'div',
      {
        class: `hs-sessrow hs-hovbox-ink hs-inkmut hs-session-row${open || picked || menuOpen ? ' hs-boxsel' : ''}`,
        'data-drop': `row:${s.id}`,
        'data-ins': ins,
        'data-filed': list ? 'true' : undefined,
        'data-dragged': state.drag?.ids.includes(s.id) ? 'true' : undefined,
        ...pressable(s.title),
        onmousedown: (e) => pressRow(e, s.id),
        onclick: (e) =>
          clickSession(s.id, { shift: e.shiftKey, ctrl: e.ctrlKey || e.metaKey }, order),
      },
      h('span', { class: 'hs-session-mark' }, statusMark(statusOf(s))),
      renaming
        ? nameField({
            key: 'rename',
            initial: s.title,
            commit: (title) => rename(s.id, title),
            cancel: () => {
              state.renaming = null;
              render();
            },
          })
        : h('span', { class: 'hs-stitle hs-session-label' }, s.title),
      // Keyed, so the pin mark coming or going keeps the actions' nodes and
      // the focus one of them holds.
      s.pinned &&
        !renaming &&
        h('span', { key: 'pin', class: 'hs-pinned hs-sidebar-pin' }, glyph('pushpin-2-fill', 12)),
      h(
        'span',
        {
          key: 'actions',
          class: 'hs-rowact hs-session-actions',
          'data-open': menuOpen ? 'true' : 'false',
        },
        h(
          'span',
          {
            ...pressable(s.pinned ? 'Unpin' : 'Pin'),
            class: `hs-hovink ${s.pinned ? 'hs-inktext' : 'hs-inkmut'} hs-session-pin-action`,
            onmousedown: stop,
            onclick: (e) => {
              e.stopPropagation();
              void quietly('hearthscale/sessions/update', { id: s.id, pinned: !s.pinned });
            },
            ...tipOn(`pin:${s.id}`, s.pinned ? 'Unpin' : 'Pin'),
          },
          glyph('pushpin-2-fill', 15),
        ),
        h(
          'span',
          {
            ...pressable('More'),
            class: 'hs-hovink hs-inkmut hs-session-menu-action',
            onmousedown: stop,
            onclick: (e) => {
              e.stopPropagation();
              openMenu('session', s.id, e);
            },
          },
          glyph('more-fill', 16),
        ),
      ),
    ),
  );
}

/** The class of a row of the project that just opened, which comes in. */
const arrives = (list) => (list !== null && list === state.arriving ? ' ash-arrive' : '');

/** A helper of the open family: its status, its title and the helper
 *  mark. It opens like any other conversation, because it is one. */
function helperRow(s, list) {
  return h(
    'div',
    { key: s.id, class: `hs-subagent-slot${arrives(list)}` },
    h(
      'div',
      {
        class: `hs-sessrow hs-hovbox-ink hs-inkmut hs-session-row${state.open === s.id ? ' hs-boxsel' : ''}`,
        'data-child': 'true',
        'data-filed': list ? 'true' : undefined,
        ...pressable(s.title),
        onclick: () => clickSession(s.id, { shift: false, ctrl: false }, [s.id]),
      },
      h('span', { class: 'hs-session-mark' }, statusMark(statusOf(s))),
      h('span', { class: 'hs-stitle hs-session-label' }, s.title),
      h(
        'span',
        { class: 'hs-helper-mark', ...tipOn(`helper:${s.id}`, s.agentName) },
        glyph('robot-2-line', 14),
      ),
    ),
  );
}

function projectRow({ project, open, count }) {
  const menuOpen = state.menu?.key === 'project' && state.menu.target === project.id;
  const over = state.drag?.over?.key === `project:${project.id}`;
  return h(
    'div',
    { key: `project:${project.id}`, class: 'hs-project-slot' },
    h(
      'div',
      {
        class: `hs-projrow hs-hovbox-ink hs-inkmut hs-project-row${menuOpen || over ? ' hs-boxsel' : ''}`,
        'data-drop': `project:${project.id}`,
        'data-over': over ? 'true' : undefined,
        ...pressable(project.name),
        'aria-expanded': open ? 'true' : 'false',
        onclick: () => clickProject(project.id),
      },
      h('span', { class: 'hs-project-mark' }, folder(open, count === 0, 16)),
      state.renamingProject === project.id
        ? nameField({
            key: 'rename',
            bold: true,
            initial: project.name,
            commit: (name) => renameProject(project.id, name),
            cancel: () => {
              state.renamingProject = null;
              render();
            },
          })
        : h(
            'span',
            { class: 'hs-stitle hs-session-label' },
            project.name,
            !open && count > 0 && h('span', { class: 'hs-project-count' }, count),
          ),
      h(
        'span',
        { class: 'hs-rowact hs-session-actions', 'data-open': menuOpen ? 'true' : 'false' },
        rowAction(
          { label: 'More', onClick: (e) => openMenu('project', project.id, e) },
          glyph('more-fill', 16),
        ),
        rowAction(
          { label: 'New conversation', tight: true, onClick: () => newSession(project.id) },
          h('span', { class: 'hs-sidebar-plus' }, glyph('add-fill', 16)),
        ),
      ),
    ),
  );
}

/** The row a new project is named in: the name in a glass field. */
const newProjectRow = () =>
  h(
    'div',
    { key: 'new-project', class: 'hs-project-slot' },
    h(
      'label',
      { class: 'hs-url ash-name ash-arrive' },
      h('span', { class: 'hs-project-create-mark' }, folder(false, true, 16)),
      nameField({
        key: 'name',
        bold: true,
        initial: '',
        placeholder: 'Project name',
        commit: createProject,
        cancel: () => {
          state.creatingProject = false;
          render();
        },
      }),
    ),
  );

/** The bar under the list while more than one row is selected: the count
 *  and what the selection can do. */
function selectionBar(count) {
  const action = (label, onClick, danger) =>
    h(
      'span',
      {
        ...pressable(label),
        class: `hs-hovink ${danger ? 'hs-inkbad' : 'hs-inkmut'} hs-selection-action`,
        onmousedown: stop,
        onclick: (e) => {
          e.stopPropagation();
          onClick(e);
        },
      },
      label,
    );
  return h(
    'div',
    { key: 'bar', class: 'hs-selection-bar ash-arrive' },
    h('span', { class: 'hs-selection-count' }, `${count} selected`),
    state.projects.length > 0 && action('Move to', (e) => openMenu('move', null, e)),
    action('Archive', archiveSelection),
    action('Delete', () => openDialog({ kind: 'delete', ids: selectedIds() }), true),
  );
}

/** The sidebar's column; out of reach while the side is folded. */
function column(drawer, hidden = false) {
  const rows = rowsOf();
  rowsNow = rows;
  const order = sessionOrder(rows);
  const picked = order.filter((id) => state.selected.has(id)).length;
  const { start, end, tops, total } = windowOf(rows);
  return h(
    'div',
    { key: 'column', class: `hs-sidebar-column${drawer ? ' ash-drawer' : ''}`, inert: hidden },
    top(),
    h(
      'div',
      { key: 'metrics', class: 'hs-sidebar-metrics', 'aria-hidden': 'true' },
      h('div', { class: 'hs-session-slot' }),
      h('div', { class: 'hs-subagent-slot' }),
      h('div', { class: 'hs-project-slot' }),
    ),
    h(
      'div',
      {
        key: 'list',
        class: 'hs-overlay-scroll',
        mount: (el) => overlayThumb(el.firstElementChild, el.lastElementChild),
      },
      h(
        'div',
        {
          class: 'hs-scroll hs-sidebar-scroll',
          onscroll: onListScroll,
          mount: (el) => {
            state.scrollY = 0;
            el.addEventListener('mousedown', () => (dropped = false), true);
            el.addEventListener('click', (e) => dropped && e.stopPropagation(), true);
          },
        },
        h(
          'div',
          { class: 'hs-session-block' },
          start > 0 &&
            h('div', {
              key: 'above',
              class: 'hs-sidebar-spacer',
              style: `height: ${tops[start]}px`,
            }),
          rows
            .slice(start, end)
            .map((row) =>
              row.kind === 'session'
                ? sessionRow(row.session, row.list, order)
                : row.kind === 'helper'
                  ? helperRow(row.session, row.list)
                  : row.kind === 'project'
                    ? projectRow(row)
                    : newProjectRow(),
            ),
          end < rows.length &&
            h('div', {
              key: 'below',
              class: 'hs-sidebar-spacer',
              style: `height: ${total - tops[end]}px`,
            }),
          picked > 1 && selectionBar(picked),
        ),
      ),
      h('div', { class: 'hs-overlay-thumb', 'aria-hidden': 'true' }),
    ),
  );
}

/**
 * Keeps the list's thumb on its scroll, as the kit's `OverlayScroll` does:
 * as long as the share of the rows in sight, where the scroll stands, and
 * over the right end of the rows, inside the list's right padding. The
 * thumb's margin is its inset from the list's edges. A drag on the thumb
 * scrolls the list, and so does a wheel over it.
 */
function overlayThumb(scroller, thumb) {
  let inset = 0;
  let least = 0;
  let track = 0;
  let length = 0;
  const measure = () => {
    const style = getComputedStyle(thumb);
    inset = parseFloat(style.marginTop);
    least = parseFloat(style.minHeight);
    thumb.style.right = getComputedStyle(scroller).paddingRight;
  };
  const place = () => {
    const { scrollTop, scrollHeight, clientHeight } = scroller;
    const room = scrollHeight - clientHeight;
    thumb.dataset.shown = room > 0 ? 'true' : 'false';
    if (room <= 0) return;
    track = clientHeight - 2 * inset;
    length = Math.max(least, (track * clientHeight) / scrollHeight);
    thumb.style.height = `${length}px`;
    thumb.style.transform = `translateY(${((track - length) * scrollTop) / room}px)`;
  };
  const resized = () => {
    measure();
    place();
  };
  let drag = null;
  thumb.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    thumb.setPointerCapture(e.pointerId);
    drag = { pointer: e.pointerId, y: e.clientY, top: scroller.scrollTop };
    thumb.dataset.drag = 'true';
  });
  thumb.addEventListener('pointermove', (e) => {
    if (drag?.pointer !== e.pointerId || track <= length) return;
    const room = scroller.scrollHeight - scroller.clientHeight;
    scroller.scrollTop = drag.top + ((e.clientY - drag.y) * room) / (track - length);
  });
  const release = (e) => {
    if (drag?.pointer !== e.pointerId) return;
    drag = null;
    delete thumb.dataset.drag;
  };
  thumb.addEventListener('pointerup', release);
  thumb.addEventListener('pointercancel', release);
  thumb.addEventListener('wheel', (e) => scroller.scrollBy({ top: e.deltaY }), { passive: true });
  // A press on the thumb leaves the open menu open, as one on a native
  // scrollbar does.
  thumb.addEventListener('click', stop);
  resized();
  new ResizeObserver(resized).observe(scroller);
  new MutationObserver(place).observe(scroller, { childList: true, subtree: true });
  scroller.addEventListener('scroll', place, { passive: true });
}

/** The rows the last draw listed, which a drag reads. */
let rowsNow = [];

function measureRows() {
  const metrics = root.querySelector('.hs-sidebar-metrics');
  if (!metrics) return;
  const [session, subagent, project] = [...metrics.children].map(
    (el) => el.getBoundingClientRect().height,
  );
  const now = state.heights;
  if (now.session === session && now.subagent === subagent && now.project === project) return;
  state.heights = { session, subagent, project };
  render();
}

function onListScroll(e) {
  if (rowsNow.length <= WINDOWED) return;
  const top = e.currentTarget.scrollTop;
  requestAnimationFrame(() => {
    if (state.scrollY === top) return;
    state.scrollY = top;
    render();
  });
}

// ---------- Menus, tips and sheets ----------

function item({ icon, label, danger, onClick }) {
  return h(
    'div',
    {
      role: 'menuitem',
      tabindex: '-1',
      class: `hs-mitem hs-menu-item-row ${danger ? 'hs-inkbad hs-hovbox' : 'hs-inkmut hs-hovbox-ink'}`,
      'data-sel': 'false',
      'data-disabled': 'false',
      onclick: () => {
        closeMenu();
        onClick();
      },
      onkeydown: menuKey,
    },
    icon,
    h('span', { class: 'hs-menu-label' }, h('span', { class: 'hs-menu-title' }, label)),
  );
}

const divider = () => h('div', { class: 'hs-menu-divider' });

/** A key on a menu item: Enter or Space chooses it, and the arrows move the
 *  focus to the item below or above, round the ends. */
function menuKey(e) {
  const here = e.currentTarget;
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    here.click();
  } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    const items = [...here.parentElement.querySelectorAll('[role="menuitem"]')];
    const step = e.key === 'ArrowDown' ? 1 : -1;
    items[(items.indexOf(here) + step + items.length) % items.length].focus();
  }
}

function sessionMenu(id) {
  const s = known(id);
  if (!s) return null;
  const choices = state.projects.filter((p) => p.id !== s.project);
  return [
    item({
      icon: glyph('edit-2-fill', 14),
      label: 'Rename',
      onClick: () => {
        state.renaming = id;
        render();
      },
    }),
    item({
      icon: glyph('archive-fill', 14),
      label: 'Archive',
      onClick: () => void quietly('hearthscale/sessions/update', { id, archived: true }),
    }),
    item({
      icon: glyph('pushpin-2-fill', 14),
      label: s.pinned ? 'Unpin' : 'Pin',
      onClick: () => void quietly('hearthscale/sessions/update', { id, pinned: !s.pinned }),
    }),
    item({ icon: glyph('git-fork-line', 14), label: 'Fork', onClick: () => void fork(id) }),
    (choices.length > 0 || s.project) && [
      divider(),
      choices.map((p) =>
        item({
          icon: folder(false, false, 14),
          label: `Move to ${p.name}`,
          onClick: () => void quietly('hearthscale/sessions/update', { id, project: p.id }),
        }),
      ),
      s.project &&
        item({
          icon: glyph('folder-line', 14),
          label: 'Remove from project',
          onClick: () => void quietly('hearthscale/sessions/update', { id, project: null }),
        }),
    ],
    divider(),
    item({
      icon: glyph('delete-bin-fill', 14),
      label: 'Delete',
      danger: true,
      onClick: () => openDialog({ kind: 'delete', ids: [id] }),
    }),
  ];
}

function projectMenu(id) {
  const project = state.projects.find((p) => p.id === id);
  if (!project) return null;
  return [
    item({
      icon: glyph('edit-2-fill', 14),
      label: 'Rename',
      onClick: () => {
        state.renamingProject = id;
        render();
      },
    }),
    item({
      icon: glyph('file-fill', 14),
      label: 'Instructions',
      onClick: () =>
        openDialog({
          kind: 'instructions',
          id,
          name: project.name,
          text: project.instructions,
        }),
    }),
    item({
      icon: glyph('folder-line', 14),
      label: 'Open folder',
      onClick: () => void quietly('openai/files/open', { path: project.folder }),
    }),
    divider(),
    item({
      icon: glyph('delete-bin-fill', 14),
      label: 'Delete project',
      danger: true,
      onClick: () => openDialog({ kind: 'delete-project', id, name: project.name }),
    }),
  ];
}

const moveMenu = () => [
  state.projects.map((p) =>
    item({ icon: folder(false, false, 14), label: p.name, onClick: () => moveSelection(p.id) }),
  ),
  divider(),
  item({ icon: glyph('folder-line', 14), label: 'No project', onClick: () => moveSelection(null) }),
];

/** Each menu's items and its least width. */
const MENUS = {
  session: [sessionMenu, 170],
  project: [projectMenu, 180],
  move: [moveMenu, 180],
};

const within = (b, p) => p.x >= b.left && p.x <= b.right && p.y >= b.top && p.y <= b.bottom;

/** Whether `p` lies in the triangle `a`, `b`, `c`, its edges included. */
function inTriangle(p, a, b, c) {
  const side = (u, v) => (p.x - v.x) * (u.y - v.y) - (u.x - v.x) * (p.y - v.y);
  const d1 = side(a, b);
  const d2 = side(b, c);
  const d3 = side(c, a);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
}

/** How far behind the point where the pointer left the trigger, away from
 *  the popup, the triangle starts. The page reads that point a whole move
 *  past the edge and in whole pixels, so a triangle with its tip right
 *  there would miss the next move on the way. */
const BEHIND = 4;

/** Whether `p` lies on the way from `trigger` to `popup`: the band
 *  straight between them, or the triangle from `from`, where the pointer
 *  left the trigger, to the popup's edge that faces the trigger. A popup
 *  that overlaps its trigger has no way. */
function onWay(trigger, popup, from, p) {
  let edge;
  let band;
  let tip;
  if (popup.top >= trigger.bottom || popup.bottom <= trigger.top) {
    const below = popup.top >= trigger.bottom;
    const y = below ? popup.top : popup.bottom;
    edge = [
      { x: popup.left, y },
      { x: popup.right, y },
    ];
    band = {
      left: Math.max(trigger.left, popup.left),
      right: Math.min(trigger.right, popup.right),
      top: below ? trigger.bottom : popup.bottom,
      bottom: below ? popup.top : trigger.top,
    };
    tip = from && { x: from.x, y: from.y + (below ? -BEHIND : BEHIND) };
  } else if (popup.left >= trigger.right || popup.right <= trigger.left) {
    const right = popup.left >= trigger.right;
    const x = right ? popup.left : popup.right;
    edge = [
      { x, y: popup.top },
      { x, y: popup.bottom },
    ];
    band = {
      left: right ? trigger.right : popup.right,
      right: right ? popup.left : trigger.left,
      top: Math.max(trigger.top, popup.top),
      bottom: Math.min(trigger.bottom, popup.bottom),
    };
    tip = from && { x: from.x + (right ? -BEHIND : BEHIND), y: from.y };
  } else return false;
  if (band.left <= band.right && band.top <= band.bottom && within(band, p)) return true;
  return tip !== null && inTriangle(p, tip, edge[0], edge[1]);
}

/**
 * Keeps a popup open while the pointer is on its trigger, on the popup, or
 * on the way between them, and calls `onLeave` once the pointer is
 * anywhere else, off the page included. The way is the band straight
 * between the two and the triangle from the point where the pointer left
 * the trigger to the popup's near edge, so a pointer that heads for any
 * part of the popup crosses no ground that closes it. This happens only
 * once the pointer has been on the trigger or on the popup, so a popup a
 * key opened waits for the pointer. `popup` gives the popup's element as
 * drawn now. Returns the call that stops it.
 */
function safeTriangle(trigger, popup, onLeave) {
  let armed = trigger.matches(':hover');
  let onTrigger = armed;
  let from = null;
  const check = (e) => {
    const p = { x: e.clientX, y: e.clientY };
    const t = trigger.getBoundingClientRect();
    const m = popup().getBoundingClientRect();
    if (within(t, p)) {
      armed = onTrigger = true;
      return;
    }
    if (onTrigger) {
      onTrigger = false;
      from = p;
    }
    if (within(m, p)) {
      armed = true;
      from = null;
    } else if (armed && !onWay(t, m, from, p)) onLeave();
  };
  const away = () => {
    if (armed) onLeave();
  };
  const page = document.documentElement;
  document.addEventListener('pointermove', check, true);
  page.addEventListener('mouseleave', away);
  return () => {
    document.removeEventListener('pointermove', check, true);
    page.removeEventListener('mouseleave', away);
  };
}

function menuView() {
  const menu = state.menu;
  if (!menu) return null;
  const items = MENUS[menu.key][0](menu.target);
  if (!items) return null;
  return h(
    'div',
    {
      key: `menu:${menu.key}:${menu.target}`,
      class: 'hs-menu-position',
      'data-popup': 'menu',
      mount: (el) => {
        el.style.visibility = 'hidden';
        menu.release = safeTriangle(menu.mark, () => el, closeMenu);
      },
      onclick: stop,
    },
    h(
      'div',
      {
        class: 'hs-menu hs-menu-surface',
        style: `min-width: min(${MENUS[menu.key][1]}px, calc(100vw - var(--space) * 4))`,
      },
      items,
    ),
  );
}

function tipView() {
  const tip = state.tip;
  const text = tip && tipTexts.get(tip.key)?.text;
  if (!text) return null;
  return h(
    'div',
    {
      key: `tip:${tip.key}`,
      class: 'hs-menu-position hs-floating-tip ash-arrive',
      'data-popup': 'tip',
      mount: (el) => (el.style.visibility = 'hidden'),
    },
    h(
      'span',
      { class: 'hs-tip hs-tooltip', 'data-sub': 'false' },
      h('span', { class: 'hs-tooltip-title' }, text),
    ),
  );
}

/** The box a popup stays in: the whole page, chat and all, since the page
 *  covers the chat while a popup shows. */
const boundary = () => ({ left: 0, top: 0, right: innerWidth, bottom: innerHeight });

/** Places a popup under its mark from the mark's left edge, or above it
 *  where there is more room, kept inside the boundary; a menu's list
 *  scrolls when neither side holds it. A tip at the mark's right stands
 *  level with the mark's middle. */
function place(el, mark, menu, side = 'below') {
  const b = boundary();
  const a = mark.getBoundingClientRect();
  if (side === 'right') {
    const height = el.offsetHeight;
    const top = a.top + (a.height - height) / 2;
    el.style.left = `${Math.min(a.right + OFFSET, b.right - PAD - el.offsetWidth)}px`;
    el.style.top = `${Math.max(b.top + PAD, Math.min(top, b.bottom - PAD - height))}px`;
    el.style.visibility = 'visible';
    return;
  }
  const surface = el.firstElementChild;
  if (menu) {
    const room = b.right - b.left - 2 * PAD;
    surface.style.minWidth = `${Math.max(0, Math.min(Math.max(menu, a.width), room))}px`;
    surface.style.maxWidth = `${Math.max(0, room)}px`;
    surface.style.maxHeight = 'none';
  }
  const below = b.bottom - PAD - (a.bottom + OFFSET);
  const above = a.top - OFFSET - (b.top + PAD);
  let height = el.offsetHeight;
  const down = height <= below || below >= above;
  if (menu && height > (down ? below : above)) {
    surface.style.maxHeight = `${Math.max(0, down ? below : above)}px`;
    height = el.offsetHeight;
  }
  const width = el.offsetWidth;
  const left = Math.max(b.left + PAD, Math.min(a.left, b.right - PAD - width));
  el.style.left = `${left}px`;
  el.style.top = `${down ? a.bottom + OFFSET : a.top - OFFSET - height}px`;
  el.style.visibility = 'visible';
}

function placePopups() {
  const menuEl = root.querySelector('[data-popup="menu"]');
  if (menuEl) {
    if (state.menu.mark.isConnected) {
      place(menuEl, state.menu.mark, MENUS[state.menu.key][1]);
      if (state.menu.keyboard && !menuEl.contains(document.activeElement)) {
        menuEl.querySelector('[role="menuitem"]')?.focus();
      }
    } else closeMenu();
  }
  const tipEl = root.querySelector('[data-popup="tip"]');
  const tipMark = tipEl && root.querySelector(`[data-tip="${CSS.escape(state.tip.key)}"]`);
  if (tipEl && tipMark) place(tipEl, tipMark, 0, tipTexts.get(state.tip.key).side);
}

/** Opens the menu of one key on one target from the pressed mark, or
 *  closes it when the same menu is open. A key's press, whose click counts
 *  no pointer press, opens it with the focus on its first item. */
function openMenu(key, target, e) {
  e.stopPropagation();
  const menu = state.menu;
  if (menu && menu.key === key && menu.target === target) {
    closeMenu();
    return;
  }
  menu?.release?.();
  state.menu = { key, target, mark: e.currentTarget, keyboard: e.detail === 0 };
  render();
}

/** Closes the open menu; one a key opened gives the focus back to its
 *  mark. */
function closeMenu() {
  if (!state.menu) return;
  const { mark, keyboard, release } = state.menu;
  state.menu = null;
  release?.();
  render();
  if (keyboard && mark.isConnected) mark.focus();
}

/** Opens a sheet in a modal over the page, on the press that asks for
 *  it. */
function openDialog(dialog) {
  state.tip = null;
  render();
  void quietly('hearthscale/ui/open-modal', { surface: 'sheet', input: dialog });
}

// ---------- The chat slot ----------

let reported = '';
/** Whether the next report asks the host to glide the chat to its place,
 *  as the sidebar folds or opens. */
let glide = false;
/** Whether the page covers the chat, as the host last heard. */
let covered = false;

/** Covers the chat while a popup or a drag's label shows, which may lie
 *  over it, and uncovers it once none does. */
function coverSlots() {
  const over = root.querySelector('[data-popup], .hs-sidebar-drag') !== null;
  if (over === covered) return;
  covered = over;
  void quietly('hearthscale/ui/cover', { covered });
}

/** The width the sidebar takes once its slide settles: its whole width
 *  while it shows, none while it is folded. */
const sideWidth = () =>
  state.shown ? root.querySelector('.ash-probe').getBoundingClientRect().width : 0;

/** The hole the folded bar keeps in the chat: the bar, and a margin round
 *  it for its shadow. */
function holeOf(bar) {
  const r = bar.getBoundingClientRect();
  const margin = 2 * parseFloat(getComputedStyle(root).getPropertyValue('--space'));
  return {
    left: Math.round(r.left - margin),
    top: Math.round(r.top - margin),
    width: Math.round(r.width + 2 * margin),
    height: Math.round(r.height + 2 * margin),
  };
}

/** Tells the host where the chat lies and which conversation it shows;
 *  the sidebar over the whole page gives the slot back. While the sidebar
 *  folds or opens, the chat's place is where the side's width settles. */
function reportSlots() {
  const chat = root.querySelector('.ash-chat');
  const slots = [];
  if (chat) {
    const r = chat.getBoundingClientRect();
    const settles = glide && state.wide;
    const bar =
      !glide && !state.sliding && layout() === 'folded' && root.querySelector('.ash-float');
    slots.push({
      id: 'chat',
      kind: 'chat',
      session: state.open,
      ...(state.open === null && state.project && { project: state.project }),
      insets: {
        left: Math.round(settles ? sideWidth() : r.left),
        top: Math.round(r.top),
        right: Math.round(innerWidth - r.right),
        bottom: Math.round(innerHeight - r.bottom),
      },
      ...(bar && { holes: [holeOf(bar)] }),
    });
  }
  const words = JSON.stringify(slots);
  const animate = glide;
  glide = false;
  if (words === reported) return;
  reported = words;
  void quietly('hearthscale/ui/slots', { slots, ...(animate && { animate: true }) });
}

// ---------- What the person does ----------

/** Shows a conversation in the chat. */
function show(id) {
  state.open = id;
  state.project = null;
  state.drawer = false;
  state.family = known(id)?.spawnedBy ?? id;
  if (state.unread.delete(id)) keep('unread');
  render();
  refreshSoon();
}

/** Shows a new conversation, which its first message makes in `project`. */
function newSession(project) {
  closeMenu();
  state.open = null;
  state.project = project;
  state.family = null;
  state.helpers = [];
  state.drawer = false;
  if (project && !state.openProjects[project]) {
    state.openProjects = { ...state.openProjects, [project]: true };
    state.arriving = project;
    keep('open-projects');
  }
  render();
}

let slideTimer;

/** Starts the sidebar's slide, which ends after the kit's slow duration:
 *  then the folded bar comes in with its hole, and the chat's place is
 *  reported as it settled. */
function slide() {
  const token = getComputedStyle(root).getPropertyValue('--dur-slow').trim();
  const ms = token.endsWith('ms') ? parseFloat(token) : parseFloat(token) * 1000;
  state.sliding = true;
  glide = true;
  clearTimeout(slideTimer);
  slideTimer = setTimeout(() => {
    state.sliding = false;
    render();
  }, ms || 0);
}

function toggle() {
  state.tip = null;
  if (state.wide) {
    state.shown = !state.shown;
    slide();
    keep('sidebar');
  } else state.drawer = !state.drawer;
  render();
}

function selectOnly(id) {
  state.selected = new Set(id ? [id] : []);
  state.anchor = id;
}

const selectedIds = () => sessionOrder(rowsNow).filter((id) => state.selected.has(id));

/** A plain click opens one row; Shift spans from the anchor over the
 *  list's order; Ctrl toggles one. */
function clickSession(id, mods, order) {
  if (mods.shift && state.anchor) {
    const a = order.indexOf(state.anchor);
    const b = order.indexOf(id);
    if (a >= 0 && b >= 0) {
      state.selected = new Set(order.slice(Math.min(a, b), Math.max(a, b) + 1));
      render();
      return;
    }
  }
  if (mods.ctrl && state.anchor) {
    const next = new Set(state.selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    state.selected = next;
    state.anchor = id;
    render();
    return;
  }
  selectOnly(id);
  show(id);
}

/** A project row opens the project and its new conversation, which names
 *  it; pressed again while that conversation shows, it closes. Over the
 *  narrow page, it only opens or closes. */
function clickProject(id) {
  const open = state.openProjects[id] ?? false;
  const onItsChat = state.open === null && state.project === id;
  if (layout() === 'drawer' || (open && onItsChat)) {
    state.openProjects = { ...state.openProjects, [id]: !open };
    if (!open) state.arriving = id;
    keep('open-projects');
    render();
    return;
  }
  newSession(id);
}

function rename(id, title) {
  if (state.renaming !== id) return;
  state.renaming = null;
  render();
  void quietly('hearthscale/sessions/update', { id, title });
}

function renameProject(id, name) {
  if (state.renamingProject !== id) return;
  state.renamingProject = null;
  render();
  void quietly('hearthscale/sessions/projects/update', { id, name });
}

async function createProject(name) {
  if (!state.creatingProject) return;
  state.creatingProject = false;
  render();
  const made = await quietly('hearthscale/sessions/projects/create', { name });
  if (!made) return;
  state.openProjects = { ...state.openProjects, [made.project.id]: true };
  keep('open-projects');
  await refreshProjects();
}

async function fork(id) {
  const made = await quietly('hearthscale/sessions/fork', { id });
  if (!made) return;
  await refresh();
  selectOnly(made.session.id);
  show(made.session.id);
}

function archiveSelection() {
  const ids = selectedIds();
  selectOnly(state.open && !ids.includes(state.open) ? state.open : null);
  render();
  for (const id of ids) void quietly('hearthscale/sessions/update', { id, archived: true });
}

/** Files the selected rows into a project, or out of every project. */
function moveSelection(project) {
  const ids = selectedIds();
  selectOnly(state.open);
  render();
  for (const id of ids) void quietly('hearthscale/sessions/update', { id, project });
}

/** A drop is one change per row, filing and rank together. On a project
 *  the rows go to the top of its list. Between two rows
 *  the ranks spread evenly inside the gap; when the gap cannot hold
 *  distinct values the whole list is ranked again with whole spacing. */
async function dropSessions(ids, target) {
  const patch = (id, project, rank) =>
    quietly('hearthscale/sessions/update', { id, project, rank });
  if (target.kind === 'project') {
    const top = Date.now();
    for (const [k, id] of ids.entries()) await patch(id, target.id, top - k);
    return;
  }
  const { project } = target;
  const rankOf = (id) => (id ? (state.sessions.find((s) => s.id === id)?.rank ?? null) : null);
  const above = rankOf(target.above);
  const below = rankOf(target.below);
  const n = ids.length;
  let ranks;
  if (above !== null && below !== null) {
    const step = (above - below) / (n + 1);
    ranks = ids.map((_, k) => above - step * (k + 1));
  } else if (above !== null) ranks = ids.map((_, k) => above - 60_000 * (k + 1));
  else if (below !== null) ranks = ids.map((_, k) => below + 60_000 * (n - k));
  else ranks = ids.map((_, k) => Date.now() - k);
  const distinct = ranks.every(
    (r, k) =>
      (k === 0 || ranks[k - 1] > r) &&
      (above === null || r < above) &&
      (below === null || r > below),
  );
  if (distinct) {
    for (const [k, id] of ids.entries()) await patch(id, project, ranks[k]);
    return;
  }
  const list = state.sessions
    .filter((s) => (s.project ?? null) === project && !ids.includes(s.id))
    .sort(byRank)
    .map((s) => s.id);
  const at = target.below ? list.indexOf(target.below) : list.length;
  const order = [...list.slice(0, at), ...ids, ...list.slice(at)];
  for (const [k, id] of order.entries()) await patch(id, project, (order.length - k) * 1000);
}

// ---------- Drag ----------
// The press is remembered; a move past the arming distance starts the
// drag, so an unarmed release is an ordinary click. Every listener sits on
// the document, and the pointer leaving the page, the page losing focus or
// Escape cancels the gesture. A press carries the selection to a target.

let press = null;
let dropped = false;
let springTimer = null;
let scrollDir = 0;
let scrollLoop = null;
const pointer = { x: 0, y: 0 };

function targetAt(x, y) {
  const drag = state.drag;
  const el = document.elementFromPoint(x, y)?.closest('[data-drop]');
  if (!el) return null;
  const drop = el.dataset.drop;
  if (drop.startsWith('project:')) {
    return { key: drop, target: { kind: 'project', id: drop.slice('project:'.length) } };
  }
  const rowId = drop.slice('row:'.length);
  if (drag.ids.includes(rowId)) return null;
  const row = rowsNow.find((r) => r.kind === 'session' && r.session.id === rowId);
  if (!row) return null;
  const list = rowsNow.flatMap((r) =>
    r.kind === 'session' && r.list === row.list && !drag.ids.includes(r.session.id)
      ? [r.session.id]
      : [],
  );
  const rect = el.getBoundingClientRect();
  const ins = y < rect.top + rect.height / 2 ? 'before' : 'after';
  const idx = list.indexOf(rowId);
  const above = ins === 'before' ? (list[idx - 1] ?? null) : rowId;
  const below = ins === 'before' ? rowId : (list[idx + 1] ?? null);
  return {
    key: `${drop}:${ins}`,
    target: { kind: 'between', project: row.list, above, below },
    rowId,
    ins,
  };
}

function endDrag(drop) {
  const drag = state.drag;
  document.removeEventListener('mousemove', onDragMove);
  document.removeEventListener('mouseup', onDragUp);
  document.removeEventListener('keydown', onDragKey);
  document.documentElement.removeEventListener('mouseleave', onDragCancel);
  window.removeEventListener('blur', onDragCancel);
  press = null;
  clearTimeout(springTimer);
  springTimer = null;
  if (scrollLoop !== null) cancelAnimationFrame(scrollLoop);
  scrollLoop = null;
  scrollDir = 0;
  if (!drag) return;
  document.body.style.userSelect = '';
  document.body.style.cursor = '';
  // The click the release fires on the pressed row is swallowed.
  dropped = true;
  state.drag = null;
  render();
  if (drop && drag.over) void dropSessions(drag.ids, drag.over.target);
}

const onDragCancel = () => endDrag(false);
const onDragUp = () => endDrag(true);
const onDragKey = (e) => e.key === 'Escape' && endDrag(false);
const onDragMove = (e) => moveTo(e.clientX, e.clientY);

/** The pressed row and, when it is selected, the whole selection come
 *  along under a label. */
function lift(x, y) {
  const order = sessionOrder(rowsNow);
  const carried = state.selected.has(press.id)
    ? order.filter((id) => state.selected.has(id))
    : [press.id];
  if (!state.selected.has(press.id)) selectOnly(press.id);
  const title = known(press.id)?.title ?? '';
  state.drag = {
    ids: carried,
    label: carried.length > 1 ? `${carried.length} sessions` : title,
    x,
    y,
    over: null,
  };
}

function track(x, y) {
  const over = targetAt(x, y);
  if (over?.key !== state.drag.over?.key) {
    clearTimeout(springTimer);
    springTimer = null;
    if (over?.target.kind === 'project') {
      const id = over.target.id;
      springTimer = setTimeout(() => {
        if (state.openProjects[id]) return;
        state.openProjects = { ...state.openProjects, [id]: true };
        state.arriving = id;
        keep('open-projects');
        render();
      }, SPRING_MS);
    }
  }
  state.drag = { ...state.drag, x, y, over };
  render();
}

function moveTo(x, y) {
  if (!press) return;
  pointer.x = x;
  pointer.y = y;
  if (!state.drag) {
    if (Math.hypot(x - press.x, y - press.y) < DRAG_ARM_PX) return;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';
    // Near the list's edges the list scrolls and the drag tracks under the
    // still pointer.
    const tick = () => {
      const list = root.querySelector('.hs-sidebar-scroll');
      if (list && scrollDir) {
        list.scrollTop += scrollDir * 6;
        moveTo(pointer.x, pointer.y);
      }
      scrollLoop = requestAnimationFrame(tick);
    };
    scrollLoop = requestAnimationFrame(tick);
    lift(x, y);
  }
  const list = root.querySelector('.hs-sidebar-scroll');
  if (list) {
    const rect = list.getBoundingClientRect();
    scrollDir = y < rect.top + EDGE_SCROLL_PX ? -1 : y > rect.bottom - EDGE_SCROLL_PX ? 1 : 0;
  }
  track(x, y);
}

function pressRow(e, id) {
  if (e.button !== 0 || state.renaming === id || state.drag) return;
  press = { id, x: e.clientX, y: e.clientY };
  document.addEventListener('mousemove', onDragMove);
  document.addEventListener('mouseup', onDragUp);
  document.addEventListener('keydown', onDragKey);
  document.documentElement.addEventListener('mouseleave', onDragCancel);
  window.addEventListener('blur', onDragCancel);
}

// ---------- The lists ----------

let refreshTimer;

function refreshSoon() {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => void refresh(), 60);
}

/** Marks unread each conversation whose last turn finished while the chat
 *  showed another. */
function noteTurns(sessions, first) {
  let changed = false;
  for (const s of sessions) {
    const turn = s.lastTurn?.id ?? null;
    const was = finished.get(s.id);
    finished.set(s.id, turn);
    if (first || was === undefined || turn === null || turn === was || s.id === state.open)
      continue;
    state.unread.add(s.id);
    changed = true;
  }
  if (changed) keep('unread');
}

let listed = false;

async function refresh() {
  const family = state.family;
  const [top, helpers] = await Promise.all([
    call('hearthscale/sessions/list', {}),
    family ? call('hearthscale/sessions/list', { spawnedBy: family }) : { sessions: [] },
  ]).catch(() => [null, null]);
  if (!top) return;
  noteTurns([...top.sessions, ...helpers.sessions], !listed);
  listed = true;
  state.sessions = top.sessions;
  if (state.family === family) state.helpers = helpers.sessions;
  else refreshSoon();
  const ids = new Set([...state.sessions, ...state.helpers].map((s) => s.id));
  const kept = [...state.selected].filter((id) => ids.has(id));
  if (kept.length !== state.selected.size) state.selected = new Set(kept);
  const unread = [...state.unread].filter((id) => ids.has(id));
  if (unread.length !== state.unread.size) {
    state.unread = new Set(unread);
    keep('unread');
  }
  render();
}

async function refreshProjects() {
  const answer = await quietly('hearthscale/sessions/projects/list', {});
  if (!answer) return;
  state.projects = answer.projects;
  render();
}

// ---------- The store ----------

const KEPT = {
  'open-projects': () => state.openProjects,
  unread: () => [...state.unread],
  sidebar: () => state.shown,
};
const keeping = new Set();
let keepTimer;

/** Saves one of the page's own values to Ash's store, soon. */
function keep(key) {
  keeping.add(key);
  clearTimeout(keepTimer);
  keepTimer = setTimeout(() => {
    for (const k of keeping) void quietly('hearthscale/store/set', { key: k, value: KEPT[k]() });
    keeping.clear();
  }, 300);
}

async function restore() {
  const [projects, unread, sidebar] = await Promise.all(
    Object.keys(KEPT).map((key) => quietly('hearthscale/store/get', { key })),
  );
  if (projects?.value) state.openProjects = projects.value;
  if (Array.isArray(unread?.value)) state.unread = new Set(unread.value);
  if (typeof sidebar?.value === 'boolean') state.shown = sidebar.value;
}

// ---------- What the host tells ----------

app.fallbackNotificationHandler = async (note) => {
  const params = note.params ?? {};
  switch (note.method) {
    case 'hearthscale/sessions/changed':
      refreshSoon();
      return;
    case 'hearthscale/sessions/deleted':
      state.sessions = state.sessions.filter((s) => s.id !== params.id);
      state.helpers = state.helpers.filter((s) => s.id !== params.id);
      if (state.unread.delete(params.id)) keep('unread');
      if (state.open === params.id) {
        const next = [...state.sessions].sort(byRank)[0]?.id ?? null;
        if (next) show(next);
        else newSession(null);
        selectOnly(next);
      } else if (state.selected.delete(params.id)) selectOnly(state.open);
      render();
      return;
    case 'hearthscale/sessions/projects/changed':
      void refreshProjects();
      return;
    case 'hearthscale/ui/slot-session':
      if (params.id !== 'chat' || params.session === state.open) return;
      selectOnly(params.session);
      show(params.session);
      return;
  }
};

addEventListener('resize', () => {
  const wide = innerWidth >= WIDE;
  if (wide !== state.wide) {
    state.wide = wide;
    state.drawer = false;
  }
  render();
});

// Escape closes the folded sidebar's search, else the menu, else a
// selection of more than one row.
addEventListener(
  'keydown',
  (e) => {
    if (e.key !== 'Escape') return;
    if (state.finding !== null) {
      e.stopPropagation();
      e.preventDefault();
      state.finding = null;
      render();
    } else if (state.menu) {
      e.stopPropagation();
      e.preventDefault();
      closeMenu();
    } else if (state.selected.size > 1) {
      selectOnly(state.open);
      render();
    }
  },
  true,
);

// A menu of a page the person left closes, as one does where they click
// outside it.
addEventListener('blur', () => closeMenu());

const style = document.createElement('style');
style.textContent = SHEET;
document.head.append(style);
document.body.append(root);
render();

await app.connect(new PostMessageTransport(window.parent, window.parent));
reported = '';
render();
await restore();
await Promise.all([refresh(), refreshProjects()]);
