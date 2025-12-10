# e-Gov法令API 構造調査レポート

## 調査日時
2025年12月10日

## 1. APIエンドポイントとレスポンス形式

### 1.1 主要エンドポイント

#### 法令一覧取得
```
GET https://laws.e-gov.go.jp/api/2/laws?law_id={法令ID}
```

**レスポンス形式**: JSON

**レスポンス構造**:
```json
{
  "total_count": 1,
  "count": 1,
  "laws": [
    {
      "law_info": {
        "law_type": "Act",
        "law_id": "325AC0000000201",
        "law_num": "昭和二十五年法律第二百一号",
        "law_num_era": "Showa",
        "law_num_year": 25,
        "promulgation_date": "1950-05-24"
      },
      "revision_info": {
        "law_revision_id": "325AC0000000201_20251201_507AC0000000035",
        "law_title": "建築基準法",
        "law_title_kana": "けんちくきじゅんほう",
        "category": "建築・住宅",
        "updated": "2025-12-01T00:20:55+09:00"
      }
    }
  ]
}
```

#### 法令本文取得
```
GET https://laws.e-gov.go.jp/api/2/law_data/{law_revision_id}
```

**レスポンス形式**: JSON（XMLをJSONに変換した構造）

**主要構造**:
```json
{
  "law_full_text": {
    "tag": "Law",
    "attr": {
      "Lang": "ja",
      "Era": "Showa",
      "Year": "25",
      "Num": "201"
    },
    "children": [
      { "tag": "LawNum", "children": ["昭和二十五年法律第二百一号"] },
      { "tag": "LawBody", "children": [...] }
    ]
  }
}
```

### 1.2 レスポンスの特徴

- **XML-JSON変換形式**: 従来のXMLがJSON形式に変換されている
- **階層構造**: ツリー構造で表現され、各ノードは `tag`, `attr`, `children` を持つ
- **テキストノード**: 文字列は配列の要素として直接含まれる

## 2. 条・項・号の階層構造

### 2.1 基本的な階層構造

```
Law (法令全体)
└── LawBody (法令本体)
    ├── LawTitle (法令タイトル)
    ├── TOC (目次)
    └── MainProvision (本則)
        └── Chapter (章)
            └── Article (条)
                ├── ArticleCaption (条の見出し)
                ├── ArticleTitle (条番号)
                └── Paragraph (項)
                    ├── ParagraphNum (項番号)
                    ├── ParagraphSentence (項の本文)
                    │   └── Sentence (文)
                    └── Item (号)
                        ├── ItemTitle (号番号)
                        ├── ItemSentence (号の本文)
                        │   └── Column (列)
                        │       └── Sentence (文)
                        └── Subitem1 (イロハ)
                            ├── Subitem1Title
                            ├── Subitem1Sentence
                            └── Subitem2 (1,2,3...)
                                ├── Subitem2Title
                                ├── Subitem2Sentence
                                └── Subitem3 ((i),(ii),(iii)...)
                                    ├── Subitem3Title
                                    └── Subitem3Sentence
```

### 2.2 XML-JSONタグ一覧

#### 主要構造タグ
- `Law`: 法令のルート要素
- `LawBody`: 法令本体
- `MainProvision`: 本則
- `Chapter`: 章
- `Section`: 節
- `Article`: 条

#### 条文構造タグ
- `ArticleCaption`: 条の見出し（例: "（目的）"）
- `ArticleTitle`: 条番号（例: "第一条"）
- `Paragraph`: 項
- `ParagraphNum`: 項番号（例: "２"、"３"）
- `ParagraphSentence`: 項の本文

#### 号・サブ項目タグ
- `Item`: 号（一、二、三...）
- `ItemTitle`: 号のタイトル
- `ItemSentence`: 号の本文
- `Subitem1`: イロハレベル
- `Subitem1Title`: イロハのタイトル
- `Subitem1Sentence`: イロハの本文
- `Subitem2`: 数字レベル（(1), (2), (3)...）
- `Subitem2Title`: 数字のタイトル
- `Subitem2Sentence`: 数字の本文
- `Subitem3`: ローマ数字レベル（(i), (ii), (iii)...）
- `Subitem3Title`: ローマ数字のタイトル
- `Subitem3Sentence`: ローマ数字の本文

