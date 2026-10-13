#!/usr/bin/env node
// Збирає .data/phrases.txt у модулі data/phrases.js і data/meta.js та перевіряє фрази:
// три поля, лише символи, які точно є в шрифті годинника, наголос у вимові.
// Запуск: node .tools/gen-data.js   (з --check — лише перевірити, нічого не писати)

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const SRC = path.join(ROOT, '.data/phrases.txt')
const OUT_DATA = path.join(ROOT, 'data/phrases.js')
const OUT_META = path.join(ROOT, 'data/meta.js')

const PUNCT = " .,!?:;()«»'’\"—–-…/%+0123456789"
const CYR = 'абвгґдеєжзиіїйклмнопрстуфхцчшщьюя'
const CYR_ALL = CYR + CYR.toUpperCase()
const LAT = 'abcdefghijklmnopqrstuvwxyzäöüß'
const LAT_ALL = LAT + LAT.toUpperCase().replace('SS', '') + 'ÄÖÜ'
const ALLOWED = {
  ua: new Set(Array.from(CYR_ALL + LAT_ALL + PUNCT)),
  de: new Set(Array.from(LAT_ALL + PUNCT)),
  pr: new Set(Array.from(CYR_ALL + PUNCT))
}
const VOWELS = 'аеиіїоуєюя'

function syllables(word) {
  const w = word.toLowerCase()
  let n = 0
  for (let i = 0; i < w.length; i++) {
    if (VOWELS.indexOf(w[i]) < 0) continue
    // «ау» — один склад (нім. au)
    if (w[i] === 'у' && i > 0 && w[i - 1] === 'а') continue
    n++
  }
  return n
}

function upperVowels(word) {
  let n = 0
  for (const ch of word) if (VOWELS.toUpperCase().indexOf(ch) >= 0) n++
  return n
}

function checkStress(pr) {
  const problems = []
  pr.split(/[\s,.!?:;()…\/—–-]+/)
    .filter(Boolean)
    .forEach((word) => {
      const s = syllables(word)
      const u = upperVowels(word)
      if (s >= 2 && u !== 1) problems.push(word + ' (складів ' + s + ', наголосів ' + u + ')')
      if (s < 2 && u > 0) problems.push(word + ' (односкладове з наголосом)')
    })
  return problems
}

function parse(text) {
  const groups = []
  const cats = []
  const errors = []
  let cat = null
  text.split('\n').forEach((raw, i) => {
    const line = raw.trim()
    const at = 'рядок ' + (i + 1)
    if (!line || line.startsWith('//')) return
    if (line.startsWith('## ')) {
      groups.push(line.slice(3).trim())
      return
    }
    if (line.startsWith('# ')) {
      const parts = line.slice(2).split('|').map((s) => s.trim())
      if (!groups.length) errors.push(at + ': категорія поза групою')
      cat = { id: parts[0], title: parts[1], group: groups.length - 1, dir: parts[2] === 'de' ? 'de' : 'ua', items: [] }
      if (!/^[a-z]+$/.test(cat.id) || !cat.title) errors.push(at + ': погана категорія')
      cats.push(cat)
      return
    }
    if (!cat) {
      errors.push(at + ': фраза поза категорією')
      return
    }
    const f = line.split(' | ').map((s) => s.trim())
    if (f.length !== 3 || f.some((x) => !x)) {
      errors.push(at + ': треба 3 поля через « | »: ' + line)
      return
    }
    ;['ua', 'de', 'pr'].forEach((k, j) => {
      const bad = Array.from(f[j]).filter((ch) => !ALLOWED[k].has(ch))
      if (bad.length) errors.push(at + ': недозволені символи в ' + k + ': ' + JSON.stringify(bad.join('')))
    })
    checkStress(f[2]).forEach((p) => errors.push(at + ': наголос: ' + p))
    cat.items.push(f)
  })
  const ids = new Set()
  cats.forEach((c) => {
    if (ids.has(c.id)) errors.push('повтор id категорії ' + c.id)
    ids.add(c.id)
    if (!c.items.length) errors.push('порожня категорія ' + c.id)
  })
  const seen = new Map()
  cats.forEach((c) =>
    c.items.forEach((it) => {
      const key = it[1]
      if (seen.has(key) && seen.get(key) !== c.id) {
        // однакова німецька фраза в різних категоріях допустима, але не в одній
      } else if (seen.has(key)) errors.push('повтор у ' + c.id + ': ' + key)
      seen.set(key, c.id)
    })
  )
  return { groups, cats, errors }
}

function main() {
  const { groups, cats, errors } = parse(fs.readFileSync(SRC, 'utf8'))
  const total = cats.reduce((s, c) => s + c.items.length, 0)
  if (errors.length) {
    errors.forEach((e) => console.error('✗ ' + e))
    console.error(errors.length + ' помилок')
    process.exit(1)
  }
  console.log('Категорій: ' + cats.length + ', фраз: ' + total)
  if (process.argv.includes('--check')) return
  const head = '// Згенеровано з .data/phrases.txt командою node .tools/gen-data.js — не редагувати вручну.\n'
  const data =
    head +
    '// Фраза: [українською, німецькою, вимова]. dir: "de" — спершу показувати німецькою.\n\n' +
    'export const GROUPS = ' + JSON.stringify(groups) + '\n\n' +
    'export const CATS = [\n' +
    cats
      .map(
        (c) =>
          '  {\n    id: ' + JSON.stringify(c.id) + ',\n    title: ' + JSON.stringify(c.title) +
          ',\n    group: ' + c.group + ',\n    dir: ' + JSON.stringify(c.dir) + ',\n    items: [\n' +
          c.items.map((it) => '      ' + JSON.stringify(it)).join(',\n') + '\n    ]\n  }'
      )
      .join(',\n') +
    '\n]\n'
  const meta =
    head +
    '// Лише назви й кількість — для головної сторінки, щоб не вантажити всі фрази.\n\n' +
    'export const GROUPS = ' + JSON.stringify(groups) + '\n\n' +
    'export const META = ' + JSON.stringify(cats.map((c) => ({ id: c.id, title: c.title, group: c.group, count: c.items.length })), null, 2) + '\n\n' +
    'export const TOTAL = ' + total + '\n'
  fs.mkdirSync(path.dirname(OUT_DATA), { recursive: true })
  fs.writeFileSync(OUT_DATA, data)
  fs.writeFileSync(OUT_META, meta)
  console.log('Записано data/phrases.js і data/meta.js')
}

if (require.main === module) main()
module.exports = { parse, checkStress, syllables }
