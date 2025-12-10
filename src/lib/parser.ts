
export interface LawNode {
  type: string;
  title: string;
  children: LawNode[];
  content?: string;
  articleTitle?: string; // For articles, e.g., "第一条"
  /** 条番号 (例: "1", "20_3") */
  articleNum?: string;
  /** 項番号 (例: "1", "2") */
  paragraphNum?: string;
  /** 号番号 (例: "1", "2") */
  itemNum?: string;
  /** 機序図用のID (例: "A43_P1", "A20_3_P2_I1") */
  diagramId?: string;
  /** 規制文かどうか */
  isRegulation?: boolean;
  /** 条文の見出し (例: "（目的）") */
  caption?: string;
}

interface XmlNode {
    tag: string;
    attr?: Record<string, string>;
    children?: (XmlNode | string)[];
}

// Helper to get text content from a node (recursively)
function getText(node: XmlNode | string): string {
    if (typeof node === 'string') return node;
    if (!node.children) return '';
    return node.children.map(child => getText(child)).join('');
}

// Helper to find first child by tag
function findChild(node: XmlNode, tagName: string): XmlNode | undefined {
    if (!node.children) return undefined;
    return node.children.find(c => typeof c !== 'string' && c.tag === tagName) as XmlNode | undefined;
}

// Helper to find all children by tag
function findChildren(node: XmlNode, tagName: string): XmlNode[] {
    if (!node.children) return [];
    return node.children.filter(c => typeof c !== 'string' && c.tag === tagName) as XmlNode[];
}

export function parseLawData(lawData: any): LawNode[] {
  // Check if it's the new XML-JSON structure
  if (!lawData || typeof lawData !== 'object') return [];
  
  // lawData should be the root 'Law' node or have 'Law' property?
  // The API returns { law_full_text: { tag: 'Law', ... } }
  // Our fetch returns law_full_text directly.
  
  let rootNode = lawData as XmlNode;
  
  // Just in case it's wrapped
  if (rootNode.tag !== 'Law' && (lawData as any).Law) {
      // Old structure or wrapper? Unlikely based on test, but safety check.
      // logic for old structure removed as we confirmed new structure
  }
  
  if (rootNode.tag !== 'Law') {
      console.warn('Root node is not Law', rootNode);
      return [];
  }

  const lawBody = findChild(rootNode, 'LawBody');
  if (!lawBody) return [];

  const mainProvision = findChild(lawBody, 'MainProvision');
  if (!mainProvision) return [];

  return traverse(mainProvision);
}

function traverse(node: XmlNode): LawNode[] {
    const nodes: LawNode[] = [];
    if (!node.children) return nodes;

    const containerTags = ['Part', 'Chapter', 'Section', 'Subsection', 'Division', 'Article'];

    node.children.forEach(child => {
        if (typeof child === 'string') return;

        if (containerTags.includes(child.tag)) {
            // Find title
            // e.g. Chapter -> ChapterTitle
            const titleTag = child.tag === 'Article' ? 'ArticleTitle' : `${child.tag}Title`;
            const titleNode = findChild(child, titleTag);
            const title = titleNode ? getText(titleNode) : '';

            const newNode: LawNode = {
                type: child.tag,
                title: title,
                children: []
            };

            if (child.tag === 'Article') {
                newNode.articleTitle = title;
                // 条番号を取得 (例: "1", "20" など Num属性から)
                const articleNum = child.attr?.Num || '';
                newNode.articleNum = articleNum;

                // 見出し取得
                const captionNode = findChild(child, 'ArticleCaption');
                if (captionNode) {
                    newNode.caption = getText(captionNode);
                }

                // 条の下に項を展開
                newNode.children = extractParagraphs(child, articleNum);
                newNode.content = extractArticleContent(child);
            } else {
                newNode.children = traverse(child);
            }

            nodes.push(newNode);
        }
    });

    return nodes;
}

/**
 * 規制文かどうかを判定
 * 「〜しなければならない」「〜してはならない」で終わる文を規制文とする
 */
function isRegulationText(text: string): boolean {
    const patterns = [
        /しなければならない[。]?$/,
        /してはならない[。]?$/,
        /することができない[。]?$/,
        /ものとする[。]?$/,
    ];
    return patterns.some(p => p.test(text.trim()));
}

/**
 * 条から項を抽出
 */
function extractParagraphs(article: XmlNode, articleNum: string): LawNode[] {
    const paragraphs = findChildren(article, 'Paragraph');
    const nodes: LawNode[] = [];

    paragraphs.forEach(p => {
        const pNumAttr = p.attr?.Num || '1';
        const pNumNode = findChild(p, 'ParagraphNum');
        const pNumText = pNumNode ? getText(pNumNode) : '';

        // 項の本文を取得
        const pSentence = findChild(p, 'ParagraphSentence');
        const sentenceText = pSentence ? extractSentenceText(pSentence) : '';

        // diagramId生成 (例: A43_P1)
        const diagramId = `A${articleNum.replace(/の/g, '_')}_P${pNumAttr}`;

        // 規制文判定
        const isRegulation = isRegulationText(sentenceText);

        const paragraphNode: LawNode = {
            type: 'Paragraph',
            title: pNumText ? `第${pNumText}項` : '第1項',
            paragraphNum: pNumAttr,
            articleNum: articleNum,
            diagramId: diagramId,
            isRegulation: isRegulation,
            content: sentenceText,
            children: extractItems(p, articleNum, pNumAttr)
        };

        nodes.push(paragraphNode);
    });

    return nodes;
}

/**
 * 項から号を抽出
 */
