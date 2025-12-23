# 審査機序図ビューアー (Law API Hackathon 2025)

建築基準法をe-Gov法令APIから取得し、条・項・号の階層構造で閲覧、および審査機序図（buildingSMART Japan仕様）を表示するWebアプリケーションです。

## 機能

- **法令データの取得**: e-Gov法令API (v2) を使用して建築基準法・施行令・施行規則の最新データを取得
- **ツリー表示**: 章・節・条・項・号の階層構造をサイドバーでツリー表示
- **規制文の識別**: 「〜しなければならない」等で終わる規制文を自動検出してマーク表示
- **審査機序図表示**:
  - JSON形式の審査機序図データをReact Flowで可視化
  - [情報]ノード（矩形）と[処理]ノード（角丸矩形）を色分け表示
  - ノード選択で詳細情報（主体、性質、関連条項など）を表示
- **適合判定フロー図表示**:
  - 機序図から生成されたフローチャートを表示
  - 判定ノード・終端ノードによる適合判定の流れを可視化

## 環境構築手順

### 前提条件

- Node.js (v18以上推奨)
- npm

### インストール

リポジトリをクローンした後、依存パッケージをインストールしてください。

```bash
npm install
```

### 開発サーバーの起動

以下のコマンドでローカルサーバーを起動します。

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) にアクセスしてください。

## 技術スタック

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **UI Library**: [shadcn/ui](https://ui.shadcn.com/)
- **Diagrams**: [React Flow](https://reactflow.dev/) (@xyflow/react)
- **Validation**: JSON Schema + [ajv](https://ajv.js.org/)
- **Data Source**: [e-Gov 法令API v2](https://laws.e-gov.go.jp/api/2/swagger-ui/)

## ディレクトリ構成

- `src/app`: Next.jsのApp Routerページコンポーネント
  - `page.tsx`: メインビューアーページ
  - `api/laws/[lawId]`: 法令データ取得API
  - `api/diagrams`: 機序図ファイル一覧・取得API
- `src/components`: UIコンポーネント
  - `kijo-diagram/`: 審査機序図・フロー図関連コンポーネント
- `src/lib`: ユーティリティ・ロジック
  - `api.ts`: e-Gov法令APIクライアント
  - `parser.ts`: 法令JSONデータの解析、条・項・号の階層構造抽出
  - `validation.ts`: IDバリデーション、グラフ検証
  - `schema-validator.ts`: JSON Schemaによるバリデーション（ajv使用）
- `src/types`: TypeScript型定義
  - `diagram.ts`: 審査機序図・フロー図の型定義
- `data/diagrams`: 審査機序図JSONファイル
- `schemas`: JSONスキーマ定義
  - `kijo-diagram.schema.json`: 機序図スキーマ
  - `flow-diagram.schema.json`: フロー図スキーマ
- `prompts`: 機序図作成手引書・生成プロンプト
- `.claude/skills`: Claude Code用スキル定義

## 機序図・フロー図の作成方法

[Claude Code](https://claude.ai/claude-code) を使用して、条文から機序図・フロー図を自動生成できます。

### 前提条件

- Claude Code がインストールされていること
- このリポジトリのルートディレクトリで Claude Code を起動していること

### 機序図の作成

Claude Code で以下のように指示します。

```
法43条1項の機序図を作成して
```

または

```
令112条1項の機序図を生成して
```

**生成される内容:**
- e-Gov法令APIから条文を取得
- 規制文を分析し、情報ノード・処理ノードを構造化
- `data/diagrams/{法令ID}/{条番号}_kijo.json` にJSON形式で保存（例: `A22_P1_kijo.json`）

### フロー図の作成

機序図が存在する条文に対して、Claude Code で以下のように指示します。

```
法43条1項のフロー図を作成して
```

または

```
令112条1項の適合判定フローを生成して
```

**生成される内容:**
- 既存の機序図JSON（`*_kijo.json`）を読み込み
- 判定ノード・終端ノードを含むフローチャートを生成
- 別ファイル `{条番号}_flow.json` として保存（例: `A22_P1_flow.json`）

### 使用例

```
# 建築基準法第22条第1項の機序図を作成
法22条1項の機序図を作成して

# 作成した機序図からフロー図を生成
法22条1項のフロー図を作成して

# 建築基準法施行令第112条第1項
令112条1項の機序図を生成して
```

### 法令ID一覧

| 法令 | 略称 | 法令ID |
|------|------|--------|
| 建築基準法 | 法 | 325AC0000000201 |
| 建築基準法施行令 | 令 | 325CO0000000338 |
| 建築基準法施行規則 | 規則 | 325M50004000040 |
