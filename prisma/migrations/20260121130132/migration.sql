-- CreateEnum
CREATE TYPE "CommentTargetType" AS ENUM ('node', 'edge');

-- CreateTable
CREATE TABLE "DiagramCommentThread" (
    "id" TEXT NOT NULL,
    "diagramKey" TEXT NOT NULL,
    "diagramType" "DiagramType" NOT NULL,
    "targetType" "CommentTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "offsetX" DOUBLE PRECISION NOT NULL,
    "offsetY" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiagramCommentThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiagramComment" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorRole" "UserRole" NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiagramComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DiagramCommentThread_diagramKey_diagramType_idx" ON "DiagramCommentThread"("diagramKey", "diagramType");

-- CreateIndex
CREATE INDEX "DiagramCommentThread_targetType_targetId_idx" ON "DiagramCommentThread"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "DiagramComment_threadId_idx" ON "DiagramComment"("threadId");

-- CreateIndex
CREATE INDEX "DiagramComment_userId_idx" ON "DiagramComment"("userId");

-- AddForeignKey
ALTER TABLE "DiagramCommentThread" ADD CONSTRAINT "DiagramCommentThread_diagramKey_fkey" FOREIGN KEY ("diagramKey") REFERENCES "Diagram"("diagramKey") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagramComment" ADD CONSTRAINT "DiagramComment_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "DiagramCommentThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagramComment" ADD CONSTRAINT "DiagramComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
