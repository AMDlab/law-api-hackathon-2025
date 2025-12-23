import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";
import { isValidLawId, isValidArticleId, getBaseArticleId } from "@/lib/validation";
import { LAW_INFO } from "@/lib/api";

const DIAGRAMS_DIR = path.join(process.cwd(), "data", "diagrams");

interface DiagramFile {
  filename: string;
  /** 表示用タイトル (例: "第43条第1項") */
  displayTitle: string;
  /** 図のID (例: "A43_P1_kijo", "A43_P1_flow") */
  diagramId: string;
  /** ベースID (例: "A43_P1") - LawNodeのdiagramIdと対応 */
  baseId: string;
  /** 図の種類 */
  type: "kijo" | "flow";
  /** APIパス */
  path: string;
}

interface DiagramInfo {
  lawId: string;
  lawName: string;
  files: DiagramFile[];
}

/**
 * 法令IDから法令名を取得
 */
function getLawName(lawId: string): string {
  return LAW_INFO[lawId]?.name || lawId;
}

/**
 * ファイル名から表示用タイトルを生成
 */
function parseDisplayTitle(filename: string): string {
  // A43_P1_kijo.json -> 第43条第1項（機序図）
  // A43_P1_flow.json -> 第43条第1項（フロー図）
  // A20_3_P2_kijo.json -> 第20条の3第2項（機序図）
  const match = filename.match(/^A(\d+(?:_\d+)?)(?:_P(\d+))?(?:_I(\d+))?(?:_(kijo|flow))?\.json$/);
  if (!match) return filename;

  const article = match[1].replace(/_/g, "の");
  let result = `第${article}条`;
  if (match[2]) {
    result += `第${match[2]}項`;
  }
  if (match[3]) {
    result += `第${match[3]}号`;
  }
  // 図の種類を追加
  if (match[4] === "kijo") {
    result += "（機序図）";
  } else if (match[4] === "flow") {
    result += "（フロー図）";
  }
  return result;
}

/**
 * ファイル名からarticleIdを抽出
 * 例: A43_P1_kijo.json -> A43_P1_kijo
 *     A43_P1_flow.json -> A43_P1_flow
 */
function extractArticleIdFromFilename(filename: string): string | null {
  const match = filename.match(/^(A\d+(?:_\d+)*(?:_P\d+)?(?:_I\d+)?(?:_kijo|_flow)?)\.json$/);
  return match ? match[1] : null;
}

/**
 * ファイル名から図の種類を取得
 */
function getDiagramTypeFromFilename(filename: string): "kijo" | "flow" | null {
  if (filename.includes("_kijo.json")) return "kijo";
  if (filename.includes("_flow.json")) return "flow";
  return null;
}

/**
 * GET /api/diagrams
 * 機序図ファイル一覧を取得
 */
export async function GET() {
  try {
    // data/diagrams ディレクトリが存在するか確認
    if (!fs.existsSync(DIAGRAMS_DIR)) {
      return NextResponse.json({ diagrams: [] });
    }

    const diagrams: DiagramInfo[] = [];

    // 法令IDごとのディレクトリを走査
    const lawDirs = fs.readdirSync(DIAGRAMS_DIR, { withFileTypes: true });

    for (const lawDir of lawDirs) {
      if (!lawDir.isDirectory()) continue;

      const lawId = lawDir.name;

      // 法令IDのバリデーション
      if (!isValidLawId(lawId)) {
        console.warn(`Skipping invalid law ID directory: ${lawId}`);
        continue;
      }

      const lawPath = path.join(DIAGRAMS_DIR, lawId);
      const files = fs.readdirSync(lawPath).filter((f) => f.endsWith(".json"));

      if (files.length === 0) continue;

      const validFiles = files
        .map((filename) => {
          const diagramId = extractArticleIdFromFilename(filename);
          const diagramType = getDiagramTypeFromFilename(filename);
          // diagramIdのバリデーション（_kijoまたは_flowが必須）
          if (!diagramId || !isValidArticleId(diagramId) || !diagramType) {
            console.warn(`Skipping invalid article file: ${filename}`);
            return null;
          }
          return {
            filename,
            displayTitle: parseDisplayTitle(filename),
            diagramId,
            baseId: getBaseArticleId(diagramId),
            type: diagramType,
            path: `/api/diagrams/${lawId}/${diagramId}`,
          };
        })
        .filter((f): f is NonNullable<typeof f> => f !== null);

      if (validFiles.length === 0) continue;

      diagrams.push({
        lawId,
        lawName: getLawName(lawId),
        files: validFiles,
      });
    }

    return NextResponse.json({ diagrams });
  } catch (error) {
    console.error("Failed to list diagrams:", error);
    return NextResponse.json(
      { error: "Failed to list diagrams" },
      { status: 500 }
    );
  }
}
