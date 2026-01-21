export type CommentTargetType = "node" | "edge";

export interface DiagramComment {
  id: string;
  threadId: string;
  authorName: string;
  authorRole: string;
  body: string;
  isDeleted: boolean;
  deletedAt?: string | null;
  createdAt: string;
}

export interface DiagramCommentThread {
  id: string;
  diagramKey: string;
  diagramType: "kijo" | "flow";
  targetType: CommentTargetType;
  targetId: string;
  offsetX: number;
  offsetY: number;
  isResolved: boolean;
  isDeleted: boolean;
  resolvedAt?: string | null;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  comments: DiagramComment[];
}
