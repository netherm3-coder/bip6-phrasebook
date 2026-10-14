// Пошук по фразах однієї мови: українською, іноземною (умлаути можна не набирати) і за вимовою.
// Шукає в готовому індексі data/<мова>_idx.js: рядок на фразу «|українською|іноземною|вимова»,
// уже нормалізований генератором, — годиннику лишається тільки indexOf.

const MAP = { ä: 'a', ö: 'o', ü: 'u', ß: 'ss', ґ: 'г', ё: 'е' }

export function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[äöüßґё]/g, (c) => MAP[c])
    .replace(/['’ʼ`]/g, '')
    .replace(/[^a-z0-9а-яєії]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function words(query) {
  const n = norm(query)
  return n ? n.split(' ') : []
}

// Номери фраз, що містять кожне слово запиту, по порядку.
// among — шукати лише серед цих номерів (попередній результат, коли запит лише доповнили).
export function match(idx, ws, among) {
  const out = []
  if (!ws.length) return out
  const n = among ? among.length : idx.length
  for (let j = 0; j < n; j++) {
    const i = among ? among[j] : j
    const e = idx[i]
    let ok = true
    for (let w = 0; w < ws.length; w++) {
      if (e.indexOf(ws[w]) < 0) {
        ok = false
        break
      }
    }
    if (ok) out.push(i)
  }
  return out
}

// Чи починає перше слово запиту якесь слово фрази українською чи іноземною (не у вимові).
function strong(e, a, b) {
  const pr = e.lastIndexOf('|')
  const i = e.indexOf(a)
  if (i >= 0 && i < pr) return true
  const j = e.indexOf(b)
  return j >= 0 && j < pr
}

// Спершу «сильні» збіги, далі решта; всередині — порядок фраз.
export function rank(idx, ws, hits) {
  if (!ws.length) return hits
  const a = '|' + ws[0]
  const b = ' ' + ws[0]
  const first = []
  const rest = []
  for (let k = 0; k < hits.length; k++) {
    const i = hits[k]
    if (strong(idx[i], a, b)) first.push(i)
    else rest.push(i)
  }
  return first.concat(rest)
}

// Перший після rank() — без сортування всього списку.
export function best(idx, ws, hits) {
  if (!hits.length) return -1
  const a = '|' + ws[0]
  const b = ' ' + ws[0]
  for (let k = 0; k < hits.length; k++) if (strong(idx[hits[k]], a, b)) return hits[k]
  return hits[0]
}

export function search(idx, query) {
  const ws = words(query)
  return rank(idx, ws, match(idx, ws))
}
