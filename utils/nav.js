// Дані між сторінками (живуть, поки відкрита програма):
// поточний список фраз для сторінки фрази, прокрутка списку, останній запит і його результати.

export function shared() {
  try {
    const app = getApp()
    if (app && app._options) {
      if (!app._options.globalData) app._options.globalData = {}
      return app._options.globalData
    }
  } catch (e) {}
  if (!globalThis.__phrasebook) globalThis.__phrasebook = {}
  return globalThis.__phrasebook
}

// items: [{ ua, fo, pr, dir, cat, lang }] — увесь список (усі сторінки), щоб < > у фразі йшли по ньому.
export function setList(title, items) {
  shared().list = { title, items }
}

export function getList() {
  const l = shared().list
  return l && Array.isArray(l.items) ? l : { title: '', items: [] }
}

export function saveScroll(key, top) {
  shared().scroll = { key, top }
}

export function takeScroll(key) {
  const s = shared().scroll
  return s && s.key === key ? s.top : 0
}

export function setQuery(q) {
  shared().query = q
}

export function getQuery() {
  return shared().query || ''
}

// Результати пошуку: { q, lang, total, items }.
export function setFound(found) {
  shared().found = found
}

export function getFound() {
  const f = shared().found
  return f && Array.isArray(f.items) ? f : null
}

// true лише вперше за цей запуск програми.
export function once(flag) {
  const g = shared()
  if (!g.flags) g.flags = {}
  if (g.flags[flag]) return false
  g.flags[flag] = true
  return true
}

// Переклад: останній введений текст і результат { src, text, from, to, pr, engine }.
export function setTrQuery(q) {
  shared().trQuery = q
}

export function getTrQuery() {
  return shared().trQuery || ''
}

export function setTranslation(t) {
  shared().translation = t
}

export function getTranslation() {
  const t = shared().translation
  return t && typeof t.text === 'string' ? t : null
}
