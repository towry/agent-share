---
name: read-arxiv-paper
description: Use to read and interpret an arXiv paper an arxiv URL or paper ID, and report its summary, methods, and key contributions.
---

# Read arxiv paper

You will be given an arXiv paper URL, for example:

https://www.arxiv.org/abs/2601.07372

Part 1: Normalize the URL
Fetch the paper's TeX source, not the PDF. The source URL always has this form:

https://www.arxiv.org/src/2601.07372

Note the `/src/` path. Once you have the URL, continue to Part 2.

Part 2: Download the paper source
Download the URL to a local `.tar.gz` file. A good location is `/tmp/{arxiv_id}.tar.gz`.

If the file already exists, do not download it again.

Part 3: Unpack the file in that folder
Unpack the contents into the `/tmp/{arxiv_id}` directory.

Part 4: Locate the entrypoint
Find the LaTeX entry point, typically `main.tex` or a similarly named file.

Part 5: Read the paper
Read the entry point, then follow its references through all other relevant source files.

Part 6: Report
After reading the paper, write a Markdown summary to `./docs/papers/summary\_{tag}.md`. Use this project-local papers directory, not `/tmp`, so the summary is easy to open and reference. Choose a descriptive tag such as `conditional_memory`, and make sure the path does not already exist before writing it.

Write the summary in the context of the project. Read relevant code when necessary, then explain explicitly how the paper relates to the codebase and which ideas may be worth applying or testing.
