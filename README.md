# Ash

The Hearthscale chat app: one agent over your own computer, in one chat. Ash
reads your files, runs commands in its workspace, makes pictures, keeps
notes, hands work to helpers, and uses whatever the plugins and connectors
you attach offer.

Ash is an ordinary Hearthscale app. Nothing in the platform knows its name;
it installs from the Marketplace like any other app, and this repository is
an example of what an app with an agent looks like.

## The folder

| File | What it is |
| --- | --- |
| `app.json` | The manifest: id, name, the agent, its tools and roots, what it contributes. |
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
