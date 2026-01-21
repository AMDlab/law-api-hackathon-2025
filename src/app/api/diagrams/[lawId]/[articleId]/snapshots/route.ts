import { NextResponse } from "next/server";
import {
  isValidLawId,
  isValidArticleId,
  getDiagramType,
} from "@/lib/validation";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{
    lawId: string;
    articleId: string;
  }>;
}

/**
 * GET /api/diagrams/[lawId]/[articleId]/snapshots
 * スナップショット一覧
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { lawId, articleId } = await params;

    if (!isValidLawId(lawId)) {
      return NextResponse.json(
        { error: "Invalid law ID format" },
        { status: 400 },
      );
    }

    if (!isValidArticleId(articleId)) {
      return NextResponse.json(
        { error: "Invalid article ID format" },
        { status: 400 },
      );
    }

    const diagramType = getDiagramType(articleId);
    if (!diagramType) {
      return NextResponse.json(
        { error: "Article ID must end with _kijo or _flow" },
        { status: 400 },
      );
    }

    const diagram = await prisma.diagram.findUnique({
      where: { diagramKey: articleId },
      select: { lawId: true },
    });

    if (!diagram || diagram.lawId !== lawId) {
      return NextResponse.json({ error: "Diagram not found" }, { status: 404 });
    }

    const snapshots = await prisma.diagramSnapshot.findMany({
      where: {
        diagramKey: articleId,
        diagramType,
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        note: true,
      },
    });

    return NextResponse.json({ snapshots });
  } catch (error) {
    console.error("Failed to list snapshots:", error);
    return NextResponse.json(
      { error: "Failed to list snapshots" },
      { status: 500 },
    );
  }
}
