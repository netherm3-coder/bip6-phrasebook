#!/usr/bin/env node
// Збирає .data/de.txt і .data/en.txt у модулі data/meta.js, data/<мова>.js, data/<мова>_idx.js та перевіряє:
// три поля, лише символи, які точно є в шрифті годинника, наголос у вимові,
// однакові категорії (id, назви, порядок) в обох мовах.
// Запуск: node .tools/gen-data.js   (з --check — лише перевірити, нічого не писати)

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const OUT_DATA = path.join(ROOT, 'data/phrases.js')
const OUT_META = path.join(ROOT, 'data/meta.js')

const PUNCT = " .,!?:;()«»'’\"—–-…/%+0123456789"
const CYR = 'абвгґдеєжзиіїйклмнопрстуфхцчшщьюя'
const CYR_ALL = CYR + CYR.toUpperCase()
const LAT = 'abcdefghijklmnopqrstuvwxyz'
const LAT_ALL = LAT + LAT.toUpperCase()
const VOWELS = 'аеиіїоуєюя'

// Те саме, що norm() в utils/search.js (тест звіряє їх на всіх фразах).
const NORM_MAP = { ä: 'a', ö: 'o', ü: 'u', ß: 'ss', ґ: 'г', ё: 'е' }
function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[äöüßґё]/g, (c) => NORM_MAP[c])
    .replace(/['’ʼ`]/g, '')
    .replace(/[^a-z0-9а-яєії]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Рядок пошуку для фрази: «|українською|іноземною|вимова», уже нормалізований,
// щоб годинник не перетворював 640 фраз при кожному відкритті пошуку.
function searchKey(it) {
  return '|' + norm(it[0]) + '|' + norm(it[1]) + '|' + norm(it[2])
}

// Склади у вимові. Німецька: «ау» — один склад.
function syllablesDe(word) {
  const w = word.toLowerCase()
  let n = 0
  for (let i = 0; i < w.length; i++) {
    if (VOWELS.indexOf(w[i]) < 0) continue
    if (w[i] === 'у' && i > 0 && w[i - 1] === 'а') continue
    n++
  }
  return n
}

// Англійська: «оу», «ау» — один склад; «у» перед голосним — це w (уот, уЕа).
function syllablesEn(word) {
  const w = word.toLowerCase()
  let n = 0
  for (let i = 0; i < w.length; i++) {
    const ch = w[i]
    if (VOWELS.indexOf(ch) < 0) continue
    if (ch === 'у') {
      const prev = w[i - 1]
      const next = w[i + 1]
      if (prev === 'о' || prev === 'а') continue
      if (next && VOWELS.indexOf(next) >= 0) continue
    }
    n++
  }
  return n
}

const LANGS = [
  { code: 'de', name: 'Deutsch', short: 'DE', file: '.data/de.txt', foreign: LAT_ALL + 'äöüßÄÖÜ', syllables: syllablesDe },
  { code: 'en', name: 'English', short: 'EN', file: '.data/en.txt', foreign: LAT_ALL, syllables: syllablesEn }
]

function upperVowels(word) {
  let n = 0
  for (const ch of word) if (VOWELS.toUpperCase().indexOf(ch) >= 0) n++
  return n
}

function checkStress(pr, syllables) {
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

function parse(text, lang) {
  const allowed = {
    ua: new Set(Array.from(CYR_ALL + LAT_ALL + PUNCT)),
    fo: new Set(Array.from(lang.foreign + PUNCT)),
    pr: new Set(Array.from(CYR_ALL + PUNCT))
  }
  const groups = []
  const cats = []
  const errors = []
  let cat = null
  text.split('\n').forEach((raw, i) => {
    const line = raw.trim()
    const at = lang.code + '.txt, рядок ' + (i + 1)
    if (!line || line.startsWith('//')) return
    if (line.startsWith('## ')) {
      groups.push(line.slice(3).trim())
      return
    }
    if (line.startsWith('# ')) {
      const parts = line.slice(2).split('|').map((s) => s.trim())
      if (!groups.length) errors.push(at + ': категорія поза групою')
      cat = { id: parts[0], title: parts[1], group: groups.length - 1, dir: parts[2] === 'fo' ? 'fo' : 'ua', items: [] }
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
    ;['ua', 'fo', 'pr'].forEach((k, j) => {
      const bad = Array.from(f[j]).filter((ch) => !allowed[k].has(ch))
      if (bad.length) errors.push(at + ': недозволені символи в ' + k + ': ' + JSON.stringify(bad.join('')))
    })
    checkStress(f[2], lang.syllables).forEach((p) => errors.push(at + ': наголос: ' + p))
    cat.items.push(f)
  })
  const ids = new Set()
  cats.forEach((c) => {
    if (ids.has(c.id)) errors.push(lang.code + ': повтор id категорії ' + c.id)
    ids.add(c.id)
    if (!c.items.length) errors.push(lang.code + ': порожня категорія ' + c.id)
    const seen = new Set()
    c.items.forEach((it) => {
      if (seen.has(it[1])) errors.push(lang.code + ': повтор у ' + c.id + ': ' + it[1])
      seen.add(it[1])
    })
  })
  return { groups, cats, errors }
}

function load() {
  const parsed = LANGS.map((lang) => Object.assign({ lang }, parse(fs.readFileSync(path.join(ROOT, lang.file), 'utf8'), lang)))
  const errors = [].concat(...parsed.map((p) => p.errors))
  const base = parsed[0]
  parsed.slice(1).forEach((p) => {
    if (JSON.stringify(p.groups) !== JSON.stringify(base.groups)) errors.push(p.lang.code + ': групи не збігаються з ' + base.lang.code)
    const a = base.cats.map((c) => [c.id, c.title, c.group, c.dir].join('|'))
    const b = p.cats.map((c) => [c.id, c.title, c.group, c.dir].join('|'))
    if (a.join('\n') !== b.join('\n')) {
      errors.push(p.lang.code + ': категорії не збігаються з ' + base.lang.code + ' (id, назва, група, порядок)')
      const diff = a.filter((x, i) => x !== b[i]).slice(0, 3)
      diff.forEach((d) => errors.push('  ' + base.lang.code + ': ' + d))
    }
  })
  return { parsed, errors }
}

function main() {
  const { parsed, errors } = load()
  if (errors.length) {
    errors.forEach((e) => console.error('✗ ' + e))
    console.error(errors.length + ' помилок')
    process.exit(1)
  }
  const base = parsed[0]
  const totals = {}
  parsed.forEach((p) => {
    totals[p.lang.code] = p.cats.reduce((s, c) => s + c.items.length, 0)
  })
  console.log('Категорій: ' + base.cats.length + ', фраз: ' + parsed.map((p) => p.lang.code + ' ' + totals[p.lang.code]).join(', '))
  if (process.argv.includes('--check')) return

  const head = '// Згенеровано з .data/*.txt командою node .tools/gen-data.js — не редагувати вручну.\n'
  const names = {}
  const shorts = {}
  LANGS.forEach((l) => {
    names[l.code] = l.name
    shorts[l.code] = l.short
  })
  const cats = base.cats.map((c, i) => {
    const count = {}
    parsed.forEach((p) => {
      count[p.lang.code] = p.cats[i].items.length
    })
    return { id: c.id, title: c.title, group: c.group, dir: c.dir, count }
  })
  // Спільне для всіх сторінок і невелике: мови, групи, категорії з кількістю фраз.
  const meta =
    head +
    '// Категорії однакові для всіх мов. dir: "fo" — спершу показувати іноземною.\n\n' +
    'export const LANGS = ' + JSON.stringify(LANGS.map((l) => l.code)) + '\n' +
    'export const LANG_NAMES = ' + JSON.stringify(names) + '\n' +
    'export const LANG_SHORT = ' + JSON.stringify(shorts) + '\n' +
    'export const GROUPS = ' + JSON.stringify(base.groups) + '\n\n' +
    'export const CATS = ' + JSON.stringify(cats, null, 2) + '\n\n' +
    'export const TOTAL = ' + JSON.stringify(totals) + '\n'
  fs.mkdirSync(path.dirname(OUT_META), { recursive: true })
  fs.writeFileSync(OUT_META, meta)
  // Фрази — окремий модуль на кожну мову: сторінка вантажить лише свою.
  parsed.forEach((p) => {
    const body =
      head +
      '// ' + p.lang.name + '. ITEMS[категорія] = [[українською, іноземною, вимова], …], порядок категорій — як у meta.js.\n\n' +
      'export const ITEMS = [\n' +
      p.cats.map((c) => '  [\n' + c.items.map((it) => '    ' + JSON.stringify(it)).join(',\n') + '\n  ]').join(',\n') +
      '\n]\n'
    fs.writeFileSync(path.join(ROOT, 'data', p.lang.code + '.js'), body)
    // Готовий індекс пошуку — лише для сторінки пошуку цієї мови.
    const keys = [].concat(...p.cats.map((c) => c.items.map(searchKey)))
    const idx =
      head +
      '// ' + p.lang.name + ': рядки пошуку «|українською|іноземною|вимова» (нормалізовані), по порядку фраз у ' + p.lang.code + '.js.\n\n' +
      'export const IDX = [\n' + keys.map((k) => '  ' + JSON.stringify(k)).join(',\n') + '\n]\n'
    fs.writeFileSync(path.join(ROOT, 'data', p.lang.code + '_idx.js'), idx)
  })
  try {
    fs.rmSync(OUT_DATA)
  } catch (e) {}
  console.log('Записано data/meta.js, ' + parsed.map((p) => 'data/' + p.lang.code + '.js, data/' + p.lang.code + '_idx.js').join(', '))
}

if (require.main === module) main()
module.exports = { parse, checkStress, syllablesDe, syllablesEn, norm, searchKey, LANGS }
