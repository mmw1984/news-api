#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = new URL('..', import.meta.url);
const readJson = (file) => JSON.parse(fs.readFileSync(new URL(file, root), 'utf8'));

const sourcesPayload = readJson('data/sources.json');
const articlesPayload = readJson('data/articles.json');

const categories = new Set(sourcesPayload.categories.map((category) => category.id));
const sources = new Map(sourcesPayload.sources.map((source) => [source.id, source]));
const ids = new Set();
const errors = [];

for (const source of sourcesPayload.sources) {
  if (!/^[a-z0-9-]+$/.test(source.id)) errors.push(`Invalid source id: ${source.id}`);
  if (!categories.has(source.categoryId)) errors.push(`Source ${source.id} has unknown categoryId ${source.categoryId}`);
  if (!source.homeUrl.startsWith('https://')) errors.push(`Source ${source.id} homeUrl must start with https://`);
}

for (const article of articlesPayload.articles) {
  if (ids.has(article.id)) errors.push(`Duplicate article id: ${article.id}`);
  ids.add(article.id);

  if (!/^[a-z0-9-]+$/.test(article.id)) errors.push(`Invalid article id: ${article.id}`);
  if (!sources.has(article.sourceId)) errors.push(`Article ${article.id} has unknown sourceId ${article.sourceId}`);
  if (!categories.has(article.categoryId)) errors.push(`Article ${article.id} has unknown categoryId ${article.categoryId}`);

  const source = sources.get(article.sourceId);
  if (source && source.categoryId !== article.categoryId) {
    errors.push(`Article ${article.id} categoryId ${article.categoryId} does not match source ${source.id}`);
  }

  for (const key of ['title', 'summary', 'content', 'url', 'language', 'publishedAt', 'updatedAt']) {
    if (typeof article[key] !== 'string' || article[key].trim() === '') {
      errors.push(`Article ${article.id} missing string field ${key}`);
    }
  }

  if (typeof article.url === 'string' && !article.url.startsWith('https://')) {
    errors.push(`Article ${article.id} url must start with https://`);
  }

  if (article.imageUrl !== null && article.imageUrl !== undefined && !String(article.imageUrl).startsWith('https://')) {
    errors.push(`Article ${article.id} imageUrl must be null or https://`);
  }

  if (!Array.isArray(article.tags)) errors.push(`Article ${article.id} tags must be an array`);
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(`OK: ${sources.size} sources, ${articlesPayload.articles.length} articles`);
