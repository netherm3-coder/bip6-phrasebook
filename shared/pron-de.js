// Вимова німецького тексту українськими літерами — за правилами читання, без словника.
// Як у розмовнику: ґ — g, г — h, велика голосна — наголос (лише в словах із 2+ складів).
// Правила покривають звичайні слова; у запозиченнях і складених словах можливі помилки,
// тому вимова перекладу підписана як приблизна.

const VOWELS = 'aeiouyäöü'

// Ненаголошені префікси (наголос — на наступний склад), довші — першими.
const INSEP = ['zer', 'ver', 'ent', 'emp', 'be', 'ge', 'er']
// Слова, що лише починаються як такий префікс.
const NOT_PREFIXED = /^(geben|gibt|gibst|gegen\w*|gehen|geht|gehe|gehst|gestern|gern|gerne|gelb\w*|geld\w*|gelt\w*|geist\w*|erst|erste[nrs]?|erstens|erstmal|erde|erden|ernst\w*|erbe|erben|abend\w*|besser\w*|beste[nrs]?|bestens|bett\w*|berg\w*|beten|betet|verb|verben|ente|enten|end\w*|general\w*|genie)$/
// Частини складених слів на st / sp: у середині слова там теж шт / шп (Frühstück, Tankstelle).
const COMPOUND_ST = [
  'stück', 'stelle', 'stand', 'stände', 'straße', 'strasse', 'stadt', 'städte', 'station', 'stein', 'stunde', 'stuhl', 'sport', 'spiel',
  'spitze', 'stoff', 'sprache', 'spur', 'stock', 'streich', 'stätte', 'stange', 'stab', 'stiefel', 'steuer',
  // і на h, s — там h вимовляється, s дзвінке
  'hundert', 'haus', 'häuser', 'hof', 'höfe', 'heit', 'haft', 'heim', 'halt', 'hilfe', 'hand', 'hafen', 'haben', 'helm', 'hose', 'hund',
  'sack', 'sicht', 'seite', 'sein', 'satz'
]
// Префікси, після яких st / sp на початку кореня — шт / шп.
const PREFIXES = [
  'zurück', 'wieder', 'vorbei', 'voraus', 'heraus', 'herein', 'hinaus', 'unter', 'über', 'durch', 'nach', 'fort', 'auf', 'aus', 'ein', 'mit',
  'vor', 'weg', 'los', 'hin', 'her', 'bei', 'zer', 'ver', 'ent', 'emp', 'an', 'ab', 'um', 'zu', 'be', 'ge', 'er', 'un'
]
// Відокремлювані префікси: такі слова не наголошуються за іншомовним зразком «-ole», «-ate»…
const SEPARABLE = ['zurück', 'wieder', 'nach', 'fort', 'auf', 'aus', 'ein', 'mit', 'vor', 'weg', 'los', 'hin', 'her', 'bei', 'an', 'ab', 'um', 'zu']
// Запозичення, де v — це «в».
const V_AS_W = [
  'visum', 'video', 'visier', 'vitamin', 'version', 'virus', 'vase', 'variant', 'vektor', 'vokal', 'evaku', 'reserv', 'offensiv', 'defensiv',
  'konvoi', 'konvent', 'klavier', 'pullover', 'november', 'universit', 'privat', 'navig', 'provi', 'servic', 'kurve', 'olive', 'oval', 'lava',
  'revier', 'kavaller', 'advent', 'motiv', 'invalid', 'intervall', 'vulkan', 'vanill', 'vegan', 'veget', 'ventil', 'violett', 'virtuell', 'vision'
]
// Готова вимова для частих слів, які правила читають неправильно.
const WORDS = {
  ukraine: 'украЇне',
  ukrainer: 'украЇнер',
  ukrainerin: 'украЇнерін',
  ukrainisch: 'украЇніш',
  ukrainische: 'украЇніше',
  ukrainischen: 'украЇнішен',
  bisschen: 'бІсхен',
  handy: 'гЕнді',
  okay: 'окЕй',
  hotel: 'готЕль',
  kaffee: 'кАфе',
  restaurant: 'ресторАн',
  bataillon: 'батальйОн',
  toilette: 'тоалЕте',
  chef: 'шеф',
  major: 'майОр',
  leutnant: 'лОйтнант',
  sergeant: 'сержАнт',
  jetzt: 'єцт',
  museum: 'музЕум',
  wlan: 'вЕлан',
  orange: 'орАнже',
  garage: 'ґарАже',
  etage: 'етАже',
  journalist: 'журналІст',
  computer: 'компЮтер',
  internet: 'Інтернет',
  ticket: 'тІкет',
  baby: 'бЕйбі',
  team: 'тім',
  job: 'джоб',
  jeans: 'джінс',
  email: 'Імейл'
}
// Наголошений склад (номер голосної з 0) там, де правила не вгадують.
const STRESS = {
  zurück: 1, vielleicht: 1, natürlich: 1, warum: 1, woher: 1, wohin: 1, daher: 1, dahin: 1, willkommen: 1, allein: 1, kaputt: 1,
  zusammen: 1, sofort: 1, jedoch: 1, nachdem: 1, obwohl: 1, heraus: 1, herein: 1, hinaus: 1, vorbei: 1, voraus: 1, hinein: 1,
  lebendig: 1, kamerad: 2, kameraden: 2, uniform: 0, geradeaus: 3, wiederholen: 2, wiederholung: 2, offizier: 2, unteroffizier: 0,
  gegenüber: 2, problem: 1, probleme: 1, problemen: 1, system: 1, systeme: 1, jawohl: 1, alarm: 1, abteilung: 1, kassenbon: 0,
  persönlich: 1, persönliche: 1, persönlichen: 1, persönlicher: 1, bibliothek: 3, apotheke: 2, apotheken: 2,
  eventuell: 3, ungefähr: 2, genau: 1, august: 1, april: 1, september: 1, oktober: 1, dezember: 1, november: 1, kilometer: 2,
  minute: 1, minuten: 1, familie: 1, medizin: 2, termin: 1, disziplin: 2, magazin: 2, musik: 1, fabrik: 1, republik: 2, politik: 2,
  kritik: 1, physik: 1, logistik: 1, übersetzen: 2, übersetzung: 2, überholen: 2, übernachten: 2, übernachtung: 2, überweisen: 2,
  überweisung: 2, unterschreiben: 2, unterstützen: 2, unterstützung: 2, untersuchen: 2, untersuchung: 2, million: 1, millionen: 1,
  januar: 0, februar: 0, einmal: 0, zweimal: 0, dreimal: 0, manchmal: 0, nochmal: 0, diesmal: 0, erstmal: 0, normal: 1
}
// Закінчення, що забирають наголос: закінчення → номер наголошеної голосної від кінця слова (1 — остання).
const SUFFIX = {
  ieren: 2, iert: 1, ierte: 2, ierten: 2, ierst: 1, ierung: 2, ierungen: 3,
  ion: 1, ionen: 2, tät: 1, täten: 2, erei: 1, ei: 1, ie: 1, ier: 1, iere: 2,
  eur: 1, euse: 2, ett: 1, ee: 1, enz: 1, anz: 1, ent: 1, enten: 2, ant: 1, anten: 2,
  ist: 1, isten: 2, ismus: 2, ell: 1, al: 1, ale: 2, alen: 2, at: 1, aten: 2, ur: 1, uren: 2, on: 1, ös: 1,
  it: 1, att: 1, ept: 1, ar: 1, ut: 1, tär: 1, thek: 1
}
// Слова, до яких ці закінчення не застосовуються (перевіряється входження).
const NO_SUFFIX = [
  'abend', 'jugend', 'tugend', 'frist', 'monat', 'heimat', 'heirat', 'vorrat', 'bundesrat', 'stadtrat', 'nachbar', 'kmal', 'schicksal',
  'leutnant', 'restaurant', 'arier', 'frei', 'bar', 'armut', 'wermut', 'demut', 'anmut'
]
// Перша частина складеного слова, що несе наголос (Militärausweis → як Militär).
const COMPOUND_FIRST = [
  'militär', 'general', 'kompanie', 'offizier', 'sanität', 'brigade', 'bataillon', 'regiment', 'division', 'artillerie', 'infanterie',
  'munition', 'polizei', 'station', 'information', 'telefon', 'alarm', 'apotheke', 'batterie', 'kaserne', 'patrone', 'granate', 'pistole',
  'maschine', 'minute', 'reserve', 'personal', 'material', 'signal', 'kanal', 'soldat', 'gefreite', 'gefreiten'
]
// Іншомовні слова з 3+ складів на -one, -ine, -ate… — наголос на передостанній склад.
// Закінчення → номер наголошеної голосної від кінця (2 — передостання).
const PENULT = {
  one: 2, onen: 2, ine: 2, inen: 2, ane: 2, anen: 2, ate: 2, aten: 2, ete: 2, eten: 2, ute: 2, uten: 2, ade: 2, aden: 2, ide: 2, iden: 2,
  ode: 2, oden: 2, ose: 2, osen: 2, ole: 2, olen: 2, ette: 2, etten: 2, onne: 2, onnen: 2, erne: 2, ernen: 2, ante: 2, anten: 2, anze: 2,
  anzen: 2, esse: 2, eke: 2, eken: 2, isch: 2, ische: 3, ischen: 3, ischer: 3, isches: 3, ischem: 3
}

