import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tempDir = path.join(__dirname, 'test_temp_dir');
const tempToolsDir = path.join(tempDir, 'tools');
const tempValidatorPath = path.join(tempToolsDir, 'validate.mjs');
const tempDataDir = path.join(tempDir, 'data');

// Setup baseline JSON payloads
const baseFeed = {
  schemaVersion: "1.0.0",
  updatedAt: "2026-06-09T00:00:00+08:00",
  defaultLocale: "zh-Hant-HK",
  endpoints: {
    sources: "data/sources.json",
    articles: "data/articles.json",
    feed: "data/feed.json"
  },
  sourcesUrl: "data/sources.json",
  articlesUrl: "data/articles.json",
  notes: ["Test note"]
};

const baseSources = {
  schemaVersion: "1.0.0",
  updatedAt: "2026-06-09T00:00:00+08:00",
  owner: "mmw1984",
  repository: "news-api",
  defaultLocale: "zh-Hant-HK",
  categories: [
    {
      id: "hk-local",
      name: "Local",
      description: "Local news"
    }
  ],
  sources: [
    {
      id: "the-collective-hk",
      name: "集誌社",
      categoryId: "hk-local",
      homeUrl: "https://view-link.cx/h7GFHKErq3p",
      language: ["zh-Hant"],
      active: true
    }
  ]
};

const baseArticles = {
  schemaVersion: "1.0.0",
  updatedAt: "2026-06-09T00:00:00+08:00",
  defaultLocale: "zh-Hant-HK",
  articles: [
    {
      id: "art-1",
      sourceId: "the-collective-hk",
      categoryId: "hk-local",
      title: "Title",
      summary: "Summary",
      content: "Content",
      url: "https://view-link.cx/art-1",
      imageUrl: "https://view-link.cx/image.png",
      language: "zh-Hant",
      tags: ["tag1"],
      publishedAt: "2026-06-09T00:00:00+08:00",
      updatedAt: "2026-06-09T00:00:00+08:00"
    }
  ]
};

// Initialize directories and copy validator
function setup() {
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempToolsDir, { recursive: true });
  fs.mkdirSync(tempDataDir, { recursive: true });
  fs.copyFileSync(path.join(__dirname, 'validate.mjs'), tempValidatorPath);
}

