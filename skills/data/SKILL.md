---
name: data
description: Work out totals, averages, counts and duplicates, or draw a chart, from a CSV file, a spreadsheet or other data.
---

# Work with data

Do every step with the python tool, and open the data file in the program itself. Never type the data or the amounts into the code.

1. **Look first.** Load the file with pandas and print its columns, its number of rows, and the first and the last date. A CSV may use `;` and a decimal comma: then read it with `sep=";", decimal=","`.
2. **Pick the rows in code.** Filter by the period of the question and by the category or the name it gives. The date of today is in the turn block, so "last month" is the calendar month before it, whatever the file is called. Print how many rows match and a few of them.
3. **Compute** the result in the same program and print it with its unit, money to the cent. Before you rank, decide whether a higher or a lower value is better on this scale, as with grades, ranks or times.
4. **Duplicates:** use the column that names one record, such as an e-mail address or a number, as the key. Compare it without case, spaces and accents, and print the pairs you merge.
5. **Chart**, when the person asks for one: draw it with Matplotlib, with a title and axis labels, and save it as a PNG with a name of words joined by hyphens, such as `running-per-month.png`, in the attached folder, or in the workspace when there is none. Then read the PNG with read, so that you see it and the person can see it in your answer.
6. **Answer** with the number the program printed, the period and the number of rows it used, in one or two sentences. When you made a chart, end the answer with it as a picture, written with the file's name alone, without its folder: `![<the chart's title>](<the file's name>)`, such as `![Kilometres per month](running-per-month.png)`.
