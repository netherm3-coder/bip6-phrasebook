// Налаштування й списки — у файлі на годиннику:
//   target — мова перекладу ('de' | 'en'), kb — розкладка клавіатури пошуку ('uk' | 'en'),
//   fav — обране, recent — нещодавні. Фразу запам'ятовуємо як «мова:текст».

import { readFileSync, writeFileSync, renameSync, rmSync, statSync } from '@zos/fs'

const FILE = 'phrasebook.json'
const TMP = 'phrasebook.tmp'
const MAX_FAV = 200
const MAX_RECENT = 20
const KEY_RE = /^(de|en):/

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

// Старе обране (до англійської) — це німецькі фрази без префікса.
function cleanKeys(list, max) {
  if (!Array.isArray(list)) return []
  const out = []
  list.forEach((s) => {
    if (typeof s !== 'string' || !s || s.length > 300) return
    const key = KEY_RE.test(s) ? s : 'de:' + s
    if (out.indexOf(key) < 0) out.push(key)
  })
  return out.slice(0, max)
}

export function loadState() {
  const raw = readJson(FILE) || readJson(TMP) || {}
  return {
    target: raw.target === 'en' ? 'en' : 'de',
    kb: raw.kb === 'en' || (!raw.kb && raw.lang === 'en') ? 'en' : 'uk',
    fav: cleanKeys(raw.fav, MAX_FAV),
    recent: cleanKeys(raw.recent, MAX_RECENT)
  }
}

export function saveState(st) {
  const text = JSON.stringify({
    v: 2,
    target: st.target,
    kb: st.kb,
    fav: st.fav.slice(0, MAX_FAV),
    recent: st.recent.slice(0, MAX_RECENT)
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

export function keyOf(lang, fo) {
  return lang + ':' + fo
}

export function splitKey(key) {
  const i = key.indexOf(':')
  return { lang: key.slice(0, i), fo: key.slice(i + 1) }
}

export function isFav(st, key) {
  return st.fav.indexOf(key) >= 0
}

// Додає або прибирає; новіші — на початку списку. Повертає true, якщо додано.
export function toggleFav(st, key) {
  const i = st.fav.indexOf(key)
  if (i >= 0) st.fav.splice(i, 1)
  else st.fav.unshift(key)
  saveState(st)
  return i < 0
}

export function addRecent(st, key) {
  const i = st.recent.indexOf(key)
  if (i === 0) return
  if (i > 0) st.recent.splice(i, 1)
  st.recent.unshift(key)
  if (st.recent.length > MAX_RECENT) st.recent.length = MAX_RECENT
  saveState(st)
}

export function setTarget(st, lang) {
  st.target = lang === 'en' ? 'en' : 'de'
  saveState(st)
}
