---
name: kijo-generator
description: 建築基準法の条文から審査機序図（kijo diagram）JSONを生成するスキル。「機序図を作成」「機序図を生成」「法○条の機序図」「令○条の機序図」等のリクエストで使用。buildingSMART Japan仕様に基づく審査フロー図を作成し、規制文の構造を可視化する。
---

# 審査機序図生成スキル

## 作業フロー

### STEP 1: スキーマ読み込み
`schemas/kijo-diagram.schema.json` を読む

### STEP 2: 条文取得
キャッシュファイル確認: `data/law-articles/{法令ID}/A{条}.json`
- 存在すれば使用、なければAPIから取得

### STEP 3: 法文構造分析
1. 規制文特定（「〜しなければならない」「〜してはならない」）
2. 適合命題変換
3. ただし書き分析
4. 各号展開
5. 別表参照展開

### STEP 4: JSON生成
出力先: `data/diagrams/{法令ID}/A{条}_P{項}_kijo.json`

### STEP 5: バリデーション
```bash
npm run validate:kijo {ファイルパス}
```

## 法令ID

| 法令 | ID |
|---|---|
| 建築基準法 | 325AC0000000201 |
| 建築基準法施行令 | 325CO0000000338 |

## 重要ルール

詳細は [references/rules.md](references/rules.md) 参照。

**核心ルール:**
1. **[情報]→[情報]直接接続禁止** - 必ず[処理]を経由
2. **公共データはノードにしない** - `compliance_logic.scope_condition`に記載
3. **入力情報ごとに個別処理ノード作成**
4. **set_definition必須** - 主体の親子関係がある場合

## ノード種類

### [情報] property_type
- `proposition` - 命題真偽
- `classification` - 区分情報
- `numeric` - 数値
- `geometric_*` - 幾何学概念
- `set_definition` - 集合定義（主体の親子関係時に必須）
- `visual` - 視認情報

### [処理] process_type
- `undefined_input` - 設計図書から読み取る情報
- `mechanical` - 自動化可能な処理
- `human_judgment` - 人の判断が必要
- `sub_diagram_reference` - 別図参照
- `consistency_check` - 整合確認

## 生成チェックリスト

- [ ] スキーマ読み込み済み
- [ ] [情報]→[情報]直接接続なし
- [ ] 公共データはノードに含めていない
- [ ] 主体の親子関係にset_definition追加済み
- [ ] バリデーション通過
