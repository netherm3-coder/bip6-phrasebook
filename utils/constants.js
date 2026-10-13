// Кольори й розміри. Екран Bip 6: 390x450, AMOLED, кути з радіусом 86 px.

export const COLOR = {
  BG: 0x000000,
  TEXT: 0xffffff,
  TEXT_SOFT: 0xd8d8d8,
  TEXT_DIM: 0x9a9a9a,
  DE: 0x8fbcff,
  PRON: 0xffb340,
  CARD: 0x1c1c1e,
  CARD_PRESS: 0x3a3a3c,
  ACCENT: 0x2f7ff5,
  ACCENT_PRESS: 0x1f5fc0,
  NEUTRAL: 0x2c2c2e,
  NEUTRAL_PRESS: 0x48484a,
  FAV: 0xffd60a,
  DISABLED: 0x161618,
  // клавіатура пошуку
  KEY: 0x38383c,
  KEY_FN: 0x232326,
  KEY_PRESS: 0x6a6a70,
  KEY_HINT: 0x9a9a9a,
  BUBBLE: 0x55555b
}

// Висота системного рядка стану на квадратних екранах (назва програми + час).
export const STATUS_BAR_H = 64

// Поки відкрита фраза чи пошук, екран світиться довше (від останнього дотику).
export const SCREEN_ON_MS = 60 * 1000

// Скільки знайдених фраз показувати.
export const MAX_RESULTS = 60
