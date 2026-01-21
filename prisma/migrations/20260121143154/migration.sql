-- AlterTable
ALTER TABLE "DiagramComment" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "DiagramCommentThread" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isResolved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "resolvedAt" TIMESTAMP(3);
