import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import {
  isValidLawId,
  isValidArticleId,
  getDiagramType,
  validateKijoDiagram,
  validateFlowDiagram,
  formatErrors,
} from "@/lib/validation";
import { prisma } from "@/lib/prisma";
import { buildDiagramJson, extractDiagramUpdate } from "@/lib/diagram-storage";

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
        { status: 400 },
      );
    }

    if (!isValidArticleId(articleId)) {
      return NextResponse.json(
        { error: "Invalid article ID format" },
        { status: 400 },
      );
    }

    // 図の種類を判定
    const diagramType = getDiagramType(articleId);
    if (!diagramType) {
      return NextResponse.json(
        { error: "Article ID must end with _kijo or _flow" },
        { status: 400 },
      );
    }

    const diagramKey = `${lawId}/${articleId}`;
    const diagram = await prisma.diagram.findUnique({
      where: {
        diagramKey,
      },
      include: {
        labels: true,
        relatedLaws: true,
        nodes: { orderBy: { nodeId: "asc" } },
        edges: { orderBy: { edgeId: "asc" } },
      },
    });

    if (!diagram) {
      return NextResponse.json({ error: "Diagram not found" }, { status: 404 });
    }

    const jsonData = buildDiagramJson(diagram, diagramType);

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
        { status: 500 },
      );
    }

    return NextResponse.json(jsonData);
  } catch (error) {
    console.error("Failed to load diagram:", error);
    return NextResponse.json(
      { error: "Failed to load diagram" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/diagrams/[lawId]/[articleId]
 * 図の更新（保存） + スナップショット作成
 */
export async function PUT(request: Request, { params }: RouteParams) {
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

    const body = (await request.json()) as Record<string, unknown>;
    const payload =
      body && typeof body === "object" && "diagram" in body
        ? body.diagram
        : body;
    const note =
      body && typeof body === "object" && "note" in body
        ? (body.note as string | undefined)
        : undefined;

    const validationResult =
      diagramType === "kijo"
        ? validateKijoDiagram(payload)
        : validateFlowDiagram(payload);
    if (!validationResult.valid) {
      return NextResponse.json(
        {
          error: "Invalid diagram schema",
          details: formatErrors(validationResult),
        },
        { status: 400 },
      );
    }

    const diagramKey = `${lawId}/${articleId}`;
    const diagram = await prisma.diagram.findUnique({
      where: { diagramKey },
      include: {
        labels: true,
        relatedLaws: true,
        nodes: { orderBy: { nodeId: "asc" } },
        edges: { orderBy: { edgeId: "asc" } },
      },
    });

    if (!diagram) {
      return NextResponse.json({ error: "Diagram not found" }, { status: 404 });
    }

    const snapshot: Prisma.InputJsonValue = buildDiagramJson(
      diagram,
      diagramType,
    );
    const {
      updateData: rawUpdateData,
      labels,
      relatedLaws,
      nodes,
      edges,
    } = extractDiagramUpdate(payload as Record<string, unknown>, diagramType);
    const updateData = rawUpdateData as Prisma.DiagramUpdateInput;

    await prisma.$transaction(async (tx) => {
      await tx.diagramSnapshot.create({
        data: {
          diagramKey: diagram.diagramKey,
          diagramType,
          snapshot,
          note: note ?? null,
        },
      });

      await tx.diagram.update({
        where: { diagramKey: diagram.diagramKey },
        data: updateData,
      });

      await tx.diagramLabel.deleteMany({
        where: { diagramKey: diagram.diagramKey },
      });
      if (labels.length > 0) {
        await tx.diagramLabel.createMany({
          data: labels.map((label) => ({
            diagramKey: diagram.diagramKey,
            label: label.label,
          })),
        });
      }

      await tx.relatedLaw.deleteMany({
        where: { diagramKey: diagram.diagramKey },
      });
      if (relatedLaws.length > 0) {
        await tx.relatedLaw.createMany({
          data: relatedLaws.map((law) => ({
            diagramKey: diagram.diagramKey,
            lawId: law.lawId,
            lawName: law.lawName,
            lawType: law.lawType,
            relationship: law.relationship,
            articles: law.articles,
            description: law.description,
          })),
        });
      }

      await tx.diagramNode.deleteMany({
        where: { diagramKey: diagram.diagramKey },
      });
      if (nodes.length > 0) {
        await tx.diagramNode.createMany({
          data: nodes.map((node) => ({
            diagramKey: diagram.diagramKey,
            nodeId: node.nodeId,
            type: node.type,
            title: node.title,
            data: node.data ?? undefined,
          })),
        });
      }

      await tx.diagramEdge.deleteMany({
        where: { diagramKey: diagram.diagramKey },
      });
      if (edges.length > 0) {
        await tx.diagramEdge.createMany({
          data: edges.map((edge) => ({
            diagramKey: diagram.diagramKey,
            edgeId: edge.edgeId,
            fromId: edge.fromId,
            toId: edge.toId,
            role: edge.role ?? undefined,
            label: edge.label ?? undefined,
          })),
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to update diagram:", error);
    return NextResponse.json(
      { error: "Failed to update diagram" },
      { status: 500 },
    );
  }
}
