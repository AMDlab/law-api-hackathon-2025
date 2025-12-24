#!/usr/bin/env node
/**
 * 孤立した適用範囲条件ノードを最終判定に接続するスクリプト
 */
import { readFileSync, writeFileSync } from 'fs';

// エラーのあるファイル一覧
const errorFiles = [
  'data/diagrams/325CO0000000338/A137_10_P1_kijo.json',
  'data/diagrams/325CO0000000338/A137_11_2_P1_kijo.json',
  'data/diagrams/325CO0000000338/A137_11_3_P1_kijo.json',
  'data/diagrams/325CO0000000338/A137_12_P8_kijo.json',
  'data/diagrams/325CO0000000338/A137_2_2_P1_I1_kijo.json',
  'data/diagrams/325CO0000000338/A137_2_2_P1_kijo.json',
  'data/diagrams/325CO0000000338/A137_2_2_P2_kijo.json',
  'data/diagrams/325CO0000000338/A137_2_3_P1_kijo.json',
  'data/diagrams/325CO0000000338/A137_2_4_P1_kijo.json',
  'data/diagrams/325CO0000000338/A137_2_5_P1_kijo.json',
  'data/diagrams/325CO0000000338/A137_2_P1_kijo.json',
  'data/diagrams/325CO0000000338/A137_3_P1_I1_kijo.json',
  'data/diagrams/325CO0000000338/A137_3_P1_kijo.json',
  'data/diagrams/325CO0000000338/A137_4_2_P1_kijo.json',
  'data/diagrams/325CO0000000338/A137_4_P1_kijo.json',
  'data/diagrams/325CO0000000338/A137_5_P1_kijo.json',
  'data/diagrams/325CO0000000338/A137_6_2_P2_kijo.json',
  'data/diagrams/325CO0000000338/A137_6_3_P2_kijo.json',
  'data/diagrams/325CO0000000338/A137_6_4_P2_I1_kijo.json',
  'data/diagrams/325CO0000000338/A137_6_4_P2_kijo.json',
  'data/diagrams/325CO0000000338/A137_6_P1_kijo.json',
  'data/diagrams/325CO0000000338/A137_9_P1_kijo.json'
];

let fixedCount = 0;

for (const filePath of errorFiles) {
  try {
    const data = JSON.parse(readFileSync(filePath, 'utf-8'));
    const { nodes, edges } = data.kijo_diagram;

    // 最終判定プロセスノードを探す
    const finalProcNode = nodes.find(n =>
      n.type === 'process' &&
      (n.title.includes('最終') || n.title.includes('緩和適用') || n.title.includes('総合判定') || n.id.includes('final'))
    );

    if (!finalProcNode) {
      console.log('最終判定ノードが見つからない: ' + filePath);
      continue;
    }

    // 孤立している情報ノードを探す
    const nodesWithOutgoing = new Set(edges.map(e => e.from));
    const isolatedInfoNodes = nodes.filter(n => {
      if (n.type !== 'information') return false;
      if (nodesWithOutgoing.has(n.id)) return false;
      // 適用状況や工事種別のノードのみ対象
      return n.title.includes('法適用状況') || n.title.includes('工事種別') || n.title.includes('工事内容');
    });

    if (isolatedInfoNodes.length === 0) {
      console.log('孤立ノードなし: ' + filePath);
      continue;
    }

    // 新しいエッジIDを決定
    let maxEdgeNum = 0;
    for (const edge of edges) {
      const match = edge.id.match(/e?(\d+)/);
      if (match) {
        maxEdgeNum = Math.max(maxEdgeNum, parseInt(match[1]));
      }
    }

    for (const node of isolatedInfoNodes) {
      maxEdgeNum++;
      const newEdge = {
        id: 'e' + String(maxEdgeNum).padStart(2, '0'),
        from: node.id,
        to: finalProcNode.id,
        role: 'input'
      };
      edges.push(newEdge);
      console.log('追加: ' + filePath + ' - ' + node.id + ' -> ' + finalProcNode.id);
    }

    writeFileSync(filePath, JSON.stringify(data, null, 2));
    fixedCount++;
  } catch (err) {
    console.error('エラー: ' + filePath + ' - ' + err.message);
  }
}

console.log('\n修正完了: ' + fixedCount + '件');
