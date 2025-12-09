# 法令フロー図生成アプリ (Law API Hackathon 2025)

建築基準法をe-Gov法令APIから取得し、ツリー形式で閲覧および条文内容のフロー図（Mermaid記法）を自動生成するWebアプリケーションです。

## 機能

- **建築基準法の取得**: e-Gov法令API (v2) を使用して最新の法令データを取得。
- **ツリー表示**: 編・章・節・条の階層構造をサイドバーでツリー表示。
- **フロー図生成**:
  - 選択した条文を解析し、Mermaid.jsを用いてフローチャート化。
  - 条文内の「第X条」等の参照を検出し、リンクまたはサブグラフとして図に統合。
  - 参照先が他の法令である場合も、APIを通じて動的に取得・解析。

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

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Library**: [shadcn/ui](https://ui.shadcn.com/)
- **Diagrams**: [Mermaid.js](https://mermaid.js.org/)
- **Data Source**: [e-Gov 法令API v2](https://laws.e-gov.go.jp/api/2/swagger-ui/)

## ディレクトリ構成

- `src/app`: Next.jsのApp Routerページコンポーネント。
- `src/components`: UIコンポーネント。
  - `law-tree.tsx`: 法令ツリー表示コンポーネント。
  - `mermaid-view.tsx`: フロー図レンダリングコンポーネント。
- `src/lib`: ユーティリティ・ロジック。
  - `api.ts`: e-Gov APIとの通信ロジック。
  - `parser.ts`: 法令JSONデータの解析、テキスト抽出、参照解決、Mermaid生成ロジック。
