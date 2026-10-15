// Переклад довільного тексту через телефон (Zepp + інтернет).
// Кирилицею — переклад вибраною мовою (Deutsch / English), латиницею — українською.
// «Голос» — системний голосовий ввід, якщо годинник його дає. Галочка — перекласти; при порожньому полі — назад.
// Без зв'язку з телефоном замість «Голос» з'являється «У фразах» — пошук у розмовнику.

import * as hmUI from '@zos/ui'
import { back, push, replace } from '@zos/router'
import { getDeviceInfo } from '@zos/device'
import { onGesture, offGesture, GESTURE_LEFT, GESTURE_RIGHT } from '@zos/interaction'
import { BasePage } from '@zeppos/zml/base-page'
import { loadState, saveState } from '../utils/store'
import { getTrQuery, setTrQuery, setTranslation, setQuery, shared } from '../utils/nav'
import { direction, LANG_IN, LANG_LABEL, errorMessage, isOffline, bleCode } from '../utils/translate'
import { COLOR, SCREEN_ON_MS } from '../utils/constants'
import { statusBar, keepScreen, setProps, fitTail } from '../utils/ui'
import { TextEditor } from '../keyboard/editor'
import { mountKeyboard } from '../keyboard/keyboard'

const KB_TOP = 154
const TEXT_SIZE = 26
const TEXT_X = 20
const TEXT_Y = 34
const INFO_Y = 98
const BTN_W = 104
const BTN_H = 46
const MAX_LEN = 200
const REQUEST_MS = 25000

