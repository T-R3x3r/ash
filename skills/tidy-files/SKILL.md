---
name: tidy-files
description: Sorts, moves, renames and removes duplicate files in a folder. Use it when the person asks to tidy, sort or clean up a folder, to put files of one kind together, or to remove duplicates.
---

# Tidy files

1. **List** every file of the folder with find, its subfolders included, and count them.
2. **Decide what each file is.** When a name does not say clearly what a file is, read its first page and decide by its content. Duplicates are files with the same content: find them by a SHA-256 hash, never by their names.
3. **Plan**: one target folder for each kind, with the name the person gave. Files of other kinds stay where they are.
4. **Do it in one program** with the python tool: `shutil.move` to move, never a copy, and `hashlib` for duplicates. Write paths with forward slashes, such as `C:/Users/…`. When the person asked to remove duplicates, keep one file of each content and delete the others; delete nothing else.
5. **Check** in the same program or with find: list the folders again and compare the counts with step 1, so that every file is in its place and none is lost.
6. **Answer** with what you moved or removed, in a short list.
