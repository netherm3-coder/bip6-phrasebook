// Головна: переклад, пошук фраз, обране, мова (Deutsch / English), нещодавні, категорії.
// Кожен рядок — одна кнопка: мало віджетів, тож головна відкривається й гортається швидко.

import * as hmUI from '@zos/ui'
import { push, replace } from '@zos/router'
import { getDeviceInfo } from '@zos/device'
import { LANGS, LANG_NAMES, GROUPS, CATS, TOTAL } from '../data/meta'
import { loadState, setTarget, fixLangs } from '../utils/store'
import { once, setTrQuery } from '../utils/nav'
import { COLOR, STATUS_BAR_H } from '../utils/constants'
import { statusBar, phrases } from '../utils/ui'

const ROW_H = 60
const ROW_GAP = 8

Page({
  onInit() {
    this.leaving = false
    this.state = loadState()
    // Обране зі старої версії спершу доповнюється (сторінками категорій тих мов, один раз).
    const langs = fixLangs(this.state)
    this.fixing = langs.length && once('fix') ? langs : null
  },

  build() {
    const { width: W } = getDeviceInfo()
    this.W = W
    statusBar(true)
    if (this.fixing) {
      const langs = this.fixing
      this.leaving = true
      setTimeout(() => replace({ url: 'page/cat_' + langs[0], params: JSON.stringify({ fix: langs.join(',') }) }), 0)
      return
    }
    const st = this.state
    let y = STATUS_BAR_H + 6

    // Переклад будь-якого тексту — через телефон; пошук і обране — без нього.
    this.button(16, y, W - 32, 58, 'Перекласти', COLOR.ACCENT, COLOR.ACCENT_PRESS, COLOR.TEXT, 26, () => {
      setTrQuery('')
      this.go('page/translate', {})
    })
    y += 58 + 10
    const half = Math.floor((W - 32 - 10) / 2)
    this.button(16, y, half, 54, 'Пошук фраз', COLOR.NEUTRAL, COLOR.NEUTRAL_PRESS, COLOR.TEXT, 22, () =>
      this.go('page/search_' + st.target, {})
    )
    const favN = st.fav.length
    this.button(16 + half + 10, y, half, 54, 'Обране' + (favN ? ' · ' + favN : ''), COLOR.NEUTRAL, COLOR.NEUTRAL_PRESS, favN ? COLOR.FAV : COLOR.TEXT, 22, () =>
      this.go('page/items', { fav: 1 })
    )
    y += 54 + 10

    // Мова перекладу: дві кнопки, вибрана — синя.
    hmUI.createWidget(hmUI.widget.FILL_RECT, { x: 16, y, w: W - 32, h: 56, radius: 28, color: COLOR.CARD })
    const segW = Math.floor((W - 32 - 8) / LANGS.length)
    LANGS.forEach((lang, i) => {
      const active = lang === st.target
      this.button(20 + i * segW, y + 4, segW, 48, LANG_NAMES[lang], active ? COLOR.ACCENT : COLOR.CARD, active ? COLOR.ACCENT : COLOR.CARD_PRESS, active ? COLOR.TEXT : COLOR.TEXT_DIM, 24, () =>
        this.switchTo(lang)
      )
    })
    y += 56 + 8

    hmUI.createWidget(hmUI.widget.TEXT, {
      x: 20,
      y,
      w: W - 40,
      h: 56,
      text: phrases(TOTAL[st.target]) + ' з вимовою.\nВелика літера у вимові — наголос.',
      text_size: 20,
      color: COLOR.TEXT_DIM,
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.TOP,
      text_style: hmUI.text_style.WRAP
    })
    y += 62

    if (st.recent.length) {
      this.row(y, 'Нещодавні · ' + st.recent.length, () => this.go('page/items', { recent: 1 }))
      y += ROW_H + ROW_GAP
    }

    GROUPS.forEach((title, gi) => {
      y += 8
      hmUI.createWidget(hmUI.widget.TEXT, {
        x: 26,
        y,
        w: W - 52,
        h: 34,
        text: title,
        text_size: 22,
        color: COLOR.TEXT_DIM,
        align_h: hmUI.align.LEFT,
        align_v: hmUI.align.CENTER_V,
        text_style: hmUI.text_style.NONE
      })
      y += 40
      CATS.forEach((c) => {
        if (c.group !== gi) return
        this.row(y, c.title, () => this.go('page/cat_' + st.target, { cat: c.id }))
        y += ROW_H + ROW_GAP
      })
    })
    hmUI.createWidget(hmUI.widget.FILL_RECT, { x: 0, y: y + 60, w: W, h: 2, radius: 0, color: COLOR.BG })
  },

  row(y, text, onClick) {
    this.button(16, y, this.W - 32, ROW_H, text, COLOR.CARD, COLOR.CARD_PRESS, COLOR.TEXT, 25, onClick, 18)
  },

  button(x, y, w, h, text, color, press, textColor, size, onClick, radius) {
    hmUI.createWidget(hmUI.widget.BUTTON, {
      x,
      y,
      w,
      h,
      radius: radius === undefined ? Math.floor(h / 2) : radius,
      normal_color: color,
      press_color: press,
      text,
      text_size: size,
      color: textColor,
      click_func: onClick
    })
  },

  switchTo(lang) {
    if (lang === this.state.target || this.leaving) return
    this.leaving = true
    setTarget(this.state, lang)
    replace({ url: 'page/index', params: JSON.stringify({}) })
  },

  go(url, params) {
    if (this.leaving) return
    this.leaving = true
    setTimeout(() => {
      this.leaving = false
    }, 1000)
    push({ url, params: JSON.stringify(params) })
  }
})
