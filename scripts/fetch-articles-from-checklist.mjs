#!/usr/bin/env node
/**
 * チェックリストから必要な条文を一括取得
 * 出力先: data/law-articles/{法令ID}/A{条}_P{項}.json
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

const API_BASE_URL = 'https://laws.e-gov.go.jp/api/2'
const LAW_IDS = {
  '建築基準法': '325AC0000000201',
  '建築基準法施行令': '325CO0000000338',
  '建築基準法施行規則': '325M50004000040'
}

async function fetchLawData(lawId) {
  console.log(`法令データ取得中: ${lawId}`)
  const listRes = await fetch(`${API_BASE_URL}/laws?law_id=${lawId}`)
  const listData = await listRes.json()
  const revisionId = listData.laws[0].revision_info.law_revision_id

  const dataRes = await fetch(`${API_BASE_URL}/law_data/${revisionId}`)
  const data = await dataRes.json()
  return data.law_full_text
}

function findArticle(node, articleNum) {
  if (typeof node === 'string') return null
  if (node.tag === 'Article' && node.attr?.Num === articleNum) return node
  if (node.children) {
    for (const child of node.children) {
      const result = findArticle(child, articleNum)
      if (result) return result
    }
  }
  return null
}

function getText(node) {
  if (typeof node === 'string') return node
  if (!node.children) return ''
  return node.children.map(child => getText(child)).join('')
}

function extractArticleText(article) {
  const parts = []
  const caption = article.children?.find(c => typeof c !== 'string' && c.tag === 'ArticleCaption')
  if (caption) parts.push(getText(caption))

  const title = article.children?.find(c => typeof c !== 'string' && c.tag === 'ArticleTitle')
  if (title) parts.push(getText(title))

  const paragraphs = article.children?.filter(c => typeof c !== 'string' && c.tag === 'Paragraph') || []
  paragraphs.forEach(p => parts.push(getText(p)))

  return parts.join('\n')
}

async function processLaw(lawName, lawId, pattern, labelPrefix) {
  console.log(`\n=== ${lawName} ===`)

  // チェックリスト読み込み（BOM除去）
  const csvPath = '.claude/skills/確認審査報告書チェックリスト.csv'
  let csv = readFileSync(csvPath, 'utf-8')
  csv = csv.replace(/^\uFEFF/, '') // BOM除去
  const lines = csv.split('\n').slice(2) // ヘッダースキップ

  // 必要な条文をパース（ファイル名から抽出）
  const articles = new Set()
  for (const line of lines) {
    if (!line.trim()) continue
    // 法令種別でフィルタ
    if (!line.match(pattern)) continue

    // ファイル名から条文番号を抽出: A19_P1_kijo.json → 19
    const filenameMatch = line.match(/A(\d+(?:_\d+)?)_P\d+/)
    if (filenameMatch) {
      // A28_2_P1 → 28の2
      const articleNum = filenameMatch[1].replace(/_/g, 'の')
      articles.add(articleNum)
    }
  }

  if (articles.size === 0) {
    console.log('対象条文なし')
    return 0
  }

  console.log(`取得対象条文: ${articles.size}件`)
  console.log([...articles].sort((a, b) => parseInt(a) - parseInt(b)).join(', '))

  // 法令データ取得
  const lawData = await fetchLawData(lawId)

  // 出力ディレクトリ作成
  const outDir = join('data', 'law-articles', lawId)
  mkdirSync(outDir, { recursive: true })

  // 各条文を抽出して保存
  let successCount = 0
  for (const articleNum of articles) {
    // API側は"の"ではなく"_"を使用: "28の2" → "28_2"
    const apiArticleNum = articleNum.replace(/の/g, '_')
    const article = findArticle(lawData, apiArticleNum)
    if (!article) {
      console.warn(`⚠ 条文が見つかりません: 第${articleNum}条`)
      continue
    }

    const text = extractArticleText(article)
    const output = {
      law_id: lawId,
      law_name: lawName,
      article: articleNum,
      text: text,
      raw_node: article,
      fetched_at: new Date().toISOString()
    }

    // ファイル名はアンダースコア形式（機械可読性のため）
    const filenameArticle = articleNum.replace(/の/g, '_')
    const filename = `${labelPrefix}${filenameArticle}.json`
    const filepath = join(outDir, filename)
    writeFileSync(filepath, JSON.stringify(output, null, 2), 'utf-8')
    console.log(`✓ ${filename}`)
    successCount++
  }

  console.log(`完了: ${successCount}件の条文を保存`)
  console.log(`保存先: ${outDir}`)
  return successCount
}

async function main() {
  let totalCount = 0

  // 建築基準法
  totalCount += await processLaw(
    '建築基準法',
    LAW_IDS['建築基準法'],
    /^法第(\d+(?:の\d+)?)条,/,
    'A'
  )

  // 建築基準法施行令
  totalCount += await processLaw(
    '建築基準法施行令',
    LAW_IDS['建築基準法施行令'],
    /^令第(\d+(?:の\d+)?)条,/,
    'A'
  )

  console.log(`\n=== 全体 ===`)
  console.log(`合計: ${totalCount}件の条文を保存しました`)
}

main().catch(console.error)
