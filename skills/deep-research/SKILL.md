---
name: deep-research
description: Use it when the person asks you to research or look into something, on the web or on a site they name.
---

# Deep research

Do these steps in order. The programs below need this skill's root: the root you read this file from.

1. **Plan.** Split the question into 2 to 5 sub-questions that do not overlap; a simple question gets 2. Show the plan with the ask tool: the question lists the sub-questions with their numbers, and the choices are "Start" and "Change". On "Change", ask what to change, change the plan and show it again.

2. **Folder.** Name the folder of this research `research/<topic>-<today's date>`, with the topic in two or three words, such as `research/heat-pumps-2026-11-14`. The programs make it in the workspace.

3. **Helpers.** For each sub-question, call spawn_agent with these arguments:

   ```json
   { "agent": "researcher", "title": "<two or three words>", "task": "Sub-question <number>: <the sub-question>\nFolder: <the folder>\nSources: <the addresses the person named, or the web>\nLanguage: <the language the person wrote in>" }
   ```

   Start two helpers, wait for them with wait_agents and timeout_s 1800, then start the next two.

4. **Check.** When every helper has answered, run this program with exec and yield_s 30:

   ```js
   const s = await tools.read({ root: "<this skill's root>", path: "scripts/check.js" });
   text(await eval(s.text.replace(/^\d+\|/gm, ""))("<the folder>"));
   ```

   It keeps only the findings whose page a helper saved and whose quote is on that page, and lists them by sub-question with a source number such as [2-1].

5. **Write** the report one section at a time. For each sub-question, write the file `<the folder>/section-<number>.md` with write, root workspace. Start it with `## ` and a short heading, then write a few sentences in the person's language with the kept findings of that sub-question only. After each fact, put its source number in square brackets, such as [2-1]. Where findings disagree or something was not found, say so.

6. **Sources.** Run this program with exec and yield_s 30, with a title for the report:

   ```js
   const s = await tools.read({ root: "<this skill's root>", path: "scripts/report.js" });
   text(await eval(s.text.replace(/^\d+\|/gm, ""))({ dir: "<the folder>", title: "<the title>" }));
   ```

   It joins the sections into `<the folder>/report.md`, turns each source number into a numbered link, removes every link that no helper saved, and adds the list of sources.

7. **Answer** by copying the report the program printed, from its title to its list of sources, word for word with every link. Add nothing before or after it.
