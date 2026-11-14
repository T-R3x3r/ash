---
name: deep-research
description: Use it when the person asks you to research or look into something, on the web or on a site they name.
---

# Deep research

Do these steps in order. The programs below need this skill's root: the root you read this file from.

1. **Plan.** Split the question into 2 to 5 sub-questions that do not overlap; a simple question gets 2. Show the plan with the ask tool: the question lists the sub-questions with their numbers, and the choices are "Start" and "Change". On "Change", ask what to change, change the plan and show it again.

2. **Folder.** Name the folder of this research `research/<topic>-<today's date>`, with the topic in two or three words, such as `research/heat-pumps-2026-11-14`. It starts with research/, and the programs make it in the workspace.

3. **Helpers.** For each sub-question, call spawn_agent with these arguments:

   ```json
   { "agent": "researcher", "title": "<two or three words>", "task": "Sub-question <number>: <the sub-question>\nFolder: <the folder>\nSources: <the addresses the person named, or the web>\nLanguage: <the language the person wrote in>" }
   ```

   Start two helpers, wait for them with wait_agents and timeout_s 1800, then start the next two.

4. **Report.** When every helper has answered, call exec with these arguments, with a title and the sub-questions of the plan in their order:

   ```json
   { "file": { "root": "<this skill's root>", "path": "scripts/report.js" }, "args": { "dir": "<the folder>", "title": "<the title>", "questions": ["<sub-question 1>", "<sub-question 2>"] }, "yield_s": 30 }
   ```

   It keeps only the findings whose page a helper saved and whose quote is on that page, writes one section for each sub-question into `<the folder>/report.md` with a numbered link after each finding, and adds the list of sources.

5. **Answer** in the person's language with two or three sentences that answer their question from the report, then the report as the program printed it, copied whole with every link. Where a section says that no saved page answers it, say so; do not search further yourself.
