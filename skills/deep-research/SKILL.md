---
name: deep-research
description: Research a question on the web or on named sites, with a linked source for each finding.
---

# Deep research

Do these steps in order. Two programs are already written, scripts/plan.js and scripts/next.js, so every exec call here has the fields file, args and yield_s, and no code field: you write no program. The file's root is this skill's root, the root you read this file from.

1. **Plan.** Split the question into 2 to 5 sub-questions that do not overlap; a simple question gets 2. Then call exec with these fields, and change only what is in angle brackets:

   ```json
   { "file": { "root": "<this skill's root>", "path": "scripts/plan.js" }, "args": { "message": "<the person's message, copied whole with every web address in it>", "sources": ["<each web address or site the message names>"], "language": "<the language the message is written in>", "topic": "<the topic in two or three words>", "questions": [{ "title": "<two or three words>", "question": "<sub-question 1>" }, { "title": "<two or three words>", "question": "<sub-question 2>" }] }, "yield_s": 30 }
   ```

   Write "sources": [] when the person named no site.

2. **Ask.** Call ask with the arguments the program printed, so that the person sees the plan with Start and Change. When the person wants a change, change the sub-questions and call plan.js again.

3. **Research.** On Start, call exec with the arguments the program printed for next.js. Each time, next.js prints the next call: make that call, until it prints the report.

4. **Answer** as next.js prints: two or three sentences that answer the question from the report, then the whole report, copied word for word with every link. Where a section has no finding, say so; do not search further yourself.
