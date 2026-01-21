import { NextResponse } from "next/server";
import { isValidLawId } from "@/lib/validation";
import { parseLawData } from "@/lib/parser";

interface RouteParams {
  params: Promise<{
    lawId: string;
  }>;
}

// 法令IDからe-Gov法令APIのリビジョンIDを取得するためのマップ
// 実際の運用では、laws APIで検索して取得する
const LAW_REVISION_MAP: Record<
  string,
  { revisionId: string; lawName: string }
> = {
  "325AC0000000201": {
    revisionId: "325AC0000000201_20250401_506AC0000000053",
    lawName: "建築基準法",
  },
  "325CO0000000338": {
    revisionId: "325CO0000000338_20250401_506CO0000000006",
    lawName: "建築基準法施行令",
  },
};

/**
 * GET /api/laws/[lawId]
 * 法令データを取得してパース済みのツリー構造で返す
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { lawId } = await params;

    // IDのバリデーション
    if (!isValidLawId(lawId)) {
      return NextResponse.json(
        { error: "Invalid law ID format" },
        { status: 400 },
      );
    }

    // 法令情報を取得
    const lawInfo = LAW_REVISION_MAP[lawId];
    if (!lawInfo) {
      return NextResponse.json(
        { error: "Law not found in registry" },
        { status: 404 },
      );
    }

    // e-Gov法令APIから法令データを取得
    const apiUrl = `https://laws.e-gov.go.jp/api/2/law_data/${lawInfo.revisionId}`;
    const response = await fetch(apiUrl, {
      headers: {
        Accept: "application/json",
      },
      // キャッシュ設定（1日）
      next: { revalidate: 86400 },
    });

    if (!response.ok) {
      console.error(`e-Gov API error: ${response.status}`);
      return NextResponse.json(
        { error: "Failed to fetch law data from e-Gov" },
        { status: 502 },
      );
    }

    const data = await response.json();

    // law_full_textをパース
    const lawFullText = data.law_full_text;
    if (!lawFullText) {
      return NextResponse.json(
        { error: "No law_full_text in response" },
        { status: 500 },
      );
    }

    // パース
    const parsedData = parseLawData(lawFullText);

    return NextResponse.json({
      lawId,
      lawName: lawInfo.lawName,
      tree: parsedData,
    });
  } catch (error) {
    console.error("Failed to load law data:", error);
    return NextResponse.json(
      { error: "Failed to load law data" },
      { status: 500 },
    );
  }
}
