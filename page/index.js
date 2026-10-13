// Головна: пошук, обране, категорії.

import * as hmUI from '@zos/ui'
import { push } from '@zos/router'
import { getDeviceInfo } from '@zos/device'
import { GROUPS, META, TOTAL } from '../data/meta'
import { loadState } from '../utils/store'
import { COLOR, STATUS_BAR_H } from '../utils/constants'
import { statusBar, tappable, phrases } from '../utils/ui'

const ROW_H = 62
const ROW_GAP = 8

Page({
  onInit() {
    this.alive = true
    this.leaving = false
    this.favCount = loadState().fav.length
  },

  build() {
    const { width: W } = getDeviceInfo()
    statusBar(true)
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
    hmUI.createWidget(hmUI.widget.BUTTON, {
      x: 16 + half + 10,
      y,
      w: half,
      h: 58,
      radius: 29,
      normal_color: COLOR.NEUTRAL,
      press_color: COLOR.NEUTRAL_PRESS,
      text: 'Обране' + (this.favCount ? ' · ' + this.favCount : ''),
      text_size: 24,
      color: this.favCount ? COLOR.FAV : COLOR.TEXT,
      click_func: () => this.go('page/list', { fav: 1 })
    })
    y += 58 + 10

    hmUI.createWidget(hmUI.widget.TEXT, {
      x: 20,
      y,
      w: W - 40,
      h: 56,
      text: phrases(TOTAL) + ' з вимовою.\nВелика літера у вимові — наголос.',
      text_size: 20,
      color: COLOR.TEXT_DIM,
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.TOP,
      text_style: hmUI.text_style.WRAP
    })
    y += 60

    GROUPS.forEach((title, gi) => {
      y += 10
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
        this.row(m, y, W)
        y += ROW_H + ROW_GAP
      })
    })
    hmUI.createWidget(hmUI.widget.FILL_RECT, { x: 0, y: y + 60, w: W, h: 2, radius: 0, color: COLOR.BG })
  },

  row(m, y, W) {
    const rect = { x: 16, y, w: W - 32, h: ROW_H, radius: 18 }
    const bg = hmUI.createWidget(hmUI.widget.FILL_RECT, Object.assign({ color: COLOR.CARD }, rect))
    const title = hmUI.createWidget(hmUI.widget.TEXT, {
      x: 34,
      y,
      w: W - 68 - 56,
      h: ROW_H,
      text: m.title,
      text_size: 25,
      color: COLOR.TEXT,
      align_h: hmUI.align.LEFT,
      align_v: hmUI.align.CENTER_V,
      text_style: hmUI.text_style.ELLIPSIS
    })
    const count = hmUI.createWidget(hmUI.widget.TEXT, {
      x: W - 34 - 56,
      y,
      w: 56,
      h: ROW_H,
      text: String(m.count),
      text_size: 22,
      color: COLOR.TEXT_DIM,
      align_h: hmUI.align.RIGHT,
      align_v: hmUI.align.CENTER_V,
      text_style: hmUI.text_style.NONE
    })
    tappable([bg, title, count], bg, rect, COLOR.CARD, COLOR.CARD_PRESS, () => this.go('page/list', { cat: m.id }), () => this.alive)
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
