// Пошук англійською. Окрема сторінка на мову: вантажить лише англійські фрази й готовий індекс.

import { ITEMS } from '../data/en'
import { IDX } from '../data/en_idx'
import { searchPage } from '../lib/searchpage'

Page(searchPage('en', ITEMS, IDX))
