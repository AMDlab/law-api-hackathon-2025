#!/usr/bin/env node
/**
 * 機序図のkijo-generatorルール検証スクリプト
 *
 * チェック項目:
 * 1. 孤立ノード（edgesに含まれないノード）
 * 2. informationノードにprocessノードからの入力がないもの
 * 3. information→informationの直接接続（禁止）
 * 4. エッジのroleが正しいか（info→process: input, process→info: output）
 */
import { readFileSync, readdirSync, statSync } from 'fs'
import { join, resolve } from 'path'

// 機序図ファイルを検索
function findKijoFiles(pattern) {
  const diagramsDir = resolve('data/diagrams')
  const files = []

  function scan(dir) {
    const entries = readdirSync(dir)
    for (const entry of entries) {
      const fullPath = join(dir, entry)
      const stat = statSync(fullPath)

      if (stat.isDirectory()) {
        scan(fullPath)
      } else if (entry.endsWith('_kijo.json')) {
        if (!pattern || fullPath.includes(pattern)) {
          files.push(fullPath)
        }
      }
    }
  }

  scan(diagramsDir)
  return files
}

// ルール検証
function validateKijoRules(filePath) {
  const errors = []

  try {
    const content = readFileSync(filePath, 'utf-8')
    const data = JSON.parse(content)

    if (!data.kijo_diagram) {
      return { file: filePath, errors: ['kijo_diagramが存在しません'] }
    }

    const { nodes, edges } = data.kijo_diagram

    if (!nodes || !edges) {
      return { file: filePath, errors: ['nodesまたはedgesが存在しません'] }
    }

    // ノードIDのマップを作成
    const nodeMap = new Map()
    for (const node of nodes) {
      nodeMap.set(node.id, node)
    }

    // エッジに含まれるノードIDを収集
    const connectedNodes = new Set()
    for (const edge of edges) {
      connectedNodes.add(edge.from)
      connectedNodes.add(edge.to)
    }

    // 1. 孤立ノードのチェック
    for (const node of nodes) {
      if (!connectedNodes.has(node.id)) {
        errors.push(`孤立ノード: ${node.id} (${node.title})`)
      }
    }

    // 1b. 終端でない孤立始点ノードのチェック（出力があるが最終的に使われていないノード）
    // 始点ノード（入力エッジを持たない）と終点ノード（出力エッジを持たない）を特定
    const nodesWithIncoming = new Set()
    const nodesWithOutgoing = new Set()
    for (const edge of edges) {
      nodesWithIncoming.add(edge.to)
      nodesWithOutgoing.add(edge.from)
    }

    // 終点ノード（出力エッジなし）を特定
    const terminalNodes = new Set()
    for (const node of nodes) {
      if (!nodesWithOutgoing.has(node.id) && connectedNodes.has(node.id)) {
        terminalNodes.add(node.id)
      }
    }

    // 始点ノードから終点ノードへ到達可能かチェック（逆方向にBFS）
    const reachableFromTerminal = new Set()
    const queue = [...terminalNodes]
    while (queue.length > 0) {
      const current = queue.shift()
      if (reachableFromTerminal.has(current)) continue
      reachableFromTerminal.add(current)
      // このノードへ入力しているノードを追加
      for (const edge of edges) {
        if (edge.to === current && !reachableFromTerminal.has(edge.from)) {
          queue.push(edge.from)
        }
      }
    }

    // 終点から到達できないノード（孤立した部分グラフ）を検出
    for (const node of nodes) {
      if (connectedNodes.has(node.id) && !reachableFromTerminal.has(node.id)) {
        errors.push(`終点に到達しない孤立部分グラフ: ${node.id} (${node.title})`)
      }
    }

    // 1c. 終点情報ノードのチェック
    // 「既存建築物の法適用状況」「工事種別」「工事内容」など適用範囲を示す情報ノードが
    // 最終判定に接続されていない場合は警告
    const terminalInfoNodes = [...terminalNodes].filter(id => {
      const node = nodeMap.get(id)
      return node && node.type === 'information'
    })

    // 適用範囲条件を示すキーワード（これらが終点になっている場合は孤立の可能性が高い）
    // ただし、その号自体の機序図であれば最終結果として終点でOK
    const scopeConditionKeywords = ['法適用状況', '工事種別', '工事内容', '本項適用該当', '条適用完了', '適用範囲該当', '適用範囲']
    // 最終結果ノードを示すキーワード（これらは終点でOK）
    const finalResultKeywords = ['適合', '判定', '適用除外', '結果', '最終', '適用時', '基準適合', '号該当', '項該当', '条該当']

    // 1d. *-applicability ノードが最終判定に接続されているかチェック（IDベース）
    // 適用範囲を示すノード（*-applicability, *-scope）が終点になっている場合は警告
    for (const id of terminalInfoNodes) {
      // 既にfinalResultキーワードで許可されているものはスキップ
      const node = nodeMap.get(id)
      const isFinalResult = finalResultKeywords.some(kw => node.title.includes(kw))
      if (isFinalResult) continue

      // IDが -applicability や -scope で終わるものは適用範囲判定結果
      if (id.endsWith('-applicability') || id.endsWith('-scope')) {
        errors.push(`適用範囲ノードが最終判定に接続されていない: ${id} (${node.title})`)
      }
    }

    for (const id of terminalInfoNodes) {
      const node = nodeMap.get(id)
      // 最終結果系のノードは終点でOK
      const isFinalResult = finalResultKeywords.some(kw => node.title.includes(kw))
      if (isFinalResult) continue

      // 適用範囲条件系のノードが終点になっている場合は警告
      const isScopeCondition = scopeConditionKeywords.some(kw =>
        node.title.includes(kw) || (node.description && node.description.includes(kw))
      )
      if (isScopeCondition) {
        errors.push(`適用範囲条件ノードが最終判定に接続されていない: ${id} (${node.title})`)
      }
    }

    // 2. informationノードにprocessからの入力があるかチェック
    // 3. information→informationの直接接続チェック
    // 4. エッジのroleチェック
    for (const edge of edges) {
      const fromNode = nodeMap.get(edge.from)
      const toNode = nodeMap.get(edge.to)

      if (!fromNode) {
        errors.push(`エッジ${edge.id}: fromノード "${edge.from}" が存在しません`)
        continue
      }
      if (!toNode) {
        errors.push(`エッジ${edge.id}: toノード "${edge.to}" が存在しません`)
        continue
      }

      // information→informationは禁止
      if (fromNode.type === 'information' && toNode.type === 'information') {
        errors.push(`禁止パターン: information→information (${edge.from} → ${edge.to})`)
      }

      // roleチェック
      if (fromNode.type === 'information' && toNode.type === 'process') {
        if (edge.role !== 'input') {
          errors.push(`エッジ${edge.id}: info→processはrole="input"であるべき (現在: ${edge.role})`)
        }
      }
      if (fromNode.type === 'process' && toNode.type === 'information') {
        if (edge.role !== 'output') {
          errors.push(`エッジ${edge.id}: process→infoはrole="output"であるべき (現在: ${edge.role})`)
        }
      }
    }

    // informationノードへの入力元チェック（processからの入力があるか）
    const infoNodesWithProcessInput = new Set()
    for (const edge of edges) {
      const fromNode = nodeMap.get(edge.from)
      const toNode = nodeMap.get(edge.to)
      if (fromNode && toNode && fromNode.type === 'process' && toNode.type === 'information') {
        infoNodesWithProcessInput.add(edge.to)
      }
    }

    for (const node of nodes) {
      if (node.type === 'information' && !infoNodesWithProcessInput.has(node.id)) {
        // informationノードだがprocessからの出力がない
        // ただし、最初の入力情報である場合は許容される場合もある
        // エッジで「to」として登場しないなら孤立ではなく入力情報
        let hasIncomingEdge = false
        for (const edge of edges) {
          if (edge.to === node.id) {
            hasIncomingEdge = true
            break
          }
        }
        if (hasIncomingEdge) {
          errors.push(`informationノード "${node.id}" にprocessからの入力がありません`)
        }
      }
    }

    return { file: filePath, errors }
  } catch (error) {
    return { file: filePath, errors: [`パースエラー: ${error.message}`] }
  }
}

