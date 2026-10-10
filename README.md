# Ash

Ash is an assistant you talk to in Hearthscale. Ask it a question, or give it a file or a folder to work on, and it reads, writes and runs what the task needs on your computer, then tells you what it did. It can also search the web with the Browser, make pictures, keep notes between conversations and hand parts of a big task to helpers.

## Get started

Click Ash's button on the rail and type what you need. A small task whose result you can check is a good first one:

> Help me plan three dinners using rice, spinach, lemons and chickpeas. Make one shopping list for anything else I need.

Ash runs on a chat model that can use tools. Pick one in the model picker of the composer, or leave it on **Automatic**. If the picker shows **No model**, download a model in Hearthscale Server or connect a provider in **Settings → Providers**.

To work on your own material, choose **+** in the composer: **Files…** attaches files, and **A folder** gives the conversation a folder to read, or to read and write. Conversations about the same thing can share a project, which gives them a folder and notes of their own.

## What Ash asks for

- **Your files.** Ash reads the files in your home folder. It writes in its own workspace, in a project's folder and in the folders you give a conversation; a change anywhere else is a step that needs your yes.
- **Commands.** Ash runs commands in a sandbox that keeps them to the folders it works in.
- **Notes.** Ash keeps notes about your work between conversations. You can read, edit or switch them off in **Settings → Memory**.
- **The Browser.** Installing Ash also installs the Browser, so Ash can search and read the web. You can leave it out on the install card; Ash then answers without the web.

The permission level, which you choose in the composer, decides how a step that needs your yes goes. At **Supervised**, Ash asks you first. At **Auto**, a review checks the step and refuses what fails it. At **Full access**, the step runs. [Permission levels](https://hearthscale.com/docs/app/settings/permissions#level) explains each one.
