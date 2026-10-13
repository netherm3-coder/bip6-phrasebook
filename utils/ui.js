import * as hmUI from '@zos/ui'
import { getScrollTop } from '@zos/page'
import { setPageBrightTime } from '@zos/display'

export function statusBar(visible) {
  try {
    if (typeof hmUI.setStatusBarVisible === 'function') hmUI.setStatusBarVisible(visible)
  } catch (e) {}
}

export function keepScreen(ms) {
  try {
    setPageBrightTime({ brightTime: ms })
  } catch (e) {}
}

export function parseParams(params) {
  if (!params) return {}
  if (typeof params === 'object') return params
  try {
    return JSON.parse(params) || {}
  } catch (e) {
    return {}
  }
}

export function setProps(widget, props) {
  if (!widget) return
  try {
    widget.setProperty(hmUI.prop.MORE, props)
  } catch (e) {}
}

export function scrollTop() {
  try {
    return getScrollTop() || 0
  } catch (e) {
    return 0
  }
}

// Оцінка, якщо getTextLayout недоступний: середня ширина символу ~0.58 кегля.
function estimate(text, size, width) {
  const perRow = Math.max(1, Math.floor(width / (size * 0.58)))
  let rows = 0
  String(text)
    .split('\n')
    .forEach((line) => {
      rows += Math.max(1, Math.ceil(line.length / perRow))
    })
  return { rows, height: Math.ceil(rows * size * 1.3) }
}

export function measure(text, size, width) {
  try {
    const r = hmUI.getTextLayout(String(text), { text_size: size, text_width: width, wrapped: 1 })
    if (r && r.height > 0) return { rows: typeof r.rows === 'number' && r.rows > 0 ? r.rows : 0, height: r.height }
  } catch (e) {}
  return estimate(text, size, width)
}

export function textHeight(text, size, width) {
  return measure(text || ' ', size, width).height
}

// Найбільший кегль, з яким текст влазить у прямокутник.
export function fitWrapped(text, sizes, width, height) {
  for (let i = 0; i < sizes.length; i++) {
    if (textHeight(text, sizes[i], width) <= height) return sizes[i]
  }
  return sizes[sizes.length - 1]
}

// Хвіст тексту, що вміщується в maxRows рядків (поле введення пошуку).
export function fitTail(text, size, width, maxRows) {
  const lineH = Math.max(1, textHeight('Ag', size, width))
  const fits = (t) => textHeight(t, size, width) <= lineH * maxRows + 2
  if (fits(text)) return text
  let lo = 1
  let hi = text.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (fits('…' + text.slice(mid))) hi = mid
    else lo = mid + 1
  }
  return '…' + text.slice(lo)
}

// 1 фраза, 2 фрази, 5 фраз
export function plural(n, forms) {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return forms[0]
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return forms[1]
  return forms[2]
}

export function phrases(n) {
  return n + ' ' + plural(n, ['фраза', 'фрази', 'фраз'])
}

// Картка, що реагує на дотик: підсвічується й відкриває, якщо сторінку не прокручували.
export function tappable(widgets, bg, rect, color, pressColor, onTap, isAlive) {
  let press = null
  const paint = (c) => setProps(bg, Object.assign({}, rect, { color: c }))
  const down = () => {
    press = { top: scrollTop(), t: Date.now() }
    paint(pressColor)
    setTimeout(() => {
      if (!isAlive || isAlive()) paint(color)
    }, 300)
  }
  const up = () => {
    const p = press
    press = null
    if (!p) return
    if (Math.abs(scrollTop() - p.top) > 6) return
    if (Date.now() - p.t > 1500) return
    onTap()
  }
  widgets.forEach((wd) => {
    try {
      wd.addEventListener(hmUI.event.CLICK_DOWN, down)
      wd.addEventListener(hmUI.event.CLICK_UP, up)
    } catch (e) {}
  })
}
