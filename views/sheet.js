/**
 * Ash's sheets, which the page opens in a modal over its tile: the
 * confirmation of a delete, of conversations or of a project, and a
 * project's instructions. The tool input names the sheet. Each sheet looks
 * as the shell's own sheets look, does its change on the press that
 * confirms it, and closes the modal; a press outside the box, Cancel and
 * Escape close it with no change.
 */
import {
  App,
  McpUiMessageResultSchema as Answer,
  PostMessageTransport,
} from '@modelcontextprotocol/ext-apps';

const app = new App({ name: 'Ash', version: '6.1.0' }, {}, { autoResize: false });

/** One request of the host, its result whole. */
const call = (method, params = {}) => app.request({ method, params }, Answer);

const close = () => call('hearthscale/ui/close-modal').catch(() => null);

/** An element: its tag, its class, its attributes and handlers, its
 *  children. */
function el(tag, props = {}, ...kids) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(props)) {
    if (name.startsWith('on')) node[name] = value;
    else node.setAttribute(name, value);
  }
  node.append(...kids);
  return node;
}

const stop = (e) => e.stopPropagation();

/** The confirmation of a delete, as the shell's own confirmations look. */
function confirmSheet({ title, body, action, onConfirm }) {
  return el(
    'div',
    { class: 'hs-confirm', onclick: () => void close() },
    el(
      'div',
      { class: 'hs-confirm-box', role: 'dialog', onclick: stop },
      el('span', { class: 'hs-confirm-title' }, title),
      el('span', { class: 'hs-confirm-body' }, body),
      el(
        'div',
        { class: 'hs-confirm-footer' },
        el(
          'button',
          {
            type: 'button',
            class: 'hs-button hs-confirm-cancel',
            'data-variant': 'secondary',
            'data-size': 'sm',
            onclick: () => void close(),
          },
          'Cancel',
        ),
        el(
          'button',
          {
            type: 'button',
            class: 'hs-button hs-confirm-action',
            'data-variant': 'danger',
            'data-size': 'sm',
            onclick: async () => {
              await onConfirm();
              await close();
            },
          },
          action,
        ),
      ),
    ),
  );
}

/** The sheet that edits a project's instructions. */
function instructionsSheet({ id, name, text }) {
  const button = (label, onClick, strong) =>
    el(
      'span',
      {
        class: `hs-glassbtn hs-inktext hs-sheet-button${strong ? ' hs-hovink' : ''}`,
        'data-strong': strong ? 'true' : 'false',
        onclick: onClick,
      },
      label,
    );
  const input = el('textarea', {
    class: 'hs-ta hs-sheet-input',
    rows: '7',
    placeholder: 'What the assistant should know or do in this project…',
  });
  input.value = text ?? '';
  return el(
    'div',
    { class: 'hs-sheet-shell', onclick: () => void close() },
    el(
      'div',
      { class: 'hs-sheet-box', role: 'dialog', onclick: stop },
      el('span', { class: 'hs-sheet-title' }, `Instructions for ${name}`),
      el(
        'span',
        { class: 'hs-sheet-hint' },
        'Every conversation in this project reads this before it starts.',
      ),
      input,
      el(
        'div',
        { class: 'hs-sheet-footer' },
        button('Cancel', () => void close(), false),
        button(
          'Save',
          async () => {
            await call('hearthscale/sessions/projects/update', {
              id,
              instructions: input.value,
            }).catch(() => null);
            await close();
          },
          true,
        ),
      ),
    ),
  );
}

/** The sheet the tool input names. */
function sheetOf(input) {
  if (input.kind === 'delete') {
    const one = input.ids.length === 1;
    return confirmSheet({
      title: one ? 'Delete this session?' : `Delete ${input.ids.length} sessions?`,
      body: one
        ? 'It is gone for good, with everything it did.'
        : 'They are gone for good, with everything they did.',
      action: one ? 'Delete session' : `Delete ${input.ids.length} sessions`,
      onConfirm: () =>
        Promise.all(
          input.ids.map((id) => call('hearthscale/sessions/delete', { id }).catch(() => null)),
        ),
    });
  }
  if (input.kind === 'delete-project') {
    return confirmSheet({
      title: `Delete ${input.name}?`,
      body: "Its conversations stay and move to the list without a project. The project's folder stays on this computer.",
      action: 'Delete project',
      onConfirm: () =>
        call('hearthscale/sessions/projects/delete', { id: input.id }).catch(() => null),
    });
  }
  return instructionsSheet(input);
}

addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  e.preventDefault();
  void close();
});

app.ontoolinput = ({ arguments: input }) => {
  document.body.replaceChildren(sheetOf(input ?? {}));
  document.querySelector('.hs-sheet-input')?.focus();
};

await app.connect(new PostMessageTransport(window.parent, window.parent));
