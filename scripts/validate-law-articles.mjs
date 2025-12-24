#!/usr/bin/env node
/**
 * 条文キャッシュファイルのバリデーション
 */
import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import Ajv from 'ajv'
import addFormats from 'ajv-formats'

const ajv = new Ajv({ allErrors: true, verbose: true })
addFormats(ajv)

// スキーマ読み込み
const schemaPath = 'schemas/law-article.schema.json'
const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'))
const validate = ajv.compile(schema)

const LAW_DIRS = [
  { id: '325AC0000000201', name: '建築基準法' },
  { id: '325CO0000000338', name: '建築基準法施行令' }
]

let totalFiles = 0
let validFiles = 0
let invalidFiles = 0

for (const { id, name } of LAW_DIRS) {
  const dir = join('data', 'law-articles', id)
  console.log(`\n=== ${name} (${id}) ===`)

  try {
    const files = readdirSync(dir).filter(f => f.endsWith('.json'))
    console.log(`ファイル数: ${files.length}`)

    for (const file of files) {
      totalFiles++
      const filepath = join(dir, file)

      try {
        const content = readFileSync(filepath, 'utf-8')
        const data = JSON.parse(content)

        const valid = validate(data)
        if (valid) {
          validFiles++
          console.log(`✓ ${file}`)
        } else {
          invalidFiles++
          console.error(`✗ ${file}`)
          console.error('  エラー:', validate.errors)
        }
      } catch (err) {
        invalidFiles++
        console.error(`✗ ${file}`)
        console.error('  エラー:', err.message)
      }
    }
  } catch (err) {
    console.error(`ディレクトリ読み込みエラー: ${err.message}`)
  }
}

console.log(`\n=== 検証結果 ===`)
console.log(`総ファイル数: ${totalFiles}`)
console.log(`有効: ${validFiles}`)
console.log(`無効: ${invalidFiles}`)

if (invalidFiles > 0) {
  process.exit(1)
}
