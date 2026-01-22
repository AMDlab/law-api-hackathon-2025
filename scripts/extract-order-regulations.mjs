/**
 * 建築基準法施行令から規制文を含む条文を抽出するスクリプト
 * 第2章〜第7章の4を対象
 */

const API_BASE_URL = "https://laws.e-gov.go.jp/api/2";
const BUILDING_STANDARDS_ORDER_ID = "325CO0000000338";

// 規制文パターン
const REGULATION_PATTERNS = [
  /しなければならない/,
  /してはならない/,
  /することができない/,
  /ものとする/,
  /なければならない/,
  /することができる/,  // 許可規定も含む
];

function isRegulationText(text) {
  return REGULATION_PATTERNS.some((p) => p.test(text));
}

async function fetchLawList(lawId) {
  const response = await fetch(`${API_BASE_URL}/laws?law_id=${lawId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch law list: ${response.statusText}`);
  }
  const data = await response.json();
  return data.laws;
}

async function fetchLawData(revisionId) {
  const response = await fetch(`${API_BASE_URL}/law_data/${revisionId}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch law data: ${response.statusText}`);
  }
  const data = await response.json();
  return data.law_full_text;
}

function getText(node) {
  if (typeof node === "string") return node;
  if (!node.children) return "";
  return node.children.map((child) => getText(child)).join("");
}

function findChild(node, tagName) {
  if (!node.children) return undefined;
  return node.children.find((c) => typeof c !== "string" && c.tag === tagName);
}

function findChildren(node, tagName) {
  if (!node.children) return [];
  return node.children.filter((c) => typeof c !== "string" && c.tag === tagName);
}

// 章番号を取得（"2", "3", "7_4" など）
function getChapterNum(chapterNode) {
  return chapterNode.attr?.Num || "";
}

// 章番号が第2章〜第7章の4の範囲内かをチェック
function isTargetChapter(chapterNum) {
  // 通常の番号: "2", "3", "4", "5", "6", "7"
  // 枝番: "7_2", "7_3", "7_4"
  if (!chapterNum) return false;

  const num = parseInt(chapterNum.split("_")[0]);
  if (num >= 2 && num <= 7) {
    // 第7章の場合、7_5以降は除外
    if (num === 7 && chapterNum.includes("_")) {
      const subNum = parseInt(chapterNum.split("_")[1]);
      return subNum <= 4;
    }
    return true;
  }
  return false;
}

// 条から項と号を抽出し、規制文をチェック
function extractRegulationsFromArticle(article) {
  const results = [];
  const articleNum = article.attr?.Num || "";

  const paragraphs = findChildren(article, "Paragraph");

  paragraphs.forEach((p) => {
    const paragraphNum = p.attr?.Num || "1";

    // 項の本文をチェック
    const pSentence = findChild(p, "ParagraphSentence");
    if (pSentence) {
      const text = getText(pSentence);
      if (isRegulationText(text)) {
        results.push({
          articleNum,
          paragraphNum,
          itemNum: null,
          text: text.substring(0, 100) + (text.length > 100 ? "..." : ""),
        });
      }
    }

    // 号をチェック
    const items = findChildren(p, "Item");
    items.forEach((item) => {
      const itemNum = item.attr?.Num || "";
      const itemSentence = findChild(item, "ItemSentence");
      if (itemSentence) {
        const text = getText(itemSentence);
        if (isRegulationText(text)) {
          results.push({
            articleNum,
            paragraphNum,
            itemNum,
            text: text.substring(0, 100) + (text.length > 100 ? "..." : ""),
          });
        }
      }
    });
  });

  return results;
}

