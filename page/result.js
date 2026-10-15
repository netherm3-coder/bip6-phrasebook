// Результат перекладу: оригінал, переклад, вимова німецькою (автоматична, приблизна).
// «Великим» — переклад на весь екран для співрозмовника; «В обране» — фраза лишиться й без телефона.
// Переклад одразу потрапляє в «Нещодавні».

import * as hmUI from '@zos/ui'
import { push, back } from '@zos/router'
import { getDeviceInfo } from '@zos/device'
import { getTranslation, setList, setTrQuery } from '../utils/nav'
import { loadState, isFav, toggleFav, addRecent } from '../utils/store'
import { itemOf, LANG_LABEL } from '../utils/translate'
import { COLOR, STATUS_BAR_H, SCREEN_ON_MS } from '../utils/constants'
import { statusBar, keepScreen, cachedHeight, setProps } from '../utils/ui'

const PAD = 22
const SRC_SIZE = 24
const OUT_SIZE = 32
const PR_SIZE = 26
const BTN_H = 60

Page({
  onInit() {
    this.t = getTranslation()
    this.state = loadState()
    this.item = this.t ? itemOf(this.t, this.state.target) : null
    this.leaving = false
  },

  build() {
    const { width: W } = getDeviceInfo()
    this.W = W
    statusBar(true)
    keepScreen(SCREEN_ON_MS)
    const textW = W - PAD * 2
    let y = STATUS_BAR_H + 2
    const t = this.t
    if (!t) {
      this.text('Перекладу немає', 26, COLOR.TEXT_DIM, y + 40, textW)
      this.button(60, y + 140, W - 120, 'Назад', COLOR.NEUTRAL, COLOR.NEUTRAL_PRESS, () => back())
      return
    }
    addRecent(this.state, this.item)
    // Для «Великим»: та сама сторінка, що й у розмовнику, бере фразу зі списку.
    setList('Переклад', [this.item])

    const out = t.from === 'uk'
    this.text(LANG_LABEL[t.from] + ' — ' + LANG_LABEL[t.to] + (t.pr ? ' · вимова приблизна' : ''), 20, COLOR.TEXT_DIM, y, textW, true)
    y += 34
    const blocks = out
      ? [
          [t.src, SRC_SIZE, COLOR.TEXT_SOFT],
          [t.text, OUT_SIZE, COLOR.TEXT],
          [t.pr, PR_SIZE, COLOR.PRON]
        ]
      : [
          [t.src, SRC_SIZE, COLOR.TEXT_SOFT],
          [t.pr, PR_SIZE - 2, COLOR.PRON],
          [t.text, OUT_SIZE, COLOR.TEXT]
        ]
    blocks
      .filter((b) => b[0])
      .forEach(([text, size, color], i, arr) => {
        y = this.text(text, size, color, y, textW) + (i === arr.length - 1 ? 18 : 10)
      })

    // [Великим] [В обране] — для перекладу іноземною; з іноземної — лише [В обране]
    const half = Math.floor((W - 32 - 10) / 2)
    if (out) this.button(16, y, half, 'Великим', COLOR.ACCENT, COLOR.ACCENT_PRESS, () => this.big())
    this.favRect = { x: out ? 16 + half + 10 : 16, y, w: out ? half : W - 32, h: BTN_H }
    this.favBtn = this.button(this.favRect.x, y, this.favRect.w, '', COLOR.NEUTRAL, COLOR.NEUTRAL_PRESS, () => this.toggle())
    this.paintFav()
    y += BTN_H + 10
    this.button(16, y, W - 32, 'Новий переклад', COLOR.NEUTRAL, COLOR.NEUTRAL_PRESS, () => this.again())
    y += BTN_H
    hmUI.createWidget(hmUI.widget.FILL_RECT, { x: 0, y: y + 60, w: W, h: 2, radius: 0, color: COLOR.BG })
  },

  // Текстовий блок; повертає його низ.
  text(text, size, color, y, w, center) {
    const h = cachedHeight(text, size, w) + 4
    hmUI.createWidget(hmUI.widget.TEXT, {
      x: PAD,
      y,
      w,
      h,
      text,
      text_size: size,
      color,
      align_h: center ? hmUI.align.CENTER_H : hmUI.align.LEFT,
      align_v: hmUI.align.TOP,
      text_style: hmUI.text_style.WRAP
    })
    return y + h
  },

  button(x, y, w, text, color, press, onClick) {
    return hmUI.createWidget(hmUI.widget.BUTTON, {
      x,
      y,
      w,
      h: BTN_H,
      radius: BTN_H / 2,
      normal_color: color,
      press_color: press,
      text,
      text_size: 24,
      color: COLOR.TEXT,
      click_func: onClick
    })
  },

  paintFav() {
    const fav = isFav(this.state, this.item)
    const wide = this.favRect.w > 200
    setProps(
      this.favBtn,
      Object.assign({}, this.favRect, {
        text: fav ? (wide ? 'Прибрати з обраного' : 'В обраному') : 'В обране',
        color: fav ? COLOR.FAV : COLOR.TEXT
      })
    )
  },

  toggle() {
    toggleFav(this.state, this.item)
    this.paintFav()
  },

  big() {
    if (this.leaving) return
    this.leaving = true
    setTimeout(() => {
      this.leaving = false
    }, 1000)
    push({ url: 'page/big', params: JSON.stringify({ pos: 0 }) })
  },

  again() {
    if (this.leaving) return
    this.leaving = true
    setTrQuery('')
    back()
  }
})
