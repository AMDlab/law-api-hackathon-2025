import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";
import {
  isValidLawId,
  isValidArticleId,
  getDiagramType,
  validateKijoDiagram,
  validateFlowDiagram,
  formatErrors,
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
 * 特定の機序図/フロー図データを取得
 * articleId: A43_P1_kijo または A43_P1_flow
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

    // 図の種類を判定
    const diagramType = getDiagramType(articleId);
    if (!diagramType) {
      return NextResponse.json(
        { error: "Article ID must end with _kijo or _flow" },
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

    // スキーマバリデーション（図の種類に応じて）
    const validationResult = diagramType === "kijo"
      ? validateKijoDiagram(jsonData)
      : validateFlowDiagram(jsonData);
    if (!validationResult.valid) {
      return NextResponse.json(
        {
          error: "Invalid diagram schema",
          details: formatErrors(validationResult),
        },
        { status: 500 }
      );
    }

    return NextResponse.json(jsonData);
  } catch (error) {
    console.error("Failed to load diagram:", error);
    return NextResponse.json(
      { error: "Failed to load diagram" },
      { status: 500 }
    );
  }
}
