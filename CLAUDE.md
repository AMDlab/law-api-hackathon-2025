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
  - `page.tsx` - メイン機序図ビューアー
  - `api/laws/[lawId]/` - 法令データ取得API
  - `api/diagrams/` - 機序図一覧・詳細取得API
- `src/components/` - UIコンポーネント
  - `kijo-diagram/` - 機序図関連（KijoDiagramViewer, LawTreeSelector）
  - `ui/` - shadcn/uiコンポーネント
- `src/lib/` - ユーティリティ
  - `parser.ts` - 法令JSONパーサー（条・項・号抽出、規制文検出）
  - `api.ts` - e-Gov法令API クライアント
  - `validation.ts` - IDバリデーション、グラフ検証
  - `schema-validator.ts` - JSON Schemaによるバリデーション（ajv使用）
- `src/types/` - 型定義
  - `diagram.ts` - 審査機序図の型
- `data/diagrams/` - 機序図JSONファイル
- `schemas/` - JSONスキーマ
- `prompts/` - 機序図作成手引書

## 技術スタック

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI**: shadcn/ui
- **Diagrams**: React Flow (@xyflow/react)
- **Validation**: JSON Schema + ajv
- **Data Source**: e-Gov法令API v2

## 主要な概念

### 審査機序図 (機序図)
buildingSMART Japan仕様に基づく審査フロー図。規制文（〜しなければならない等）を構造化して表現。

### 適合判定フロー図（フロー図）
機序図を基に、適合判定を自動化するためのフローチャートにしたもの。

### 法令構造
- **章 (Chapter)** > **条 (Article)** > **項 (Paragraph)** > **号 (Item)**
- 機序図・フロー図は項・号単位で作成
- ファイル命名規則:
  - 機序図: `A{条}_P{項}_kijo.json`（例: `A43_P1_kijo.json`）
  - フロー図: `A{条}_P{項}_flow.json`（例: `A43_P1_flow.json`）
  - 枝番あり: `A{条}_{枝番}_P{項}_kijo.json`（例: `A20_3_P2_kijo.json`）

### 規制文検出パターン
- `〜しなければならない`
- `〜してはならない`
- `〜することができる`
- `〜なければならない`

## スキル

### kijo-generator（機序図生成）
条文指定から審査機序図JSONを生成する。
- トリガー: 「法○条の機序図を作成」「機序図を生成」
- 出力先: `data/diagrams/{法令ID}/{条番号}_kijo.json`
- 詳細: `.claude/skills/kijo-generator.md`

### flow-generator（フロー図生成）
機序図JSONから適合判定フロー図を生成する。
- トリガー: 「フロー図を作成」「適合判定フロー」
- 入力: `data/diagrams/{法令ID}/{条番号}_kijo.json`
- 出力: `data/diagrams/{法令ID}/{条番号}_flow.json`
- 詳細: `.claude/skills/flow-generator.md`

## コーディング規約

- TypeScriptの型を厳密に定義（`any`使用禁止）
- JSON Schemaによるランタイムバリデーション（`schemas/`配下で管理）
- コンポーネントは`"use client"`ディレクティブを明示
- shadcn/uiコンポーネントを優先使用

## スキーマ管理

- **機序図**: `schemas/kijo-diagram.schema.json`
- **フロー図**: `schemas/flow-diagram.schema.json`
- バリデーションは`src/lib/schema-validator.ts`でajvを使用
- TypeScript型定義は`src/types/diagram.ts`で管理（スキーマと同期を保つこと）