function isVowel(c) {
  return !!c && VOWELS.indexOf(c) >= 0
}

// Дві голосні, що читаються як один склад: ei, ai, au, eu, äu, ie, aa, ee, oo.
function oneSyllable(a, b) {
  return ('ae'.indexOf(a) >= 0 && 'iuy'.indexOf(b) >= 0 && !!b) || (a === 'ä' && b === 'u') || (a === 'i' && b === 'e') || (a === b && 'aeo'.indexOf(a) >= 0 && !!a)
}

function startsWithAny(w, list) {
  for (let i = 0; i < list.length; i++) if (w.indexOf(list[i]) === 0) return list[i]
  return ''
}

function endsWithAny(w, list) {
  let best = ''
  for (let i = 0; i < list.length; i++) {
    const s = list[i]
    if (s.length > best.length && w.length > s.length && w.slice(-s.length) === s) best = s
  }
  return best
}

function containsAny(w, list) {
  for (let i = 0; i < list.length; i++) if (w.indexOf(list[i]) >= 0) return true
  return false
}

// Ненаголошений префікс на початку слова або ''.
function prefixOf(w) {
  if (NOT_PREFIXED.test(w)) return ''
  for (let i = 0; i < INSEP.length; i++) {
    const p = INSEP[i]
    if (w.indexOf(p) !== 0 || w.length <= p.length + 2) continue
    const next = w[p.length]
    // be-/ge- перед i, u — це дифтонг (Beispiel, Geist), а не префікс
    if (!isVowel(next) || (p[p.length - 1] === 'e' ? 'aoäöü' : 'aeiouäöü').indexOf(next) >= 0) return p
  }
  return ''
}

