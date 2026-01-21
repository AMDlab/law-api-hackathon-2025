import { Prisma } from "@prisma/client";
import type {
  Diagram,
  DiagramLabel,
  RelatedLaw,
  DiagramNode,
  DiagramEdge,
  DiagramType,
  LawType,
  RelatedLawRelationship,
  DiagramNodeType,
  EdgeRole,
} from "@prisma/client";

type DiagramWithRelations = Diagram & {
  labels: DiagramLabel[];
  relatedLaws: RelatedLaw[];
  nodes: DiagramNode[];
  edges: DiagramEdge[];
};

type DiagramPayload = Record<string, unknown>;
type UnknownRecord = Record<string, unknown>;
type JsonInput = Prisma.InputJsonValue;
type NullableJsonInput = Prisma.NullableJsonNullValueInput | JsonInput;

const asRecord = (value: unknown): UnknownRecord =>
  typeof value === "object" && value !== null ? (value as UnknownRecord) : {};

const asString = (value: unknown): string =>
  typeof value === "string" ? value : "";

const asStringOrNull = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];

export function buildDiagramJson(
  diagram: DiagramWithRelations,
  diagramType: DiagramType,
): JsonInput {
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

  return jsonData as JsonInput;
}

export function extractDiagramUpdate(
  payload: DiagramPayload,
  diagramType: DiagramType,
): {
  updateData: {
    schemaId: string | null;
    version: string;
    pageTitleTitle: string;
    pageTitleTargetSubject: string | null;
    pageTitleDescription: string | null;
    lawType: LawType;
    lawName: string;
    lawAbbrev: string;
    article: string;
    paragraph: string | null;
    item: string | null;
    textRaw: string | null;
    complianceLogic: NullableJsonInput;
    diagramTitle: string | null;
    diagramDescription: string | null;
    kijoDiagramRef: string | null;
    metadata: NullableJsonInput;
  };
  labels: Array<{ label: string }>;
  relatedLaws: Array<{
    lawId: string;
    lawName: string;
    lawType: LawType;
    relationship: RelatedLawRelationship;
    articles: string[];
    description: string | null;
  }>;
  nodes: Array<{
    nodeId: string;
    type: DiagramNodeType;
    title: string;
    data?: NullableJsonInput;
  }>;
  edges: Array<{
    edgeId: string;
    fromId: string;
    toId: string;
    role?: EdgeRole | null;
    label?: string | null;
  }>;
} {
  const pageTitle = asRecord(payload.page_title);
  const legalRef = asRecord(payload.legal_ref);
  const labels = asStringArray(payload.labels).map((label) => ({ label }));
  const relatedLaws = (
    Array.isArray(payload.related_laws) ? payload.related_laws : []
  ).map((law) => {
    const lawRecord = asRecord(law);
    return {
      lawId: asString(lawRecord.law_id),
      lawName: asString(lawRecord.law_name),
      lawType: (asString(lawRecord.law_type) || "act") as LawType,
      relationship: (asString(lawRecord.relationship) ||
        "references") as RelatedLawRelationship,
      articles: asStringArray(lawRecord.articles),
      description: asStringOrNull(lawRecord.description),
    };
  });

  const diagramStructure = asRecord(
    diagramType === "kijo" ? payload.kijo_diagram : payload.flow_diagram,
  );

  const nodes = (
    Array.isArray(diagramStructure.nodes) ? diagramStructure.nodes : []
  ).map((node) => {
    const nodeRecord = asRecord(node);
    const { id, type, title, ...rest } = nodeRecord;
    const data = Object.keys(rest).length > 0 ? (rest as JsonInput) : undefined;
    return {
      nodeId: asString(id),
      type: (asString(type) || "information") as DiagramNodeType,
      title: asString(title),
      data,
    };
  });

  const edges = (
    Array.isArray(diagramStructure.edges) ? diagramStructure.edges : []
  ).map((edge) => {
    const edgeRecord = asRecord(edge);
    const role = asString(edgeRecord.role);
    return {
      edgeId: asString(edgeRecord.id),
      fromId: asString(edgeRecord.from),
      toId: asString(edgeRecord.to),
      role: role ? (role as EdgeRole) : null,
      label: asStringOrNull(edgeRecord.label),
    };
  });

  const updateData = {
    schemaId: asStringOrNull(payload.id),
    version: asString(payload.version) || "3.0.0",
    pageTitleTitle: asString(pageTitle.title),
    pageTitleTargetSubject: asStringOrNull(pageTitle.target_subject),
    pageTitleDescription: asStringOrNull(pageTitle.description),
    lawType: (asString(legalRef.law_type) || "act") as LawType,
    lawName: asString(legalRef.law_name),
    lawAbbrev: asString(legalRef.law_abbrev),
    article: asString(legalRef.article),
    paragraph: asStringOrNull(legalRef.paragraph),
    item: asStringOrNull(legalRef.item),
    textRaw: asStringOrNull(payload.text_raw),
    complianceLogic:
      payload.compliance_logic !== undefined
        ? (payload.compliance_logic as JsonInput)
        : Prisma.DbNull,
    diagramTitle:
      diagramType === "flow" ? asString(diagramStructure.title) : null,
    diagramDescription:
      diagramType === "flow"
        ? asStringOrNull(diagramStructure.description)
        : null,
    kijoDiagramRef:
      diagramType === "flow" ? asStringOrNull(payload.kijo_diagram_ref) : null,
    metadata:
      payload.metadata !== undefined
        ? (payload.metadata as JsonInput)
        : Prisma.DbNull,
  };

  return { updateData, labels, relatedLaws, nodes, edges };
}
