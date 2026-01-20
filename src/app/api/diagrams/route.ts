import { NextResponse } from "next/server";
import { getBaseArticleId, isValidArticleId, isValidLawId } from "@/lib/validation";
import { LAW_INFO } from "@/lib/api";
import { prisma } from "@/lib/prisma";

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
 * 図IDから表示用タイトルを生成
 */
function parseDisplayTitle(diagramId: string): string {
  // A43_P1_kijo -> 第43条第1項（機序図）
  // A43_P1_flow -> 第43条第1項（フロー図）
  // A20_3_P2_kijo -> 第20条の3第2項（機序図）
  const match = diagramId.match(/^A(\d+(?:_\d+)?)(?:_P(\d+))?(?:_I(\d+))?(?:_(kijo|flow))?$/);
  if (!match) return diagramId;

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
 * GET /api/diagrams
 * 機序図ファイル一覧を取得
 */
export async function GET() {
  try {
    const records = await prisma.diagram.findMany({
      select: {
        lawId: true,
        diagramKey: true,
        baseId: true,
        diagramType: true,
      },
      orderBy: [{ lawId: "asc" }, { baseId: "asc" }, { diagramType: "asc" }],
    });

    const diagramMap = new Map<string, DiagramInfo>();

    for (const record of records) {
      const lawId = record.lawId;
      if (!isValidLawId(lawId) || !isValidArticleId(record.diagramKey)) {
        console.warn(`Skipping invalid diagram record: ${record.diagramKey}`);
        continue;
      }

      if (!diagramMap.has(lawId)) {
        diagramMap.set(lawId, {
          lawId,
          lawName: getLawName(lawId),
          files: [],
        });
      }

      const info = diagramMap.get(lawId)!;
      info.files.push({
        filename: `${record.diagramKey}.json`,
        displayTitle: parseDisplayTitle(record.diagramKey),
        diagramId: record.diagramKey,
        baseId: record.baseId || getBaseArticleId(record.diagramKey),
        type: record.diagramType,
        path: `/api/diagrams/${lawId}/${record.diagramKey}`,
      });
    }

    return NextResponse.json({ diagrams: Array.from(diagramMap.values()) });
  } catch (error) {
    console.error("Failed to list diagrams:", error);
    return NextResponse.json(
      { error: "Failed to list diagrams" },
      { status: 500 }
    );
  }
}