#### その他のタグ
- `Column`: 列（号の中で左右に分かれる場合）
- `Sentence`: 文（本文の最小単位）
- `Ruby`: ルビ（ふりがな）
- `Rt`: ルビテキスト
- `Table`: 表
- `TableStruct`: 表の構造
- `TableRow`: 表の行
- `TableColumn`: 表の列

### 2.3 階層の深さ

**最大7階層**:
1. Article (条)
2. Paragraph (項)
3. Item (号: 一、二、三...)
4. Subitem1 (イ、ロ、ハ...)
5. Subitem2 ((1), (2), (3)...)
6. Subitem3 ((i), (ii), (iii)...)
7. さらに深い階層（レアケース）

## 3. 建築基準法（法令ID: 325AC0000000201）の構造例

### 3.1 第一条の例（シンプルな構造）

```json
{
  "tag": "Article",
  "attr": { "Num": "1" },
  "children": [
    {
      "tag": "ArticleCaption",
      "children": ["（目的）"]
    },
    {
      "tag": "ArticleTitle",
      "children": ["第一条"]
    },
    {
      "tag": "Paragraph",
      "attr": { "Num": "1" },
      "children": [
        { "tag": "ParagraphNum", "children": [] },
        {
          "tag": "ParagraphSentence",
          "children": [
            {
              "tag": "Sentence",
              "attr": { "Num": "1", "WritingMode": "vertical" },
              "children": ["この法律は、建築物の敷地、構造、設備及び用途に関する最低の基準を定めて..."]
            }
          ]
        }
      ]
    }
  ]
}
```

### 3.2 第二条の例（項・号・イロハを含む複雑な構造）

```json
{
  "tag": "Article",
  "attr": { "Num": "2" },
  "children": [
    {
      "tag": "Paragraph",
      "attr": { "Num": "1" },
      "children": [
        {
          "tag": "Item",
          "attr": { "Num": "9_2" },
          "children": [
            { "tag": "ItemTitle", "children": ["九の二"] },
            {
              "tag": "ItemSentence",
              "children": [
                { "tag": "Column", "attr": { "Num": "1" } },
                { "tag": "Column", "attr": { "Num": "2" } }
              ]
            },
            {
              "tag": "Subitem1",
              "attr": { "Num": "1" },
              "children": [
                { "tag": "Subitem1Title", "children": ["イ"] },
                {
                  "tag": "Subitem1Sentence",
                  "children": [...]
                },
                {
                  "tag": "Subitem2",
                  "attr": { "Num": "1" },
                  "children": [
                    { "tag": "Subitem2Title", "children": ["（１）"] },
                    {
                      "tag": "Subitem2Sentence",
                      "children": [...]
                    },
                    {
                      "tag": "Subitem3",
                      "attr": { "Num": "1" },
                      "children": [
                        { "tag": "Subitem3Title", "children": ["(i)"] }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

### 3.3 第二十条の例（複数の項・号を持つ構造）

```
Article (第二十条)
├── ArticleCaption: "（構造耐力）"
├── ArticleTitle: "第二十条"
├── Paragraph (Num="1")
│   ├── ParagraphSentence
│   │   └── Sentence: "建築物は、自重、積載荷重..."
│   ├── Item (Num="1")
│   │   ├── ItemTitle: "一"
│   │   └── ItemSentence
│   │       ├── Column (Num="1"): "高さが六十メートルを超える建築物"
│   │       └── Column (Num="2"): "当該建築物の安全上必要な..."
│   ├── Item (Num="2")
│   │   ├── ItemTitle: "二"
│   │   ├── ItemSentence
│   │   ├── Subitem1 (Num="1")
│   │   │   ├── Subitem1Title: "イ"
│   │   │   └── Subitem1Sentence
│   │   └── Subitem1 (Num="2")
│   │       ├── Subitem1Title: "ロ"
│   │       └── Subitem1Sentence
│   └── Item (Num="3")
│       └── ...
└── Paragraph (Num="2")
    ├── ParagraphNum: "２"
    └── ParagraphSentence
