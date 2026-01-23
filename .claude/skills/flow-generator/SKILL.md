---
name: flow-generator
description: 機序図JSONから適合判定フロー図を生成するスキル。「フロー図を作成」「フロー図を生成」「適合判定フロー」等のリクエストで使用。機序図を元にした条件分岐フローチャートを作成し、法適合判定の手順を可視化する。
---

# 適合判定フロー図生成スキル

## 前提条件

機序図JSON（`*_kijo.json`）が必要。存在しない場合は先に機序図を作成。

## 作業フロー

### STEP 1: スキーマ読み込み
`schemas/flow-diagram.schema.json` を読む

### STEP 2: 機序図読み込み
対象: `data/diagrams/{法令ID}/A{条}_P{項}_kijo.json`

抽出:
1. `kijo_diagram.nodes` - 情報・処理ノード
2. `compliance_logic` - 適用範囲・判定ルール
3. `logic_expression` - フロー分岐の基礎

### STEP 3: 論理式→フロー変換

| logic_expression | decision |
|---|---|
| `A > 1500` | 「延べ面積 > 1500㎡？」 |
| `T ∈ {準耐火, 耐火}` | 「準耐火建築物等か？」 |
| `E1 OR E2 OR E3` | 各号を個別decisionに展開 |

### STEP 4: JSON出力
出力先: `data/diagrams/{法令ID}/A{条}_P{項}_flow.json`

## 重要ルール

詳細は [references/rules.md](references/rules.md) 参照。

**核心ルール:**
1. **「〜を特定したか？」分岐は禁止** - 結果の値で分岐
2. **classification → multi分岐** - 区分情報は多方向分岐
3. **フロー図decision数 >= 機序図process数**
4. **各号該当時は途中経過ノード必須**

## 分岐タイプ

### binary（yes/no）
```json
{
  "type": "decision",
  "title": "耐火建築物等か？",
  "decision_type": "binary"
}
```

### multi（値による多方向）
```json
{
  "type": "decision",
  "title": "構造種別は？",
  "decision_type": "multi",
  "options": [
    { "value": "木造" },
    { "value": "耐火構造" }
  ]
}
```

## 生成チェックリスト

- [ ] スキーマ読み込み済み
- [ ] 「〜を特定したか？」分岐なし
- [ ] classification情報にmulti分岐使用
- [ ] decision数 >= process数
- [ ] 全パスがterminalに到達
