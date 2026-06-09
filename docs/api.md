# API Docs

Base URL after GitHub Pages is enabled:

```text
https://mmw1984.com/news-api/
```

All endpoints return static JSON. There is no authentication and no server-side filtering.

## General Constraints

- **schemaVersion**: Must be exactly `"1.0.0"`.
- **Language**:
  - For sources (`sources.json`), the `language` field is an array of non-empty strings representing languages supported by the source (e.g. `["zh-Hant"]` or `["en"]`).
  - For articles (`articles.json`), the `language` field is a single non-empty string representing the language of the article (e.g. `"zh-Hant"`), and it must match one of the language codes supported by its source.
- **Date Format (ISO 8601)**: All date-time fields (`updatedAt` and `publishedAt`) must follow the ISO 8601 format with an explicit time offset or UTC designator (e.g. `2026-06-09T00:00:00+08:00` or `2026-06-09T00:00:00Z`).


## `GET /data/sources.json`

Returns source categories and media outlets.

Example:

```bash
curl https://mmw1984.com/news-api/data/sources.json
```

Response shape:

```ts
type SourcesResponse = {
  schemaVersion: string;
  updatedAt: string;
  owner: string;
  repository: string;
  defaultLocale: string;
  categories: SourceCategory[];
  sources: Source[];
};

type SourceCategory = {
  id: 'hk-overseas' | 'hk-local' | 'international-mainstream' | 'international-tech';
  name: string;
  description: string;
};

type Source = {
  id: string;
  name: string;
  categoryId: string;
  homeUrl: string;
  language: string[];
  active: boolean;
};
```

## `GET /data/articles.json`

Returns manually entered news articles.

Example:

```bash
curl https://mmw1984.com/news-api/data/articles.json
```

Response shape:

```ts
type ArticlesResponse = {
  schemaVersion: string;
  updatedAt: string;
  defaultLocale: string;
  articles: Article[];
};

type Article = {
  id: string;
  sourceId: string;
  categoryId: string;
  title: string;
  summary: string;
  content: string;
  url: string;
  imageUrl: string | null;
  language: string;
  tags: string[];
  publishedAt: string;
  updatedAt: string;
  editor?: string;
};
```

## `GET /data/feed.json`

Returns lightweight endpoint metadata. Apps can fetch this first if they want endpoint discovery.

```ts
type FeedMetadata = {
  schemaVersion: string;
  updatedAt: string;
  defaultLocale: string;
  endpoints: {
    sources: string;
    articles: string;
    feed: string;
  };
  sourcesUrl: string;
  articlesUrl: string;
  notes: string[];
};
```

## App Recommendations

- Cache the last successful `sources.json` and `articles.json` response.
- Resolve `feed.json` endpoint paths relative to the API base URL. For this project, `data/sources.json` resolves to `https://mmw1984.com/news-api/data/sources.json`.
- Sort articles by `publishedAt` descending.
- Filter by `categoryId`, `sourceId`, `language`, and `tags` on the client.
- Treat missing `imageUrl` as normal.
- Show `summary` in lists and `content` in detail view.
- Open `url` externally for full article reading.

## Error Handling

Because this is GitHub Pages, common client errors are:

- `404`: file path wrong or repo Pages not enabled.
- `403`: GitHub Pages unavailable or blocked by network.
- JSON parse error: manual edit introduced invalid JSON.

The Android app should keep showing cached content if a fetch fails.
