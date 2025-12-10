import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";
import {
  isValidLawId,
  isValidArticleId,
  validateDiagram,
  formatValidationError,
} from "@/lib/validation";

const DIAGRAMS_DIR = path.join(process.cwd(), "data", "diagrams");

interface RouteParams {
  params: Promise<{
    lawId: string;
    articleId: string;
  }>;
}

/**
 * GET /api/diagrams/[lawId]/[articleId]
 * 特定の機序図データを取得
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { lawId, articleId } = await params;

    // IDのバリデーション（パストラバーサル対策）
    if (!isValidLawId(lawId)) {
      return NextResponse.json(
        { error: "Invalid law ID format" },
        { status: 400 }
      );
    }

    if (!isValidArticleId(articleId)) {
      return NextResponse.json(
        { error: "Invalid article ID format" },
        { status: 400 }
      );
    }

    const filePath = path.join(DIAGRAMS_DIR, lawId, `${articleId}.json`);

    // パスがDIAGRAMS_DIR内に収まっているか確認（追加のセキュリティ）
    const resolvedPath = path.resolve(filePath);
    const resolvedBase = path.resolve(DIAGRAMS_DIR);
    if (!resolvedPath.startsWith(resolvedBase)) {
      return NextResponse.json(
        { error: "Invalid path" },
        { status: 400 }
      );
    }

    // ファイルが存在するか確認
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: "Diagram not found" },
        { status: 404 }
      );
    }

    // JSONファイルを読み込み
    const content = fs.readFileSync(filePath, "utf-8");

    // JSONパース
    let jsonData: unknown;
    try {
      jsonData = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON format" },
        { status: 500 }
      );
    }

    // スキーマバリデーション
    const validationResult = validateDiagram(jsonData);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Invalid diagram schema",
          details: formatValidationError(validationResult.error),
        },
        { status: 500 }
      );
    }

    return NextResponse.json(validationResult.data);
  } catch (error) {
    console.error("Failed to load diagram:", error);
    return NextResponse.json(
      { error: "Failed to load diagram" },
      { status: 500 }
    );
  }
}
