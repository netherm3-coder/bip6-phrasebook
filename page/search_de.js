// Пошук німецькою. Окрема сторінка на мову: вантажить лише німецькі фрази й готовий індекс.

import { ITEMS } from '../data/de'
import { IDX } from '../data/de_idx'
import { searchPage } from '../lib/searchpage'

Page(searchPage('de', ITEMS, IDX))
