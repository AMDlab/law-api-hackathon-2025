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

type DiagramPayload = Record<string, any>;

export function buildDiagramJson(
  diagram: DiagramWithRelations,
  diagramType: DiagramType
): Record<string, unknown> {
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

  return jsonData;
}

export function extractDiagramUpdate(
  payload: DiagramPayload,
  diagramType: DiagramType
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
    complianceLogic: unknown | null;
    diagramTitle: string | null;
    diagramDescription: string | null;
    kijoDiagramRef: string | null;
    metadata: unknown | null;
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
    data?: Record<string, unknown>;
  }>;
  edges: Array<{
    edgeId: string;
    fromId: string;
    toId: string;
    role?: EdgeRole | null;
    label?: string | null;
  }>;
} {
  const pageTitle = payload.page_title ?? {};
  const legalRef = payload.legal_ref ?? {};
  const labels = (payload.labels ?? []).map((label: string) => ({ label }));
  const relatedLaws = (payload.related_laws ?? []).map((law: any) => ({
    lawId: law.law_id ?? "",
    lawName: law.law_name ?? "",
    lawType: (law.law_type ?? "act") as LawType,
    relationship: (law.relationship ?? "references") as RelatedLawRelationship,
    articles: law.articles ?? [],
    description: law.description ?? null,
  }));

  const diagramStructure =
    diagramType === "kijo" ? payload.kijo_diagram : payload.flow_diagram;

  const nodes = (diagramStructure?.nodes ?? []).map((node: any) => {
    const { id, type, title, ...rest } = node ?? {};
    const data = Object.keys(rest ?? {}).length > 0 ? rest : undefined;
    return {
      nodeId: id,
      type: type as DiagramNodeType,
      title: title ?? "",
      data,
    };
  });

  const edges = (diagramStructure?.edges ?? []).map((edge: any) => {
    const { id, from, to, role, label } = edge ?? {};
    return {
      edgeId: id,
      fromId: from,
      toId: to,
      role: role ?? null,
      label: label ?? null,
    };
  });

  const updateData = {
    schemaId: payload.id ?? null,
    version: payload.version ?? "3.0.0",
    pageTitleTitle: pageTitle.title ?? "",
    pageTitleTargetSubject: pageTitle.target_subject ?? null,
    pageTitleDescription: pageTitle.description ?? null,
    lawType: (legalRef.law_type ?? "act") as LawType,
    lawName: legalRef.law_name ?? "",
    lawAbbrev: legalRef.law_abbrev ?? "",
    article: legalRef.article ?? "",
    paragraph: legalRef.paragraph ?? null,
    item: legalRef.item ?? null,
    textRaw: payload.text_raw ?? null,
    complianceLogic: payload.compliance_logic ?? null,
    diagramTitle: diagramType === "flow" ? diagramStructure?.title ?? "" : null,
    diagramDescription:
      diagramType === "flow" ? diagramStructure?.description ?? null : null,
    kijoDiagramRef: diagramType === "flow" ? payload.kijo_diagram_ref ?? null : null,
    metadata: payload.metadata ?? null,
  };

  return { updateData, labels, relatedLaws, nodes, edges };
}
