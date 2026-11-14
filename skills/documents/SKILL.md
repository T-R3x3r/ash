---
name: documents
description: Makes and changes Word, Excel and PowerPoint files with Python. Use it when the person wants a .docx, .xlsx or .pptx file written, filled in or changed.
---

# Word, Excel and PowerPoint

Make the file with the python tool. The packages python-docx, openpyxl and python-pptx are installed.

1. **Read the material** the file needs with read: the notes, the old file, the data.
2. **Write the program** that makes the file:
   - Word: `docx.Document()`, `add_heading`, `add_paragraph`, `add_table`.
   - Excel: `openpyxl.Workbook()`; write numbers as numbers, not text; a total row uses a formula such as `=SUM(B2:B9)`, and the program also prints the total it computed.
   - PowerPoint: `pptx.Presentation()`, one slide per topic with `slide_layouts[1]`, a title and short bullet points.
3. **Save** the file in the attached folder, or in the workspace when there is none, under the name the person asked for, else a clear name with the right extension. Change an existing file only when the person asks; otherwise save a new one beside it.
4. **Check** it: read the saved file with read and compare it with what was asked.
5. **Answer** with the file's name and what it holds, in one or two sentences.