function extractItems(paragraph: XmlNode, articleNum: string, paragraphNum: string): LawNode[] {
    const items = findChildren(paragraph, 'Item');
    const nodes: LawNode[] = [];

    items.forEach(item => {
        const itemNumAttr = item.attr?.Num || '';
        const itemTitleNode = findChild(item, 'ItemTitle');
        const itemTitle = itemTitleNode ? getText(itemTitleNode) : '';

        // 号の本文を取得
        const itemSentence = findChild(item, 'ItemSentence');
        const sentenceText = itemSentence ? extractSentenceText(itemSentence) : '';

        // diagramId生成 (例: A43_P1_I1)
        const diagramId = `A${articleNum.replace(/の/g, '_')}_P${paragraphNum}_I${itemNumAttr}`;

        // 規制文判定
        const isRegulation = isRegulationText(sentenceText);

        const itemNode: LawNode = {
            type: 'Item',
            title: itemTitle,
            itemNum: itemNumAttr,
            paragraphNum: paragraphNum,
            articleNum: articleNum,
            diagramId: diagramId,
            isRegulation: isRegulation,
            content: sentenceText,
            children: [] // Subitem1などはここでは展開しない
        };

        nodes.push(itemNode);
    });

    return nodes;
}

/**
 * Sentence要素からテキストを抽出
 */
function extractSentenceText(sentenceContainer: XmlNode): string {
    const sentences: string[] = [];

    // Sentence子要素から
    const sentNodes = findChildren(sentenceContainer, 'Sentence');
    sentNodes.forEach(s => {
        sentences.push(getText(s));
    });

    // Column子要素から（定義文などで使用）
    const columnNodes = findChildren(sentenceContainer, 'Column');
    columnNodes.forEach(col => {
        sentences.push(getText(col));
    });

    // 直接のテキストも
    if (sentences.length === 0) {
        sentences.push(getText(sentenceContainer));
    }

    return sentences.join('');
}


function extractArticleContent(article: XmlNode): string {
  let content = '';
  
  // ArticleCaption
  const caption = findChild(article, 'ArticleCaption');
  if (caption) {
      content += `【${getText(caption)}】\n`;
  }
  
  const paragraphs = findChildren(article, 'Paragraph');
  paragraphs.forEach(p => {
      const pNumNode = findChild(p, 'ParagraphNum');
      const pNum = pNumNode ? getText(pNumNode) : '';
      
      const sentences: string[] = [];
      const pSentence = findChild(p, 'ParagraphSentence');
      if (pSentence) {
          const sentNodes = findChildren(pSentence, 'Sentence');
          sentNodes.forEach(s => {
              sentences.push(getText(s));
          });
          // Sometimes ParagraphSentence has text directly or mixed?
          // Usually it has Sentence children.
      }
      
      content += `${pNum} ${sentences.join('')}\n`;
  });
  
  return content;
}

export interface Reference {
  lawName?: string;
  article: string;
  fullText: string;
}

export function findReferences(text: string): Reference[] {
  const regex = /((?:[^\s「]+法)|同法)?\s*第([一二三四五六七八九十百千]+)条/g;
  const matches: Reference[] = [];
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    let lawName: string | undefined = match[1];
    if (lawName === '同法') lawName = undefined;
    
    matches.push({
      lawName: lawName,
      article: `第${match[2]}条`,
      fullText: match[0]
    });
  }
  
  return matches;
}

export function generateMermaid(articleTitle: string, content: string, references: {ref: Reference, content?: string}[]): string {
  let mermaid = 'graph TD\n';
  const safeTitle = articleTitle.replace(/[()]/g, '');
  mermaid += `  start["${safeTitle}"]\n`;
  
  const lines = content.split('\n').filter(l => l.trim().length > 0);
  
  lines.forEach((line, index) => {
    const shortLine = line.length > 30 ? line.substring(0, 30) + '...' : line;
    const safeLine = shortLine.replace(/["()]/g, '');
    const nodeId = `L${index}`;
    mermaid += `  ${nodeId}["${safeLine}"]\n`;
    
    if (index === 0) {
      mermaid += `  start --> ${nodeId}\n`;
    } else {
      mermaid += `  L${index-1} --> ${nodeId}\n`;
    }
    
    references.forEach((ref, refIndex) => {
      if (line.includes(ref.ref.fullText)) {
        const refNodeId = `REF${refIndex}`;
        const refTitle = ref.ref.lawName ? `${ref.ref.lawName}\n${ref.ref.article}` : ref.ref.article;
        
        mermaid += `  ${refNodeId}[("${refTitle}")]\n`;
        mermaid += `  ${nodeId} -.-> ${refNodeId}\n`;
        
        if (ref.content) {
             const refContentId = `REF_CONTENT${refIndex}`;
             const shortRefContent = ref.content.substring(0, 50).replace(/["()]/g, '') + '...';
             mermaid += `  ${refContentId}["${shortRefContent}"]\n`;
             mermaid += `  ${refNodeId} --> ${refContentId}\n`;
        }
      }
    });
  });
  
  return mermaid;
}

export function findArticleInJson(lawData: any, articleTitle: string): string | null {
  if (!lawData || typeof lawData !== 'object') return null;
  const rootNode = lawData as XmlNode;
  
  // DFS to find Article with matching title
  
  function search(node: XmlNode): string | null {
      if (node.tag === 'Article') {
          const titleNode = findChild(node, 'ArticleTitle');
          if (titleNode && getText(titleNode) === articleTitle) {
              return extractArticleContent(node);
          }
      }
      
      if (node.children) {
          for (const child of node.children) {
              if (typeof child !== 'string') {
                  const result = search(child);
                  if (result) return result;
              }
          }
      }
      return null;
  }
  
  return search(rootNode);
}
