import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import {
  getDiagramType,
  isValidArticleId,
  isValidLawId,
} from "@/lib/validation";

interface RouteParams {
  params: Promise<{
    lawId: string;
    articleId: string;
  }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    const threads = await prisma.diagramCommentThread.findMany({
      where: { diagramKey: articleId, diagramType, isDeleted: false },
      include: {
        comments: {
          where: { isDeleted: false },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ threads });
  } catch (error) {
    console.error("Failed to load comments:", error);
    return NextResponse.json(
      { error: "Failed to load comments" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    const body = await request.json();
    const targetType = body.targetType === "edge" ? "edge" : "node";
    const targetId =
      typeof body.targetId === "string" ? body.targetId.trim() : "";
    const offsetX = Number(body.offsetX);
    const offsetY = Number(body.offsetY);
    const text = typeof body.body === "string" ? body.body.trim() : "";

    if (
      !targetId ||
      !Number.isFinite(offsetX) ||
      !Number.isFinite(offsetY) ||
      !text
    ) {
      return NextResponse.json(
        { error: "Invalid comment payload" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        name: true,
        role: true,
        familyName: true,
        givenName: true,
      },
    });
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const authorName =
      user.name ?? `${user.familyName} ${user.givenName}`.trim();

    const thread = await prisma.diagramCommentThread.create({
      data: {
        diagramKey: articleId,
        diagramType,
        targetType,
        targetId,
        offsetX,
        offsetY,
        comments: {
          create: {
            body: text,
            authorName,
            authorRole: user.role,
            userId: user.id,
          },
        },
      },
      include: {
        comments: { orderBy: { createdAt: "asc" } },
      },
    });

    return NextResponse.json({ thread }, { status: 201 });
  } catch (error) {
    console.error("Failed to create comment thread:", error);
    return NextResponse.json(
      { error: "Failed to create comment thread" },
      { status: 500 },
    );
  }
}
