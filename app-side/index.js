// Сервіс у застосунку Zepp на телефоні: перекладає текст із годинника через інтернет телефона.
// Для німецької додає вимову українськими літерами (за правилами читання, приблизну).

import { BaseSideService } from '@zeppos/zml/base-side'
import { createTranslator, cleanText } from './translate'
import { pronounceDe } from '../shared/pron-de'

const translator = createTranslator({ fetch: (opts) => fetch(opts) })

AppSideService(
  BaseSideService({
    onInit() {},

    onRequest(req, res) {
      const p = (req && req.params) || {}
      if (!req || req.method !== 'translate') {
        res(null, { error: 'unknown_method' })
        return
      }
      const text = cleanText(p.text)
      translator
        .translate(text, p.from, p.to, p.guess)
        .then((r) => {
          // вимова — для німецької сторони: перекладу німецькою або німецького оригіналу
          const de = r.to === 'de' ? r.text : r.from === 'de' ? text : ''
          let pr = ''
          try {
            pr = de ? pronounceDe(de) : ''
          } catch (e) {}
          res(null, { src: text, text: r.text, from: r.from, to: r.to, engine: r.engine, pr })
        })
        .catch((e) => res(null, { error: (e && e.code) || 'network' }))
    },

    onRun() {},

    onDestroy() {}
  })
)
