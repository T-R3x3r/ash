---
name: tidy-files
description: Tidy, sort or move the files of a folder, or remove duplicate files.
---

# Tidy files

1. **List** every file of the folder with find, its subfolders included, and count them.
2. **Decide what each file is by its content.** Read the first page of each document you plan to move, such as a PDF, a Word file or a text, and check that it is of the kind the person named: a name can mislead. Duplicates are files with the same content: find them by a SHA-256 hash, never by their names.
3. **Plan**: one target folder for each kind, with the name the person gave. Files of other kinds stay where they are.
4. **Do it in one program** with the python tool: `shutil.move` to move, never a copy, and `hashlib` for duplicates. Write paths with forward slashes, such as `C:/Users/…`. When the person asked to remove duplicates, keep one file of each content and delete the others; delete nothing else.
5. **Check** at the end of the same program: list each folder again, print the names of its files and how many there are, and compare the total with step 1, so that every file is in its place and none is lost.
6. **Answer** with what you moved or removed, in a short list. Take every name and every count from the listing of step 5, never from your own counting.
