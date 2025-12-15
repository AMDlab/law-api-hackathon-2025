// ============================================
// e-Gov法令API型定義
// ============================================

/** XMLノード構造（e-Gov法令APIのJSON表現） */
export interface LawXmlNode {
  tag: string;
  attr?: Record<string, string>;
  children?: (LawXmlNode | string)[];
}

/** 法令リビジョン情報 */
export interface LawRevision {
  law_info?: {
    law_id: string;
    law_type: string;
  };
  revision_info: {
    law_revision_id: string;
    law_title: string;
    law_type: string;
    law_no: string;
  };
}

/** 法令一覧APIレスポンス */
export interface LawListResponse {
  laws: LawRevision[];
}

/** 法令データAPIレスポンス */
export interface LawDataResponse {
  law_full_text: LawXmlNode;
}

const API_BASE_URL = 'https://laws.e-gov.go.jp/api/2';

// 法令ID定義
export const LAW_IDS = {
  // 法律（Act）
  BUILDING_STANDARDS_ACT: '325AC0000000201',
  // 政令（CabinetOrder）- 施行令
  BUILDING_STANDARDS_ORDER: '325CO0000000338',
  // 省令（MinisterialOrdinance）- 施行規則
  BUILDING_STANDARDS_REGULATION: '325M50004000040',
} as const;

export type LawType = 'act' | 'order' | 'regulation';

export interface LawInfo {
  id: string;
  name: string;
  shortName: string;
  type: LawType;
}

export const LAW_INFO: Record<string, LawInfo> = {
  [LAW_IDS.BUILDING_STANDARDS_ACT]: {
    id: LAW_IDS.BUILDING_STANDARDS_ACT,
    name: '建築基準法',
    shortName: '法',
    type: 'act',
  },
  [LAW_IDS.BUILDING_STANDARDS_ORDER]: {
    id: LAW_IDS.BUILDING_STANDARDS_ORDER,
    name: '建築基準法施行令',
    shortName: '令',
    type: 'order',
  },
  [LAW_IDS.BUILDING_STANDARDS_REGULATION]: {
    id: LAW_IDS.BUILDING_STANDARDS_REGULATION,
    name: '建築基準法施行規則',
    shortName: '規則',
    type: 'regulation',
  },
};

// 後方互換性のため
export const BUILDING_STANDARDS_ACT_ID = LAW_IDS.BUILDING_STANDARDS_ACT;

export async function fetchLawList(lawId: string): Promise<LawRevision[]> {
  const response = await fetch(`${API_BASE_URL}/laws?law_id=${lawId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch law list: ${response.statusText}`);
  }
  const data: LawListResponse = await response.json();
  return data.laws;
}

export async function fetchLawData(revisionId: string): Promise<LawXmlNode> {
  const response = await fetch(`${API_BASE_URL}/law_data/${revisionId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch law data: ${response.statusText}`);
  }
  const data: LawDataResponse = await response.json();
  return data.law_full_text;
}

export async function getLawData(lawId: string): Promise<LawXmlNode> {
  const revisions = await fetchLawList(lawId);
  if (revisions.length === 0) {
    throw new Error(`Law not found: ${lawId}`);
  }
  const latestRevision = revisions[0];
  const lawData = await fetchLawData(latestRevision.revision_info.law_revision_id);
  return lawData;
}

// 後方互換性のため
export async function getBuildingStandardsAct() {
  return getLawData(BUILDING_STANDARDS_ACT_ID);
}

export async function searchLawIdByName(lawName: string): Promise<string | null> {
  const response = await fetch(`${API_BASE_URL}/laws?law_title=${encodeURIComponent(lawName)}`);
  if (!response.ok) {
    console.error('Failed to search law');
    return null;
  }
  const data: LawListResponse = await response.json();
  if (!data.laws || data.laws.length === 0) return null;

  // Try exact match first
  const exact = data.laws.find(l => l.revision_info.law_title === lawName);
  if (exact?.law_info?.law_id) {
    return exact.law_info.law_id;
  }

  return data.laws[0]?.law_info?.law_id || null;
}

