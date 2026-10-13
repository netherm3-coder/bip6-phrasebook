// Список фраз: категорія, обране або результати пошуку.
// Параметри: { cat } | { fav: 1 } | { q }.

import * as hmUI from '@zos/ui'
import { push, replace } from '@zos/router'
import { scrollTo } from '@zos/page'
import { getDeviceInfo } from '@zos/device'
import { CATS } from '../data/phrases'
import { buildIndex, search } from '../utils/search'
import { loadState } from '../utils/store'
import { setList, saveScroll, takeScroll, setQuery } from '../utils/nav'
import { COLOR, STATUS_BAR_H, MAX_RESULTS } from '../utils/constants'
import { statusBar, parseParams, textHeight, tappable, phrases, scrollTop } from '../utils/ui'

const PAD = 16
const TOP_SIZE = 24
const SUB_SIZE = 22

function itemOf(c, it) {
  return { ua: it[0], de: it[1], pr: it[2], dir: c.dir, cat: c.title }
}

Page({
  onInit(params) {
    const p = parseParams(params)
    this.alive = true
    this.leaving = false
    this.mode = p.q ? 'search' : p.fav ? 'fav' : 'cat'
    this.query = String(p.q || '')
    this.key = this.mode + ':' + (p.cat || this.query)
    this.total = 0
    let items = []
    let title = ''

    if (this.mode === 'cat') {
      const c = CATS.find((x) => x.id === p.cat)
      title = c ? c.title : 'Не знайдено'
      items = c ? c.items.map((it) => itemOf(c, it)) : []
    } else if (this.mode === 'fav') {
      title = 'Обране'
      loadState().fav.forEach((de) => {
        for (let i = 0; i < CATS.length; i++) {
          const it = CATS[i].items.find((x) => x[1] === de)
          if (it) {
            items.push(itemOf(CATS[i], it))
            return
          }
        }
      })
    } else {
      title = '«' + this.query + '»'
      setQuery(this.query)
      const r = search(buildIndex(CATS), this.query, MAX_RESULTS)
      this.total = r.total
      items = r.hits.map(([ci, ii]) => itemOf(CATS[ci], CATS[ci].items[ii]))
    }
    this.title = title
    this.items = items
    setList(title, items)
  },

  build() {
    const { width: W } = getDeviceInfo()
    this.W = W
    statusBar(true)
    let y = STATUS_BAR_H + 4

    hmUI.createWidget(hmUI.widget.TEXT, {
      x: PAD + 10,
      y,
      w: W - PAD * 2 - 20,
      h: 40,
      text: this.title,
      text_size: 28,
      color: COLOR.TEXT,
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V,
      text_style: hmUI.text_style.ELLIPSIS
    })
    y += 40
    const n = this.items.length
    let sub = phrases(n)
    if (this.mode === 'search' && this.total > n) sub = 'Показано ' + n + ' з ' + this.total
    hmUI.createWidget(hmUI.widget.TEXT, {
      x: PAD,
      y,
      w: W - PAD * 2,
      h: 30,
      text: n ? sub : '',
      text_size: 20,
      color: COLOR.TEXT_DIM,
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V,
      text_style: hmUI.text_style.NONE
    })
    y += 36

    if (this.mode === 'search') {
      hmUI.createWidget(hmUI.widget.BUTTON, {
        x: 60,
        y,
        w: W - 120,
        h: 52,
        radius: 26,
        normal_color: COLOR.NEUTRAL,
        press_color: COLOR.NEUTRAL_PRESS,
        text: 'Змінити пошук',
        text_size: 22,
        color: COLOR.TEXT,
        click_func: () => this.leave(() => replace({ url: 'page/search', params: JSON.stringify({}) }))
      })
      y += 52 + 12
    }

    if (!n) {
      const empty =
        this.mode === 'fav'
          ? 'Поки порожньо.\nВідкрий фразу й натисни «В обране».'
          : this.mode === 'search'
            ? 'Нічого не знайдено.\nСпробуй коротше слово або іншою мовою.'
            : 'Категорію не знайдено.'
      hmUI.createWidget(hmUI.widget.TEXT, {
        x: 30,
        y: y + 10,
        w: W - 60,
        h: 120,
        text: empty,
        text_size: 24,
        color: COLOR.TEXT_DIM,
        align_h: hmUI.align.CENTER_H,
        align_v: hmUI.align.TOP,
        text_style: hmUI.text_style.WRAP
      })
      return
    }

    this.items.forEach((item, i) => {
      y = this.row(item, i, y, W) + 8
    })
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

  // Повертає низ картки.
  row(item, i, y, W) {
    const deFirst = item.dir === 'de'
    const first = deFirst ? item.de : item.ua
    const second = deFirst ? item.ua : item.de
    const textW = W - PAD * 2 - 32
    const h1 = textHeight(first, TOP_SIZE, textW)
    const h2 = textHeight(second, SUB_SIZE, textW)
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
      color: deFirst ? COLOR.TEXT_DIM : COLOR.DE,
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
})
