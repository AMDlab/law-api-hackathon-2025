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
    // e-Gov法令APIから直接取得
    const revisionId = '325AC0000000201_20250401_506AC0000000053';
    const res = await fetch(`https://laws.e-gov.go.jp/api/2/law_data/${revisionId}`, {
        headers: { Accept: 'application/json' }
    });
    const data = await res.json();
    const root = data.law_full_text;

    if (!root) {
        console.log('API response structure:', Object.keys(data));
        return;
    }

    const lawBody = findChild(root, 'LawBody');
    if (!lawBody) {
        console.log('No LawBody found. Root tag:', root.tag);
        return;
    }
    const mainProvision = findChild(lawBody, 'MainProvision');
    if (!mainProvision) {
        console.log('No MainProvision found');
        return;
    }

    let total = 0;
    let regulations = [];

    function countArticles(node) {
        if (!node.children) return;
        node.children.forEach(child => {
            if (typeof child === 'string') return;
            if (child.tag === 'Article') {
                const articleNum = child.attr?.Num || '';
                const paragraphs = findChildren(child, 'Paragraph');
                paragraphs.forEach(p => {
                    const pNum = p.attr?.Num || '1';
                    const pSentence = findChild(p, 'ParagraphSentence');
                    const text = pSentence ? extractSentenceText(pSentence) : '';
                    total++;
                    if (isRegulationText(text)) {
                        regulations.push(`A${articleNum}_P${pNum}`);
                    }

                    const items = findChildren(p, 'Item');
                    items.forEach(item => {
                        const itemNum = item.attr?.Num || '';
                        const itemSentence = findChild(item, 'ItemSentence');
                        const itemText = itemSentence ? extractSentenceText(itemSentence) : '';
                        total++;
                        if (isRegulationText(itemText)) {
                            regulations.push(`A${articleNum}_P${pNum}_I${itemNum}`);
                        }
                    });
                });
            } else {
                countArticles(child);
            }
        });
    }

    countArticles(mainProvision);
    console.log('総条文数（項+号）:', total);
    console.log('規制文数:', regulations.length);
    console.log('\n規制文一覧:');
    regulations.forEach(r => console.log(r));
}

main();
