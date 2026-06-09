#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = new URL('..', import.meta.url);
const readJson = (file) => JSON.parse(fs.readFileSync(new URL(file, root), 'utf8'));

const errors = [];

// Helper for ISO 8601 validation (supports Offset or Z)
const ISO_8601_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
function isValidDate(str) {
  if (typeof str !== 'string') return false;
  if (!ISO_8601_REGEX.test(str)) return false;
  const t = Date.parse(str);
  return !Number.isNaN(t);
}

// Read payloads
let feedPayload, sourcesPayload, articlesPayload;
try {
  feedPayload = readJson('data/feed.json');
  if (typeof feedPayload !== 'object' || feedPayload === null) {
    errors.push(`feed.json: payload must be a JSON object`);
  }
} catch (e) {
  errors.push(`Failed to read/parse data/feed.json: ${e.message}`);
}
try {
  sourcesPayload = readJson('data/sources.json');
  if (typeof sourcesPayload !== 'object' || sourcesPayload === null) {
    errors.push(`sources.json: payload must be a JSON object`);
  }
} catch (e) {
  errors.push(`Failed to read/parse data/sources.json: ${e.message}`);
}
try {
  articlesPayload = readJson('data/articles.json');
  if (typeof articlesPayload !== 'object' || articlesPayload === null) {
    errors.push(`articles.json: payload must be a JSON object`);
  }
} catch (e) {
  errors.push(`Failed to read/parse data/articles.json: ${e.message}`);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

// 1. Validate feed.json structure
if (feedPayload.schemaVersion !== '1.0.0') {
  errors.push(`feed.json: invalid schemaVersion: ${feedPayload.schemaVersion}`);
}
if (!isValidDate(feedPayload.updatedAt)) {
  errors.push(`feed.json: invalid updatedAt format: ${feedPayload.updatedAt}`);
}
if (typeof feedPayload.defaultLocale !== 'string' || feedPayload.defaultLocale.trim() === '') {
  errors.push(`feed.json: missing defaultLocale`);
}
if (!feedPayload.endpoints || typeof feedPayload.endpoints !== 'object') {
  errors.push(`feed.json: missing or invalid endpoints object`);
} else {
  if (feedPayload.endpoints.sources !== 'data/sources.json') {
    errors.push(`feed.json: endpoints.sources must be 'data/sources.json'`);
  }
  if (feedPayload.endpoints.articles !== 'data/articles.json') {
    errors.push(`feed.json: endpoints.articles must be 'data/articles.json'`);
  }
  if (feedPayload.endpoints.feed !== 'data/feed.json') {
    errors.push(`feed.json: endpoints.feed must be 'data/feed.json'`);
  }
}
if (feedPayload.sourcesUrl !== 'data/sources.json') {
  errors.push(`feed.json: sourcesUrl must be 'data/sources.json'`);
}
if (feedPayload.articlesUrl !== 'data/articles.json') {
  errors.push(`feed.json: articlesUrl must be 'data/articles.json'`);
}
if (!Array.isArray(feedPayload.notes)) {
  errors.push(`feed.json: notes must be an array`);
} else {
  feedPayload.notes.forEach((note, idx) => {
    if (typeof note !== 'string') errors.push(`feed.json: notes[${idx}] must be a string`);
  });
}

// 2. Validate sources.json structure
if (sourcesPayload.schemaVersion !== '1.0.0') {
  errors.push(`sources.json: invalid schemaVersion: ${sourcesPayload.schemaVersion}`);
}
if (!isValidDate(sourcesPayload.updatedAt)) {
  errors.push(`sources.json: invalid updatedAt format: ${sourcesPayload.updatedAt}`);
}
if (sourcesPayload.owner !== 'mmw1984') {
  errors.push(`sources.json: invalid owner: ${sourcesPayload.owner}`);
}
if (sourcesPayload.repository !== 'news-api') {
  errors.push(`sources.json: invalid repository: ${sourcesPayload.repository}`);
}
if (sourcesPayload.defaultLocale !== feedPayload.defaultLocale) {
  errors.push(`sources.json: defaultLocale (${sourcesPayload.defaultLocale}) does not match feed.json (${feedPayload.defaultLocale})`);
}
if (!Array.isArray(sourcesPayload.categories)) {
  errors.push(`sources.json: categories must be an array`);
}
if (!Array.isArray(sourcesPayload.sources)) {
  errors.push(`sources.json: sources must be an array`);
}

// Compile Categories and Sources
const categories = new Set();
if (Array.isArray(sourcesPayload.categories)) {
  const catIds = new Set();
  for (const cat of sourcesPayload.categories) {
    if (!cat || typeof cat !== 'object') {
      errors.push(`sources.json: category entry is not an object`);
      continue;
    }
    const isValidId = typeof cat.id === 'string' && /^[a-z0-9-]+$/.test(cat.id);
    if (!isValidId) {
      errors.push(`sources.json: invalid category id: ${cat.id}`);
    } else {
      if (catIds.has(cat.id)) {
        errors.push(`sources.json: duplicate category id: ${cat.id}`);
      }
      catIds.add(cat.id);
      categories.add(cat.id);
    }

    if (typeof cat.name !== 'string' || cat.name.trim() === '') {
      errors.push(`sources.json: category ${cat.id} has missing/empty name`);
    }
    if (typeof cat.description !== 'string' || cat.description.trim() === '') {
      errors.push(`sources.json: category ${cat.id} has missing/empty description`);
    }
  }
}

const sources = new Map();
if (Array.isArray(sourcesPayload.sources)) {
  for (const source of sourcesPayload.sources) {
    if (!source || typeof source !== 'object') {
      errors.push(`sources.json: source entry is not an object`);
      continue;
    }
    const isValidId = typeof source.id === 'string' && /^[a-z0-9-]+$/.test(source.id);
    if (!isValidId) {
      errors.push(`sources.json: invalid source id: ${source.id}`);
    } else {
      if (sources.has(source.id)) {
        errors.push(`sources.json: duplicate source id: ${source.id}`);
      }
      sources.set(source.id, source);
    }

    if (typeof source.name !== 'string' || source.name.trim() === '') {
      errors.push(`sources.json: source ${source.id} has missing/empty name`);
    }
    if (!categories.has(source.categoryId)) {
      errors.push(`sources.json: source ${source.id} has unknown categoryId ${source.categoryId}`);
    }
    if (typeof source.homeUrl !== 'string' || !source.homeUrl.startsWith('https://view-link.cx/')) {
      errors.push(`sources.json: source ${source.id} homeUrl must start with https://view-link.cx/`);
    }
    if (!Array.isArray(source.language)) {
      errors.push(`sources.json: source ${source.id} language must be an array`);
    } else {
      if (source.language.length === 0) {
        errors.push(`sources.json: source ${source.id} language array cannot be empty`);
      }
      source.language.forEach((lang, idx) => {
        if (typeof lang !== 'string' || lang.trim() === '') {
          errors.push(`sources.json: source ${source.id} language[${idx}] must be a non-empty string`);
        }
      });
    }
    if (typeof source.active !== 'boolean') {
      errors.push(`sources.json: source ${source.id} active must be a boolean`);
    }
  }
}

// 3. Validate articles.json structure
if (articlesPayload.schemaVersion !== '1.0.0') {
  errors.push(`articles.json: invalid schemaVersion: ${articlesPayload.schemaVersion}`);
}
if (!isValidDate(articlesPayload.updatedAt)) {
  errors.push(`articles.json: invalid updatedAt format: ${articlesPayload.updatedAt}`);
}
if (articlesPayload.defaultLocale !== feedPayload.defaultLocale) {
  errors.push(`articles.json: defaultLocale (${articlesPayload.defaultLocale}) does not match feed.json (${feedPayload.defaultLocale})`);
}
if (!Array.isArray(articlesPayload.articles)) {
  errors.push(`articles.json: articles must be an array`);
}

// Cross-file updatedAt synchronization check
if (
  isValidDate(feedPayload.updatedAt) &&
  isValidDate(sourcesPayload.updatedAt) &&
  isValidDate(articlesPayload.updatedAt)
) {
  if (feedPayload.updatedAt !== sourcesPayload.updatedAt || feedPayload.updatedAt !== articlesPayload.updatedAt) {
    errors.push(
      `Cross-file Sync Warning: updatedAt values are not synchronized:\n` +
      `  feed.json:    ${feedPayload.updatedAt}\n` +
      `  sources.json: ${sourcesPayload.updatedAt}\n` +
      `  articles.json:${articlesPayload.updatedAt}`
    );
  }
}

const articleIds = new Set();
if (Array.isArray(articlesPayload.articles)) {
  for (const article of articlesPayload.articles) {
    if (!article || typeof article !== 'object') {
      errors.push(`articles.json: article entry is not an object`);
      continue;
    }
    const isValidId = typeof article.id === 'string' && /^[a-z0-9-]+$/.test(article.id);
    if (!isValidId) {
      errors.push(`articles.json: invalid article id format: ${article.id}`);
    } else {
      if (articleIds.has(article.id)) {
        errors.push(`articles.json: duplicate article id: ${article.id}`);
      }
      articleIds.add(article.id);
    }

    if (!sources.has(article.sourceId)) {
      errors.push(`articles.json: article ${article.id} has unknown sourceId ${article.sourceId}`);
    }
    if (!categories.has(article.categoryId)) {
      errors.push(`articles.json: article ${article.id} has unknown categoryId ${article.categoryId}`);
    }

    const source = sources.get(article.sourceId);
    if (source) {
      if (source.categoryId !== article.categoryId) {
        errors.push(`articles.json: article ${article.id} categoryId ${article.categoryId} does not match source ${source.id} category (${source.categoryId})`);
      }
      // Check that article language matches one of the source's supported languages
      if (typeof article.language === 'string' && Array.isArray(source.language) && !source.language.includes(article.language)) {
        errors.push(`articles.json: article ${article.id} language '${article.language}' is not supported by source '${source.id}' (${JSON.stringify(source.language)})`);
      }
    }

    for (const key of ['title', 'summary', 'content', 'url', 'language', 'publishedAt', 'updatedAt']) {
      if (typeof article[key] !== 'string' || article[key].trim() === '') {
        errors.push(`articles.json: article ${article.id} missing or empty string field ${key}`);
      }
    }

    if (typeof article.url === 'string' && !article.url.startsWith('https://')) {
      errors.push(`articles.json: article ${article.id} url must start with https://`);
    }

    if (article.imageUrl !== null && article.imageUrl !== undefined && !String(article.imageUrl).startsWith('https://')) {
      errors.push(`articles.json: article ${article.id} imageUrl must be null or start with https://`);
    }

    if (article.tags !== undefined) {
      if (!Array.isArray(article.tags)) {
        errors.push(`articles.json: article ${article.id} tags must be an array`);
      } else {
        article.tags.forEach((tag, idx) => {
          if (typeof tag !== 'string' || tag.trim() === '') {
            errors.push(`articles.json: article ${article.id} tags[${idx}] must be a non-empty string`);
          }
        });
      }
    }

    if (article.publishedAt && !isValidDate(article.publishedAt)) {
      errors.push(`articles.json: article ${article.id} invalid publishedAt date format: ${article.publishedAt}`);
    }
    if (article.updatedAt && !isValidDate(article.updatedAt)) {
      errors.push(`articles.json: article ${article.id} invalid updatedAt date format: ${article.updatedAt}`);
    }
    if (article.editor !== undefined && (typeof article.editor !== 'string' || article.editor.trim() === '')) {
      errors.push(`articles.json: article ${article.id} has empty or non-string editor field`);
    }
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(`OK: feed.json matches sources (${sources.size} items) and articles (${articleIds.size} items)`);
