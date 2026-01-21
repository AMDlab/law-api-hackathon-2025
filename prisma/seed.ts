import {
  PrismaClient,
  DiagramType,
  DiagramNodeType,
  EdgeRole,
  LawType,
  RelatedLawRelationship,
} from "@prisma/client";
import * as fs from "fs/promises";
import * as path from "path";

const prisma = new PrismaClient();
const DIAGRAMS_DIR = path.join(process.cwd(), "data", "diagrams");

type RawDiagram = {
  id?: string;
  version?: string;
  page_title?: {
    title?: string;
    target_subject?: string;
    description?: string;
  };
  legal_ref?: {
    law_id?: string;
    law_type?: LawType;
    law_name?: string;
    law_abbrev?: string;
    article?: string;
    paragraph?: string | null;
    item?: string | null;
  };
  labels?: string[];
  text_raw?: string;
  compliance_logic?: unknown;
  kijo_diagram?: {
    nodes?: Array<Record<string, unknown>>;
    edges?: Array<Record<string, unknown>>;
  };
  flow_diagram?: {
    title?: string;
    description?: string;
    nodes?: Array<Record<string, unknown>>;
    edges?: Array<Record<string, unknown>>;
  };
  kijo_diagram_ref?: string;
  related_laws?: Array<{
    law_id?: string;
    law_name?: string;
    law_type?: LawType;
    relationship?: RelatedLawRelationship;
    articles?: string[];
    description?: string;
  }>;
  metadata?: unknown;
};

function getDiagramType(diagramKey: string): DiagramType | null {
  if (diagramKey.endsWith("_kijo")) return DiagramType.kijo;
  if (diagramKey.endsWith("_flow")) return DiagramType.flow;
  return null;
}

function getBaseArticleId(diagramKey: string): string {
  return diagramKey.replace(/_(kijo|flow)$/, "");
}

async function listDiagramFiles(): Promise<
  Array<{ lawId: string; diagramKey: string; filePath: string }>
> {
  const entries = await fs.readdir(DIAGRAMS_DIR, { withFileTypes: true });
  const results: Array<{
    lawId: string;
    diagramKey: string;
    filePath: string;
  }> = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const lawId = entry.name;
    const lawDir = path.join(DIAGRAMS_DIR, lawId);
    const files = await fs.readdir(lawDir, { withFileTypes: true });
    for (const file of files) {
      if (!file.isFile() || !file.name.endsWith(".json")) continue;
      const diagramKey = file.name.replace(/\.json$/, "");
      results.push({
        lawId,
        diagramKey,
        filePath: path.join(lawDir, file.name),
      });
    }
  }

  return results;
}

function parseNodes(nodes: Array<Record<string, unknown>>, diagramKey: string) {
  return nodes.map((node) => {
    const { id, type, title, ...rest } = node as {
      id: string;
      type: DiagramNodeType;
      title: string;
    };
    return {
      diagramKey,
      nodeId: id,
      type,
      title,
      data: Object.keys(rest).length > 0 ? rest : undefined,
    };
  });
}

function parseEdges(edges: Array<Record<string, unknown>>, diagramKey: string) {
  return edges.map((edge) => {
    const { id, from, to, role, label } = edge as {
      id: string;
      from: string;
      to: string;
      role?: EdgeRole;
      label?: string;
    };
    return {
      diagramKey,
      edgeId: id,
      fromId: from,
      toId: to,
      role: role ?? undefined,
      label: label ?? undefined,
    };
  });
}

async function main() {
  const files = await listDiagramFiles();
  console.info(`Found ${files.length} diagram files.`);

  await prisma.diagramEdge.deleteMany();
  await prisma.diagramNode.deleteMany();
  await prisma.diagramLabel.deleteMany();
  await prisma.relatedLaw.deleteMany();
  await prisma.diagram.deleteMany();

  for (const file of files) {
    const raw = await fs.readFile(file.filePath, "utf-8");
    const json = JSON.parse(raw) as RawDiagram;
    const diagramType = getDiagramType(file.diagramKey);
    if (!diagramType) {
      console.warn(`Skipping file with unknown type: ${file.filePath}`);
      continue;
    }

    const pageTitle = json.page_title ?? {};
    const legalRef = json.legal_ref ?? {};
    const diagramNodes =
      diagramType === DiagramType.kijo
        ? (json.kijo_diagram?.nodes ?? [])
        : (json.flow_diagram?.nodes ?? []);
    const diagramEdges =
      diagramType === DiagramType.kijo
        ? (json.kijo_diagram?.edges ?? [])
        : (json.flow_diagram?.edges ?? []);

    const lawId = legalRef.law_id ?? file.lawId;

    await prisma.diagram.create({
      data: {
        diagramKey: file.diagramKey,
        baseId: getBaseArticleId(file.diagramKey),
        diagramType,
        lawId,
        schemaId: json.id ?? null,
        version: json.version ?? "3.0.0",
        pageTitleTitle: pageTitle.title ?? "",
        pageTitleTargetSubject: pageTitle.target_subject ?? null,
        pageTitleDescription: pageTitle.description ?? null,
        lawType: (legalRef.law_type ?? "act") as LawType,
        lawName: legalRef.law_name ?? "",
        lawAbbrev: legalRef.law_abbrev ?? "",
        article: legalRef.article ?? "",
        paragraph: legalRef.paragraph ?? null,
        item: legalRef.item ?? null,
        textRaw: json.text_raw ?? null,
        complianceLogic: json.compliance_logic ?? undefined,
        diagramTitle:
          diagramType === DiagramType.flow
            ? (json.flow_diagram?.title ?? null)
            : null,
        diagramDescription:
          diagramType === DiagramType.flow
            ? (json.flow_diagram?.description ?? null)
            : null,
        kijoDiagramRef: json.kijo_diagram_ref ?? null,
        metadata: json.metadata ?? undefined,
      },
    });

    const labels = (json.labels ?? []).map((label) => ({
      diagramKey: file.diagramKey,
      label,
    }));
    if (labels.length > 0) {
      await prisma.diagramLabel.createMany({ data: labels });
    }

    const relatedLaws = (json.related_laws ?? []).map((law) => ({
      diagramKey: file.diagramKey,
      lawId: law.law_id ?? "",
      lawName: law.law_name ?? "",
      lawType: (law.law_type ?? "act") as LawType,
      relationship: (law.relationship ??
        "references") as RelatedLawRelationship,
      articles: law.articles ?? [],
      description: law.description ?? null,
    }));
    if (relatedLaws.length > 0) {
      await prisma.relatedLaw.createMany({ data: relatedLaws });
    }

    if (diagramNodes.length > 0) {
      await prisma.diagramNode.createMany({
        data: parseNodes(diagramNodes, file.diagramKey),
      });
    }
    if (diagramEdges.length > 0) {
      await prisma.diagramEdge.createMany({
        data: parseEdges(diagramEdges, file.diagramKey),
      });
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
