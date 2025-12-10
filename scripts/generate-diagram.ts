/**
 * 審査機序図生成スクリプト
 *
 * 法令MCPを使用して、指定された条文から審査機序図JSONを生成します。
 *
 * 使用方法:
 *   npx tsx scripts/generate-diagram.ts --article "法43条1項"
 *   npx tsx scripts/generate-diagram.ts --article "令112条1項" --law-id "325AC0000000201"
 */

import * as fs from "fs";
import * as path from "path";
import type { KijoDiagram } from "../src/types/diagram";

// プロンプトファイルのパス
const PROMPT_PATH = path.join(__dirname, "../prompts/機序図生成プロンプト.md");
const OUTPUT_DIR = path.join(__dirname, "../data/diagrams");

interface GenerateOptions {
  article: string; // 対象条文（例: "法43条1項"）
  lawId?: string; // e-Gov法令ID
  lawName?: string; // 法令名
  outputPath?: string; // 出力先パス
}

/**
 * プロンプトを読み込む
 */
function loadPrompt(): string {
  return fs.readFileSync(PROMPT_PATH, "utf-8");
}

/**
 * 条文指定をパースして法令情報を抽出
 */
function parseArticleRef(article: string): {
  lawPrefix: string;
  articleNum: string;
  paragraphNum?: string;
  itemNum?: string;
} {
  // 例: "法43条1項" -> { lawPrefix: "法", articleNum: "43", paragraphNum: "1" }
  // 例: "令112条1項" -> { lawPrefix: "令", articleNum: "112", paragraphNum: "1" }
  const match = article.match(
    /^(法|令|[^\d]+?)(\d+(?:の\d+)?)条(?:(\d+)項)?(?:(\d+)号)?$/
  );

  if (!match) {
    throw new Error(`条文形式が不正です: ${article}`);
  }

  return {
    lawPrefix: match[1],
    articleNum: match[2],
    paragraphNum: match[3],
    itemNum: match[4],
  };
}

/**
 * 関連条項の識別子を生成
 */
function generateArticleId(parsed: ReturnType<typeof parseArticleRef>): string {
  const articleId = `A${parsed.articleNum.replace(/の/g, "_")}`;
  let result = `${parsed.lawPrefix}::${articleId}`;

  if (parsed.paragraphNum) {
    result += `:P${parsed.paragraphNum}`;
  }
  if (parsed.itemNum) {
    result += `:I${parsed.itemNum}`;
  }

  return result;
}

/**
 * 法令名を取得
 */
function getLawName(lawPrefix: string): string {
  const lawNames: Record<string, string> = {
    法: "建築基準法",
    令: "建築基準法施行令",
  };
  return lawNames[lawPrefix] || lawPrefix;
}

/**
 * デフォルトの法令IDを取得
 */
function getDefaultLawId(lawPrefix: string): string {
  const lawIds: Record<string, string> = {
    法: "325AC0000000201", // 建築基準法
    令: "325CO0000000338", // 建築基準法施行令
  };
  return lawIds[lawPrefix] || "";
}

/**
 * 出力ファイルパスを生成
 */
