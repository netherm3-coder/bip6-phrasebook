// Обране й мова клавіатури — у файлі на годиннику.
// Обрану фразу запам'ятовуємо за німецьким текстом.

import { readFileSync, writeFileSync, renameSync, rmSync, statSync } from '@zos/fs'

const FILE = 'phrasebook.json'
const TMP = 'phrasebook.tmp'
const MAX_FAV = 200

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

export function loadState() {
  const raw = readJson(FILE) || readJson(TMP) || {}
  const fav = Array.isArray(raw.fav) ? raw.fav.filter((s) => typeof s === 'string' && s.length < 300).slice(0, MAX_FAV) : []
  return { fav, lang: raw.lang === 'en' ? 'en' : 'uk' }
}

export function saveState(st) {
  const text = JSON.stringify({ v: 1, fav: st.fav.slice(0, MAX_FAV), lang: st.lang })
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

export function isFav(st, de) {
  return st.fav.indexOf(de) >= 0
}

// Додає або прибирає; новіші — на початку списку.
export function toggleFav(st, de) {
  const i = st.fav.indexOf(de)
  if (i >= 0) st.fav.splice(i, 1)
  else st.fav.unshift(de)
  saveState(st)
  return i < 0
}
