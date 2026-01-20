import { NextResponse } from "next/server";
import {
  isValidLawId,
  isValidArticleId,
  getDiagramType,
  validateKijoDiagram,
  validateFlowDiagram,
  formatErrors,
} from "@/lib/validation";
import { prisma } from "@/lib/prisma";

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

    const diagram = await prisma.diagram.findUnique({
      where: {
        diagramKey: articleId,
      },
      include: {
        labels: true,
        relatedLaws: true,
        nodes: { orderBy: { nodeId: "asc" } },
        edges: { orderBy: { edgeId: "asc" } },
      },
    });

    if (!diagram || diagram.lawId !== lawId) {
      return NextResponse.json(
        { error: "Diagram not found" },
        { status: 404 }
      );
    }

    const nodes = diagram.nodes.map((node) => ({
      id: node.nodeId,
      type: node.type,
      title: node.title,
      ...(node.data && typeof node.data === "object" ? node.data : {}),
    }));

    const edges = diagram.edges.map((edge) => ({
      id: edge.edgeId,
      from: edge.fromId,
      to: edge.toId,
      ...(edge.role ? { role: edge.role } : {}),
      ...(edge.label ? { label: edge.label } : {}),
    }));

    const jsonData: Record<string, unknown> = {
      id: diagram.schemaId ?? diagram.diagramKey,
      version: diagram.version,
      page_title: {
        title: diagram.pageTitleTitle,
        target_subject: diagram.pageTitleTargetSubject ?? undefined,
        description: diagram.pageTitleDescription ?? undefined,
      },
      legal_ref: {
        law_id: diagram.lawId,
        law_type: diagram.lawType,
        law_name: diagram.lawName,
        law_abbrev: diagram.lawAbbrev,
        article: diagram.article,
        paragraph: diagram.paragraph ?? null,
        item: diagram.item ?? null,
      },
      labels: diagram.labels.map((label) => label.label),
      text_raw: diagram.textRaw ?? undefined,
      compliance_logic: diagram.complianceLogic ?? undefined,
      related_laws: diagram.relatedLaws.map((law) => ({
        law_id: law.lawId,
        law_name: law.lawName,
        law_type: law.lawType,
        relationship: law.relationship,
        articles: law.articles,
        description: law.description ?? undefined,
      })),
      metadata: diagram.metadata ?? undefined,
    };

    if (diagramType === "kijo") {
      jsonData.kijo_diagram = { nodes, edges };
    } else {
      jsonData.flow_diagram = {
        title: diagram.diagramTitle ?? "",
        description: diagram.diagramDescription ?? undefined,
        nodes,
        edges,
      };
      if (diagram.kijoDiagramRef) {
        jsonData.kijo_diagram_ref = diagram.kijoDiagramRef;
      }
    }

    // スキーマバリデーション（図の種類に応じて）
    const validationResult =
      diagramType === "kijo"
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
