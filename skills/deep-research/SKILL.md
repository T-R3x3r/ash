---
name: deep-research
description: Research a question on the web or on named sites, with a linked source for each finding.
---

# Deep research

Do these steps in order. Each program below needs this skill's root: the root you read this file from. Copy the arguments as they stand and change only what is in angle brackets.

1. **Plan.** Split the question into 2 to 5 sub-questions that do not overlap; a simple question gets 2. Give each a title of two or three words. Then call exec with these arguments:

   ```json
   { "file": { "root": "<this skill's root>", "path": "scripts/plan.js" }, "args": { "topic": "<the topic in two or three words>", "request": "<the person's request, copied word for word>", "language": "<the language the request is written in>", "sources": ["<each web address or site the person named>"], "questions": [{ "title": "<two or three words>", "question": "<sub-question 1>" }, { "title": "<two or three words>", "question": "<sub-question 2>" }] }, "yield_s": 30 }
   ```

   Write "sources": [] when the person named no site. The program saves the plan in a new folder of the workspace and prints the next calls.

2. **Ask.** Call ask with the arguments the program printed, so that the person sees the plan with Start and Change. When the person wants a change, change the sub-questions and call plan.js again.

3. **Research.** On Start, call exec with the arguments the program printed for next.js. It starts two helpers at a time and prints what comes next: call wait_agents as it prints, then next.js again with the same arguments, until it prints the report.

4. **Answer** as next.js prints: two or three sentences that answer the question from the report, then the whole report, copied word for word with every link. Where a section says that no saved page answers it, say so; do not search further yourself.
