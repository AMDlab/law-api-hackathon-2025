const fs = require('fs');

// 法令データを読み込み
const lawData = JSON.parse(fs.readFileSync('c:/temp/law_22.json', 'utf-8'));

// テキスト抽出ヘルパー
function getText(node) {
  if (typeof node === 'string') return node;
  if (!node) return '';
  if (node.children) {
    return node.children.map(c => getText(c)).join('');
  }
  return '';
}

// 条文を検索
function findArticle(node, articleNum) {
  if (typeof node === 'string') return null;

  if (node.tag === 'Article') {
    const numAttr = node.attr && node.attr.Num;
    if (numAttr === articleNum) {
      return node;
    }
  }

  if (node.children) {
    for (const child of node.children) {
      const result = findArticle(child, articleNum);
      if (result) return result;
    }
  }

  return null;
}

// 項を抽出
function extractParagraph(article, paragraphNum) {
  const paragraphs = article.children.filter(c => c.tag === 'Paragraph');

  if (paragraphNum === 1) {
    // 第1項は Num属性がない場合がある
    const firstPara = paragraphs[0];
    if (!firstPara) return null;

    // ParagraphSentence を探す
    const sentences = [];
    function findSentences(node) {
      if (node.tag === 'ParagraphSentence') {
        sentences.push(getText(node));
      }
      if (node.children) {
        node.children.forEach(c => findSentences(c));
      }
    }
    findSentences(firstPara);

    return sentences.join('');
  } else {
    // 第2項以降は Num属性で識別
    const para = paragraphs.find(p => p.attr && p.attr.Num === paragraphNum.toString());
    if (!para) return null;

    const sentences = [];
    function findSentences(node) {
      if (node.tag === 'ParagraphSentence') {
        sentences.push(getText(node));
      }
      if (node.children) {
        node.children.forEach(c => findSentences(c));
      }
    }
    findSentences(para);

    return sentences.join('');
  }
}

// メイン処理
const article22 = findArticle(lawData.law_full_text, '22');
if (!article22) {
  console.error('Article 22 not found');
  process.exit(1);
}

const paragraph1Text = extractParagraph(article22, 1);
if (!paragraph1Text) {
  console.error('Paragraph 1 not found');
  process.exit(1);
}

console.log('=== 建築基準法 第22条第1項 ===');
console.log(paragraph1Text);

// JSONとして出力
const result = {
  law_id: '325AC0000000201',
  law_name: '建築基準法',
  article: '22',
  paragraph: '1',
  text: paragraph1Text
};

fs.writeFileSync('c:/temp/article_22_1.json', JSON.stringify(result, null, 2));
console.log('\n保存: c:/temp/article_22_1.json');
