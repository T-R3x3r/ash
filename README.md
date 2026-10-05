# Ash

The Hearthscale chat app: one agent over your own computer, in one chat. Ash
reads your files, runs commands in its workspace, makes pictures, keeps
notes, hands work to helpers, and uses whatever the headless apps and
connectors you attach offer.

Ash is an ordinary Hearthscale app. Nothing in the platform knows its name;
it installs from the Marketplace like any other app, and this repository is
an example of what an app with an agent looks like.

## The folder

| File | What it is |
| --- | --- |
| `app.json` | The manifest: id, name, the agent, its tools and roots, and the page it places in the rail. |
| `views/ash.js` | Ash's page in its tab: the conversations and projects in a sidebar, and the chat the shell draws in the page's `chat` slot. |
| `prompt/system.md` | The agent's system prompt. |
| `skills/` | The skills the agent carries, one folder with a `SKILL.md` each. |
| `icon.svg` | The mark the client draws wherever Ash appears. |

## Working on it

With a Hearthscale platform running on this machine:

```
hearthscale dev .
```

links this folder into the running platform, picks up every change, and
asks once in the window before any code runs.

The page is one module with no build step: the platform inlines
`views/ash.js` into the document it frames, beside the design system's
sheet (the `hs-*` classes) and the Remix Icon font (the `ri-*` classes), and
maps `@modelcontextprotocol/ext-apps` to its own copy. It cannot import
another file of the package.

## Traps

- The shell draws the chat over the page's `chat` slot, so nothing the page
  draws shows there. Menus and tips stay inside the sidebar; a sheet gives
  the slot back while it is open; the narrow page opens the sidebar in
  place of the chat.
- The frame has no storage of its own: the open projects, the unread marks
  and the folded sidebar live in Ash's store (`uses: store`).
- Deleting a conversation or a project only goes through on a click inside
  the page, so the call starts in the handler of the press that confirms it.

## Releasing

Install the Hearthscale registry's GitHub App on this repository once. Then
every release whose tag equals `version` in `app.json` is picked up by the
Marketplace.

```
hearthscale pack .
```

builds the package to attach to the release.

## Licence

MIT. See `LICENSE`.
