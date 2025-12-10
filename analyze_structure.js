const fs = require('fs');
const data = JSON.parse(fs.readFileSync('building_act.json', 'utf-8'));

function showStructure(node, depth = 0, maxDepth = 4) {
    if (depth > maxDepth) return;
    if (typeof node === 'string') return;
    if (!node) return;

    const indent = '  '.repeat(depth);

    if (node.tag) {
        console.log(`${indent}${node.tag}${node.attr ? ` (${JSON.stringify(node.attr)})` : ''}`);
    } else if (typeof node === 'object') {
        for (const key of Object.keys(node)) {
            if (key === 'children') continue;
            console.log(`${indent}[${key}]: ${typeof node[key] === 'object' ? '...' : node[key]}`);
        }
    }

    if (node.children && Array.isArray(node.children)) {
        node.children.forEach(child => showStructure(child, depth + 1, maxDepth));
    }
}

console.log('Top level keys:', Object.keys(data));
console.log('\nlaw_full_text structure:');
showStructure(data.law_full_text, 0, 3);
