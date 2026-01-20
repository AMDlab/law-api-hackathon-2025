-- CreateEnum
CREATE TYPE "DiagramType" AS ENUM ('kijo', 'flow');

-- CreateEnum
CREATE TYPE "LawType" AS ENUM ('act', 'order', 'regulation', 'notice');

-- CreateEnum
CREATE TYPE "DiagramNodeType" AS ENUM ('information', 'process', 'decision', 'terminal');

-- CreateEnum
CREATE TYPE "EdgeRole" AS ENUM ('input', 'output', 'primary', 'supporting', 'yes', 'no', 'flow');

-- CreateEnum
CREATE TYPE "RelatedLawRelationship" AS ENUM ('delegates_to', 'delegated_from', 'defines_detail', 'references', 'supersedes');

-- CreateTable
CREATE TABLE "Diagram" (
    "diagramKey" TEXT NOT NULL,
    "baseId" TEXT NOT NULL,
    "diagramType" "DiagramType" NOT NULL,
    "lawId" TEXT NOT NULL,
    "schemaId" TEXT,
    "version" TEXT NOT NULL,
    "pageTitleTitle" TEXT NOT NULL,
    "pageTitleTargetSubject" TEXT,
    "pageTitleDescription" TEXT,
    "lawType" "LawType" NOT NULL,
    "lawName" TEXT NOT NULL,
    "lawAbbrev" TEXT NOT NULL,
    "article" TEXT NOT NULL,
    "paragraph" TEXT,
    "item" TEXT,
    "textRaw" TEXT,
    "complianceLogic" JSONB,
    "diagramTitle" TEXT,
    "diagramDescription" TEXT,
    "kijoDiagramRef" TEXT,
    "metadata" JSONB,

    CONSTRAINT "Diagram_pkey" PRIMARY KEY ("diagramKey")
);

-- CreateTable
CREATE TABLE "DiagramLabel" (
    "id" TEXT NOT NULL,
    "diagramKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "DiagramLabel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RelatedLaw" (
    "id" TEXT NOT NULL,
    "diagramKey" TEXT NOT NULL,
    "lawId" TEXT NOT NULL,
    "lawName" TEXT NOT NULL,
    "lawType" "LawType" NOT NULL,
    "relationship" "RelatedLawRelationship" NOT NULL,
    "articles" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "description" TEXT,

    CONSTRAINT "RelatedLaw_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiagramNode" (
    "id" TEXT NOT NULL,
    "diagramKey" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "type" "DiagramNodeType" NOT NULL,
    "title" TEXT NOT NULL,
    "data" JSONB,

    CONSTRAINT "DiagramNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiagramEdge" (
    "id" TEXT NOT NULL,
    "diagramKey" TEXT NOT NULL,
    "edgeId" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "role" "EdgeRole",
    "label" TEXT,

    CONSTRAINT "DiagramEdge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Diagram_lawId_idx" ON "Diagram"("lawId");

-- CreateIndex
CREATE INDEX "Diagram_baseId_idx" ON "Diagram"("baseId");

-- CreateIndex
CREATE INDEX "Diagram_diagramType_idx" ON "Diagram"("diagramType");

-- CreateIndex
CREATE INDEX "DiagramLabel_diagramKey_idx" ON "DiagramLabel"("diagramKey");

-- CreateIndex
CREATE INDEX "RelatedLaw_diagramKey_idx" ON "RelatedLaw"("diagramKey");

-- CreateIndex
CREATE UNIQUE INDEX "DiagramNode_diagramKey_nodeId_key" ON "DiagramNode"("diagramKey", "nodeId");

-- CreateIndex
CREATE INDEX "DiagramNode_diagramKey_idx" ON "DiagramNode"("diagramKey");

-- CreateIndex
CREATE UNIQUE INDEX "DiagramEdge_diagramKey_edgeId_key" ON "DiagramEdge"("diagramKey", "edgeId");

-- CreateIndex
CREATE INDEX "DiagramEdge_diagramKey_idx" ON "DiagramEdge"("diagramKey");

-- AddForeignKey
ALTER TABLE "DiagramLabel" ADD CONSTRAINT "DiagramLabel_diagramKey_fkey" FOREIGN KEY ("diagramKey") REFERENCES "Diagram"("diagramKey") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelatedLaw" ADD CONSTRAINT "RelatedLaw_diagramKey_fkey" FOREIGN KEY ("diagramKey") REFERENCES "Diagram"("diagramKey") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagramNode" ADD CONSTRAINT "DiagramNode_diagramKey_fkey" FOREIGN KEY ("diagramKey") REFERENCES "Diagram"("diagramKey") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagramEdge" ADD CONSTRAINT "DiagramEdge_diagramKey_fkey" FOREIGN KEY ("diagramKey") REFERENCES "Diagram"("diagramKey") ON DELETE CASCADE ON UPDATE CASCADE;
