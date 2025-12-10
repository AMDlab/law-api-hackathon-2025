const fs = require('fs');

function getText(node) {
    if (typeof node === 'string') return node;
    if (!node.children) return '';
    return node.children.map(child => getText(child)).join('');
}

function findChild(node, tagName) {
    if (!node.children) return undefined;
    return node.children.find(c => typeof c !== 'string' && c.tag === tagName);
}

function findChildren(node, tagName) {
    if (!node.children) return [];
    return node.children.filter(c => typeof c !== 'string' && c.tag === tagName);
}

function isRegulationText(text) {
    const patterns = [
        /しなければならない[。]?$/,
        /してはならない[。]?$/,
        /することができない[。]?$/,
        /ものとする[。]?$/,
    ];
    return patterns.some(p => p.test(text.trim()));
}

function extractSentenceText(sentenceContainer) {
    const sentences = [];
    const sentNodes = findChildren(sentenceContainer, 'Sentence');
    sentNodes.forEach(s => sentences.push(getText(s)));
    const columnNodes = findChildren(sentenceContainer, 'Column');
    columnNodes.forEach(col => sentences.push(getText(col)));
    if (sentences.length === 0) sentences.push(getText(sentenceContainer));
    return sentences.join('');
}

async function main() {
    // ローカルAPIから取得
    const res = await fetch('http://localhost:3000/api/laws/325AC0000000201');
    const data = await res.json();

    if (data.error) {
        console.log('API Error:', data.error);
        return;
    }

    // パース済みツリーから規制文を抽出
    const tree = data.tree;
    const regulations = [];
    const chapterStats = {};

    function findRegulations(nodes, currentChapter = '') {
        nodes.forEach(node => {
            // Chapter情報を更新
            let chapter = currentChapter;
            if (node.type === 'Chapter') {
                chapter = node.title || '';
            }

            if (node.type === 'Paragraph' && node.isRegulation) {
                regulations.push({
                    id: node.diagramId,
                    content: node.content?.substring(0, 100) + (node.content?.length > 100 ? '...' : ''),
                    chapter: chapter,
                    articleNum: node.articleNum
                });
                chapterStats[chapter] = (chapterStats[chapter] || 0) + 1;
            }
            if (node.type === 'Item' && node.isRegulation) {
                regulations.push({
                    id: node.diagramId,
                    content: node.content?.substring(0, 100) + (node.content?.length > 100 ? '...' : ''),
                    chapter: chapter,
                    articleNum: node.articleNum
                });
                chapterStats[chapter] = (chapterStats[chapter] || 0) + 1;
            }
            if (node.children) {
                findRegulations(node.children, chapter);
            }
        });
    }

    findRegulations(tree);

    console.log('規制文数:', regulations.length);
    console.log('\n章別件数:');
    Object.entries(chapterStats).forEach(([ch, count]) => console.log(`  ${ch}: ${count}件`));

    // Markdown形式で出力（章別にグループ化）
    let md = `# 建築基準法 規制文一覧 (${regulations.length}件)

## 判定パターン
以下の文末パターンで終わる文を「規制文」として抽出：

1. \`〜しなければならない\`
2. \`〜してはならない\`
3. \`〜することができない\`
4. \`〜ものとする\`

※審査機序図作成手引書では1, 2のみが規制文として定義されているが、本システムでは拡張パターンとして3, 4も含める。

---

## 章別件数

| 章 | 件数 |
|----|------|
`;
    Object.entries(chapterStats).forEach(([ch, count]) => {
        md += `| ${ch || '(章なし)'} | ${count}件 |\n`;
    });

    md += `\n---\n\n## 規制文一覧\n\n`;

    // 章ごとにグループ化して出力
    let currentCh = '';
    regulations.forEach(r => {
        if (r.chapter !== currentCh) {
            currentCh = r.chapter;
            md += `\n### ${currentCh || '(章なし)'}\n\n`;
            md += `| ID | 条文（抜粋） |\n`;
            md += `|----|------------|\n`;
        }
        const escaped = (r.content || '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
        md += `| ${r.id} | ${escaped} |\n`;
    });

    md += `\n---\n\n## 作成済み機序図\n\n`;
    md += `| ID | 条文 | 状態 |\n`;
    md += `|----|------|------|\n`;
    md += `| A21_P2 | 第21条第2項 | 作成済み |\n`;
    md += `| A43_P1 | 第43条第1項 | 作成済み |\n`;

    fs.writeFileSync('prompts/規制文ありの項目一覧.md', md, 'utf8');
    console.log('\n=> prompts/規制文ありの項目一覧.md に保存しました');
}

main();