// Позиції, з яких починається корінь (після префіксів): там st / sp — шт / шп, h — звук.
function rootStarts(w) {
  const starts = { 0: true }
  if (!NOT_PREFIXED.test(w)) {
    let pos = 0
    for (let guard = 0; guard < 3; guard++) {
      const p = startsWithAny(w.slice(pos), PREFIXES)
      const rest = w.slice(pos + (p ? p.length : 0))
      if (!p || rest.length < 3 || !/[aeiouyäöü]/.test(rest)) break
      pos += p.length
      starts[pos] = true
    }
  }
  // woher, wohin, daher, dahin: h вимовляється
  if (/^(wo|da)h(in|er|inter|eim)/.test(w)) starts[2] = true
  COMPOUND_ST.forEach((stem) => {
    const k = w.indexOf(stem, 1)
    if (k > 0) starts[k] = true
  })
  return starts
}

const DEVOICE = { b: 'п', d: 'т', g: 'к' }
const VOICED = { b: 'б', d: 'д', g: 'ґ' }
const KEEP_VOICED_BEFORE = 'lrn'
const SIMPLE = { f: 'ф', k: 'к', m: 'м', n: 'н', p: 'п', r: 'р', t: 'т', w: 'в' }

// Одне слово малими літерами → { text, nuclei: [[початок, довжина], …] } — голосні склади у виході.
function transcribe(w) {
  let out = ''
  const nuclei = []
  const roots = rootStarts(w)
  const vAsW = containsAny(w, V_AS_W)
  let iot = false // попередній звук — «й»: наступна голосна йотується (я, є, ю)
  const vowel = (plain, iotated) => {
    const s = iot && iotated ? iotated : plain
    if (iot && iotated && out[out.length - 1] === 'й' && nuclei.length && nuclei[nuclei.length - 1][0] + nuclei[nuclei.length - 1][1] === out.length) {
      // teuer → тОєр, freie → фрАє: «й» дифтонга зливається з наступною голосною
      out = out.slice(0, -1)
      nuclei[nuclei.length - 1][1] -= 1
    }
    nuclei.push([out.length, s.length])
    out += s
    iot = false
  }
  const cons = (s) => {
    out += s
    iot = false
  }
  const n = w.length
  let i = 0
  while (i < n) {
    const c = w[i]
    const c1 = w[i + 1] || ''
    const c2 = w[i + 2] || ''
    const c3 = w[i + 3] || ''
    const prev = i > 0 ? w[i - 1] : ''
    const rest = w.slice(i)
    if (isVowel(c)) {
      if ((c === 'e' || c === 'a') && (c1 === 'i' || c1 === 'y')) {
        vowel('ай', 'яй')
        iot = true
        i += 2
      } else if (c === 'e' && c1 === 'u' && /^eur(e|en|in|innen|s)?$/.test(rest) && i > 0) {
        // французьке -eur: Kommandeur → командЬОр
        vowel('ьо', 'йо')
        i += 2
      } else if ((c === 'e' || c === 'ä') && c1 === 'u') {
        vowel('ой', 'йой')
        iot = true
        i += 2
      } else if (c === 'o' && c1 === 'u') {
        // французьке ou: Route, Tour
        vowel('у', 'ю')
        i += 2
      } else if (c === 'a' && c1 === 'u') {
        vowel('ау', 'яу')
        i += 2
      } else if (c === 'i' && c1 === 'e') {
        vowel('і', 'ї')
        i += 2
      } else if ((c === 'a' || c === 'e' || c === 'o') && c1 === c) {
        vowel({ a: 'а', e: 'е', o: 'о' }[c], { a: 'я', e: 'є', o: 'йо' }[c])
        i += 2
      } else {
        if (c === 'a') vowel('а', 'я')
        else if (c === 'e') vowel('е', 'є')
        else if (c === 'i') vowel('і', 'ї')
        else if (c === 'o') vowel('о', 'йо')
        else if (c === 'u') vowel('у', 'ю')
        else if (c === 'ä') vowel('е', 'є')
        else if (c === 'ü') vowel('ю', 'ю')
        else if (c === 'ö') vowel(i > 0 && !isVowel(prev) ? 'ьо' : 'е', 'йо')
        else vowel(i + 1 >= n ? 'і' : 'ю', 'ю') // y
        i++
      }
      continue
    }
    // h після голосної — лише подовження (крім початку кореня: woher, Bahnhof)
    if (c === 'h') {
      if (i === 0 || !isVowel(prev) || roots[i]) cons('г')
      i++
      continue
    }
    if (c === 'j') {
      if (isVowel(c1)) iot = true
      else cons('й')
      i++
      continue
    }
    if (rest.indexOf('tsch') === 0 && (i === 0 || isVowel(prev))) {
      cons('ч')
      i += 4
      continue
    }
    if (rest.indexOf('sschen') === 0 && i + 6 >= n) {
      cons('сх')
      i += 4
      continue
    }
    if (rest.indexOf('ssch') === 0) {
      cons('с')
      i++
      continue
    }
    if (rest.indexOf('sch') === 0) {
      cons('ш')
      i += 3
      continue
    }
    if (c === 'c' && c1 === 'h') {
      if (c2 === 's' && c3 !== 't' && rest.indexOf('chsch') !== 0) {
        cons('кс')
        i += 3
      } else {
        cons(rest.indexOf('chef') === 0 ? 'ш' : i === 0 && (c2 === 'r' || c2 === 'o' || rest.indexOf('chaos') === 0 || rest.indexOf('charakt') === 0) ? 'к' : 'х')
        i += 2
      }
      continue
    }
    if (c === 'c' && c1 === 'k') {
      cons('к')
      i += 2
      continue
    }
    if (c === 'c') {
      cons(c1 && 'eiyäö'.indexOf(c1) >= 0 ? 'ц' : 'к')
      i++
      continue
    }
    if ((c === 't' && c1 === 'h' && !roots[i + 1]) || (c === 'd' && c1 === 't')) {
      cons('т')
      i += 2
      continue
    }
    if (c === 'p' && c1 === 'h') {
      cons('ф')
      i += 2
      continue
    }
    if (c === 'q' && c1 === 'u') {
      cons('кв')
      i += 2
      continue
    }
    if (c === 't' && rest.indexOf('tio') === 0 && i > 0) {
      // Station → штацьйОн
      cons('ць')
      iot = true
      i += 2
      continue
    }
    if (c === 't' && c1 === 'z' && i > 0 && !isVowel(prev)) {
      // achtzehn → Ахтцен
      cons('т')
      i++
      continue
    }
    if ((c === 't' && c1 === 'z') || (c === 'z' && c1 === 'z')) {
      cons('ц')
      i += 2
      continue
    }
    if (c === 'z') {
      cons('ц')
      i++
      continue
    }
    if (c === 'x') {
      cons('кс')
      i++
      continue
    }
    if (c === 'ß') {
      cons('с')
      i++
      continue
    }
    if (c === 's') {
      if (c1 === 's') {
        cons('с')
        i += roots[i + 1] ? 1 : 2
      } else if (roots[i] && (c1 === 't' || c1 === 'p')) {
        cons('ш')
        i++
      } else {
        const voiced = isVowel(c1) && (i === 0 || roots[i] || isVowel(prev) || 'lmnr'.indexOf(prev) >= 0 || (prev === 'g' && w[i - 2] === 'n' && w[i - 3] !== 'u'))
        cons(voiced ? 'з' : 'с')
        i++
      }
      continue
    }
    if (c === 'n' && c1 === 'g') {
      cons('нґ')
      i += 2
      continue
    }
    if (c === 'v') {
      cons(vAsW && i + 1 < n ? 'в' : 'ф')
      i++
      continue
    }
    if (c === 'l') {
      if (c1 === 'l' && c2 === 'i' && c3 === 'o') {
        // Million → мільйОн
        cons('ль')
        iot = true
        i += 3
        continue
      }
      const after = c1 === 'l' ? c2 : c1
      cons(isVowel(after) ? 'л' : 'ль')
      i += c1 === 'l' ? 2 : 1
      continue
    }
    // -ig у кінці слова (також -igt, -igs, -igst) — «іх»
    if (c === 'g' && prev === 'i' && (i + 1 >= n || (/^(t|s|st)$/.test(w.slice(i + 1)) && w.length - i <= 3))) {
      cons('х')
      i++
      continue
    }
    if (DEVOICE[c]) {
      const dbl = c1 === c
      const next = dbl ? c2 : c1
      const atEnd = i + (dbl ? 2 : 1) >= n
      const devoice = atEnd || (next && !isVowel(next) && KEEP_VOICED_BEFORE.indexOf(next) < 0)
      cons(devoice || roots[i + (dbl ? 2 : 1)] ? DEVOICE[c] : VOICED[c])
      i += dbl ? 2 : 1
      continue
    }
    if (SIMPLE[c]) {
      cons(SIMPLE[c])
      i += c1 === c ? 2 : 1
      continue
    }
    i++
  }
  return { text: out, nuclei }
}

