# Ash

The Hearthscale chat app: one agent over your own computer, in one chat. Ash
reads your files, runs commands in its workspace, makes images, and uses
whatever connectors you attach — all on your machine.

Ash is an ordinary Hearthscale app. Nothing in the platform knows its name;
it installs from the marketplace like any other app, and this repository is
the example of what an app looks like.

## The folder

| File | What it is |
| --- | --- |
| `app.json` | The manifest: id, name, what the app needs, what it discloses. |
| `backend.js` | The agent: its persona, its tools, its prompt layers. |
| `icon.svg` | The mark the client draws wherever Ash appears. |

## Working on it

With a Hearthscale platform running on this machine:

```
hearthscale dev .
```

links this folder into the running platform, rebuilds on every change, and
asks once in the terminal before any code runs.

## Releasing

Install the Hearthscale registry's GitHub App on this repository once. Then
every release whose tag equals `version` in `app.json` is picked up by the
marketplace.

```
hearthscale pack .
```

builds the distributable folder to attach to the release.

## Licence

MIT. See `LICENSE`.
