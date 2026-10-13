// Пошук фраз вибраної мови з клавіатури УКР/ENG. Під полем — скільки знайдено й перша фраза.
// ✓ — показати всі знайдені; ✓ при порожньому полі — назад.

import * as hmUI from '@zos/ui'
import { back, replace } from '@zos/router'
import { getDeviceInfo } from '@zos/device'
import { onGesture, offGesture, GESTURE_LEFT, GESTURE_RIGHT } from '@zos/interaction'
import { ITEMS } from '../data/phrases'
import { buildIndex, search, norm } from '../utils/search'
import { loadState, saveState } from '../utils/store'
import { getQuery } from '../utils/nav'
import { COLOR, SCREEN_ON_MS } from '../utils/constants'
import { statusBar, keepScreen, setProps, fitTail, phrases } from '../utils/ui'
import { TextEditor } from '../keyboard/editor'
import { mountKeyboard } from '../keyboard/keyboard'

const KB_TOP = 154
const TEXT_SIZE = 26
const TEXT_X = 20
const TEXT_Y = 34
const INFO_Y = 98

Page({
  onInit() {
    this.state = loadState()
    this.lists = ITEMS[this.state.target] || ITEMS.de
    this.index = buildIndex(this.lists)
    this.leaving = false
    this.gestureHooked = false
    this.keyboard = null
  },

  build() {
    const { width: W, height: H } = getDeviceInfo()
    this.W = W
    statusBar(false)
    keepScreen(SCREEN_ON_MS)
    try {
      // Свайпи вбік на клавіатурі не мають закривати пошук.
      onGesture({ callback: (e) => e === GESTURE_RIGHT || e === GESTURE_LEFT })
      this.gestureHooked = true
    } catch (e) {}

    hmUI.createWidget(hmUI.widget.TEXT, {
      x: 60,
      y: 4,
      w: W - 120,
      h: 28,
      text: 'Пошук: укр. або ' + (this.state.target === 'en' ? 'англ.' : 'нім.'),
      text_size: 20,
      color: COLOR.TEXT_DIM,
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V,
      text_style: hmUI.text_style.NONE
    })
    this.textW = W - TEXT_X * 2
    this.textWidget = hmUI.createWidget(hmUI.widget.TEXT, {
      x: TEXT_X,
      y: TEXT_Y,
      w: this.textW,
      h: INFO_Y - TEXT_Y - 2,
      text: '',
      text_size: TEXT_SIZE,
      color: COLOR.TEXT,
      align_h: hmUI.align.LEFT,
      align_v: hmUI.align.TOP,
      text_style: hmUI.text_style.WRAP
    })
    this.infoWidget = hmUI.createWidget(hmUI.widget.TEXT, {
      x: TEXT_X,
      y: INFO_Y,
      w: this.textW,
      h: KB_TOP - INFO_Y - 6,
      text: '',
      text_size: 20,
      color: COLOR.TEXT_DIM,
      align_h: hmUI.align.LEFT,
      align_v: hmUI.align.TOP,
      text_style: hmUI.text_style.WRAP
    })

    this.editor = new TextEditor({ text: getQuery(), maxLen: 40, multiline: false })
    // Без автоматичної великої літери: регістр у пошуку не важливий.
    this.editor.autoShift = function () {
      if (this.shift !== 'lock') this.shift = 'off'
    }
    this.editor.autoShift()
    this.keyboard = mountKeyboard({
      top: KB_TOP,
      width: W,
      height: H,
      editor: this.editor,
      lang: this.state.kb,
      doneIcon: 'kb/done.png',
      onText: () => this.update(),
      onDone: () => this.done(),
      onLang: (lang) => {
        this.state.kb = lang
        saveState(this.state)
      }
    })
    this.update()
  },

  update() {
    const q = this.editor.text
    setProps(this.textWidget, {
      x: TEXT_X,
      y: TEXT_Y,
      w: this.textW,
      h: INFO_Y - TEXT_Y - 2,
      text: fitTail(q + '|', TEXT_SIZE, this.textW, 2)
    })
    let info =
      this.state.target === 'en'
        ? 'Набери слово українською або англійською.'
        : 'Набери слово українською або німецькою (умлаути можна не набирати).'
    let color = COLOR.TEXT_DIM
    if (norm(q)) {
      const r = search(this.index, q, 1)
      if (!r.total) info = 'Нічого не знайдено'
      else {
        const [ci, ii] = r.hits[0]
        const it = this.lists[ci][ii]
        info = phrases(r.total) + ' · ' + it[0] + ' — ' + it[1]
        color = COLOR.DE
      }
    }
    setProps(this.infoWidget, { x: TEXT_X, y: INFO_Y, w: this.textW, h: KB_TOP - INFO_Y - 6, text: info, color })
  },

  done() {
    if (this.leaving) return
    const q = this.editor.text.replace(/\s+/g, ' ').trim()
    this.leaving = true
    if (!norm(q)) back()
    else replace({ url: 'page/list', params: JSON.stringify({ q }) })
  },

  onDestroy() {
    if (this.gestureHooked) {
      try {
        offGesture()
      } catch (e) {}
    }
    if (this.keyboard) this.keyboard.destroy()
  }
})
