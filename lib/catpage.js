// Категорія фраз однієї мови. ITEMS — фрази лише цієї мови (data/<мова>.js):
// кожна мова має свою сторінку, щоб не вантажити зайвого.
//
// Ця ж сторінка один раз після оновлення з версії 1.1 і старіших доповнює обране й нещодавні
// (там вони зберігалися лише як «мова:текст»): параметр { fix: 'de,en' } — мови, які ще треба
// доповнити; далі — наступна мова або головна.

import * as hmUI from '@zos/ui'
import { replace } from '@zos/router'
import { getDeviceInfo } from '@zos/device'
import { CATS } from '../data/meta'
import { loadState, fixEntries } from '../utils/store'
import { COLOR } from '../utils/constants'
import { parseParams } from '../utils/ui'
import { listPage } from './listpage'

export function categoryPage(lang, ITEMS) {
  function find(fo) {
    for (let ci = 0; ci < ITEMS.length; ci++) {
      const l = ITEMS[ci]
      for (let ii = 0; ii < l.length; ii++) {
        if (l[ii][1] === fo) return { lang, fo, ua: l[ii][0], pr: l[ii][2], dir: CATS[ci].dir, cat: CATS[ci].title }
      }
    }
    return null
  }

  const page = listPage('page/cat_' + lang, (p) => {
    let ci = -1
    for (let i = 0; i < CATS.length; i++) if (CATS[i].id === p.cat) ci = i
    if (ci < 0 || !ITEMS[ci]) {
      return { key: 'cat:' + lang, title: 'Не знайдено', items: [], empty: 'Категорію не знайдено.' }
    }
    const c = CATS[ci]
    return {
      key: 'cat:' + lang + ':' + c.id,
      title: c.title,
      items: ITEMS[ci].map((it) => ({ ua: it[0], fo: it[1], pr: it[2], dir: c.dir, cat: c.title, lang }))
    }
  })

  const onInit = page.onInit
  const build = page.build
  page.onInit = function (params) {
    const p = parseParams(params)
    this.fixNext = null
    if (p.fix) {
      this.fixNext = String(p.fix)
        .split(',')
        .filter((l) => l && l !== lang)
      fixEntries(loadState(), lang, find)
      return
    }
    onInit.call(this, params)
  }
  page.build = function () {
    if (!this.fixNext) return build.call(this)
    const { width: W, height: H } = getDeviceInfo()
    hmUI.createWidget(hmUI.widget.TEXT, {
      x: 30,
      y: 0,
      w: W - 60,
      h: H,
      text: 'Оновлення обраного…',
      text_size: 26,
      color: COLOR.TEXT_DIM,
      align_h: hmUI.align.CENTER_H,
      align_v: hmUI.align.CENTER_V,
      text_style: hmUI.text_style.WRAP
    })
    const next = this.fixNext
    setTimeout(() => {
      if (next.length) replace({ url: 'page/cat_' + next[0], params: JSON.stringify({ fix: next.join(',') }) })
      else replace({ url: 'page/index', params: JSON.stringify({}) })
    }, 0)
  }
  return page
}
