// 建築基準法から規制文がある条・項を抽出するスクリプト
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

function processArticle(article) {
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
                diagramId,
                article: articleTitle,
                caption: caption,
                paragraph: `第${pNumAttr}項`,
                type: 'paragraph',
                text: sentenceText.substring(0, 100) + (sentenceText.length > 100 ? '...' : '')
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
                    diagramId,
                    article: articleTitle,
                    caption: caption,
                    paragraph: `第${pNumAttr}項第${itemNumAttr}号`,
                    type: 'item',
                    text: itemText.substring(0, 100) + (itemText.length > 100 ? '...' : '')
                });
            }
        });
    });
}

function traverse(node) {
    if (!node.children) return;

    node.children.forEach(child => {
        if (typeof child === 'string') return;

        if (child.tag === 'Article') {
            processArticle(child);
        } else {
            traverse(child);
        }
    });
}

traverse(mainProvision);

// 結果を出力
console.log(`\n建築基準法 規制文一覧 (${results.length}件)\n`);
console.log('=' .repeat(80));

let currentArticle = '';
results.forEach(r => {
    if (r.article !== currentArticle) {
        currentArticle = r.article;
        console.log(`\n【${r.article}】${r.caption}`);
    }
    console.log(`  ${r.diagramId.padEnd(15)} ${r.paragraph}`);
    console.log(`    → ${r.text}`);
});

console.log('\n' + '=' .repeat(80));
console.log(`合計: ${results.length}件の規制文`);
