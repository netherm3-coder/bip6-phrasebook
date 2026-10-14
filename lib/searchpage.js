// Пошук фраз однієї мови з клавіатури УКР/ENG. Під полем — скільки знайдено й найкраща фраза.
// ✓ — показати всі знайдені; ✓ при порожньому полі — назад.
// ITEMS — фрази мови, IDX — готовий індекс (data/<мова>_idx.js): кожна мова має свою сторінку.

import * as hmUI from '@zos/ui'
import { back, replace } from '@zos/router'
import { getDeviceInfo } from '@zos/device'
import { onGesture, offGesture, GESTURE_LEFT, GESTURE_RIGHT } from '@zos/interaction'
import { CATS } from '../data/meta'
import { norm, match, rank, best } from '../utils/search'
import { loadState, saveState } from '../utils/store'
import { getQuery, setQuery, setFound } from '../utils/nav'
import { COLOR, SCREEN_ON_MS, MAX_RESULTS } from '../utils/constants'
import { statusBar, keepScreen, setProps, fitTail, phrases } from '../utils/ui'
import { TextEditor } from '../keyboard/editor'
import { mountKeyboard } from '../keyboard/keyboard'

const KB_TOP = 154
const TEXT_SIZE = 26
const TEXT_X = 20
const TEXT_Y = 34
const INFO_Y = 98

export function searchPage(lang, ITEMS, IDX) {
  // Номер фрази в індексі → категорія й місце в ній.
  const starts = []
  let count = 0
  for (let ci = 0; ci < ITEMS.length; ci++) {
    starts.push(count)
    count += ITEMS[ci].length
  }

  function itemAt(i) {
    let ci = starts.length - 1
    while (ci > 0 && starts[ci] > i) ci--
    const it = ITEMS[ci][i - starts[ci]]
    const c = CATS[ci]
    return { ua: it[0], fo: it[1], pr: it[2], dir: c.dir, cat: c.title, lang }
  }

  return {
    onInit() {
      this.state = loadState()
      this.leaving = false
      this.gestureHooked = false
      this.keyboard = null
      this.prevNorm = ''
      this.prevHits = null
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
        text: 'Пошук: укр. або ' + (lang === 'en' ? 'англ.' : 'нім.'),
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
        onLang: (kb) => {
          this.state.kb = kb
          saveState(this.state)
        }
      })
      this.update()
    },

    // Знайдене (без сортування). Якщо запит лише доповнили — шукає серед попереднього результату.
    find(n) {
      const among = this.prevHits && this.prevNorm && n.indexOf(this.prevNorm) === 0 ? this.prevHits : null
      const hits = match(IDX, n.split(' '), among)
      this.prevNorm = n
      this.prevHits = hits
      return hits
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
        lang === 'en'
          ? 'Набери слово українською або англійською.'
          : 'Набери слово українською або німецькою (умлаути можна не набирати).'
      let color = COLOR.TEXT_DIM
      const n = norm(q)
      if (n) {
        const hits = this.find(n)
        if (!hits.length) info = 'Нічого не знайдено'
        else {
          const it = itemAt(best(IDX, n.split(' '), hits))
          info = phrases(hits.length) + ' · ' + it.ua + ' — ' + it.fo
          color = COLOR.DE
        }
      } else {
        this.prevNorm = ''
        this.prevHits = null
      }
      setProps(this.infoWidget, { x: TEXT_X, y: INFO_Y, w: this.textW, h: KB_TOP - INFO_Y - 6, text: info, color })
    },

    done() {
      if (this.leaving) return
      const q = this.editor.text.replace(/\s+/g, ' ').trim()
      const n = norm(q)
      this.leaving = true
      if (!n) {
        back()
        return
      }
      const ws = n.split(' ')
      const hits = rank(IDX, ws, n === this.prevNorm && this.prevHits ? this.prevHits : match(IDX, ws))
      setQuery(q)
      setFound({ q, lang, total: hits.length, items: hits.slice(0, MAX_RESULTS).map(itemAt) })
      replace({ url: 'page/items', params: JSON.stringify({ found: 1 }) })
    },

    onDestroy() {
      if (this.gestureHooked) {
        try {
          offGesture()
        } catch (e) {}
      }
      if (this.keyboard) this.keyboard.destroy()
    }
  }
}
