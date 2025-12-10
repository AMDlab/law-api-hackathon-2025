// 建築基準法から規制文がある条・項を抽出し、まとめて表示
const fs = require('fs');

const data = JSON.parse(fs.readFileSync('building_act.json', 'utf-8'));

// 規制文パターン
const regulationPatterns = [
    /しなければならない[。]?$/,
    /してはならない[。]?$/,
    /することができない[。]?$/,
    /ものとする[。]?$/,
];

function isRegulationText(text) {
    return regulationPatterns.some(p => p.test(text.trim()));
}

function getText(node) {
    if (typeof node === 'string') return node;
    if (!node) return '';
    if (node.children) {
        return node.children.map(getText).join('');
    }
    return '';
}

function findChild(node, tag) {
    if (!node.children) return null;
    for (const child of node.children) {
        if (typeof child !== 'string' && child.tag === tag) return child;
    }
    return null;
}

function findChildren(node, tag) {
    if (!node.children) return [];
    return node.children.filter(c => typeof c !== 'string' && c.tag === tag);
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

// 特定のタグを探す
function findByTag(node, tag) {
    if (!node) return null;
    if (node.tag === tag) return node;
    if (node.children) {
        for (const child of node.children) {
            if (typeof child !== 'string') {
                const found = findByTag(child, tag);
                if (found) return found;
            }
        }
    }
    return null;
}

const lawBody = findByTag(data.law_full_text, 'LawBody');
if (!lawBody) {
    console.error('LawBody not found');
    process.exit(1);
}

const mainProvision = findByTag(lawBody, 'MainProvision');
if (!mainProvision) {
    console.error('MainProvision not found');
    process.exit(1);
}

const results = [];

function processArticle(article, chapterNum, chapterTitle) {
    const articleNum = article.attr?.Num || '';
    const titleNode = findChild(article, 'ArticleTitle');
    const captionNode = findChild(article, 'ArticleCaption');
    const articleTitle = titleNode ? getText(titleNode) : '';
    const caption = captionNode ? getText(captionNode) : '';

    const paragraphs = findChildren(article, 'Paragraph');

    paragraphs.forEach(p => {
        const pNumAttr = p.attr?.Num || '1';
        const pSentence = findChild(p, 'ParagraphSentence');
        const sentenceText = pSentence ? extractSentenceText(pSentence) : '';

        if (isRegulationText(sentenceText)) {
            const diagramId = `A${articleNum}_P${pNumAttr}`;
            results.push({
                chapter: chapterNum,
                chapterTitle: chapterTitle,
                diagramId,
                article: articleTitle,
                caption: caption,
                paragraph: `${pNumAttr}項`,
                type: 'paragraph',
            });
        }

        // 号もチェック
        const items = findChildren(p, 'Item');
        items.forEach(item => {
            const itemNumAttr = item.attr?.Num || '';
            const itemSentence = findChild(item, 'ItemSentence');
            const itemText = itemSentence ? extractSentenceText(itemSentence) : '';

            if (isRegulationText(itemText)) {
                const diagramId = `A${articleNum}_P${pNumAttr}_I${itemNumAttr}`;
                results.push({
                    chapter: chapterNum,
                    chapterTitle: chapterTitle,
                    diagramId,
                    article: articleTitle,
                    caption: caption,
                    paragraph: `${pNumAttr}項${itemNumAttr}号`,
                    type: 'item',
                });
            }
        });
    });
}

function traverseChapter(chapter) {
    const chapterNum = chapter.attr?.Num || '';
    const chapterTitleNode = findChild(chapter, 'ChapterTitle');
    const chapterTitle = chapterTitleNode ? getText(chapterTitleNode) : '';

    function traverse(node) {
        if (!node.children) return;
        node.children.forEach(child => {
            if (typeof child === 'string') return;
            if (child.tag === 'Article') {
                processArticle(child, chapterNum, chapterTitle);
            } else {
                traverse(child);
            }
        });
    }
    traverse(chapter);
}

// 章ごとに処理
const chapters = findChildren(mainProvision, 'Chapter');
chapters.forEach(traverseChapter);

// 章ごとにグループ化して出力
console.log('# 建築基準法 規制文一覧\n');

const byChapter = {};
results.forEach(r => {
    const key = `第${r.chapter}章 ${r.chapterTitle}`;
    if (!byChapter[key]) byChapter[key] = [];
    byChapter[key].push(r);
});

Object.entries(byChapter).forEach(([chapterName, items]) => {
    console.log(`## ${chapterName} (${items.length}件)`);
    console.log('');
    console.log('| diagramId | 条 | 見出し | 項号 |');
    console.log('|-----------|-----|--------|------|');
    items.forEach(r => {
        console.log(`| ${r.diagramId} | ${r.article} | ${r.caption} | ${r.paragraph} |`);
    });
    console.log('');
});

console.log(`\n## 合計: ${results.length}件の規制文`);

// 章ごとの件数サマリー
console.log('\n### 章別件数');
Object.entries(byChapter).forEach(([chapterName, items]) => {
    console.log(`- ${chapterName}: ${items.length}件`);
});