// ============================================
// 条文取得用のユーティリティ関数
// ============================================

/**
 * XMLノードからテキストを再帰的に取得
 */
function getTextFromNode(node: LawXmlNode | string): string {
  if (typeof node === 'string') return node;
  if (!node.children) return '';
  return node.children.map(child => getTextFromNode(child)).join('');
}

/**
 * 指定した条番号のArticleノードを検索
 */
function findArticleNode(node: LawXmlNode | string, targetNum: string): LawXmlNode | null {
  if (typeof node === 'string') return null;

  if (node.tag === 'Article') {
    const numAttr = node.attr?.Num;
    if (numAttr === targetNum) {
      return node;
    }
  }

  if (node.children && Array.isArray(node.children)) {
    for (const child of node.children) {
      const result = findArticleNode(child, targetNum);
      if (result) return result;
    }
  }
  return null;
}

/**
 * Articleノードから条文テキストを抽出
 */
function extractArticleText(article: LawXmlNode): string {
  const parts: string[] = [];

  // ArticleCaption（見出し）
  const caption = article.children?.find(
    c => typeof c !== 'string' && c.tag === 'ArticleCaption'
  ) as LawXmlNode | undefined;
  if (caption) {
    parts.push(getTextFromNode(caption));
  }

  // ArticleTitle（条番号）
  const title = article.children?.find(
    c => typeof c !== 'string' && c.tag === 'ArticleTitle'
  ) as LawXmlNode | undefined;
  if (title) {
    parts.push(getTextFromNode(title));
  }

  // Paragraph（項）
  const paragraphs = article.children?.filter(
    c => typeof c !== 'string' && c.tag === 'Paragraph'
  ) as LawXmlNode[] || [];

  paragraphs.forEach(p => {
    parts.push(getTextFromNode(p));
  });

  return parts.join('');
}

export interface ArticleContent {
  lawId: string;
  lawName: string;
  articleNum: string;
  text: string;
  rawNode?: LawXmlNode;
}

/**
 * e-Gov法令APIから特定の条文を取得
 *
 * @param lawId - 法令ID (例: "325AC0000000201")
 * @param articleNum - 条番号 (例: "22", "20_3" ※「の」は「_」)
 * @returns 条文情報
 *
 * @example
 * ```ts
 * // 建築基準法第22条を取得
 * const article = await fetchArticle("325AC0000000201", "22");
 * console.log(article.text);
 * ```
 */
export async function fetchArticle(lawId: string, articleNum: string): Promise<ArticleContent> {
  // 法令データ全体を取得
  const lawData = await getLawData(lawId);

  // 条番号の「_」を数値形式に変換（API内部では「_」なし）
  const normalizedNum = articleNum.replace(/_/g, '');

  // 指定条を検索
  const articleNode = findArticleNode(lawData, normalizedNum);

  if (!articleNode) {
    throw new Error(`Article ${articleNum} not found in law ${lawId}`);
  }

  // テキスト抽出
  const text = extractArticleText(articleNode);

  // 法令名を取得
  const lawInfo = LAW_INFO[lawId];
  const lawName = lawInfo?.name || '不明';

  return {
    lawId,
    lawName,
    articleNum,
    text,
    rawNode: articleNode,
  };
}

/**
 * 建築基準法から特定の条文を取得するショートカット
 */
export async function fetchBuildingStandardsArticle(articleNum: string): Promise<ArticleContent> {
  return fetchArticle(LAW_IDS.BUILDING_STANDARDS_ACT, articleNum);
}

/**
 * 建築基準法施行令から特定の条文を取得するショートカット
 */
export async function fetchBuildingStandardsOrderArticle(articleNum: string): Promise<ArticleContent> {
  return fetchArticle(LAW_IDS.BUILDING_STANDARDS_ORDER, articleNum);
}

