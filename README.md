# 審査機序図ビューアー (Law API Hackathon 2025)

建築基準法をe-Gov法令APIから取得し、条・項・号の階層構造で閲覧、および審査機序図（buildingSMART Japan仕様）を表示するWebアプリケーションです。

## 機能

- **建築基準法の取得**: e-Gov法令API (v2) を使用して最新の法令データを取得。
- **ツリー表示**: 章・節・条・項・号の階層構造をサイドバーでツリー表示。
- **規制文の識別**: 「〜しなければならない」等で終わる規制文を自動検出してマーク表示。
- **審査機序図表示**:
  - JSON形式の審査機序図データをReact Flowで可視化。
  - [情報]ノード（矩形）と[処理]ノード（角丸矩形）を色分け表示。
  - ノード選択で詳細情報（主体、性質、関連条項など）を表示。

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

ブラウザで [http://localhost:3000/diagram](http://localhost:3000/diagram) にアクセスしてください。

## 技術スタック

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Library**: [shadcn/ui](https://ui.shadcn.com/)
- **Diagrams**: [React Flow](https://reactflow.dev/)
- **Validation**: [Zod](https://zod.dev/)
- **Data Source**: [e-Gov 法令API v2](https://laws.e-gov.go.jp/api/2/swagger-ui/)

## ディレクトリ構成

- `src/app`: Next.jsのApp Routerページコンポーネント。
  - `diagram/page.tsx`: 審査機序図ビューアーページ。
  - `api/laws/[lawId]`: 法令データ取得API。
  - `api/diagrams`: 機序図ファイル一覧・取得API。
- `src/components`: UIコンポーネント。
  - `kijo-diagram/`: 審査機序図関連コンポーネント。
- `src/lib`: ユーティリティ・ロジック。
  - `parser.ts`: 法令JSONデータの解析、条・項・号の階層構造抽出。
  - `validation.ts`: Zodスキーマによるバリデーション。
- `src/types`: TypeScript型定義。
  - `diagram.ts`: 審査機序図の型定義。
- `data/diagrams`: 審査機序図JSONファイル。
- `schemas`: JSONスキーマ定義。
- `prompts`: 機序図作成手引書・生成プロンプト。
