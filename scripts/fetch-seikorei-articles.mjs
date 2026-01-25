#!/usr/bin/env node
/**
 * 施行令チェックリストの条文をe-Gov APIから取得してキャッシュ
 * Usage: node scripts/fetch-seikorei-articles.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const LAW_ID = '325CO0000000338'; // 建築基準法施行令
const LAW_NAME = '建築基準法施行令';
const CACHE_DIR = path.join(ROOT, 'data', 'law-articles', LAW_ID);

// チェックリストから条番号を抽出
function getArticleNumbers() {
  const csvPath = path.join(ROOT, '.claude', 'skills', '施行令チェックリスト.csv');
  const csv = fs.readFileSync(csvPath, 'utf8');
  const lines = csv.split('\n').slice(1).filter(l => l.trim());

  const articles = new Set();
  for (const line of lines) {
    const parts = line.split(',');
    const law = parts[0]?.trim(); // 例: 令第19条
    if (law && law.startsWith('令第')) {
      // 「令第19条」→「19」、「令第20条の2」→「20_2」
      const match = law.match(/令第(\d+)条(?:の(\d+))?/);
      if (match) {
        const article = match[2] ? `${match[1]}_${match[2]}` : match[1];
        articles.add(article);
      }
    }
  }
  return Array.from(articles).sort((a, b) => {
    const [a1, a2] = a.split('_').map(Number);
    const [b1, b2] = b.split('_').map(Number);
    if (a1 !== b1) return a1 - b1;
    return (a2 || 0) - (b2 || 0);
  });
}

// e-Gov API から条文を取得
async function fetchArticle(article) {
  // article: "19" or "20_2"
  const articleNum = article.replace('_', 'の');
  const url = `https://laws.e-gov.go.jp/api/1/articles;lawId=${LAW_ID};article=${articleNum}`;

  console.log(`Fetching: 令第${articleNum}条...`);

  const response = await fetch(url);
  if (!response.ok) {
    console.error(`  Error: ${response.status}`);
    return null;
  }

  const xml = await response.text();

  // XMLからテキストを抽出
  const text = extractTextFromXml(xml);

  return {
    law_id: LAW_ID,
    law_name: LAW_NAME,
    article: article,
    text: text,
    raw_xml: xml,
    fetched_at: new Date().toISOString()
  };
}

// XMLからテキストを抽出
function extractTextFromXml(xml) {
  const lines = [];

  // ArticleCaption (条見出し)
  const captionMatch = xml.match(/<ArticleCaption>([^<]+)<\/ArticleCaption>/);
  if (captionMatch) {
    lines.push(captionMatch[1]);
  }

  // ArticleTitle (条番号)
  const titleMatch = xml.match(/<ArticleTitle>([^<]+)<\/ArticleTitle>/);
  if (titleMatch) {
    lines.push(titleMatch[1]);
  }

  // Sentence (本文)
  const sentenceMatches = xml.matchAll(/<Sentence[^>]*>([^<]+)<\/Sentence>/g);
  for (const match of sentenceMatches) {
    lines.push(match[1]);
  }

  // ItemTitle + ItemSentence (号)
  const itemMatches = xml.matchAll(/<ItemTitle>([^<]+)<\/ItemTitle>\s*<ItemSentence>\s*<Sentence[^>]*>([^<]+)<\/Sentence>/g);
  for (const match of itemMatches) {
    lines.push(`${match[1]} ${match[2]}`);
  }

  return lines.join('\n');
}

// ノードからテキストを再帰的に抽出
function extractText(node, depth = 0) {
  if (!node) return '';

  let text = '';

  if (node.text) {
    text += node.text;
  }

  if (node.children && Array.isArray(node.children)) {
    for (const child of node.children) {
      text += extractText(child, depth + 1);
    }
  }

  return text;
}

// メイン処理
async function main() {
  // キャッシュディレクトリ作成
  fs.mkdirSync(CACHE_DIR, { recursive: true });

  const articles = getArticleNumbers();
  console.log(`Found ${articles.length} unique articles to fetch`);

  let fetched = 0;
  let skipped = 0;
  let errors = 0;

  for (const article of articles) {
    const cacheFile = path.join(CACHE_DIR, `A${article}.json`);

    // キャッシュが存在する場合はスキップ
    if (fs.existsSync(cacheFile)) {
      skipped++;
      continue;
    }

    const data = await fetchArticle(article);
    if (data) {
      fs.writeFileSync(cacheFile, JSON.stringify(data, null, 2), 'utf8');
      fetched++;
    } else {
      errors++;
    }

    // API rate limit対策
    await new Promise(r => setTimeout(r, 500));
  }

  console.log('');
  console.log('=== Summary ===');
  console.log(`Total articles: ${articles.length}`);
  console.log(`Fetched: ${fetched}`);
  console.log(`Skipped (cached): ${skipped}`);
  console.log(`Errors: ${errors}`);
}

main().catch(console.error);
