-- CreateTable
CREATE TABLE "DiagramSnapshot" (
    "id" TEXT NOT NULL,
    "diagramKey" TEXT NOT NULL,
    "diagramType" "DiagramType" NOT NULL,
    "snapshot" JSONB NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiagramSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DiagramSnapshot_diagramKey_idx" ON "DiagramSnapshot"("diagramKey");

-- CreateIndex
CREATE INDEX "DiagramSnapshot_diagramType_idx" ON "DiagramSnapshot"("diagramType");

-- CreateIndex
CREATE INDEX "DiagramSnapshot_createdAt_idx" ON "DiagramSnapshot"("createdAt");

-- AddForeignKey
ALTER TABLE "DiagramSnapshot" ADD CONSTRAINT "DiagramSnapshot_diagramKey_fkey" FOREIGN KEY ("diagramKey") REFERENCES "Diagram"("diagramKey") ON DELETE CASCADE ON UPDATE CASCADE;
