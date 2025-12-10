import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";
import { isValidLawId, isValidArticleId } from "@/lib/validation";

const DIAGRAMS_DIR = path.join(process.cwd(), "data", "diagrams");

interface DiagramFile {
  filename: string;
  /** 表示用タイトル (例: "第43条第1項") */
  displayTitle: string;
  /** 機序図ID (例: "A43_P1") - LawNodeのdiagramIdと対応 */
  diagramId: string;
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
  const lawNames: Record<string, string> = {
    "325AC0000000201": "建築基準法",
    "325CO0000000338": "建築基準法施行令",
  };
  return lawNames[lawId] || lawId;
}

/**
 * ファイル名から表示用タイトルを生成
 */
function parseDisplayTitle(filename: string): string {
  // A43_P1.json -> 第43条第1項
  // A43_P1_I2.json -> 第43条第1項第2号
  // A20_3_P2.json -> 第20条の3第2項
  const match = filename.match(/^A(\d+(?:_\d+)?)(?:_P(\d+))?(?:_I(\d+))?\.json$/);
  if (!match) return filename;

  const article = match[1].replace(/_/g, "の");
  let result = `第${article}条`;
  if (match[2]) {
    result += `第${match[2]}項`;
  }
  if (match[3]) {
    result += `第${match[3]}号`;
  }
  return result;
}

/**
 * ファイル名からarticleIdを抽出
 */
function extractArticleIdFromFilename(filename: string): string | null {
  const match = filename.match(/^(A\d+(?:_\d+)*(?:_P\d+)?(?:_I\d+)?)\.json$/);
  return match ? match[1] : null;
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
          // diagramIdのバリデーション
          if (!diagramId || !isValidArticleId(diagramId)) {
            console.warn(`Skipping invalid article file: ${filename}`);
            return null;
          }
          return {
            filename,
            displayTitle: parseDisplayTitle(filename),
            diagramId,
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