function syllables(s) {
  return transcribe(s).nuclei.length
}

// Номер наголошеного складу.
function stressIndex(w, count) {
  if (Object.prototype.hasOwnProperty.call(STRESS, w)) return STRESS[w]
  if (w.indexOf('zurück') === 0) return 1
  // дієслова й іменники на -ieren / -ierung — наголос на -ier- (telefonieren), якщо не відокремлюваний префікс
  const sep = startsWithAny(w, SEPARABLE)
  if (/ier(en|t|te|ten|st|ung|ungen)$/.test(w)) {
    if (sep && w.length - sep.length > 5) return 0
    const sfx = endsWithAny(w, Object.keys(SUFFIX))
    if (sfx) return count - SUFFIX[sfx]
  }
  // складене слово: наголос — як у першій частині
  const first = startsWithAny(w, COMPOUND_FIRST)
  if (first && first !== w) return stressIndex(first, syllables(first))
  const roots = rootStarts(w)
  let part = 0
  Object.keys(roots).forEach((k) => {
    const pos = Number(k)
    if (pos > 0 && (!part || pos < part) && COMPOUND_AT(w, pos)) part = pos
  })
  if (part) {
    const head = w.slice(0, part)
    if (!INSEP.includes(head) && syllables(head) > 0) return stressIndex(head, syllables(head))
  }
  if (!containsAny(w, NO_SUFFIX)) {
    const sfx = endsWithAny(w, Object.keys(SUFFIX))
    if (sfx && !oneSyllable(w[w.length - sfx.length - 1], sfx[0]) && count > syllables(sfx)) return count - SUFFIX[sfx]
  }
  const p = prefixOf(w)
  if (p) return syllables(p)
  const pen = count >= 3 ? endsWithAny(w, Object.keys(PENULT)) : ''
  const penOk = pen && !oneSyllable(w[w.length - pen.length - 1], pen[0]) && !startsWithAny(w, SEPARABLE)
  if (penOk && !/[^aeiouyäöü]{3}/.test(w.slice(0, -pen.length).replace(/sch|ch|ck|ph|th|qu/g, 'S'))) {
    return count - PENULT[pen]
  }
  return 0
}

