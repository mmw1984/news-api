# Manual Entry Guide

This guide is for editors who manually update `mmw1984/news-api`.

## Add A News Article

Edit `data/articles.json` and add a new object at the top of the `articles` array.

Use this template:

```json
{
  "id": "source-slug-2026-06-09-short-topic",
  "sourceId": "the-chaser-news",
  "categoryId": "hk-overseas",
  "title": "新聞標題",
  "summary": "一至三句簡介，方便 app 列表顯示。",
  "content": "較完整但仍然簡短的內容摘要；不要複製整篇受版權保護文章。",
  "url": "https://example.com/article",
  "imageUrl": "https://example.com/image.jpg",
  "language": "zh-Hant",
  "tags": ["香港", "科技"],
  "publishedAt": "2026-06-09T10:30:00+08:00",
  "updatedAt": "2026-06-09T10:30:00+08:00",
  "editor": "mmw1984"
}
```

## Required Fields

- `id`: unique article id, lowercase, numbers and hyphens only.
- `sourceId`: must match one source in `data/sources.json`.
- `categoryId`: must match the source category.
- `title`: article headline.
- `summary`: short listing summary.
- `content`: manual digest or short edited body.
- `url`: public article URL.
- `language`: BCP 47-ish language code such as `zh-Hant`, `en`, `ja`.
- `publishedAt`: ISO 8601 datetime.
- `updatedAt`: ISO 8601 datetime.

## Optional Fields

- `imageUrl`: public image URL, or `null`.
- `tags`: array of search/filter tags.
- `editor`: editor handle.

## Add A Media Source

Edit `data/sources.json` and add a new item to `sources`:

```json
{
  "id": "new-source-id",
  "name": "媒體名稱",
  "categoryId": "hk-local",
  "homeUrl": "https://example.com",
  "language": ["zh-Hant"],
  "active": true
}
```

Choose one existing `categoryId`:

- `hk-overseas`
- `hk-local`
- `international-mainstream`
- `international-tech`

## Validation Checklist

Before pushing:

1. JSON has no trailing commas.
2. Every article `sourceId` exists.
3. Every article `categoryId` matches its source.
4. Every URL starts with `https://`.
5. `updatedAt` at the file top is changed.
6. `node tools/validate.mjs` passes.

## Publishing

```bash
git add data docs README.md index.html
git commit -m "Update news feed"
git push origin main
```

GitHub Pages usually updates within a minute.
