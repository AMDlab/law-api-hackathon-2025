# CLAUDE.md

このファイルはClaude Codeがこのリポジトリで作業する際のガイダンスを提供します。

## プロジェクト概要

**審査機序図ビューアー** - buildingSMART Japan仕様に基づく審査機序図を表示するWebアプリケーション。
e-Gov法令APIから建築基準法等を取得し、条・項・号の階層構造で閲覧、規制文の機序図を可視化する。

## ビルド・実行コマンド

```bash
# 依存関係インストール
npm install

# 開発サーバー起動 (http://localhost:3000)
npm run dev

# プロダクションビルド
npm run build

# 型チェック
npx tsc --noEmit

# リント
npm run lint
```

## ディレクトリ構成

- `src/app/` - Next.js App Routerページ
  - `diagram/page.tsx` - メイン機序図ビューアー
  - `api/laws/[lawId]/` - 法令データ取得API
  - `api/diagrams/` - 機序図一覧API
- `src/components/` - UIコンポーネント
  - `kijo-diagram/` - 機序図関連（KijoDiagramViewer, LawTreeSelector）
  - `ui/` - shadcn/uiコンポーネント
- `src/lib/` - ユーティリティ
  - `parser.ts` - 法令JSONパーサー（条・項・号抽出、規制文検出）
  - `validation.ts` - Zodスキーマ
- `src/types/` - 型定義
  - `diagram.ts` - 審査機序図の型
- `data/diagrams/` - 機序図JSONファイル
- `schemas/` - JSONスキーマ
- `prompts/` - 機序図作成手引書

## 技術スタック

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI**: shadcn/ui
- **Diagrams**: React Flow
- **Validation**: Zod
- **Data Source**: e-Gov法令API v2

## 主要な概念

### 審査機序図 (機序図)
buildingSMART Japan仕様に基づく審査フロー図。規制文（〜しなければならない等）を構造化して表現。

### 法令構造
- **章 (Chapter)** > **条 (Article)** > **項 (Paragraph)** > **号 (Item)**
- 機序図は項・号単位で作成
- 機序図ID形式: `A43_P1`（第43条第1項）、`A43_P1_I2`（第43条第1項第2号）

### 規制文検出パターン
- `〜しなければならない`
- `〜してはならない`
- `〜することができる`
- `〜なければならない`

## コーディング規約

- TypeScriptの型を厳密に定義
- Zodによるランタイムバリデーション
- コンポーネントは`"use client"`ディレクティブを明示
- shadcn/uiコンポーネントを優先使用
