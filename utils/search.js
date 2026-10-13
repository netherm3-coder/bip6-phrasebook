// Пошук по фразах: українською, німецькою (умлаути можна не набирати) і за вимовою.

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

// Індекс: для кожної фрази — нормалізований текст усіх трьох полів.
export function buildIndex(cats) {
  const index = []
  cats.forEach((c, ci) =>
    c.items.forEach((it, ii) => {
      index.push({ ci, ii, ua: norm(it[0]), de: norm(it[1]), all: norm(it[0] + ' ' + it[1] + ' ' + it[2]) })
    })
  )
  return index
}

function startsWord(text, word) {
  return text === word || text.indexOf(word) === 0 || text.indexOf(' ' + word) >= 0
}

// Повертає { total, hits: [[ci, ii], …] } — спершу ті, де слово запиту починає слово фрази.
export function search(index, query, limit) {
  const words = norm(query).split(' ').filter(Boolean)
  if (!words.length) return { total: 0, hits: [] }
  const first = []
  const rest = []
  for (let i = 0; i < index.length; i++) {
    const e = index[i]
    let ok = true
    for (let w = 0; w < words.length; w++) {
      if (e.all.indexOf(words[w]) < 0) {
        ok = false
        break
      }
    }
    if (!ok) continue
    const strong = startsWord(e.ua, words[0]) || startsWord(e.de, words[0])
    ;(strong ? first : rest).push([e.ci, e.ii])
  }
  const all = first.concat(rest)
  return { total: all.length, hits: all.slice(0, limit || all.length) }
}
