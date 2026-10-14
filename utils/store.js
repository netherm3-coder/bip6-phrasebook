// Налаштування й списки — у файлі на годиннику:
//   target — мова перекладу ('de' | 'en'), kb — розкладка клавіатури пошуку ('uk' | 'en'),
//   fav — обране, recent — нещодавні.
// Обране й нещодавні зберігають саму фразу: { lang, fo, ua, pr, dir, cat } (у файлі — масивом),
// тож їх можна показати, не вантажачи всіх фраз мови.
// Старі версії зберігали лише «мова:текст» (або німецьку фразу без мови) — такі записи
// без українського тексту один раз доповнює сторінка категорії відповідної мови (lib/catpage.js).

import { readFileSync, writeFileSync, renameSync, rmSync, statSync } from '@zos/fs'

const FILE = 'phrasebook.json'
const TMP = 'phrasebook.tmp'
const MAX_FAV = 200
const MAX_RECENT = 20
const LANG_RE = /^(de|en)$/

function readJson(path) {
  try {
    if (!statSync({ path })) return null
    const raw = readFileSync({ path, options: { encoding: 'utf8' } })
    if (typeof raw !== 'string' || !raw.length) return null
    return JSON.parse(raw)
  } catch (e) {
    return null
  }
}

function str(v) {
  return typeof v === 'string' ? v : ''
}

export function keyOf(lang, fo) {
  return lang + ':' + fo
}

function entry(lang, fo, ua, pr, dir, cat) {
  return { lang, fo, ua: str(ua), pr: str(pr), dir: dir === 'fo' ? 'fo' : 'ua', cat: str(cat) }
}

function fromRaw(e) {
  if (typeof e === 'string') {
    if (!e || e.length > 400) return null
    const m = /^(de|en):/.exec(e)
    const fo = m ? e.slice(3) : e
    return fo ? entry(m ? m[1] : 'de', fo) : null
  }
  if (Array.isArray(e) && LANG_RE.test(e[0]) && typeof e[1] === 'string' && e[1] && e[1].length <= 400) {
    return entry(e[0], e[1], e[2], e[3], e[4], e[5])
  }
  return null
}

function toRaw(e) {
  return [e.lang, e.fo, e.ua, e.pr, e.dir, e.cat]
}

function cleanList(list, max) {
  if (!Array.isArray(list)) return []
  const out = []
  const seen = {}
  for (let i = 0; i < list.length && out.length < max; i++) {
    const e = fromRaw(list[i])
    if (!e) continue
    const k = keyOf(e.lang, e.fo)
    if (seen[k]) continue
    seen[k] = true
    out.push(e)
  }
  return out
}

export function loadState() {
  const raw = readJson(FILE) || readJson(TMP) || {}
  return {
    target: raw.target === 'en' ? 'en' : 'de',
    kb: raw.kb === 'en' || (!raw.kb && raw.lang === 'en') ? 'en' : 'uk',
    fav: cleanList(raw.fav, MAX_FAV),
    recent: cleanList(raw.recent, MAX_RECENT)
  }
}

export function saveState(st) {
  const text = JSON.stringify({
    v: 3,
    target: st.target,
    kb: st.kb,
    fav: st.fav.slice(0, MAX_FAV).map(toRaw),
    recent: st.recent.slice(0, MAX_RECENT).map(toRaw)
  })
  try {
    writeFileSync({ path: TMP, data: text, options: { encoding: 'utf8' } })
    if (renameSync({ oldPath: TMP, newPath: FILE }) === 0) return true
    rmSync({ path: FILE })
    if (renameSync({ oldPath: TMP, newPath: FILE }) === 0) return true
  } catch (e) {}
  try {
    writeFileSync({ path: FILE, data: text, options: { encoding: 'utf8' } })
    return true
  } catch (e) {
    return false
  }
}

function indexIn(list, item) {
  for (let i = 0; i < list.length; i++) if (list[i].lang === item.lang && list[i].fo === item.fo) return i
  return -1
}

function copy(item) {
  return entry(item.lang, item.fo, item.ua, item.pr, item.dir, item.cat)
}

export function isFav(st, item) {
  return indexIn(st.fav, item) >= 0
}

// Додає або прибирає; новіші — на початку. Повертає true, якщо додано.
export function toggleFav(st, item) {
  const i = indexIn(st.fav, item)
  if (i >= 0) st.fav.splice(i, 1)
  else st.fav.unshift(copy(item))
  if (st.fav.length > MAX_FAV) st.fav.length = MAX_FAV
  saveState(st)
  return i < 0
}

export function addRecent(st, item) {
  const i = indexIn(st.recent, item)
  if (i === 0 && st.recent[0].ua) return
  if (i >= 0) st.recent.splice(i, 1)
  st.recent.unshift(copy(item))
  if (st.recent.length > MAX_RECENT) st.recent.length = MAX_RECENT
  saveState(st)
}

export function setTarget(st, lang) {
  st.target = lang === 'en' ? 'en' : 'de'
  saveState(st)
}

// Мови, у яких є записи старого формату (без українського тексту), по порядку.
export function fixLangs(st) {
  const out = []
  st.fav.concat(st.recent).forEach((e) => {
    if (!e.ua && out.indexOf(e.lang) < 0) out.push(e.lang)
  })
  return out.sort()
}

// Доповнити старі записи мови lang: find(fo) → фраза або null. Ненайдене прибирається
// (у попередній версії такі записи й так не показувалися). Записи інших мов не змінюються.
export function fixEntries(st, lang, find) {
  let changed = false
  const fix = (list) =>
    list
      .map((e) => {
        if (e.ua || e.lang !== lang) return e
        changed = true
        const it = find(e.fo)
        return it ? copy(it) : null
      })
      .filter(Boolean)
  st.fav = fix(st.fav)
  st.recent = fix(st.recent)
  if (changed) saveState(st)
  return changed
}
