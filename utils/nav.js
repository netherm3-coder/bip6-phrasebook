// Дані між сторінками (живуть, поки відкрита програма):
// поточний список фраз для сторінки фрази, позиція прокрутки списку, останній запит.

function shared() {
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

// items: [{ ua, de, pr, dir, cat }]
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
