#!/usr/bin/env node
/**
 * 機序図JSONファイルのバリデーション
 * Usage: npm run validate:kijo [file-pattern]
 */
import { readFileSync, readdirSync, statSync } from 'fs'
import { join, resolve } from 'path'
import Ajv from 'ajv'
import addFormats from 'ajv-formats'

const ajv = new Ajv({ allErrors: true, verbose: true })
addFormats(ajv)

// スキーマ読み込み
const schemaPath = resolve('schemas/kijo-diagram.schema.json')
const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'))
const validate = ajv.compile(schema)

// 機序図ファイルを検索
function findKijoFiles(pattern) {
  const diagramsDir = resolve('data/diagrams')
  const files = []

  function scan(dir) {
    const entries = readdirSync(dir)
    for (const entry of entries) {
      const fullPath = join(dir, entry)
      const stat = statSync(fullPath)

      if (stat.isDirectory()) {
        scan(fullPath)
      } else if (entry.endsWith('_kijo.json')) {
        if (!pattern || fullPath.includes(pattern)) {
          files.push(fullPath)
        }
      }
    }
  }

  scan(diagramsDir)
  return files
}

// バリデーション実行
function validateFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8')
    const data = JSON.parse(content)

    const valid = validate(data)

    return {
      file: filePath,
      valid,
      errors: valid ? [] : validate.errors
    }
  } catch (error) {
    return {
      file: filePath,
      valid: false,
      errors: [{ message: error.message }]
    }
  }
}

// メイン処理
const pattern = process.argv[2]
const files = findKijoFiles(pattern)

console.log(`\n機序図バリデーション`)
console.log(`対象: ${files.length}件\n`)

let validCount = 0
let invalidCount = 0

for (const file of files) {
  const result = validateFile(file)

  if (result.valid) {
    validCount++
    console.log(`✓ ${file.replace(process.cwd(), '')}`)
  } else {
    invalidCount++
    console.log(`✗ ${file.replace(process.cwd(), '')}`)
    for (const error of result.errors) {
      console.log(`  - ${error.instancePath || 'root'}: ${error.message}`)
    }
  }
}

console.log(`\n結果: ${validCount}件成功, ${invalidCount}件失敗`)

process.exit(invalidCount > 0 ? 1 : 0)
