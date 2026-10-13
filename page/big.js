// Іноземна фраза на весь екран — показати співрозмовнику. Торкнись — назад.

import * as hmUI from '@zos/ui'
import { back } from '@zos/router'
import { getDeviceInfo } from '@zos/device'
import { getList } from '../utils/nav'
import { COLOR, SCREEN_ON_MS } from '../utils/constants'
import { statusBar, keepScreen, parseParams, fitWrapped } from '../utils/ui'

const SIZES = [60, 54, 48, 42, 36, 32, 28]

Page({
  onInit(params) {
    const p = parseParams(params)
    const items = getList().items
    const item = items[Number(p.pos) || 0]
    this.text = item ? item.fo : ''
    this.closing = false
  },

  build() {
    const { width: W, height: H } = getDeviceInfo()
    statusBar(false)
    keepScreen(SCREEN_ON_MS)
    const box = { x: 24, y: 24, w: W - 48, h: H - 48 }
    hmUI.createWidget(hmUI.widget.TEXT, {
      x: box.x,
      y: box.y,
      w: box.w,
      h: box.h,
      text: this.text,
      text_size: fitWrapped(this.text, SIZES, box.w, box.h),
      color: COLOR.TEXT,
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V,
      text_style: hmUI.text_style.WRAP
    })
    // прозорий шар на весь екран: торкання закриває
    const layer = hmUI.createWidget(hmUI.widget.TEXT, { x: 0, y: 0, w: W, h: H, text: ' ', text_size: 10, color: COLOR.BG })
    try {
      layer.addEventListener(hmUI.event.CLICK_DOWN, () => {
        this.downAt = Date.now()
      })
      layer.addEventListener(hmUI.event.CLICK_UP, () => {
        if (this.downAt) this.close()
      })
    } catch (e) {}
  },

  close() {
    if (this.closing) return
    this.closing = true
    back()
  }
})
