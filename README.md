# HK News API

A small static JSON news API designed to run on GitHub Pages at `https://mmw1984.github.io/news-api/`.

The repository is intentionally manual-first: editors update JSON files, commit, and GitHub Pages serves the latest media list and article feed without a backend server.

## Endpoints

- `GET /data/sources.json` - news media sources grouped by category
- `GET /data/articles.json` - manually entered article feed
- `GET /data/feed.json` - combined metadata, sources, and article feed

When published to GitHub Pages, use:

```text
https://mmw1984.github.io/news-api/data/sources.json
https://mmw1984.github.io/news-api/data/articles.json
https://mmw1984.github.io/news-api/data/feed.json
```

## Manual Updates

Read [Manual Entry Guide](docs/manual-entry.md) before adding articles or sources.

Quick flow:

1. Edit `data/articles.json` for new news entries.
2. Edit `data/sources.json` only when adding or changing a media outlet.
3. Keep `updatedAt` in ISO 8601 format.
4. Run `node tools/validate.mjs` before committing.
5. Commit and push to GitHub Pages.

## API Documentation

Read [API Docs](docs/api.md) for schemas, examples, and recommended app usage.

## GitHub Pages Setup

For repository `mmw1984/news-api`:

1. Push this folder as the repository root.
2. In GitHub, open **Settings > Pages**.
3. Set source to `main` branch and `/ (root)`.
4. Confirm the public URL is `https://mmw1984.github.io/news-api/`.

## Editor Rules

- Keep article links as original public article URLs when possible.
- `view-link.cx` links are currently stored for source home links because they were supplied as the first source list.
- Do not put paywalled article body text into `content`; use `summary` and link out.
- Keep titles and summaries in Traditional Chinese or the article's original language.