// メイン処理
async function main() {
  console.log("建築基準法施行令から規制文を抽出中...\n");

  // 法令データ取得
  const revisions = await fetchLawList(BUILDING_STANDARDS_ORDER_ID);
  if (revisions.length === 0) {
    throw new Error("施行令が見つかりません");
  }

  const latestRevision = revisions[0];
  console.log(`取得: ${latestRevision.revision_info.law_title}`);
  console.log(`リビジョン: ${latestRevision.revision_info.law_revision_id}\n`);

  const lawData = await fetchLawData(latestRevision.revision_info.law_revision_id);

  // LawBody > MainProvision を探す
  const lawBody = findChild(lawData, "LawBody");
  if (!lawBody) throw new Error("LawBody not found");

  const mainProvision = findChild(lawBody, "MainProvision");
  if (!mainProvision) throw new Error("MainProvision not found");

  // 章を探索
  const chapters = findChildren(mainProvision, "Chapter");
  const allRegulations = [];

  for (const chapter of chapters) {
    const chapterNum = getChapterNum(chapter);
    const chapterTitle = findChild(chapter, "ChapterTitle");
    const chapterTitleText = chapterTitle ? getText(chapterTitle) : "";

    if (!isTargetChapter(chapterNum)) {
      continue;
    }

    console.log(`処理中: 第${chapterNum.replace("_", "の")}章 ${chapterTitleText}`);

    // 章の直下の条
    const articles = findChildren(chapter, "Article");
    for (const article of articles) {
      const regs = extractRegulationsFromArticle(article);
      regs.forEach((r) => {
        allRegulations.push({
          chapter: chapterNum,
          chapterTitle: chapterTitleText,
          ...r,
        });
      });
    }

    // 節(Section)がある場合
    const sections = findChildren(chapter, "Section");
    for (const section of sections) {
      const sectionArticles = findChildren(section, "Article");
      for (const article of sectionArticles) {
        const regs = extractRegulationsFromArticle(article);
        regs.forEach((r) => {
          allRegulations.push({
            chapter: chapterNum,
            chapterTitle: chapterTitleText,
            ...r,
          });
        });
      }

      // 款(Subsection)がある場合
      const subsections = findChildren(section, "Subsection");
      for (const subsection of subsections) {
        const subsectionArticles = findChildren(subsection, "Article");
        for (const article of subsectionArticles) {
          const regs = extractRegulationsFromArticle(article);
          regs.forEach((r) => {
            allRegulations.push({
              chapter: chapterNum,
              chapterTitle: chapterTitleText,
              ...r,
            });
          });
        }

        // 目(Division)がある場合
        const divisions = findChildren(subsection, "Division");
        for (const division of divisions) {
          const divisionArticles = findChildren(division, "Article");
          for (const article of divisionArticles) {
            const regs = extractRegulationsFromArticle(article);
            regs.forEach((r) => {
              allRegulations.push({
                chapter: chapterNum,
                chapterTitle: chapterTitleText,
                ...r,
              });
            });
          }
        }
      }
    }
  }

  console.log(`\n合計 ${allRegulations.length} 件の規制文を検出\n`);

  // 重複を除去（同じ条・項で複数の規制パターンがマッチした場合）
  const uniqueMap = new Map();
  for (const reg of allRegulations) {
    const key = `${reg.articleNum}_${reg.paragraphNum}_${reg.itemNum || ""}`;
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, reg);
    }
  }

  const uniqueRegulations = Array.from(uniqueMap.values());
  console.log(`重複除去後: ${uniqueRegulations.length} 件\n`);

  // CSV形式で出力
  console.log("=== CSV出力 ===\n");
  console.log("法令,項,号,ファイル名");

  const csvLines = ["法令,項,号,ファイル名"];

  for (const reg of uniqueRegulations) {
    // 条番号のフォーマット（例: "20" -> "第20条", "20_3" -> "第20条の3"）
    const articleFormatted = formatArticleNum(reg.articleNum);
    const paragraphFormatted = `第${reg.paragraphNum}項`;
    const itemFormatted = reg.itemNum ? `第${reg.itemNum}号` : "";
    const fileName = generateFileName(reg.articleNum, reg.paragraphNum, reg.itemNum);

    const line = `令${articleFormatted},${paragraphFormatted},${itemFormatted},${fileName}`;
    csvLines.push(line);
    console.log(line);
  }

  // ファイルに保存
  const fs = await import("fs");
  const path = await import("path");
  const outputPath = path.join(process.cwd(), ".claude/skills/施行令チェックリスト.csv");

  // BOM付きUTF-8で保存
  const bom = "\uFEFF";
  fs.writeFileSync(outputPath, bom + csvLines.join("\n"), "utf8");

  console.log(`\n出力完了: ${outputPath}`);
}

function formatArticleNum(num) {
  // "20" -> "第20条", "20_3" -> "第20条の3"
  if (num.includes("_")) {
    const parts = num.split("_");
    return `第${parts[0]}条の${parts.slice(1).join("の")}`;
  }
  return `第${num}条`;
}

function generateFileName(articleNum, paragraphNum, itemNum) {
  // A{条}_P{項}_kijo.json or A{条}_P{項}_I{号}_kijo.json
  const articlePart = `A${articleNum}`;
  const paragraphPart = `P${paragraphNum}`;

  if (itemNum) {
    return `${articlePart}_${paragraphPart}_I${itemNum}_kijo.json`;
  }
  return `${articlePart}_${paragraphPart}_kijo.json`;
}

main().catch(console.error);