```

## 4. 条文テキストの抽出方法

### 4.1 基本的な抽出ロジック

```typescript
function getText(node: XmlNode | string): string {
  if (typeof node === 'string') return node;
  if (!node.children) return '';
  return node.children.map(child => getText(child)).join('');
}
```

### 4.2 条文全体の抽出

```typescript
function extractArticleContent(article: XmlNode): string {
  let content = '';

  // 条の見出し
  const caption = findChild(article, 'ArticleCaption');
  if (caption) {
    content += `【${getText(caption)}】\n`;
  }

  // 各項の抽出
  const paragraphs = findChildren(article, 'Paragraph');
  paragraphs.forEach(p => {
    const pNumNode = findChild(p, 'ParagraphNum');
    const pNum = pNumNode ? getText(pNumNode) : '';

    const sentences: string[] = [];
    const pSentence = findChild(p, 'ParagraphSentence');
    if (pSentence) {
      const sentNodes = findChildren(pSentence, 'Sentence');
      sentNodes.forEach(s => {
        sentences.push(getText(s));
      });
    }

    content += `${pNum} ${sentences.join('')}\n`;
  });

  return content;
}
```

## 5. 条文の階層を考慮した解析

### 5.1 Article > Paragraph > Item の階層

- **Article (条)**: 法令の基本単位
- **Paragraph (項)**: 条の中の項（第1項は番号なし、第2項以降は"２"、"３"と表記）
- **Item (号)**: 項の中の号（"一"、"二"、"三"...、または"九の二"のような変則的な番号）

### 5.2 Item > Subitem1 > Subitem2 > Subitem3 の階層

- **Item (号)**: 一、二、三...
- **Subitem1 (イロハ)**: イ、ロ、ハ、二、ホ...
- **Subitem2 (括弧数字)**: （１）、（２）、（３）...
- **Subitem3 (括弧ローマ数字)**: (i)、(ii)、(iii)...

### 5.3 特殊な構造

#### Column（列）
号の中で定義と説明を左右に分ける場合に使用：

```json
{
  "tag": "Item",
  "children": [
    { "tag": "ItemTitle", "children": ["一"] },
    {
      "tag": "ItemSentence",
      "children": [
        {
          "tag": "Column",
          "attr": { "Num": "1" },
          "children": [
            { "tag": "Sentence", "children": ["建築物"] }
          ]
        },
        {
          "tag": "Column",
          "attr": { "Num": "2" },
          "children": [
            { "tag": "Sentence", "children": ["土地に定着する工作物のうち..."] }
          ]
        }
      ]
    }
  ]
}
```

#### Sentence の Function 属性
文の役割を示す属性：

- `Function="main"`: 本文
- `Function="proviso"`: ただし書き

例:
```json
{
  "tag": "Sentence",
  "attr": { "Function": "proviso", "Num": "2" },
  "children": ["ただし、次のイ又はロのいずれかに該当する部分を除く。"]
}
```

## 6. まとめ

### 6.1 API の特徴

1. **JSON形式のレスポンス**: XMLがJSONに変換された形式で提供
2. **階層構造の明確さ**: タグ名で階層が明確に区別されている
3. **属性による補足情報**: Num属性などで順序や識別情報を提供
4. **再帰的な構造**: すべてのノードが同じ形式（tag, attr, children）

### 6.2 条文解析のポイント

1. **Paragraph が最も重要**: 条文の実質的な内容は項（Paragraph）に含まれる
2. **Item は Paragraph の子要素**: 号は必ず項の中に含まれる
3. **Subitem は最大3階層**: Subitem1（イロハ）→ Subitem2（数字）→ Subitem3（ローマ数字）
4. **Column は表形式の情報**: 用語定義などで左右に分かれる場合に使用
5. **Sentence が基本単位**: テキストは必ず Sentence タグ内に含まれる

### 6.3 実装時の注意点

1. **再帰的な探索が必要**: 深い階層まで再帰的にトラバースする必要がある
2. **文字列と要素の混在**: children配列には文字列とオブジェクトが混在する
3. **空要素の存在**: ParagraphNum など空のchildren配列を持つ要素がある
4. **Ruby要素の処理**: ふりがなは Ruby と Rt タグで表現される
5. **変則的な番号**: Item の Num 属性が "9_2" のような形式を取る場合がある

## 参考資料

- e-Gov 法令API Version 2: https://laws.e-gov.go.jp/api/2/swagger-ui/
- API ドキュメント: https://laws.e-gov.go.jp/api/2/redoc/
- 法令検索トップ: https://laws.e-gov.go.jp/apitop/
