// Одна фраза: українською, іноземною, вимова. < > — сусідні фрази списку.

import * as hmUI from '@zos/ui'
import { push, replace, back } from '@zos/router'
import { getDeviceInfo } from '@zos/device'
import { LANG_SHORT } from '../data/meta'
import { getList } from '../utils/nav'
import { loadState, isFav, toggleFav, addRecent } from '../utils/store'
import { COLOR, STATUS_BAR_H, SCREEN_ON_MS } from '../utils/constants'
import { statusBar, keepScreen, parseParams, cachedHeight, setProps } from '../utils/ui'

const PAD = 22
const UA_SIZE = 24
const FO_SIZE = 34
const PR_SIZE = 28

Page({
  onInit(params) {
    const p = parseParams(params)
    const list = getList()
    this.items = list.items
    this.pos = Math.max(0, Math.min(this.items.length - 1, Number(p.pos) || 0))
    this.item = this.items[this.pos] || null
    this.state = loadState()
    this.leaving = false
  },

  build() {
    const { width: W } = getDeviceInfo()
    this.W = W
    statusBar(true)
    keepScreen(SCREEN_ON_MS)
    const textW = W - PAD * 2
    let y = STATUS_BAR_H + 2

    if (!this.item) {
      hmUI.createWidget(hmUI.widget.TEXT, {
        x: 30,
        y: y + 40,
        w: W - 60,
        h: 80,
        text: 'Фразу не знайдено',
        text_size: 26,
        color: COLOR.TEXT_DIM,
        align_h: hmUI.align.CENTER_H,
        align_v: hmUI.align.CENTER_V,
        text_style: hmUI.text_style.WRAP
      })
      this.button(60, y + 140, W - 120, 'Назад', COLOR.NEUTRAL, COLOR.NEUTRAL_PRESS, () => back())
      return
    }

    const it = this.item
    addRecent(this.state, it)
    hmUI.createWidget(hmUI.widget.TEXT, {
      x: PAD,
      y,
      w: textW,
      h: 30,
      text: it.cat + ' · ' + (this.pos + 1) + ' з ' + this.items.length + ' · ' + (LANG_SHORT[it.lang] || ''),
      text_size: 20,
      color: COLOR.TEXT_DIM,
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V,
      text_style: hmUI.text_style.ELLIPSIS
    })
    y += 38

    const blocks = (
      it.dir === 'fo'
        ? [
            [it.fo, FO_SIZE, COLOR.TEXT],
            [it.pr, PR_SIZE, COLOR.PRON],
            [it.ua, UA_SIZE, COLOR.TEXT_SOFT]
          ]
        : [
            [it.ua, UA_SIZE, COLOR.TEXT_SOFT],
            [it.fo, FO_SIZE, COLOR.TEXT],
            [it.pr, PR_SIZE, COLOR.PRON]
          ]
    ).filter((b) => b[0])
    blocks.forEach(([text, size, color], i) => {
      const h = cachedHeight(text, size, textW) + 4
      hmUI.createWidget(hmUI.widget.TEXT, {
        x: PAD,
        y,
        w: textW,
        h,
        text,
        text_size: size,
        color,
        align_h: hmUI.align.LEFT,
        align_v: hmUI.align.TOP,
        text_style: hmUI.text_style.WRAP
      })
      y += h + (i === blocks.length - 1 ? 18 : 10)
    })

    // ‹ Великим ›
    const side = 72
    const gap = 8
    const mid = W - 32 - side * 2 - gap * 2
    const hasPrev = this.pos > 0
    const hasNext = this.pos < this.items.length - 1
    this.button(16, y, side, '<', hasPrev ? COLOR.NEUTRAL : COLOR.DISABLED, COLOR.NEUTRAL_PRESS, () => this.step(-1), hasPrev ? COLOR.TEXT : COLOR.TEXT_DIM)
    this.button(16 + side + gap, y, mid, 'Великим', COLOR.ACCENT, COLOR.ACCENT_PRESS, () => this.big())
    this.button(16 + side + gap + mid + gap, y, side, '>', hasNext ? COLOR.NEUTRAL : COLOR.DISABLED, COLOR.NEUTRAL_PRESS, () => this.step(1), hasNext ? COLOR.TEXT : COLOR.TEXT_DIM)
    y += 60 + 10

    this.favY = y
    this.favBtn = this.button(16, y, W - 32, '', COLOR.NEUTRAL, COLOR.NEUTRAL_PRESS, () => this.toggle())
    this.paintFav()
    y += 60
    hmUI.createWidget(hmUI.widget.FILL_RECT, { x: 0, y: y + 60, w: W, h: 2, radius: 0, color: COLOR.BG })
  },

  button(x, y, w, text, color, press, onClick, textColor) {
    return hmUI.createWidget(hmUI.widget.BUTTON, {
      x,
      y,
      w,
      h: 60,
      radius: 30,
      normal_color: color,
      press_color: press,
      text,
      text_size: text.length > 2 ? 24 : 32,
      color: textColor || COLOR.TEXT,
      click_func: onClick
    })
  },

  paintFav() {
    const fav = isFav(this.state, this.item)
    setProps(this.favBtn, {
      x: 16,
      y: this.favY,
      w: this.W - 32,
      h: 60,
      text: fav ? 'Прибрати з обраного' : 'В обране',
      color: fav ? COLOR.FAV : COLOR.TEXT
    })
  },

  toggle() {
    toggleFav(this.state, this.item)
    this.paintFav()
  },

  step(d) {
    const pos = this.pos + d
    if (pos < 0 || pos >= this.items.length || this.leaving) return
    this.leaving = true
    replace({ url: 'page/phrase', params: JSON.stringify({ pos }) })
  },

  big() {
    if (this.leaving) return
    this.leaving = true
    setTimeout(() => {
      this.leaving = false
    }, 1000)
    push({ url: 'page/big', params: JSON.stringify({ pos: this.pos }) })
  }
})