// メイン処理
const pattern = process.argv[2]
const files = findKijoFiles(pattern)

console.log(`\n機序図ルール検証 (kijo-generator準拠)`)
console.log(`対象: ${files.length}件\n`)

let validCount = 0
let invalidCount = 0
const allErrors = []

for (const file of files) {
  const result = validateKijoRules(file)

  if (result.errors.length === 0) {
    validCount++
  } else {
    invalidCount++
    const relativePath = file.replace(process.cwd(), '').replace(/\\/g, '/')
    console.log(`✗ ${relativePath}`)
    for (const error of result.errors) {
      console.log(`  - ${error}`)
    }
    allErrors.push({ file: relativePath, errors: result.errors })
  }
}

console.log(`\n結果: ${validCount}件OK, ${invalidCount}件エラー`)

if (invalidCount > 0) {
  console.log(`\n=== エラーサマリー ===`)
  // エラー種別ごとにカウント
  const errorTypes = {}
  for (const item of allErrors) {
    for (const err of item.errors) {
      const type = err.split(':')[0]
      errorTypes[type] = (errorTypes[type] || 0) + 1
    }
  }
  for (const [type, count] of Object.entries(errorTypes)) {
    console.log(`  ${type}: ${count}件`)
  }
}

process.exit(invalidCount > 0 ? 1 : 0)