function cleanup() {
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function runValidator() {
  try {
    const stdout = execSync(`node "${tempValidatorPath}"`, { cwd: tempDir, encoding: 'utf8', stdio: 'pipe' });
    return { code: 0, output: stdout };
  } catch (error) {
    return { code: error.status || 1, output: error.stderr + error.stdout };
  }
}

function writePayloads(feed, sources, articles) {
  fs.writeFileSync(path.join(tempDataDir, 'feed.json'), JSON.stringify(feed, null, 2));
  fs.writeFileSync(path.join(tempDataDir, 'sources.json'), JSON.stringify(sources, null, 2));
  fs.writeFileSync(path.join(tempDataDir, 'articles.json'), JSON.stringify(articles, null, 2));
}

let failed = false;
function assert(testName, condition, detail) {
  if (!condition) {
    console.error(`❌ FAIL: ${testName}`);
    if (detail) console.error(detail);
    failed = true;
  } else {
    console.log(`✅ PASS: ${testName}`);
  }
}

try {
  setup();

  // Test Case 1: Happy Path
  {
    writePayloads(baseFeed, baseSources, baseArticles);
    const res = runValidator();
    assert("Happy Path should exit 0", res.code === 0, res.output);
  }

  // Test Case 2: Set Leak Vulnerability - Category ID
  // If category ID is invalid, it must not be added to the categories Set.
  // Therefore, a source with categoryId pointing to it must report "unknown categoryId".
  {
    const sourcesPayload = JSON.parse(JSON.stringify(baseSources));
    // Set invalid category id (contains underscore)
    sourcesPayload.categories[0].id = "hk_local";
    sourcesPayload.sources[0].categoryId = "hk_local";
    writePayloads(baseFeed, sourcesPayload, baseArticles);
    
    const res = runValidator();
    assert("Category Set Leak - Code should exit 1", res.code !== 0, res.output);
    assert("Category Set Leak - Should report invalid category id", res.output.includes("invalid category id: hk_local"), res.output);
    assert("Category Set Leak - Should report unknown categoryId because it was not added to the Set", res.output.includes("unknown categoryId hk_local"), res.output);
  }

  // Test Case 3: Set Leak Vulnerability - Source ID
  // If source ID is invalid, it must not be added to the sources Map.
  // Therefore, an article referencing it must report "unknown sourceId".
  {
    const sourcesPayload = JSON.parse(JSON.stringify(baseSources));
    const articlesPayload = JSON.parse(JSON.stringify(baseArticles));
    // Set invalid source id (contains underscore)
    sourcesPayload.sources[0].id = "the_collective_hk";
    articlesPayload.articles[0].sourceId = "the_collective_hk";
    writePayloads(baseFeed, sourcesPayload, articlesPayload);

    const res = runValidator();
    assert("Source Map Leak - Code should exit 1", res.code !== 0, res.output);
    assert("Source Map Leak - Should report invalid source id", res.output.includes("invalid source id: the_collective_hk"), res.output);
    assert("Source Map Leak - Should report unknown sourceId because it was not added to the Map", res.output.includes("unknown sourceId the_collective_hk"), res.output);
  }

  // Test Case 4: Set Leak Vulnerability - Article ID
  // If article ID is invalid, it must not be added to the articleIds Set.
  {
    const articlesPayload = JSON.parse(JSON.stringify(baseArticles));
    articlesPayload.articles[0].id = "art_1"; // Contains underscore
    writePayloads(baseFeed, baseSources, articlesPayload);

    const res = runValidator();
    assert("Article Set Leak - Code should exit 1", res.code !== 0, res.output);
    assert("Article Set Leak - Should report invalid article id format", res.output.includes("invalid article id format: art_1"), res.output);
  }

  // Test Case 5: Enforce view-link.cx Prefix
  {
    const sourcesPayload = JSON.parse(JSON.stringify(baseSources));
    sourcesPayload.sources[0].homeUrl = "https://example.com/foo";
    writePayloads(baseFeed, sourcesPayload, baseArticles);

    const res = runValidator();
    assert("Prefix check - Code should exit 1", res.code !== 0, res.output);
    assert("Prefix check - Should report homeUrl must start with https://view-link.cx/", res.output.includes("homeUrl must start with https://view-link.cx/"), res.output);
  }

  // Test Case 6: Make Tags Optional - Case A: omitted
  {
    const articlesPayload = JSON.parse(JSON.stringify(baseArticles));
    delete articlesPayload.articles[0].tags;
    writePayloads(baseFeed, baseSources, articlesPayload);

    const res = runValidator();
    assert("Omitted tags should exit 0", res.code === 0, res.output);
  }

  // Test Case 7: Make Tags Optional - Case B: present but not array
  {
    const articlesPayload = JSON.parse(JSON.stringify(baseArticles));
    articlesPayload.articles[0].tags = "invalid_tags";
    writePayloads(baseFeed, baseSources, articlesPayload);

    const res = runValidator();
    assert("Tags not array - Code should exit 1", res.code !== 0, res.output);
    assert("Tags not array - Should report tags must be an array", res.output.includes("tags must be an array"), res.output);
  }

  // Test Case 8: Make Tags Optional - Case C: array containing empty string
  {
    const articlesPayload = JSON.parse(JSON.stringify(baseArticles));
    articlesPayload.articles[0].tags = ["tag1", ""];
    writePayloads(baseFeed, baseSources, articlesPayload);

    const res = runValidator();
    assert("Empty tag - Code should exit 1", res.code !== 0, res.output);
    assert("Empty tag - Should report tags[1] must be a non-empty string", res.output.includes("tags[1] must be a non-empty string"), res.output);
  }

  // Test Case 9: Source with null/missing language should not crash the validator
  {
    const sourcesPayload = JSON.parse(JSON.stringify(baseSources));
    delete sourcesPayload.sources[0].language;
    writePayloads(baseFeed, sourcesPayload, baseArticles);

    const res = runValidator();
    assert("Missing source language should exit 1 (not crash)", res.code !== 0, res.output);
    assert("Missing source language should report language must be an array", res.output.includes("language must be an array"), res.output);
    assert("Missing source language should not crash with TypeError on article language check", !res.output.includes("TypeError"), res.output);
  }

  // Test Case 10: Null feed payload should not crash and report clean error
  {
    writePayloads(null, baseSources, baseArticles);
    const res = runValidator();
    assert("Null feed payload should exit 1", res.code !== 0, res.output);
    assert("Null feed payload should report clean error", res.output.includes("feed.json: payload must be a JSON object"), res.output);
    assert("Null feed payload should not crash with TypeError", !res.output.includes("TypeError"), res.output);
  }

  // Test Case 11: Null sources payload should not crash and report clean error
  {
    writePayloads(baseFeed, null, baseArticles);
    const res = runValidator();
    assert("Null sources payload should exit 1", res.code !== 0, res.output);
    assert("Null sources payload should report clean error", res.output.includes("sources.json: payload must be a JSON object"), res.output);
    assert("Null sources payload should not crash with TypeError", !res.output.includes("TypeError"), res.output);
  }

  // Test Case 12: Null articles payload should not crash and report clean error
  {
    writePayloads(baseFeed, baseSources, null);
    const res = runValidator();
    assert("Null articles payload should exit 1", res.code !== 0, res.output);
    assert("Null articles payload should report clean error", res.output.includes("articles.json: payload must be a JSON object"), res.output);
    assert("Null articles payload should not crash with TypeError", !res.output.includes("TypeError"), res.output);
  }

} finally {
  cleanup();
}

if (failed) {
  process.exit(1);
} else {
  console.log("All validator tests passed successfully!");
}
