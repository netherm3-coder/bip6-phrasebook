// Переклад на годиннику: напрямок за абеткою, фраза для обраного й нещодавніх, тексти помилок.

const CYR = /[а-яіїєґё]/i

// Кирилиця — з української на вибрану мову; латиниця — на українську (мову оригіналу визначить перекладач).
export function direction(text, target) {
  if (CYR.test(text)) return { from: 'uk', to: target, guess: 'uk' }
  return { from: 'auto', to: 'uk', guess: target }
}

export const LANG_LABEL = { uk: 'укр.', de: 'нім.', en: 'англ.' }
export const LANG_IN = { uk: 'українською', de: 'німецькою', en: 'англійською' }

// Результат перекладу → фраза розмовника { lang, fo, ua, pr, dir, cat }: іноземна сторона — fo.
export function itemOf(t, target) {
  if (t.from === 'uk') return { lang: t.to, fo: t.text, ua: t.src, pr: t.pr || '', dir: 'ua', cat: 'Переклад' }
  const lang = t.from === 'de' || t.from === 'en' ? t.from : target
  return { lang, fo: t.src, ua: t.text, pr: t.pr || '', dir: 'fo', cat: 'Переклад' }
}

const MESSAGES = {
  ble: "Немає зв'язку з телефоном.",
  phone_timeout: 'Телефон не відповів. Zepp запущений?',
  network: 'Телефон без інтернету.',
  timeout: 'Перекладач не відповів. Спробуй ще.',
  rate_limited: 'Забагато запитів. Спробуй за хвилину.',
  empty: 'Порожній текст.',
  bad_lang: 'Ця пара мов не підтримується.',
  unknown_method: 'Онови програму: старий сервіс у Zepp.'
}

export function errorMessage(code) {
  return MESSAGES[code] || 'Перекладач повернув помилку. Спробуй ще.'
}

// Без телефона чи інтернету можна шукати у фразах розмовника.
export function isOffline(code) {
  return code === 'ble' || code === 'phone_timeout' || code === 'network'
}

// Помилки бібліотеки зв'язку з телефоном → коди вище.
export function bleCode(err) {
  const text = String((err && (err.message || err.msg)) || err || '').toLowerCase()
  const code = err && err.code
  if (code === 4 || text.indexOf('request id') >= 0 || (text.indexOf('timeout') >= 0 && text.indexOf('shake') < 0)) return 'phone_timeout'
  return 'ble'
}
