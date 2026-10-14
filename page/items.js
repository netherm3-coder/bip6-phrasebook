// Обране, нещодавні (обидві мови) і результати пошуку. Фрази беруться з файлу налаштувань
// і з пам'яті сторінок — усі фрази мови сюди не вантажаться.
// Параметри: { fav: 1 } | { recent: 1 } | { found: 1 }, а також page.

import { replace } from '@zos/router'
import { LANG_SHORT } from '../data/meta'
import { loadState } from '../utils/store'
import { getFound } from '../utils/nav'
import { listPage } from '../lib/listpage'

function searchAgain(lang) {
  return { text: 'Змінити пошук', go: () => replace({ url: 'page/search_' + lang, params: JSON.stringify({}) }) }
}

Page(
  listPage('page/items', (p) => {
    if (p.found) {
      const f = getFound()
      if (!f) return { key: 'found', title: 'Пошук', items: [], empty: 'Нічого не знайдено.', extra: searchAgain(loadState().target) }
      return {
        key: 'found:' + f.lang + ':' + f.q,
        title: '«' + f.q + '» · ' + (LANG_SHORT[f.lang] || ''),
        items: f.items,
        total: f.total,
        empty: 'Нічого не знайдено.\nСпробуй коротше слово або іншою мовою.',
        extra: searchAgain(f.lang)
      }
    }
    const st = loadState()
    if (p.recent) return { key: 'recent', title: 'Нещодавні', items: st.recent, mixed: true, empty: 'Поки порожньо.' }
    return {
      key: 'fav',
      title: 'Обране',
      items: st.fav,
      mixed: true,
      empty: 'Поки порожньо.\nВідкрий фразу й натисни «В обране».'
    }
  })
)
