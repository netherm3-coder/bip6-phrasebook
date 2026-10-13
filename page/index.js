// Головна: пошук, обране, мова перекладу (Deutsch / English), нещодавні, категорії.

import * as hmUI from '@zos/ui'
import { push, replace } from '@zos/router'
import { getDeviceInfo } from '@zos/device'
import { LANGS, LANG_NAMES, GROUPS, META, TOTAL } from '../data/meta'
import { loadState, setTarget } from '../utils/store'
import { COLOR, STATUS_BAR_H } from '../utils/constants'
import { statusBar, tappable, phrases } from '../utils/ui'

const ROW_H = 62
const ROW_GAP = 8

Page({
  onInit() {
    this.alive = true
    this.leaving = false
    this.state = loadState()
  },

  build() {
    const { width: W } = getDeviceInfo()
    this.W = W
    statusBar(true)
    const st = this.state
    let y = STATUS_BAR_H + 6

    const half = Math.floor((W - 32 - 10) / 2)
    hmUI.createWidget(hmUI.widget.BUTTON, {
      x: 16,
      y,
      w: half,
      h: 58,
      radius: 29,
      normal_color: COLOR.ACCENT,
      press_color: COLOR.ACCENT_PRESS,
      text: 'Пошук',
      text_size: 26,
      color: COLOR.TEXT,
      click_func: () => this.go('page/search', {})
    })
    const favN = st.fav.length
    hmUI.createWidget(hmUI.widget.BUTTON, {
      x: 16 + half + 10,
      y,
      w: half,
      h: 58,
      radius: 29,
      normal_color: COLOR.NEUTRAL,
      press_color: COLOR.NEUTRAL_PRESS,
      text: 'Обране' + (favN ? ' · ' + favN : ''),
      text_size: 24,
      color: favN ? COLOR.FAV : COLOR.TEXT,
      click_func: () => this.go('page/list', { fav: 1 })
    })
    y += 58 + 10

    // Мова перекладу: дві кнопки, вибрана — синя.
    hmUI.createWidget(hmUI.widget.FILL_RECT, { x: 16, y, w: W - 32, h: 56, radius: 28, color: COLOR.CARD })
    const segW = Math.floor((W - 32 - 8) / LANGS.length)
    LANGS.forEach((lang, i) => {
      const active = lang === st.target
      hmUI.createWidget(hmUI.widget.BUTTON, {
        x: 20 + i * segW,
        y: y + 4,
        w: segW,
        h: 48,
        radius: 24,
        normal_color: active ? COLOR.ACCENT : COLOR.CARD,
        press_color: active ? COLOR.ACCENT : COLOR.CARD_PRESS,
        text: LANG_NAMES[lang],
        text_size: 24,
        color: active ? COLOR.TEXT : COLOR.TEXT_DIM,
        click_func: () => this.switchTo(lang)
      })
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
      this.row('Нещодавні', st.recent.length, y, W, () => this.go('page/list', { recent: 1 }))
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
      META.filter((m) => m.group === gi).forEach((m) => {
        this.row(m.title, m.count[st.target], y, W, () => this.go('page/list', { cat: m.id }))
        y += ROW_H + ROW_GAP
      })
    })
    hmUI.createWidget(hmUI.widget.FILL_RECT, { x: 0, y: y + 60, w: W, h: 2, radius: 0, color: COLOR.BG })
  },

  row(title, count, y, W, onTap) {
    const rect = { x: 16, y, w: W - 32, h: ROW_H, radius: 18 }
    const bg = hmUI.createWidget(hmUI.widget.FILL_RECT, Object.assign({ color: COLOR.CARD }, rect))
    const t = hmUI.createWidget(hmUI.widget.TEXT, {
      x: 34,
      y,
      w: W - 68 - 56,
      h: ROW_H,
      text: title,
      text_size: 25,
      color: COLOR.TEXT,
      align_h: hmUI.align.LEFT,
      align_v: hmUI.align.CENTER_V,
      text_style: hmUI.text_style.ELLIPSIS
    })
    const c = hmUI.createWidget(hmUI.widget.TEXT, {
      x: W - 34 - 56,
      y,
      w: 56,
      h: ROW_H,
      text: String(count),
      text_size: 22,
      color: COLOR.TEXT_DIM,
      align_h: hmUI.align.RIGHT,
      align_v: hmUI.align.CENTER_V,
      text_style: hmUI.text_style.NONE
    })
    tappable([bg, t, c], bg, rect, COLOR.CARD, COLOR.CARD_PRESS, onTap, () => this.alive)
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
  },

  onDestroy() {
    this.alive = false
  }
})
