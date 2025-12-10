// 指定した条番号の条文全文を取得
const fs = require('fs');

const articleNum = process.argv[2] || '21';
const data = JSON.parse(fs.readFileSync('building_act.json', 'utf-8'));

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

function findArticleByNum(node, num) {
    if (!node) return null;
    if (node.tag === 'Article' && node.attr?.Num === num) return node;
    if (node.children) {
        for (const child of node.children) {
            if (typeof child !== 'string') {
                const found = findArticleByNum(child, num);
                if (found) return found;
            }
        }
    }
    return null;
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

const lawBody = findByTag(data.law_full_text, 'LawBody');
const mainProvision = findByTag(lawBody, 'MainProvision');

const article = findArticleByNum(mainProvision, articleNum);

if (!article) {
    console.error(`Article ${articleNum} not found`);
    process.exit(1);
}

const titleNode = findChild(article, 'ArticleTitle');
const captionNode = findChild(article, 'ArticleCaption');
const title = titleNode ? getText(titleNode) : '';
const caption = captionNode ? getText(captionNode) : '';

console.log(`\n${'='.repeat(60)}`);
console.log(`${title} ${caption}`);
console.log(`${'='.repeat(60)}\n`);

const paragraphs = findChildren(article, 'Paragraph');

paragraphs.forEach(p => {
    const pNum = p.attr?.Num || '1';
    const pSentence = findChild(p, 'ParagraphSentence');
    const pText = pSentence ? extractSentenceText(pSentence) : '';

    console.log(`【第${pNum}項】`);
    console.log(pText);
    console.log('');

    // 号
    const items = findChildren(p, 'Item');
    items.forEach(item => {
        const iNum = item.attr?.Num || '';
        const iTitleNode = findChild(item, 'ItemTitle');
        const iTitle = iTitleNode ? getText(iTitleNode) : '';
        const iSentence = findChild(item, 'ItemSentence');
        const iText = iSentence ? extractSentenceText(iSentence) : '';

        console.log(`  ${iTitle} ${iText}`);

        // サブアイテム
        const subItems = findChildren(item, 'Subitem1');
        subItems.forEach(sub => {
            const subTitle = findChild(sub, 'Subitem1Title');
            const subSentence = findChild(sub, 'Subitem1Sentence');
            console.log(`    ${subTitle ? getText(subTitle) : ''} ${subSentence ? extractSentenceText(subSentence) : ''}`);
        });
    });

    console.log('');
});
