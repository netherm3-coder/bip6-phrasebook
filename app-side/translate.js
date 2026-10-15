// Переклад у сервісі Zepp на телефоні. Google Перекладач — без ключа й реєстрації;
// якщо адреса не відповіла, пробує наступну. Залежності передаються ззовні,
// щоб модуль можна було перевірити без Zepp.

const TIMEOUT_MS = 9000
export const MAX_TEXT = 300
const LANGS = ['uk', 'de', 'en']

function fail(code, detail) {
  const e = new Error(code)
  e.code = code
  if (detail) e.detail = detail
  return e
}

function bodyJson(body) {
  if (body && typeof body === 'object') return body
  try {
    return JSON.parse(String(body || ''))
  } catch (e) {
    return null
  }
}

function withTimeout(promise, ms, setTimer) {
  return new Promise((resolve, reject) => {
    let done = false
    setTimer(() => {
      if (done) return
      done = true
      reject(fail('timeout'))
    }, ms)
    promise.then(
      (v) => {
        if (done) return
        done = true
        resolve(v)
      },
      (e) => {
        if (done) return
        done = true
        reject(e)
      }
    )
  })
}

// translate.googleapis.com: [[["переклад","оригінал",…],…], null, "мова оригіналу", …]
export function parseGtx(data) {
  if (!Array.isArray(data) || !Array.isArray(data[0])) return null
  const text = data[0].map((s) => (Array.isArray(s) && typeof s[0] === 'string' ? s[0] : '')).join('')
  if (!text.trim()) return null
  return { text: text.trim(), from: typeof data[2] === 'string' ? data[2] : '' }
}

// clients5.google.com: ["переклад"] або [["переклад","мова оригіналу"]]
export function parseDict(data) {
  if (!Array.isArray(data) || !data.length) return null
  const first = data[0]
  if (typeof first === 'string') return first.trim() ? { text: first.trim(), from: '' } : null
  if (Array.isArray(first) && typeof first[0] === 'string' && first[0].trim()) {
    return { text: first[0].trim(), from: typeof first[1] === 'string' ? first[1] : '' }
  }
  return null
}

// api.mymemory.translated.net (запасний, без автовизначення мови)
export function parseMyMemory(data) {
  if (!data || typeof data !== 'object') return null
  const status = Number(data.responseStatus)
  const t = data.responseData && data.responseData.translatedText
  if ((status && status !== 200) || typeof t !== 'string' || !t.trim()) return null
  if (/MYMEMORY WARNING|QUERY LENGTH LIMIT/i.test(t)) return null
  return { text: t.trim(), from: '' }
}

const ENGINES = [
  {
    name: 'google',
    url: (q, sl, tl) => 'https://translate.googleapis.com/translate_a/single?client=gtx&ie=UTF-8&oe=UTF-8&dt=t&sl=' + sl + '&tl=' + tl + '&q=' + q,
    parse: parseGtx
  },
  {
    name: 'google',
    url: (q, sl, tl) => 'https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=' + sl + '&tl=' + tl + '&q=' + q,
    parse: parseDict
  },
  {
    name: 'mymemory',
    url: (q, sl, tl, guess) => 'https://api.mymemory.translated.net/get?langpair=' + (sl === 'auto' ? guess : sl) + '|' + tl + '&q=' + q,
    parse: parseMyMemory
  }
]

export function cleanText(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_TEXT)
}

export function createTranslator(deps) {
  const doFetch = deps.fetch
  const setTimer = deps.setTimeout || setTimeout

  function get(url) {
    const call = Promise.resolve()
      .then(() => doFetch({ url, method: 'GET', headers: { Accept: 'application/json' } }))
      .catch((e) => {
        const status = e && (e.status || e.statusCode)
        throw fail(status === 429 ? 'rate_limited' : status ? 'http_' + status : 'network', e && e.message)
      })
      .then((res) => {
        const status = Number(res && (res.status || res.statusCode)) || 200
        if (status === 429) throw fail('rate_limited')
        if (status < 200 || status >= 300) throw fail('http_' + status)
        return bodyJson(res.body)
      })
    return withTimeout(call, TIMEOUT_MS, setTimer)
  }

  return {
    // from: 'uk' | 'de' | 'en' | 'auto'; to: 'uk' | 'de' | 'en'; guess — мова для запасного, якщо from = 'auto'.
    translate(text, from, to, guess) {
      const t = cleanText(text)
      if (!t) return Promise.reject(fail('empty'))
      const sl = from === 'auto' || LANGS.indexOf(from) >= 0 ? from : 'auto'
      if (LANGS.indexOf(to) < 0 || sl === to) return Promise.reject(fail('bad_lang'))
      const g = LANGS.indexOf(guess) >= 0 && guess !== to ? guess : to === 'uk' ? 'de' : 'uk'
      const q = encodeURIComponent(t)
      let firstError = null
      let k = 0
      const next = () => {
        if (k >= ENGINES.length) return Promise.reject(firstError || fail('network'))
        const engine = ENGINES[k++]
        return get(engine.url(q, sl, to, g))
          .then((data) => {
            const r = engine.parse(data)
            if (!r) throw fail('bad_data')
            const detected = LANGS.indexOf(r.from) >= 0 ? r.from : sl === 'auto' ? g : sl
            return { text: r.text, from: detected, to, engine: engine.name }
          })
          .catch((e) => {
            if (!firstError) firstError = e
            return next()
          })
      }
      return next()
    }
  }
}
