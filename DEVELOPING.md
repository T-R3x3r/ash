# Developing Ash

`README.md` is the text the Marketplace shows under **About** on Ash's listing, so it is written for the people who install Ash. This file is for the people who work on it.

Ash is an ordinary Hearthscale app. Nothing in the platform knows its name;
it installs from the Marketplace like any other app, and this repository is
an example of what an app with an agent looks like.

## The folder

| File | What it is |
| --- | --- |
| `app.json` | The manifest: id, name, the agent, its tools and roots, and the page it places in the rail. |
| `views/ash.js` | Ash's page in its tab: the conversations and projects in a sidebar, and the chat the shell draws in the page's `chat` slot. |
| `views/sheet.js` | Ash's sheets, in a modal the shell draws over the page: a delete to confirm and a project's instructions. |
| `prompt/system.md` | The agent's system prompt. |
| `skills/` | The skills the agent carries, one folder with a `SKILL.md` each. |
| `icon.svg` | The mark the client draws wherever Ash appears. |
| `screenshots/` | The pictures of the Marketplace listing, in the order of their names. |

## Working on it

With a Hearthscale platform running on this machine:

```sh
hearthscale dev .
```

links this folder into the running platform, picks up every change, and
asks once in the window before any code runs.

Each view is one module with no build step: the platform inlines
`views/ash.js` or `views/sheet.js` into the document it frames, beside the design system's
sheet (the `hs-*` classes) and the Remix Icon font (the `ri-*` classes), and
maps `@modelcontextprotocol/ext-apps` to its own copy. It cannot import
another file of the package.

## Traps

- The shell draws the chat over the page's `chat` slot, so nothing the page
  draws shows there on its own. While a menu, a tip or a drag's label shows,
  the page covers the slot (`hearthscale/ui/cover`), and the shell lays the
  chat under the page until it closes; a sheet opens in a modal over the
  whole page, chat and all (`hearthscale/ui/open-modal`, surface `sheet`),
  and closes itself; the narrow page opens the sidebar in place of the chat.
- The sidebar folds and opens over the kit's slow duration, and the report
  of the chat's place that goes with it asks the shell to glide the chat
  (`animate`), so the two move together. The report names the place the
  chat takes once the side's width settles, and the slide's end, a timer
  of that duration, reports it again.
- Folded, the sidebar leaves a small bar over the chat's top left corner.
  The chat's slot keeps a hole there (`holes`), so the bar shows above the
  chat and takes the pointer. The bar and its hole come in together at the
  slide's end, not while the chat glides: a hole stands where the slot's
  insets put it, and a bar drawn earlier shows over the narrowing sidebar
  and then goes under the chat.
- The frame has no storage of its own: the open projects, the unread marks
  and the folded sidebar live in Ash's store (`uses: store`).
- Deleting a conversation or a project only goes through on a click inside
  the sheet, so the call starts in the handler of the press that confirms it.
  The page hears the deletion and moves its chat when it showed it.
- A project's Open folder shows its folder in the system's file manager
  (`openai/files/open`, `uses: files.open`); a view may open only a folder
  of its own app.

## Releasing

Install the Hearthscale registry's GitHub App on this repository once. Then
every release whose tag equals `version` in `app.json` is picked up by the
Marketplace.

```sh
hearthscale pack .
```

builds the package to attach to the release.

## Licence

MIT. See `LICENSE`.
