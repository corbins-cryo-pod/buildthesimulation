# How to publish (News + Articles)

This repo uses **Astro Content Collections**.

## Where content lives
- News posts: `src/content/news/*.md`
- Articles: `src/content/articles/*.md`

## Drafts vs published
Each file has `draft: true|false`.
- `draft: true` → not shown on the site
- `draft: false` → published

## News: create a new weekly post
1. Copy the template:
   - `workbench/notes-templates/templates/news-template.md`
2. Name it like:
   - `src/content/news/YYYY-MM-DD-weekly-bci-roundup.md`
3. Fill in frontmatter + content.
4. Set `draft: false`.
5. Commit + push to `main`.

## Articles: add to the sequence
1. Copy the template:
   - `workbench/notes-templates/templates/article-template.md`
2. Name it like:
   - `src/content/articles/02-history-of-bcis.md`
3. Set `order: 2` (and increment for each article).
4. Set `draft: true` until you’re ready.

## Local preview
```bash
npm install
npm run dev
```
Open the printed `http://localhost:4321/` URL.

## Build check
```bash
npm run build
```

## RSS
The RSS feed is generated at `/rss.xml` (requires `site` set in `astro.config.mjs`).