function generateOutputPath(
  lawId: string,
  articleNum: string,
  paragraphNum?: string
): string {
  const dir = path.join(OUTPUT_DIR, lawId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  let filename = `A${articleNum.replace(/の/g, "_")}`;
  if (paragraphNum) {
    filename += `_P${paragraphNum}`;
  }
  filename += ".json";

  return path.join(dir, filename);
}

/**
 * MCP用のプロンプトを生成
 */
function generateMCPPrompt(options: GenerateOptions): string {
  const basePrompt = loadPrompt();
  const parsed = parseArticleRef(options.article);
  const articleId = generateArticleId(parsed);
  const lawName = options.lawName || getLawName(parsed.lawPrefix);
  const lawId = options.lawId || getDefaultLawId(parsed.lawPrefix);

  const userRequest = `
---

## 生成リクエスト

以下の条文について審査機序図JSONを生成してください。

- **対象条文**: ${options.article}
- **法令ID**: ${lawId}
- **法令名**: ${lawName}
- **関連条項ID**: ${articleId}

まず法令MCPを使用して条文の全文を取得し、上記の手順に従って分析・JSON生成を行ってください。
`;

  return basePrompt + userRequest;
}

/**
 * 生成されたJSONを検証
 */
function validateDiagram(diagram: unknown): diagram is KijoDiagram {
  if (typeof diagram !== "object" || diagram === null) {
    return false;
  }

  const d = diagram as Record<string, unknown>;

  // 必須フィールドの確認
  if (typeof d.id !== "string") return false;
  if (typeof d.pageTitle !== "object" || d.pageTitle === null) return false;
  if (!Array.isArray(d.nodes)) return false;
  if (!Array.isArray(d.edges)) return false;

  return true;
}

/**
 * JSONをファイルに保存
 */
function saveDiagram(diagram: KijoDiagram, outputPath: string): void {
  const jsonStr = JSON.stringify(diagram, null, 2);
  fs.writeFileSync(outputPath, jsonStr, "utf-8");
  console.log(`保存しました: ${outputPath}`);
}

/**
 * メイン処理
 */
async function main(): Promise<void> {
  // コマンドライン引数をパース
  const args = process.argv.slice(2);
  const options: GenerateOptions = {
    article: "",
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--article":
      case "-a":
        options.article = args[++i];
        break;
      case "--law-id":
      case "-l":
        options.lawId = args[++i];
        break;
      case "--law-name":
      case "-n":
        options.lawName = args[++i];
        break;
      case "--output":
      case "-o":
        options.outputPath = args[++i];
        break;
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
    }
  }

  if (!options.article) {
    console.error("エラー: --article オプションは必須です");
    printHelp();
    process.exit(1);
  }

  try {
    const parsed = parseArticleRef(options.article);
    const lawId = options.lawId || getDefaultLawId(parsed.lawPrefix);

    // MCP用プロンプトを生成
    const prompt = generateMCPPrompt(options);

    // 出力パスを決定
    const outputPath =
      options.outputPath ||
      generateOutputPath(lawId, parsed.articleNum, parsed.paragraphNum);

    console.log("=".repeat(60));
    console.log("審査機序図生成スクリプト");
    console.log("=".repeat(60));
    console.log(`対象条文: ${options.article}`);
    console.log(`法令ID: ${lawId}`);
    console.log(`出力先: ${outputPath}`);
    console.log("=".repeat(60));
    console.log("");
    console.log("以下のプロンプトを法令MCPに渡してください：");
    console.log("");
    console.log("-".repeat(60));
    console.log(prompt);
    console.log("-".repeat(60));
    console.log("");
    console.log(
      "MCPからの応答（JSON）を取得後、--json オプションで保存できます："
    );
    console.log(`  npx tsx scripts/generate-diagram.ts --save '{"id":...}'`);
  } catch (error) {
    console.error("エラー:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

/**
 * ヘルプを表示
 */
function printHelp(): void {
  console.log(`
審査機序図生成スクリプト

使用方法:
  npx tsx scripts/generate-diagram.ts [オプション]

オプション:
  --article, -a <条文>    対象条文（必須）
                          例: "法43条1項", "令112条1項"

  --law-id, -l <ID>       e-Gov法令ID（任意）
                          未指定の場合は法令名から自動判定

  --law-name, -n <名前>   法令名（任意）
                          未指定の場合は法令名から自動判定

  --output, -o <パス>     出力先パス（任意）
                          未指定の場合は data/diagrams/<法令ID>/<条番号>.json

  --help, -h              このヘルプを表示

例:
  npx tsx scripts/generate-diagram.ts --article "法43条1項"
  npx tsx scripts/generate-diagram.ts -a "令112条1項" -l "325CO0000000338"
`);
}

// エントリーポイント
main().catch(console.error);
