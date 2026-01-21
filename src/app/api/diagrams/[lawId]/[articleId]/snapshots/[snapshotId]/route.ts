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
import { buildDiagramJson, extractDiagramUpdate } from "@/lib/diagram-storage";

interface RouteParams {
  params: Promise<{
    lawId: string;
    articleId: string;
    snapshotId: string;
  }>;
}

/**
 * POST /api/diagrams/[lawId]/[articleId]/snapshots/[snapshotId]
 * スナップショットから復元
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { lawId, articleId, snapshotId } = await params;

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

    const diagramType = getDiagramType(articleId);
    if (!diagramType) {
      return NextResponse.json(
        { error: "Article ID must end with _kijo or _flow" },
        { status: 400 }
      );
    }

    const diagram = await prisma.diagram.findUnique({
      where: { diagramKey: articleId },
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

    const snapshot = await prisma.diagramSnapshot.findFirst({
      where: { id: snapshotId, diagramKey: articleId, diagramType },
    });

    if (!snapshot) {
      return NextResponse.json(
        { error: "Snapshot not found" },
        { status: 404 }
      );
    }

    const payload = snapshot.snapshot as Record<string, unknown>;
    const validationResult =
      diagramType === "kijo"
        ? validateKijoDiagram(payload)
        : validateFlowDiagram(payload);
    if (!validationResult.valid) {
      return NextResponse.json(
        {
          error: "Invalid snapshot schema",
          details: formatErrors(validationResult),
        },
        { status: 400 }
      );
    }

    const currentSnapshot = buildDiagramJson(diagram, diagramType);
    const { updateData, labels, relatedLaws, nodes, edges } =
      extractDiagramUpdate(payload, diagramType);

    await prisma.$transaction(async (tx) => {
      await tx.diagramSnapshot.create({
        data: {
          diagramKey: diagram.diagramKey,
          diagramType,
          snapshot: currentSnapshot,
          note: `restore:${snapshotId}`,
        },
      });

      await tx.diagram.update({
        where: { diagramKey: diagram.diagramKey },
        data: updateData,
      });

      await tx.diagramLabel.deleteMany({ where: { diagramKey: diagram.diagramKey } });
      if (labels.length > 0) {
        await tx.diagramLabel.createMany({
          data: labels.map((label) => ({
            diagramKey: diagram.diagramKey,
            label: label.label,
          })),
        });
      }

      await tx.relatedLaw.deleteMany({ where: { diagramKey: diagram.diagramKey } });
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

      await tx.diagramNode.deleteMany({ where: { diagramKey: diagram.diagramKey } });
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

      await tx.diagramEdge.deleteMany({ where: { diagramKey: diagram.diagramKey } });
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
    console.error("Failed to restore snapshot:", error);
    return NextResponse.json(
      { error: "Failed to restore snapshot" },
      { status: 500 }
    );
  }
}