// Чи з позиції pos починається відома частина складеного слова.
function COMPOUND_AT(w, pos) {
  for (let i = 0; i < COMPOUND_ST.length; i++) if (w.indexOf(COMPOUND_ST[i], pos) === pos) return true
  return false
}

function markStress(text, start, len) {
  // у «ьо», «йо» велика — сама голосна
  const k = text[start] === 'ь' || (len > 1 && text[start] === 'й') ? 1 : 0
  return text.slice(0, start + k) + text[start + k].toUpperCase() + text.slice(start + k + 1)
}

export function pronounceWord(word) {
  const w = String(word || '').toLowerCase().replace(/['’`]/g, '')
  if (!w) return ''
  if (Object.prototype.hasOwnProperty.call(WORDS, w)) return WORDS[w]
  const t = transcribe(w)
  if (t.nuclei.length < 2) return t.text
  let k = stressIndex(w, t.nuclei.length)
  if (!(k >= 0 && k < t.nuclei.length)) k = 0
  return markStress(t.text, t.nuclei[k][0], t.nuclei[k][1])
}

// Увесь текст: слова транскрибуються, розділові знаки й цифри лишаються як є.
export function pronounceDe(text) {
  return String(text || '')
    .replace(/[A-Za-zÄÖÜäöüß'’]+/g, (m) => pronounceWord(m))
    .replace(/\s+/g, ' ')
    .trim()
}