Page(
  BasePage({
    onInit() {
      this.state = loadState()
      this.leaving = false
      this.busy = false
      this.alive = true
      this.gestureHooked = false
      this.keyboard = null
      // кнопка праворуч: 'voice' | 'offline' | ''; якщо голосу на годиннику немає — до кінця запуску без неї
      this.side = shared().noVoice ? '' : 'voice'
    },

    build() {
      const { width: W, height: H } = getDeviceInfo()
      this.W = W
      statusBar(false)
      keepScreen(SCREEN_ON_MS)
      try {
        // Свайпи вбік на клавіатурі не мають закривати сторінку.
        onGesture({ callback: (e) => e === GESTURE_RIGHT || e === GESTURE_LEFT })
        this.gestureHooked = true
      } catch (e) {}

      this.titleWidget = hmUI.createWidget(hmUI.widget.TEXT, {
        x: 60,
        y: 4,
        w: W - 120,
        h: 28,
        text: '',
        text_size: 20,
        color: COLOR.TEXT_DIM,
        align_h: hmUI.align.CENTER_H,
        align_v: hmUI.align.CENTER_V,
        text_style: hmUI.text_style.ELLIPSIS
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
      this.infoW = W - TEXT_X * 2 - BTN_W - 8
      this.infoWidget = hmUI.createWidget(hmUI.widget.TEXT, {
        x: TEXT_X,
        y: INFO_Y,
        w: this.infoW,
        h: KB_TOP - INFO_Y - 4,
        text: '',
        text_size: 20,
        color: COLOR.TEXT_DIM,
        align_h: hmUI.align.LEFT,
        align_v: hmUI.align.TOP,
        text_style: hmUI.text_style.WRAP
      })
      this.editor = new TextEditor({ text: getTrQuery(), maxLen: MAX_LEN, multiline: false })
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
      // Кнопка — після клавіатури: її прозорий шар на весь екран інакше перехопить дотики.
      this.sideRect = { x: W - TEXT_X - BTN_W, y: INFO_Y + 2, w: BTN_W, h: BTN_H }
      this.sideBtn = hmUI.createWidget(hmUI.widget.BUTTON, {
        x: this.sideRect.x,
        y: this.sideRect.y,
        w: BTN_W,
        h: BTN_H,
        radius: BTN_H / 2,
        normal_color: COLOR.NEUTRAL,
        press_color: COLOR.NEUTRAL_PRESS,
        text: 'Голос',
        text_size: 22,
        color: COLOR.TEXT,
        click_func: () => this.sideTap()
      })
      if (!this.side) this.setSide('')

      this.update()
    },

    dir() {
      return direction(this.editor.text, this.state.target)
    },

    update(info, color) {
      if (!this.alive) return
      const q = this.editor.text
      setTrQuery(q)
      setProps(this.textWidget, {
        x: TEXT_X,
        y: TEXT_Y,
        w: this.textW,
        h: INFO_Y - TEXT_Y - 2,
        text: fitTail(q + '|', TEXT_SIZE, this.textW, 2)
      })
      const d = this.dir()
      const target = this.state.target
      const title = !q.trim() ? 'Переклад: укр. — ' + LANG_LABEL[target] : 'Переклад ' + LANG_IN[d.to]
      setProps(this.titleWidget, { x: 60, y: 4, w: this.W - 120, h: 28, text: title })
      let text = info
      if (text === undefined) {
        text = q.trim()
          ? 'Галочка — перекласти'
          : 'Українською — переклад ' + LANG_IN[target] + '. Латиницею — українською.'
      }
      const w = this.side ? this.infoW : this.textW
      setProps(this.infoWidget, { x: TEXT_X, y: INFO_Y, w, h: KB_TOP - INFO_Y - 4, text, color: color || COLOR.TEXT_DIM })
    },

    setSide(kind) {
      this.side = kind
      const text = kind === 'offline' ? 'У фразах' : kind === 'voice' ? 'Голос' : ''
      setProps(this.sideBtn, Object.assign({}, this.sideRect, { text }))
      try {
        this.sideBtn.setProperty(hmUI.prop.VISIBLE, !!kind)
      } catch (e) {}
    },

    sideTap() {
      if (this.side === 'offline') this.offline()
      else if (this.side === 'voice') this.voice()
    },

    // Системний голосовий ввід (Zepp OS 4). Якщо годинник його не дає — кнопка зникає.
    voice() {
      if (this.busy || this.leaving) return
      const create = hmUI.createKeyboard
      const types = hmUI.inputType
      if (typeof create !== 'function' || !types || types.VOICE === undefined) {
        this.noVoice()
        return
      }
      const close = () => {
        try {
          if (typeof hmUI.deleteKeyboard === 'function') hmUI.deleteKeyboard()
        } catch (e) {}
      }
      try {
        create({
          inputType: types.VOICE,
          text: '',
          onComplete: (_, result) => {
            close()
            const t = String((result && result.data) || '')
              .replace(/\s+/g, ' ')
              .trim()
            if (!t || !this.alive) return
            this.editor.text = t.slice(0, MAX_LEN)
            this.editor.autoShift()
            this.update()
            this.done()
          },
          onCancel: () => close()
        })
      } catch (e) {
        this.noVoice()
      }
    },

    noVoice() {
      shared().noVoice = true
      this.setSide('')
      this.update('Голосовий ввід на цьому годиннику недоступний — набери текст.', COLOR.PRON)
    },

    done() {
      if (this.leaving || this.busy) return
      const q = this.editor.text.replace(/\s+/g, ' ').trim()
      if (!q) {
        this.leaving = true
        back()
        return
      }
      const d = this.dir()
      this.busy = true
      this.update('Перекладаю…', COLOR.DE)
      this.request({ method: 'translate', params: { text: q, from: d.from, to: d.to, guess: d.guess } }, { timeout: REQUEST_MS })
        .then((res) => {
          this.busy = false
          if (!this.alive) return
          if (!res || res.error || typeof res.text !== 'string') {
            this.fail((res && res.error) || 'bad_data')
            return
          }
          const from = res.from || (d.from === 'auto' ? d.guess : d.from)
          setTranslation({ src: res.src || q, text: res.text, from, to: res.to || d.to, pr: res.pr || '', engine: res.engine || '' })
          this.leaving = true
          push({ url: 'page/result', params: JSON.stringify({}) })
          setTimeout(() => {
            this.leaving = false
          }, 1500)
        })
        .catch((e) => {
          this.busy = false
          if (this.alive) this.fail(bleCode(e))
        })
    },

    fail(code) {
      this.setSide(isOffline(code) ? 'offline' : this.side === '' ? '' : 'voice')
      this.update(errorMessage(code), COLOR.PRON)
    },

    // Пошук того самого тексту у фразах розмовника (працює без телефона).
    offline() {
      if (this.leaving) return
      this.leaving = true
      setQuery(this.editor.text.replace(/\s+/g, ' ').trim())
      replace({ url: 'page/search_' + this.state.target, params: JSON.stringify({}) })
    },

    onDestroy() {
      this.alive = false
      if (this.gestureHooked) {
        try {
          offGesture()
        } catch (e) {}
      }
      if (this.keyboard) this.keyboard.destroy()
    }
  })
)
