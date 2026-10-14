// Список фраз сторінками (до PAGE_MAX фраз) — для категорій, обраного, нещодавніх і пошуку.
// Менше віджетів на сторінці — швидше вона будується (і перебудовується після «назад») і гортається.
//
// listPage(url, load): load(params) → { key, title, items, mixed?, total?, empty?, extra? }
//   key   — для відновлення прокрутки;   mixed — фрази різних мов (позначати DE / EN);
//   total — скільки знайдено всього (пошук);   empty — текст, коли фраз немає;
//   extra — { text, go } кнопка під заголовком.
// Сторінка списку — параметр page (з 0). «Попередні» / «Наступні» — через replace,
// тож «назад» одразу виходить зі списку.

import * as hmUI from '@zos/ui'
import { push, replace } from '@zos/router'
import { scrollTo } from '@zos/page'
import { getDeviceInfo } from '@zos/device'
import { LANG_SHORT } from '../data/meta'
import { setList, saveScroll, takeScroll } from '../utils/nav'
import { COLOR, STATUS_BAR_H, PAGE_MAX } from '../utils/constants'
import { statusBar, parseParams, cachedHeight, tappable, phrases, scrollTop } from '../utils/ui'

const PAD = 16
const TOP_SIZE = 24
const SUB_SIZE = 22
const BTN_H = 52

// Рівні сторінки: 34 фрази → 17 + 17, 41 → 14 + 14 + 13.
export function paging(n, page) {
  const pages = Math.max(1, Math.ceil(n / PAGE_MAX))
  const per = Math.max(1, Math.ceil(n / pages))
  const p = Math.max(0, Math.min(pages - 1, Math.floor(Number(page) || 0)))
  const start = p * per
  return { pages, per, page: p, start, end: Math.min(n, start + per) }
}

export function listPage(url, load) {
  return {
    onInit(params) {
      const p = parseParams(params)
      this.alive = true
      this.leaving = false
      this.params = p
      this.m = load(p)
      this.pg = paging(this.m.items.length, p.page)
      this.key = this.m.key + '#' + this.pg.page
      setList(this.m.title, this.m.items)
    },

    build() {
      const { width: W } = getDeviceInfo()
      this.W = W
      statusBar(true)
      const m = this.m
      const pg = this.pg
      const n = m.items.length
      let y = STATUS_BAR_H + 4

      this.label(m.title, y, 40, 28, COLOR.TEXT)
      y += 40
      let sub = pg.pages > 1 ? pg.start + 1 + '–' + pg.end + ' з ' + n : phrases(n)
      if (m.total > n) sub += ' · знайдено ' + m.total
      this.label(n ? sub : '', y, 30, 20, COLOR.TEXT_DIM)
      y += 36

      if (m.extra) {
        this.button(y, m.extra.text, () => this.leave(m.extra.go))
        y += BTN_H + 12
      }

      if (!n) {
        hmUI.createWidget(hmUI.widget.TEXT, {
          x: 30,
          y: y + 10,
          w: W - 60,
          h: 120,
          text: m.empty || 'Порожньо.',
          text_size: 24,
          color: COLOR.TEXT_DIM,
          align_h: hmUI.align.CENTER_H,
          align_v: hmUI.align.TOP,
          text_style: hmUI.text_style.WRAP
        })
        return
      }

      if (pg.page > 0) {
        this.button(y, 'Попередні ' + pg.per, () => this.turn(-1))
        y += BTN_H + 12
      }
      for (let i = pg.start; i < pg.end; i++) y = this.row(m.items[i], i, y, W) + 8
      if (pg.page < pg.pages - 1) {
        const next = Math.min(n, pg.end + pg.per) - pg.end
        y += 4
        this.button(y, 'Наступні ' + next, () => this.turn(1))
        y += BTN_H
      }
      hmUI.createWidget(hmUI.widget.FILL_RECT, { x: 0, y: y + 60, w: W, h: 2, radius: 0, color: COLOR.BG })

      const top = takeScroll(this.key)
      if (top) {
        const restore = () => {
          try {
            scrollTo({ y: top })
          } catch (e) {}
        }
        restore()
        setTimeout(restore, 30)
      }
    },

    label(text, y, h, size, color) {
      hmUI.createWidget(hmUI.widget.TEXT, {
        x: PAD + 10,
        y,
        w: this.W - PAD * 2 - 20,
        h,
        text,
        text_size: size,
        color,
        align_h: hmUI.align.CENTER_H,
        align_v: hmUI.align.CENTER_V,
        text_style: hmUI.text_style.ELLIPSIS
      })
    },

    button(y, text, onClick) {
      hmUI.createWidget(hmUI.widget.BUTTON, {
        x: 60,
        y,
        w: this.W - 120,
        h: BTN_H,
        radius: BTN_H / 2,
        normal_color: COLOR.NEUTRAL,
        press_color: COLOR.NEUTRAL_PRESS,
        text,
        text_size: 22,
        color: COLOR.TEXT,
        click_func: onClick
      })
    },

    // Картка фрази; повертає її низ.
    row(item, i, y, W) {
      const foFirst = item.dir === 'fo'
      const fo = this.m.mixed ? (LANG_SHORT[item.lang] || '') + ' · ' + item.fo : item.fo
      let first = foFirst ? fo : item.ua
      let second = foFirst ? item.ua : fo
      if (!item.ua) {
        first = fo
        second = item.pr || ' '
      }
      const textW = W - PAD * 2 - 32
      const h1 = cachedHeight(first, TOP_SIZE, textW)
      const h2 = cachedHeight(second, SUB_SIZE, textW)
      const h = 12 + h1 + 4 + h2 + 12
      const rect = { x: PAD, y, w: W - PAD * 2, h, radius: 18 }
      const bg = hmUI.createWidget(hmUI.widget.FILL_RECT, Object.assign({ color: COLOR.CARD }, rect))
      const t1 = hmUI.createWidget(hmUI.widget.TEXT, {
        x: PAD + 16,
        y: y + 12,
        w: textW,
        h: h1,
        text: first,
        text_size: TOP_SIZE,
        color: COLOR.TEXT,
        align_h: hmUI.align.LEFT,
        align_v: hmUI.align.TOP,
        text_style: hmUI.text_style.WRAP
      })
      const t2 = hmUI.createWidget(hmUI.widget.TEXT, {
        x: PAD + 16,
        y: y + 12 + h1 + 4,
        w: textW,
        h: h2,
        text: second,
        text_size: SUB_SIZE,
        color: foFirst || !item.ua ? COLOR.TEXT_DIM : COLOR.DE,
        align_h: hmUI.align.LEFT,
        align_v: hmUI.align.TOP,
        text_style: hmUI.text_style.WRAP
      })
      tappable([bg, t1, t2], bg, rect, COLOR.CARD, COLOR.CARD_PRESS, () => this.open(i), () => this.alive)
      return y + h
    },

    open(i) {
      saveScroll(this.key, scrollTop())
      this.leave(() => push({ url: 'page/phrase', params: JSON.stringify({ pos: i }) }))
    },

    turn(d) {
      saveScroll('', 0)
      const params = Object.assign({}, this.params, { page: this.pg.page + d })
      this.leave(() => replace({ url, params: JSON.stringify(params) }))
    },

    leave(go) {
      if (this.leaving) return
      this.leaving = true
      setTimeout(() => {
        this.leaving = false
      }, 1000)
      go()
    },

    onDestroy() {
      this.alive = false
    }
  }
}
