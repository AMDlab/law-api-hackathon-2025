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
    threadId: string;
  }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { lawId, articleId, threadId } = await params;
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

    const diagramKey = `${lawId}/${articleId}`;
    const diagram = await prisma.diagram.findUnique({
      where: { diagramKey },
      select: { lawId: true },
    });
    if (!diagram || diagram.lawId !== lawId) {
      return NextResponse.json({ error: "Diagram not found" }, { status: 404 });
    }

    const body = await request.json();
    const text = typeof body.body === "string" ? body.body.trim() : "";
    if (!text) {
      return NextResponse.json(
        { error: "Invalid comment payload" },
        { status: 400 },
      );
    }

    const thread = await prisma.diagramCommentThread.findUnique({
      where: { id: threadId },
      select: {
        id: true,
        diagramKey: true,
        diagramType: true,
        isDeleted: true,
      },
    });
    if (
      !thread ||
      thread.diagramKey !== diagramKey ||
      thread.diagramType !== diagramType ||
      thread.isDeleted
    ) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
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

    const comment = await prisma.diagramComment.create({
      data: {
        threadId: thread.id,
        userId: user.id,
        authorName,
        authorRole: user.role,
        body: text,
      },
    });

    await prisma.diagramCommentThread.update({
      where: { id: thread.id },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error("Failed to add comment:", error);
    return NextResponse.json(
      { error: "Failed to add comment" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { lawId, articleId, threadId } = await params;
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

    const diagramKey = `${lawId}/${articleId}`;
    const diagram = await prisma.diagram.findUnique({
      where: { diagramKey },
      select: { lawId: true },
    });
    if (!diagram || diagram.lawId !== lawId) {
      return NextResponse.json({ error: "Diagram not found" }, { status: 404 });
    }

    const body = await request.json();
    const action = typeof body.action === "string" ? body.action : "";

    const thread = await prisma.diagramCommentThread.findUnique({
      where: { id: threadId },
      select: {
        id: true,
        diagramKey: true,
        diagramType: true,
        isDeleted: true,
      },
    });
    if (
      !thread ||
      thread.diagramKey !== diagramKey ||
      thread.diagramType !== diagramType
    ) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    if (action === "resolve" || action === "reopen") {
      const isResolved = action === "resolve";
      const updated = await prisma.diagramCommentThread.update({
        where: { id: threadId },
        data: {
          isResolved,
          resolvedAt: isResolved ? new Date() : null,
        },
        include: {
          comments: {
            where: { isDeleted: false },
            orderBy: { createdAt: "asc" },
          },
        },
      });
      return NextResponse.json({ thread: updated });
    }

    if (action === "delete") {
      if (thread.isDeleted) {
        return NextResponse.json({ ok: true });
      }
      const updated = await prisma.diagramCommentThread.update({
        where: { id: threadId },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
        include: {
          comments: {
            where: { isDeleted: false },
            orderBy: { createdAt: "asc" },
          },
        },
      });
      return NextResponse.json({ thread: updated });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Failed to update comment thread:", error);
    return NextResponse.json(
      { error: "Failed to update comment thread" },
      { status: 500 },
    );
  }
}
